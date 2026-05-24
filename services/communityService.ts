import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, DocumentData } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { DonationPost } from "@/lib/types";

export async function createDonationPost(input: Omit<DonationPost, "id" | "createdAt">) {
  const { db } = ensureClientFirebase();
  const payload = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, "communityPosts"), payload as DocumentData);
  return { id: ref.id, ...payload } as DonationPost;
}

export async function getDonationPosts(limit = 50) {
  const { db } = ensureClientFirebase();
  const postsRef = collection(db, "communityPosts");
  const q = query(postsRef, orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DonationPost, "id">) })) as DonationPost[];
}

export async function getDonationPostById(id: string) {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, "communityPosts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<DonationPost, "id">) } as DonationPost;
}

export async function getDonationCategories() {
  const { db } = ensureClientFirebase();
  const snaps = await getDocs(collection(db, "communityCategories"));
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

const communityService = { createDonationPost, getDonationPosts, getDonationPostById, getDonationCategories };
export default communityService;
