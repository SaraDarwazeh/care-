"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseProfileForm from "@/components/nurse/NurseProfileForm";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getNurseProfileByUserId } from "@/services/nurseService";

export default function NurseSetupPage() {
  const router = useRouter();
  const { appUser, loading } = useProtectedRoute({
    allowedRoles: ["nurse"],
    requireApprovedNurse: true,
  });
  // Tracks whether the nurse already has a saved profile. Drives copy
  // ("set up" vs "manage") but never redirects — this page is the single
  // surface for both onboarding AND ongoing edits.
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function checkSetup() {
      const profile = await getNurseProfileByUserId(appUser!.id);
      if (active) setHasProfile(Boolean(profile));
    }
    void checkSetup();
    return () => {
      active = false;
    };
  }, [appUser]);

  if (loading || !appUser) {
    return <LoadingScreen text="Loading your profile..." />;
  }

  const onboarding = hasProfile === false;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">
          {onboarding ? "Complete your profile" : "Your nurse profile"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">
          {onboarding ? "Set up your nurse profile" : "Manage your profile"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          {onboarding
            ? "Add services, pricing, skills, and availability so patients can book you."
            : "Update your services, pricing, availability, and credentials anytime."}
        </p>
      </section>

      <NurseProfileForm
        userId={appUser.id}
        fullName={appUser.name}
        onSaved={() => {
          // After saving from onboarding, push to dashboard. From maintenance
          // edits, stay on this page (no redirect) so the nurse can keep editing.
          if (onboarding) router.replace("/nurse");
          else setHasProfile(true);
        }}
      />
    </div>
  );
}
