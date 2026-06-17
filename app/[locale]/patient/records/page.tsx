"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import SectionContainer from "@/components/patient/SectionContainer";
import BackLink from "@/components/common/BackLink";
import { getRecordsForPatient } from "@/services/medicalService";
import { useAuth } from "@/hooks/useAuth";
import RecordCard from "@/components/medical/RecordCard";
import type { MedicalRecord } from "@/lib/types";

export default function PatientRecordsPage() {
  const { appUser, loading } = useAuth();
  const t = useTranslations("patient.records");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!appUser) return;
      setLoadingData(true);
      const r = await getRecordsForPatient(appUser.id);
      if (!active) return;
      setRecords(r);
      setLoadingData(false);
    }
    void load();
    return () => { active = false; };
  }, [appUser]);

  return (
    <div className="space-y-4">
      <BackLink href="/patient" labelKey="common.actions.backToDashboard" />
      <SectionContainer title={t("pageTitle")} description={t("pageSubtitle")}>
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          {t("privacyNote")}
          <Link href="/privacy" className="text-brand hover:underline ms-1">{t("privacyLink")}</Link>
        </p>
      </div>
      <div className="space-y-4">
        {loading || loadingData ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-500">
            {t("loading")}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {records.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </div>
    </SectionContainer>
    </div>
  );
}
