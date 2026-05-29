import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { CarePackage } from "@/lib/types";
import { DEFAULT_PACKAGES } from "@/lib/packagesCatalog";

const COLLECTION = "packages";

function mapDoc(id: string, data: Record<string, unknown>): CarePackage {
  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    description: typeof data.description === "string" ? data.description : undefined,
    targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : undefined,
    recommendedFor: Array.isArray(data.recommendedFor) ? (data.recommendedFor as string[]) : undefined,
    includedServices: Array.isArray(data.includedServices) ? (data.includedServices as string[]) : [],
    highlights: Array.isArray(data.highlights) ? (data.highlights as string[]) : [],
    outcomes: Array.isArray(data.outcomes) ? (data.outcomes as string[]) : undefined,
    careTimeline: Array.isArray(data.careTimeline)
      ? (data.careTimeline as CarePackage["careTimeline"])
      : undefined,
    durationDays: Number(data.durationDays ?? 0),
    durationOptions: Array.isArray(data.durationOptions)
      ? (data.durationOptions as CarePackage["durationOptions"])
      : undefined,
    shiftOptions: Array.isArray(data.shiftOptions) ? (data.shiftOptions as string[]) : undefined,
    basePricePerDay:
      typeof data.basePricePerDay === "number" ? data.basePricePerDay : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
    addOns: Array.isArray(data.addOns) ? (data.addOns as string[]) : undefined,
    pricingMode: data.pricingMode === "fixed" ? "fixed" : data.pricingMode === "dynamic" ? "dynamic" : undefined,
    image: typeof data.image === "string" ? data.image : undefined,
    images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
    active: data.active !== false,
    featured: Boolean(data.featured),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

async function seedIfEmpty(): Promise<CarePackage[] | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(collection(db, COLLECTION));
  if (!snap.empty) return null;

  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_PACKAGES.map((pkg) =>
      setDoc(doc(db, COLLECTION, pkg.id), {
        ...pkg,
        createdAt: pkg.createdAt ?? now,
        updatedAt: pkg.updatedAt ?? now,
      }),
    ),
  );
  return DEFAULT_PACKAGES.map((pkg) => ({
    ...pkg,
    createdAt: pkg.createdAt ?? now,
    updatedAt: pkg.updatedAt ?? now,
  }));
}

export async function listPackages(includeInactive = false): Promise<CarePackage[]> {
  const { db } = ensureClientFirebase();

  let snap = await getDocs(collection(db, COLLECTION));
  if (snap.empty) {
    const seeded = await seedIfEmpty();
    if (seeded) {
      return includeInactive ? seeded : seeded.filter((p) => p.active);
    }
    snap = await getDocs(collection(db, COLLECTION));
  }

  const all = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
  return includeInactive ? all : all.filter((p) => p.active);
}

export async function listFeaturedPackages(): Promise<CarePackage[]> {
  const packages = await listPackages(false);
  const featured = packages.filter((p) => p.featured);
  return featured.length > 0 ? featured : packages.slice(0, 3);
}

export async function getPackageById(id: string): Promise<CarePackage | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function getPackageBySlug(slug: string): Promise<CarePackage | null> {
  // Try id lookup first because our default seeds use slug == id.
  const direct = await getPackageById(slug);
  if (direct) return direct;

  const { db } = ensureClientFirebase();
  const snap = await getDocs(query(collection(db, COLLECTION), where("slug", "==", slug)));
  if (snap.empty) return null;
  const first = snap.docs[0];
  return mapDoc(first.id, first.data() as Record<string, unknown>);
}

export type CarePackageInput = Omit<CarePackage, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

// Firestore client SDK rejects undefined values; admin form fields that
// are left blank arrive as undefined. Drop them so the write succeeds.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export async function createPackage(input: CarePackageInput): Promise<CarePackage> {
  const { db } = ensureClientFirebase();
  const now = new Date().toISOString();
  const payload = stripUndefined({ ...input, createdAt: now, updatedAt: now });

  if (input.id) {
    await setDoc(doc(db, COLLECTION, input.id), payload);
    return { ...payload, id: input.id } as CarePackage;
  }
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return { ...payload, id: ref.id } as CarePackage;
}

export async function updatePackage(
  id: string,
  patch: Partial<CarePackageInput>,
): Promise<void> {
  const { db } = ensureClientFirebase();
  const cleaned = stripUndefined({ ...patch, updatedAt: new Date().toISOString() });
  await updateDoc(doc(db, COLLECTION, id), cleaned);
}

export async function deletePackage(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, COLLECTION, id));
}
