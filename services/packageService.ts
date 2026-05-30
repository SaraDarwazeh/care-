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
import type { CarePackage, PackageDurationOption, PackageTimelineStep } from "@/lib/types";
import { DEFAULT_PACKAGES } from "@/lib/packagesCatalog";
import {
  normalizeLocalized,
  normalizeLocalizedArray,
  normalizeLocalizedRequired,
  type LocalizedInput,
} from "@/lib/i18nContent";

const COLLECTION = "packages";

// Tolerant readers — per Phase 5 plan, legacy plain-string records get
// coerced to { en: "..." } on read so the rollout doesn't depend on the
// backfill being complete first. After mandatory backfill + production
// verification, the legacy-coercion branches can be removed (every
// record will already be canonical LocalizedString).
function mapTimelineStep(raw: unknown): PackageTimelineStep | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { day?: unknown; title?: LocalizedInput; description?: LocalizedInput };
  return {
    day: Number(obj.day ?? 0),
    title: normalizeLocalizedRequired(obj.title),
    description: normalizeLocalizedRequired(obj.description),
  };
}

function mapDurationOption(raw: unknown): PackageDurationOption | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { days?: unknown; label?: LocalizedInput; priceModifier?: unknown };
  const days = Number(obj.days ?? 0);
  if (days <= 0) return null;
  return {
    days,
    label: normalizeLocalizedRequired(obj.label),
    priceModifier: typeof obj.priceModifier === "number" ? obj.priceModifier : undefined,
  };
}

function mapDoc(id: string, data: Record<string, unknown>): CarePackage {
  return {
    id,
    slug: String(data.slug ?? id),
    title: normalizeLocalizedRequired(data.title as LocalizedInput),
    summary: normalizeLocalizedRequired(data.summary as LocalizedInput),
    description: normalizeLocalized(data.description as LocalizedInput),
    targetAudience: normalizeLocalized(data.targetAudience as LocalizedInput),
    recommendedFor: Array.isArray(data.recommendedFor)
      ? normalizeLocalizedArray(data.recommendedFor as LocalizedInput[])
      : undefined,
    includedServices: Array.isArray(data.includedServices)
      ? normalizeLocalizedArray(data.includedServices as LocalizedInput[])
      : [],
    highlights: Array.isArray(data.highlights)
      ? normalizeLocalizedArray(data.highlights as LocalizedInput[])
      : [],
    outcomes: Array.isArray(data.outcomes)
      ? normalizeLocalizedArray(data.outcomes as LocalizedInput[])
      : undefined,
    careTimeline: Array.isArray(data.careTimeline)
      ? (data.careTimeline as unknown[])
          .map(mapTimelineStep)
          .filter((s): s is PackageTimelineStep => s !== null)
      : undefined,
    durationDays: Number(data.durationDays ?? 0),
    durationOptions: Array.isArray(data.durationOptions)
      ? (data.durationOptions as unknown[])
          .map(mapDurationOption)
          .filter((o): o is PackageDurationOption => o !== null)
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

// Seed-version key per plan §Risks #14 — prevents seedIfEmpty from
// racing with a partially-populated collection. Bumped per schema
// change (current version is 1, corresponding to LocalizedString shape).
const SEED_VERSION = 1;
const SEED_META_DOC = "meta-seed-version";

async function getSeedVersion(): Promise<number | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, COLLECTION, SEED_META_DOC));
  if (!snap.exists()) return null;
  const v = (snap.data() as { version?: unknown }).version;
  return typeof v === "number" ? v : null;
}

async function setSeedVersion(version: number): Promise<void> {
  const { db } = ensureClientFirebase();
  await setDoc(doc(db, COLLECTION, SEED_META_DOC), { version, setAt: new Date().toISOString() });
}

async function seedIfEmpty(): Promise<CarePackage[] | null> {
  const { db } = ensureClientFirebase();
  // The meta doc itself is a doc in the collection; exclude it from
  // the emptiness check so we only seed truly virgin collections.
  const snap = await getDocs(collection(db, COLLECTION));
  const realDocs = snap.docs.filter((d) => d.id !== SEED_META_DOC);
  if (realDocs.length > 0) return null;

  const existingVersion = await getSeedVersion();
  if (existingVersion !== null) return null; // previously seeded then cleared — don't auto-re-seed

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
  await setSeedVersion(SEED_VERSION);
  return DEFAULT_PACKAGES.map((pkg) => ({
    ...pkg,
    createdAt: pkg.createdAt ?? now,
    updatedAt: pkg.updatedAt ?? now,
  }));
}

export async function listPackages(includeInactive = false): Promise<CarePackage[]> {
  const { db } = ensureClientFirebase();

  let snap = await getDocs(collection(db, COLLECTION));
  const hasRealDocs = snap.docs.some((d) => d.id !== SEED_META_DOC);
  if (!hasRealDocs) {
    const seeded = await seedIfEmpty();
    if (seeded) {
      return includeInactive ? seeded : seeded.filter((p) => p.active);
    }
    snap = await getDocs(collection(db, COLLECTION));
  }

  const all = snap.docs
    .filter((d) => d.id !== SEED_META_DOC)
    .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
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
