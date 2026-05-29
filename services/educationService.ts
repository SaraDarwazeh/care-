import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { EducationCard, EducationCardKind } from "@/lib/types";
import { DEFAULT_EDUCATION_CARDS } from "@/lib/educationSeed";

const COLLECTION = "educationCards";

function mapDoc(id: string, data: Record<string, unknown>): EducationCard {
  return {
    id,
    kind: (data.kind as EducationCardKind) ?? "faq",
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    icon: typeof data.icon === "string" ? data.icon : undefined,
    accent: typeof data.accent === "string" ? (data.accent as EducationCard["accent"]) : undefined,
    order: typeof data.order === "number" ? data.order : 0,
    active: data.active !== false,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

// Auto-seed the collection the first time anyone reads from it so the
// homepage isn't empty on a fresh deployment. Same pattern as
// packageService.seedIfEmpty.
async function seedIfEmpty(): Promise<EducationCard[] | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(collection(db, COLLECTION));
  if (!snap.empty) return null;
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_EDUCATION_CARDS.map((card) =>
      setDoc(doc(db, COLLECTION, card.id), { ...card, createdAt: now, updatedAt: now }),
    ),
  );
  return DEFAULT_EDUCATION_CARDS.map((card) => ({ ...card, createdAt: now, updatedAt: now }));
}

function sortCards(cards: EducationCard[]): EducationCard[] {
  return [...cards].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.order - b.order;
  });
}

// Public-facing reader — only active cards. Used by the homepage.
export async function getActiveEducationCards(): Promise<EducationCard[]> {
  const { db } = ensureClientFirebase();
  let snap = await getDocs(collection(db, COLLECTION));
  if (snap.empty) {
    const seeded = await seedIfEmpty();
    if (seeded) return sortCards(seeded.filter((c) => c.active));
    snap = await getDocs(collection(db, COLLECTION));
  }
  const all = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
  return sortCards(all.filter((c) => c.active));
}

// Admin reader — everything, sorted, including disabled cards.
export async function getAllEducationCardsForAdmin(): Promise<EducationCard[]> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(collection(db, COLLECTION));
  return sortCards(snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>)));
}

export interface EducationCardInput {
  id?: string;
  kind: EducationCardKind;
  title: string;
  body: string;
  icon?: string;
  accent?: EducationCard["accent"];
  order?: number;
  active?: boolean;
}

// Firestore client SDK rejects undefined values — strip them so optional
// admin-form fields (no icon, no accent) write cleanly.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export async function createEducationCard(input: EducationCardInput): Promise<EducationCard> {
  const { db } = ensureClientFirebase();
  const now = new Date().toISOString();
  const id =
    input.id?.trim() ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  // Pick a default order: max(existing order in same kind) + 1.
  let order = typeof input.order === "number" ? input.order : 0;
  if (typeof input.order !== "number") {
    const sameKindSnap = await getDocs(
      query(collection(db, COLLECTION), where("kind", "==", input.kind)),
    );
    const maxOrder = sameKindSnap.docs.reduce((max, d) => {
      const v = Number((d.data() as Record<string, unknown>).order ?? 0);
      return v > max ? v : max;
    }, 0);
    order = maxOrder + 1;
  }

  const payload = stripUndefined({
    kind: input.kind,
    title: input.title.trim(),
    body: input.body.trim(),
    icon: input.icon,
    accent: input.accent,
    order,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  });
  await setDoc(doc(db, COLLECTION, id), payload);
  return { id, ...(payload as Omit<EducationCard, "id">) };
}

export async function updateEducationCard(
  id: string,
  patch: Partial<EducationCardInput>,
): Promise<void> {
  const { db } = ensureClientFirebase();
  const cleaned = stripUndefined({ ...patch, updatedAt: new Date().toISOString() });
  await updateDoc(doc(db, COLLECTION, id), cleaned);
}

export async function deleteEducationCard(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, COLLECTION, id));
}
