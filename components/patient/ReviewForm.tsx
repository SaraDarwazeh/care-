"use client";

import { FormEvent, useState } from "react";
import { Star } from "lucide-react";
import { createReview } from "@/services/reviewService";
import type { NurseReview } from "@/lib/types";

interface ReviewFormProps {
  nurseId: string;
  patientId: string;
  patientName?: string;
  onSubmitted: (review: NurseReview) => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  nurseId,
  patientId,
  patientName,
  onSubmitted,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    if (comment.trim().length < 5) {
      setError("Please write a short comment (at least 5 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const review = await createReview({
        nurseId,
        patientId,
        patientName,
        rating,
        comment,
      });
      onSubmitted(review);
    } catch (err) {
      console.error("[ReviewForm] save failed", err);
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const display = hover || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4"
    >
      <div>
        <p className="text-sm font-bold text-slate-700">Rate your visit</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Honest feedback helps other families choose the right nurse.
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            className="rounded-full p-1 transition hover:bg-amber-50"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-7 w-7 ${
                star <= display ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-bold text-slate-700">{rating}/5</span>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Your experience
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What stood out about this nurse? Punctuality, care, communication…"
          className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
