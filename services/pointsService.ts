import {
  collection,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { PointsLedgerEntry, PointsSource } from "@/lib/types";
import {
  MAX_REDEEM_FRACTION,
  MIN_REDEEM_POINTS,
  POINTS_PER_REDEEM_ILS,
} from "@/lib/pointsConstants";

// Points ledger + balance writer. All mutations go through Firestore
// transactions so a balance never drifts from the ledger. Reads are
// allowed to be eventually consistent.
//
// Layout:
//   users/{uid}                              -> { pointsBalance: number, ... }
//   users/{uid}/pointsLedger/{txId}          -> PointsLedgerEntry
//
// Idempotency: every earn pulled in from a domain event (booking
// completion, order delivery, first review) carries a (source, sourceId)
// pair. The earn helper looks up an existing ledger entry with that pair
// and no-ops if one exists, so admin re-completions or notification
// retries don't double-credit.

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Deterministic ledger doc id for a domain event. Two concurrent earns
// with the same (source, sourceId) target the same doc, so the Firestore
// transaction can detect a duplicate on `tx.get` and no-op — no separate
// read-before-write race window. The id includes a stable prefix + the
// source and a sanitized sourceId. Firestore allows arbitrary printable
// ASCII in document ids except "/" and starting "."; we encode anything
// risky with %xx so collisions are impossible.
function idempotentLedgerId(source: PointsSource, sourceId: string): string {
  const sanitized = sourceId.replace(/[^A-Za-z0-9_-]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`,
  );
  return `evt_${source}_${sanitized}`;
}

// Earn helper. Returns the ledger entry id (newly written or pre-existing).
// `amount` MUST be a positive integer.
export async function earnPoints(input: {
  patientId: string;
  source: PointsSource;
  amount: number;
  sourceId?: string;
  note?: string;
}): Promise<string | null> {
  const amount = Math.floor(Number(input.amount) || 0);
  if (amount <= 0) return null;

  // Domain events without a sourceId can't be made idempotent, so we
  // disallow them here. Admin-adjust callers should supply their own
  // unique sourceId (e.g. a uuid) if they want one entry per action.
  if (input.source !== "admin_adjust" && !input.sourceId) {
    console.warn("[pointsService] earn refused — missing sourceId for non-admin source", input);
    return null;
  }

  const { db } = ensureClientFirebase();
  // Deterministic id when we have a sourceId; random for admin-adjust
  // without one (rare). The deterministic path lets the transaction body
  // detect duplicates atomically instead of doing a read-then-write that
  // races under concurrent calls.
  const txId = input.sourceId
    ? idempotentLedgerId(input.source, input.sourceId)
    : generateId();
  const userRef = doc(db, "users", input.patientId);
  const ledgerRef = doc(db, "users", input.patientId, "pointsLedger", txId);

  const resultId = await runTransaction(db, async (tx) => {
    // Idempotency check INSIDE the transaction — two concurrent earns
    // for the same key serialize through Firestore and the loser sees
    // the winner's write and returns the existing id.
    const existingSnap = await tx.get(ledgerRef);
    if (existingSnap.exists()) {
      return txId;
    }

    const userSnap = await tx.get(userRef);
    const current = userSnap.exists()
      ? Number((userSnap.data() as Record<string, unknown>).pointsBalance ?? 0)
      : 0;
    const entry: Omit<PointsLedgerEntry, "id"> = {
      type: "earn",
      source: input.source,
      amount,
      sourceId: input.sourceId,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    tx.set(ledgerRef, entry);
    tx.set(userRef, { pointsBalance: current + amount }, { merge: true });
    return txId;
  });

  return resultId;
}

// Redeem helper. Validates min + max-fraction caps + balance inside the
// transaction so a client can't game it by sending bad numbers.
// `cartSubtotal` is the pre-discount subtotal the cap is computed against.
export async function redeemPoints(input: {
  patientId: string;
  amount: number;
  sourceId: string;
  cartSubtotal: number;
}): Promise<string> {
  const amount = Math.floor(Number(input.amount) || 0);
  if (amount < MIN_REDEEM_POINTS) {
    throw new Error(`Minimum redemption is ${MIN_REDEEM_POINTS} points`);
  }
  // Cap: 50% of subtotal expressed in points.
  const cap = Math.floor(input.cartSubtotal * MAX_REDEEM_FRACTION * POINTS_PER_REDEEM_ILS);
  if (amount > cap) {
    throw new Error(`Redemption exceeds the ${MAX_REDEEM_FRACTION * 100}% cap on this cart`);
  }

  const { db } = ensureClientFirebase();
  const txId = generateId();
  const userRef = doc(db, "users", input.patientId);
  const ledgerRef = doc(db, "users", input.patientId, "pointsLedger", txId);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const current = userSnap.exists()
      ? Number((userSnap.data() as Record<string, unknown>).pointsBalance ?? 0)
      : 0;
    if (current < amount) {
      throw new Error("Insufficient points balance");
    }
    const entry: Omit<PointsLedgerEntry, "id"> = {
      type: "redeem",
      source: "redemption",
      amount,
      sourceId: input.sourceId,
      createdAt: new Date().toISOString(),
    };
    tx.set(ledgerRef, entry);
    tx.set(userRef, { pointsBalance: current - amount }, { merge: true });
  });

  return txId;
}

export async function getPointsBalance(patientId: string): Promise<number> {
  const { db } = ensureClientFirebase();
  const userRef = doc(db, "users", patientId);
  const snap = await (await import("firebase/firestore")).getDoc(userRef);
  if (!snap.exists()) return 0;
  return Number((snap.data() as Record<string, unknown>).pointsBalance ?? 0);
}

export async function getPointsLedger(
  patientId: string,
  limit = 20,
): Promise<PointsLedgerEntry[]> {
  const { db } = ensureClientFirebase();
  const ledger = collection(db, "users", patientId, "pointsLedger");
  const q = query(ledger, orderBy("createdAt", "desc"), fbLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PointsLedgerEntry, "id">) }));
}
