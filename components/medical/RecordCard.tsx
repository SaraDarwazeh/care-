"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { MedicalRecord } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export default function RecordCard({ record }: { record: MedicalRecord }) {
  const t = useTranslations("patient.records");
  const locale = useLocale() as Locale;
  const date = fmtDate(record.createdAt, locale, { year: "numeric", month: "short", day: "numeric" });
  const time = fmtDate(record.createdAt, locale, { hour: "2-digit", minute: "2-digit" });

  const latestObs = record.observations && record.observations.length > 0 ? record.observations[0] : null;
  const nurseName = latestObs?.nurseName ?? (record.nurseId ? t("nurseFallback") : null);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 truncate">{record.summary ?? t("visitRecord")}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">{date} · {time}</span>
            {nurseName && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-emerald-700 font-medium">{nurseName}</span>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {t("observationsCount", { n: record.observations?.length ?? 0 })}
        </span>
      </div>

      {latestObs && (
        <p className="text-sm text-slate-600 line-clamp-2 bg-slate-50 rounded-xl px-3 py-2">
          {latestObs.note}
        </p>
      )}

      <Link
        href={`/patient/records/${record.id}`}
        className="mt-auto inline-flex items-center gap-1 rounded-xl border border-brand-soft bg-brand-soft/30 px-4 py-2 text-sm font-semibold text-brand-deep hover:bg-brand-soft/50 transition self-start"
      >
        {t("viewDetails")}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
