"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("patient.reviews.form");
  const tCommon = useTranslations("patient.reviews");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setError(t("errorRating"));
      return;
    }
    if (comment.trim().length < 5) {
      setError(t("errorComment"));
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
      setError(err instanceof Error ? err.message : t("errorSubmit"));
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
        <p className="text-sm font-bold text-slate-700">{t("title")}</p>
        <p className="mt-0.5 text-xs text-slate-500">{t("subtitle")}</p>
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
            aria-label={t("starsAria", { n: star })}
          >
            <Star
              className={`h-7 w-7 ${
                star <= display ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ms-2 text-sm font-bold text-slate-700" dir="ltr">{rating}/5</span>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {t("experienceLabel")}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          dir="auto"
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
            {t("cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition disabled:opacity-60"
        >
          {submitting ? tCommon("submitting") : tCommon("submit")}
        </button>
      </div>
    </form>
  );
}
