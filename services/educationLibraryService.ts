import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  EDUCATION_VIDEO_CATEGORIES,
  type EducationVideo,
  type EducationVideoCategory,
  type SavedVideoEntry,
} from "@/lib/types";
import {
  normalizeLocalizedRequired,
  type LocalizedInput,
  type LocalizedString,
} from "@/lib/i18nContent";

const COLLECTION = "educationVideos";
const SAVED_SUBCOLLECTION = "savedVideos";

function isCategory(value: unknown): value is EducationVideoCategory {
  return (
    typeof value === "string" &&
    (EDUCATION_VIDEO_CATEGORIES as readonly string[]).includes(value)
  );
}

function mapDoc(id: string, data: Record<string, unknown>): EducationVideo {
  return {
    id,
    title: normalizeLocalizedRequired(data.title as LocalizedInput),
    description: normalizeLocalizedRequired(data.description as LocalizedInput),
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : "",
    thumbnailUrl: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : undefined,
    durationSeconds:
      typeof data.durationSeconds === "number" ? data.durationSeconds : undefined,
    category: isCategory(data.category) ? data.category : "general",
    tags: Array.isArray(data.tags) ? (data.tags as string[]).filter((t) => typeof t === "string") : undefined,
    published: data.published !== false,
    order: typeof data.order === "number" ? data.order : 0,
    viewCount: typeof data.viewCount === "number" ? data.viewCount : undefined,
    saveCount: typeof data.saveCount === "number" ? data.saveCount : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
  };
}

function sortAdmin(videos: EducationVideo[]): EducationVideo[] {
  return [...videos].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// Firestore client SDK rejects undefined values — strip them before
// every write so optional admin-form fields don't blow up.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

// ---------- public reads ----------

// Client-side page size. The query itself fetches every published
// video in one round-trip; this constant just controls how many we
// reveal per scroll tick in the feed UI.
export const EDUCATION_VIDEOS_PAGE_SIZE = 20;

function sortByCreatedDesc(videos: EducationVideo[]): EducationVideo[] {
  return [...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Public reader for the patient feed. Single-field equality query
// (auto-indexed by Firestore — no composite index required); ordering,
// category filtering, and pagination are done client-side. Suitable
// for an MVP catalogue of dozens to a few hundred videos. If the
// library grows past ~1k published items, promote this back to a
// cursor-paginated query and add the composite indexes to
// firestore.indexes.json.
export async function listPublishedVideos(): Promise<EducationVideo[]> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("published", "==", true)),
  );
  return sortByCreatedDesc(
    snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>)),
  );
}

export async function getVideoById(id: string): Promise<EducationVideo | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapDoc(snap.id, snap.data() as Record<string, unknown>);
}

// Up to N other published videos in the same category, excluding the
// video being viewed. Same single-field query strategy as
// listPublishedVideos — we narrow by category client-side so no
// composite index is required.
export async function listRelatedVideos(
  video: EducationVideo,
  count = 6,
): Promise<EducationVideo[]> {
  const all = await listPublishedVideos();
  return all
    .filter((v) => v.category === video.category && v.id !== video.id)
    .slice(0, count);
}

// ---------- admin reads ----------

export async function getAllVideosForAdmin(): Promise<EducationVideo[]> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(collection(db, COLLECTION));
  return sortAdmin(snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>)));
}

// ---------- admin writes ----------

export interface EducationVideoInput {
  id?: string;
  title: LocalizedString;
  description: LocalizedString;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  category: EducationVideoCategory;
  tags?: string[];
  published?: boolean;
  order?: number;
  createdBy?: string;
}

export async function createEducationVideo(
  input: EducationVideoInput,
): Promise<EducationVideo> {
  const { db } = ensureClientFirebase();
  const now = new Date().toISOString();
  const id =
    input.id?.trim() ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  let order = typeof input.order === "number" ? input.order : 0;
  if (typeof input.order !== "number") {
    const snap = await getDocs(collection(db, COLLECTION));
    const maxOrder = snap.docs.reduce((max, d) => {
      const v = Number((d.data() as Record<string, unknown>).order ?? 0);
      return v > max ? v : max;
    }, 0);
    order = maxOrder + 1;
  }

  const payload = stripUndefined({
    title: input.title,
    description: input.description,
    videoUrl: input.videoUrl,
    thumbnailUrl: input.thumbnailUrl,
    durationSeconds: input.durationSeconds,
    category: input.category,
    tags: input.tags && input.tags.length > 0 ? input.tags : undefined,
    published: input.published ?? false,
    order,
    viewCount: 0,
    saveCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  });
  await setDoc(doc(db, COLLECTION, id), payload);
  return {
    id,
    ...(payload as Omit<EducationVideo, "id">),
  };
}

export async function updateEducationVideo(
  id: string,
  patch: Partial<EducationVideoInput>,
): Promise<void> {
  const { db } = ensureClientFirebase();
  const cleaned = stripUndefined({ ...patch, updatedAt: new Date().toISOString() });
  await updateDoc(doc(db, COLLECTION, id), cleaned);
}

export async function deleteEducationVideo(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, COLLECTION, id));
}

// Best-effort increment — never fail the parent flow on a counter miss.
export async function incrementViewCount(id: string): Promise<void> {
  const { db } = ensureClientFirebase();
  try {
    await updateDoc(doc(db, COLLECTION, id), { viewCount: increment(1) });
  } catch {
    // counters are vanity — swallow errors so a missing doc / rules
    // hiccup doesn't break video playback.
  }
}

// ---------- per-user saves ----------

function savedRef(uid: string, videoId: string) {
  const { db } = ensureClientFirebase();
  return doc(db, "users", uid, SAVED_SUBCOLLECTION, videoId);
}

export async function saveVideo(uid: string, videoId: string): Promise<void> {
  await setDoc(savedRef(uid, videoId), {
    videoId,
    savedAt: new Date().toISOString(),
  });
  const { db } = ensureClientFirebase();
  try {
    await updateDoc(doc(db, COLLECTION, videoId), { saveCount: increment(1) });
  } catch {
    /* counter best-effort */
  }
}

export async function unsaveVideo(uid: string, videoId: string): Promise<void> {
  await deleteDoc(savedRef(uid, videoId));
  const { db } = ensureClientFirebase();
  try {
    await updateDoc(doc(db, COLLECTION, videoId), { saveCount: increment(-1) });
  } catch {
    /* counter best-effort */
  }
}

export async function isVideoSaved(uid: string, videoId: string): Promise<boolean> {
  const snap = await getDoc(savedRef(uid, videoId));
  return snap.exists();
}

export async function listSavedVideoIds(uid: string): Promise<SavedVideoEntry[]> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(collection(db, "users", uid, SAVED_SUBCOLLECTION));
  const entries: SavedVideoEntry[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      videoId: typeof data.videoId === "string" ? data.videoId : d.id,
      savedAt: typeof data.savedAt === "string" ? data.savedAt : "",
    };
  });
  entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return entries;
}

// Hydrate the saved list with full video records. Filters out entries
// whose underlying video has since been deleted so the library doesn't
// render ghost rows.
export async function listSavedVideos(uid: string): Promise<EducationVideo[]> {
  const entries = await listSavedVideoIds(uid);
  if (entries.length === 0) return [];
  const videos = await Promise.all(entries.map((e) => getVideoById(e.videoId)));
  return videos.filter((v): v is EducationVideo => v !== null);
}
