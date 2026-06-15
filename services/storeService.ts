import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, setDoc, where } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { StoreItem, StoreOrder } from "@/lib/types";
import { STORE_ITEMS } from "@/lib/data/store";
import { notifyOrderCreated, notifyOrderStatusChange } from "@/services/notificationService";
import { normalizeLocalizedRequired, type LocalizedInput } from "@/lib/i18nContent";

const COLLECTION = "products";
const SEED_VERSION = 1;
const SEED_META_DOC = "meta-seed-version";

// Tolerant reader — coerces legacy plain-string name/description into
// the canonical LocalizedString shape so the rollout can ship before
// the migration completes (per Phase 5 plan).
function mapProduct(id: string, data: Record<string, unknown>): StoreItem {
  return {
    id,
    name: normalizeLocalizedRequired(data.name as LocalizedInput),
    description: normalizeLocalizedRequired(data.description as LocalizedInput),
    price: typeof data.price === "number" ? data.price : 0,
    category: typeof data.category === "string" ? data.category : "",
    image: typeof data.image === "string" ? data.image : "",
  };
}

async function getSeedVersion(db: ReturnType<typeof ensureClientFirebase>["db"]): Promise<number | null> {
  const snap = await getDoc(doc(db, COLLECTION, SEED_META_DOC));
  if (!snap.exists()) return null;
  const v = (snap.data() as { version?: unknown }).version;
  return typeof v === "number" ? v : null;
}

async function setSeedVersion(db: ReturnType<typeof ensureClientFirebase>["db"], version: number): Promise<void> {
  await setDoc(doc(db, COLLECTION, SEED_META_DOC), { version, setAt: new Date().toISOString() });
}

export async function getProducts(): Promise<StoreItem[]> {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(collection(db, COLLECTION));
  const realDocs = snapshot.docs.filter((d) => d.id !== SEED_META_DOC);

  // Auto-seed if the products collection is empty AND has never been
  // seeded (seed-version meta doc absent). Prevents re-seeding into a
  // collection an admin cleared on purpose. Per Phase 5 plan §Risks #14.
  if (realDocs.length === 0) {
    const existingVersion = await getSeedVersion(db);
    if (existingVersion === null) {
      await Promise.all(
        STORE_ITEMS.map((item) => setDoc(doc(db, COLLECTION, item.id), item)),
      );
      await setSeedVersion(db, SEED_VERSION);
      return STORE_ITEMS;
    }
    return [];
  }

  return realDocs.map((d) => mapProduct(d.id, d.data() as Record<string, unknown>));
}

export async function createProduct(input: Omit<StoreItem, "id">): Promise<StoreItem> {
  const { db } = ensureClientFirebase();
  const ref = await addDoc(collection(db, COLLECTION), input);
  return { id: ref.id, ...input };
}

export async function updateProduct(id: string, input: Partial<Omit<StoreItem, "id">>): Promise<void> {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, COLLECTION, id), input);
}

export async function deleteProduct(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, COLLECTION, id));
}

// Order Management
export async function getOrders(): Promise<StoreOrder[]> {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(collection(db, "orders"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoreOrder, "id">),
  }));
}

export async function createOrder(
  input: Omit<StoreOrder, "id"> & { redeemPointsAmount?: number },
): Promise<StoreOrder> {
  const { db } = ensureClientFirebase();
  // Strip the convenience field before writing — it isn't a persisted
  // shape, it's just a per-call instruction to also burn points.
  const { redeemPointsAmount, ...persistedInput } = input;
  const ref = await addDoc(collection(db, "orders"), persistedInput);
  const order: StoreOrder = { id: ref.id, ...persistedInput };
  await notifyOrderCreated(order);

  // Burn the requested points atomically. Validation (min, max-fraction,
  // balance) lives in the points service; if it throws, the order has
  // already been written — admin can compensate via /api/points/adjust.
  // We accept this asymmetry because the order itself should not fail
  // for a points-side error mid-checkout.
  if (redeemPointsAmount && redeemPointsAmount > 0) {
    try {
      const { redeemPoints } = await import("@/services/pointsService");
      const subtotal = typeof persistedInput.subtotal === "number"
        ? persistedInput.subtotal
        : persistedInput.total;
      await redeemPoints({
        patientId: persistedInput.patientId,
        amount: redeemPointsAmount,
        sourceId: order.id,
        cartSubtotal: subtotal,
      });
      const { notifyPointsRedeemed } = await import("@/services/notificationService");
      await notifyPointsRedeemed({ userId: persistedInput.patientId, amount: redeemPointsAmount, orderId: order.id });
    } catch (err) {
      console.error("[storeService] points redemption failed (order persisted without burn)", err);
    }
  }
  return order;
}

export async function getOrdersForPatient(patientId: string): Promise<StoreOrder[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, "orders"), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoreOrder, "id">),
  }));
  // Sort newest-first client-side to avoid requiring a composite Firestore index.
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateOrderStatus(
  orderId: string,
  status: StoreOrder["status"]
): Promise<void> {
  const { db } = ensureClientFirebase();
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as Omit<StoreOrder, "id">) : null;
  await updateDoc(ref, { status });
  if (existing) {
    await notifyOrderStatusChange({
      order: { id: orderId, patientId: existing.patientId },
      newStatus: status,
    });

    // Loyalty earn on delivery. Idempotent per (orderId, source).
    if (status === "delivered") {
      try {
        const { earnPoints } = await import("@/services/pointsService");
        const { POINTS_PER_ILS } = await import("@/lib/pointsConstants");
        const amount = Math.round(Number(existing.total ?? 0) * POINTS_PER_ILS);
        if (amount > 0) {
          await earnPoints({
            patientId: existing.patientId,
            source: "order_delivered",
            amount,
            sourceId: orderId,
          });
          const { notifyPointsEarned } = await import("@/services/notificationService");
          await notifyPointsEarned({ userId: existing.patientId, amount, source: "order_delivered", sourceId: orderId });
        }
      } catch (err) {
        console.warn("[storeService] points earn failed (non-fatal)", err);
      }
    }
  }
}
