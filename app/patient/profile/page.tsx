"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientProfileEditor from "@/components/patient/PatientProfileEditor";
import { useAuth } from "@/hooks/useAuth";
import { getMissingFieldLabels, getPatientProfile } from "@/services/patientService";

function PatientProfilePageInner() {
  const { appUser, loading } = useAuth();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const [missingLabels, setMissingLabels] = useState<string[] | null>(null);

  useEffect(() => {
    if (!appUser || !isOnboarding) return;
    let active = true;
    void getPatientProfile(appUser.id).then((profile) => {
      if (active) setMissingLabels(getMissingFieldLabels(profile));
    });
    return () => { active = false; };
  }, [appUser, isOnboarding]);

  if (loading || !appUser) {
    return <LoadingScreen text="Loading profile..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {isOnboarding && missingLabels && missingLabels.length > 0 && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <div className="flex-1">
              <p className="font-bold text-sky-800">Welcome to Care Plus</p>
              <p className="mt-1 text-sm text-sky-700">
                Add the following so we can match you with the right nurse safely:
              </p>
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
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">My Profile</h1>
        <p className="mt-2 text-slate-600">
          Manage your personal details, medical history, and preferences to streamline your booking experience.
        </p>
      </div>

      <PatientProfileEditor userId={appUser.id} />
    </div>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading profile..." />}>
      <PatientProfilePageInner />
    </Suspense>
  );
}
