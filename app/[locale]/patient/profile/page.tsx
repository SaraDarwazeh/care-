"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import BackLink from "@/components/common/BackLink";
import PatientProfileEditor from "@/components/patient/PatientProfileEditor";
import RewardsSection from "@/components/patient/RewardsSection";
import { useAuth } from "@/hooks/useAuth";
import { getMissingFieldLabels, getPatientProfile } from "@/services/patientService";

function PatientProfilePageInner() {
  const { appUser, loading } = useAuth();
  const searchParams = useSearchParams();
  const t = useTranslations("patient.profile");
  // Root-scope translator so we can pass it into patientService helpers
  // that return fully-qualified i18n keys.
  const tRoot = useTranslations();
  const isOnboarding = searchParams.get("onboarding") === "true";
  // Deep-link target from the booking gate (e.g. ?section=identity).
  // Only accept the known section ids; anything else is ignored so a
  // typo in a URL doesn't blow up the editor.
  const SECTION_IDS = ["personal", "identity", "locations", "medical", "emergency", "payment"] as const;
  type SectionId = (typeof SECTION_IDS)[number];
  const requestedSection = searchParams.get("section");
  const initialSection = (SECTION_IDS as readonly string[]).includes(requestedSection ?? "")
    ? (requestedSection as SectionId)
    : undefined;

  const [missingLabels, setMissingLabels] = useState<string[] | null>(null);

  useEffect(() => {
    if (!appUser || !isOnboarding) return;
    let active = true;
    void getPatientProfile(appUser.id).then((profile) => {
      if (active) setMissingLabels(getMissingFieldLabels(profile, tRoot));
    });
    return () => { active = false; };
  }, [appUser, isOnboarding, tRoot]);

  if (loading || !appUser) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <BackLink href="/patient" labelKey="common.actions.backToDashboard" />

      {isOnboarding && missingLabels && missingLabels.length > 0 && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <div className="flex-1">
              <p className="font-bold text-sky-800">{t("onboardingWelcome")}</p>
              <p className="mt-1 text-sm text-sky-700">{t("onboardingPrompt")}</p>
              <ul className="mt-2 space-y-1 text-sm text-sky-700">
                {missingLabels.map((label) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-sky-500" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">{t("pageTitle")}</h1>
        <p className="mt-2 text-slate-600">{t("pageSubtitle")}</p>
      </div>

      <PatientProfileEditor userId={appUser.id} initialSection={initialSection} />
      <RewardsSection />
    </div>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PatientProfilePageInner />
    </Suspense>
  );
}
