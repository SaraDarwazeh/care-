"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FileText, ChevronRight } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getRecordsForNurse } from "@/services/medicalService";
import type { MedicalRecord } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export default function NurseRecordsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["nurse"],
    requireApprovedNurse: true,
  });
  const t = useTranslations("nurse.records");
  const tErr = useTranslations("nurse.errors");
  const tLoading = useTranslations("nurse.loading");
  const locale = useLocale() as Locale;
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    (async () => {
      try {
        const data = await getRecordsForNurse(appUser.id);
        if (active) setRecords(data);
      } catch (err) {
        console.error("[nurse/records] failed to load", err);
        if (active) setError(tErr("loadRecords"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appUser, tErr]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={tLoading("records")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
        <p className="mt-1 text-slate-500">{t("pageSubtitle")}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((record) => {
            const date = fmtDate(record.createdAt, locale, { year: "numeric", month: "short", day: "numeric" });
            return (
              <Link
                key={record.id}
                href={`/patient/records/${record.id}`}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-brand-soft hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">
                      {record.summary ?? t("visitRecord")}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {date}
                      {record.bookingId && (
                        <span className="ms-1 text-slate-400">{t("bookingShortPrefix", { id: record.bookingId.slice(-6).toUpperCase() })}</span>
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {t("patientIdLabel")} <span className="font-mono" dir="ltr">{record.patientId.slice(0, 10)}…</span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand transition" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
