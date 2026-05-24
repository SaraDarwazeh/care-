import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { createLogger } from "@/lib/logger";
import type { NurseReview } from "@/lib/types";

const log = createLogger("reviewService");

const COLLECTION = "reviews";

export interface ReviewSummary {
  count: number;
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

const EMPTY_BREAKDOWN: ReviewSummary["breakdown"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function mapDoc(id: string, data: Record<string, unknown>): NurseReview {
  return {
    id,
    nurseId: String(data.nurseId ?? ""),
    patientId: String(data.patientId ?? ""),
    patientName: typeof data.patientName === "string" ? data.patientName : undefined,
    bookingId: typeof data.bookingId === "string" ? data.bookingId : undefined,
    rating: Number(data.rating ?? 0),
    comment: String(data.comment ?? ""),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
  };
}

// Reviews are unbounded over a nurse's lifetime; cap default reads at 30 so
// the marketplace + detail pages stay snappy. The cached aggregate on the
// nurse profile (rating + reviewCount) reflects ALL reviews, not just this page.
export const REVIEWS_DEFAULT_LIMIT = 30;

export async function getReviewsForNurse(
  nurseId: string,
  opts: { limit?: number } = {},
): Promise<NurseReview[]> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(query(collection(db, COLLECTION), where("nurseId", "==", nurseId)));
  const items = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cap = opts.limit ?? REVIEWS_DEFAULT_LIMIT;
  return items.slice(0, cap);
}

export function summarize(reviews: NurseReview[]): ReviewSummary {
  if (reviews.length === 0) {
    return { count: 0, average: 0, breakdown: { ...EMPTY_BREAKDOWN } };
  }
  const breakdown = { ...EMPTY_BREAKDOWN };
  let total = 0;
  reviews.forEach((r) => {
    const bucket = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[bucket] += 1;
    total += r.rating;
  });
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
    breakdown,
  };
}

export async function getReviewByPatient(
  nurseId: string,
  patientId: string,
): Promise<NurseReview | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDocs(
    query(
      collection(db, COLLECTION),
      where("nurseId", "==", nurseId),
      where("patientId", "==", patientId),
    ),
  );
  if (snap.empty) return null;
  const first = snap.docs[0];
  return mapDoc(first.id, first.data() as Record<string, unknown>);
}

// Patient can review a nurse if they've had at least one completed booking
// with them AND haven't already left a review.
export async function canPatientReview(
  nurseId: string,
  patientId: string,
): Promise<{ eligible: boolean; reason?: "no_completed_visit" | "already_reviewed" }> {
  const { db } = ensureClientFirebase();

  const existing = await getReviewByPatient(nurseId, patientId);
  if (existing) return { eligible: false, reason: "already_reviewed" };

  const bookingsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("patientId", "==", patientId),
      where("nurseId", "==", nurseId),
      where("status", "==", "completed"),
    ),
  );
  if (bookingsSnap.empty) return { eligible: false, reason: "no_completed_visit" };

  return { eligible: true };
}

async function refreshNurseAggregate(nurseId: string): Promise<void> {
  const { db } = ensureClientFirebase();
  const reviews = await getReviewsForNurse(nurseId);
  const summary = summarize(reviews);
  try {
    await updateDoc(doc(db, "nurseProfiles", nurseId), {
      rating: summary.average,
      reviewCount: summary.count,
    });
  } catch (error) {
    // Profile doc may not exist yet (edge case). Don't fail the review write.
    log.warn("failed to update nurse aggregate", error);
  }
}

export async function createReview(input: {
  nurseId: string;
  patientId: string;
  patientName?: string;
  bookingId?: string;
  rating: number;
  comment: string;
}): Promise<NurseReview> {
  const { db } = ensureClientFirebase();
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const payload: Omit<NurseReview, "id"> = {
    nurseId: input.nurseId,
    patientId: input.patientId,
    patientName: input.patientName,
    bookingId: input.bookingId,
    rating,
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  await refreshNurseAggregate(input.nurseId);
  return { id: ref.id, ...payload };
}

export async function deleteReview(reviewId: string, nurseId: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await deleteDoc(doc(db, COLLECTION, reviewId));
  await refreshNurseAggregate(nurseId);
}
