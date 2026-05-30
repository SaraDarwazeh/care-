"use client";

import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { NurseReview } from "@/lib/types";
import { summarize } from "@/services/reviewService";
import { fmtDate, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

interface ReviewListProps {
  reviews: NurseReview[];
}

function StarsRow({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rounded ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewList({ reviews }: ReviewListProps) {
  const t = useTranslations("patient.reviews");
  const locale = useLocale() as Locale;
  const summary = summarize(reviews);

  if (summary.count === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <Star className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 font-semibold text-slate-700">{t("list.emptyTitle")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("list.emptyBody")}</p>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(summary.breakdown));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 p-5 sm:min-w-[140px]">
          <p className="text-4xl font-extrabold text-amber-700">
            {fmtNumber(summary.average, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
          <StarsRow value={summary.average} />
          <p className="mt-2 text-xs font-semibold text-amber-700">
            {t("list.count", { n: summary.count })}
          </p>
        </div>
        <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-white p-4">
          {([5, 4, 3, 2, 1] as const).map((bucket) => {
            const count = summary.breakdown[bucket];
            const pct = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100);
            return (
              <div key={bucket} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-end font-semibold text-slate-600">{bucket}★</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-end font-semibold text-slate-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                  {(review.patientName ?? "P").substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {review.patientName ?? t("anonymous")}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StarsRow value={review.rating} />
                    <span className="text-xs text-slate-400">
                      {fmtDate(review.createdAt, locale, { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{review.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
