import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { DonationPost, DonationPostStatus } from "@/lib/types";

export function postStatus(post: Pick<DonationPost, "status">): DonationPostStatus {
  return post.status ?? "active";
}

export async function createDonationPost(input: Omit<DonationPost, "id" | "createdAt">) {
  const { db } = ensureClientFirebase();
  const payload = {
    status: "active" as DonationPostStatus,
    ...input,
    createdAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, "communityPosts"), payload as DocumentData);
  return { id: ref.id, ...payload } as DonationPost;
}

// Public listing — hides anything that's not "active". Records without a
// status field are treated as active (backward compat for older posts).
export async function getDonationPosts(limit = 50) {
  const { db } = ensureClientFirebase();
  const postsRef = collection(db, "communityPosts");
  const q = query(postsRef, orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  const posts = snaps.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<DonationPost, "id">) })) as DonationPost[];
  return posts.filter((p) => postStatus(p) === "active").slice(0, limit);
}

// Admin listing — returns everything regardless of status.
export async function getAllDonationPostsForAdmin(limit = 200) {
  const { db } = ensureClientFirebase();
  const postsRef = collection(db, "communityPosts");
  const q = query(postsRef, orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  return (snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DonationPost, "id">) })) as DonationPost[])
    .slice(0, limit);
}

export async function getDonationPostById(id: string) {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, "communityPosts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<DonationPost, "id">) } as DonationPost;
}

export async function setDonationPostStatus(id: string, status: DonationPostStatus, note?: string) {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "communityPosts", id), {
    status,
    moderatedAt: new Date().toISOString(),
    ...(note ? { moderationNote: note } : {}),
  });
}

export async function deleteDonationPost(id: string) {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, "communityPosts", id));
}

export async function getDonationCategories() {
  const { db } = ensureClientFirebase();
  const snaps = await getDocs(collection(db, "communityCategories"));
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

const communityService = {
  createDonationPost,
  getDonationPosts,
  getAllDonationPostsForAdmin,
  getDonationPostById,
  setDonationPostStatus,
  deleteDonationPost,
  getDonationCategories,
  postStatus,
};
export default communityService;
