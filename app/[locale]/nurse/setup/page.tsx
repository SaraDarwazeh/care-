"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseProfileForm from "@/components/nurse/NurseProfileForm";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getNurseProfileByUserId } from "@/services/nurseService";

// Pick the gender-aware onboarding heading. Pragmatic per Phase 4
// decision — only the onboarding heading varies, not every label.
function setupHeadingKey(gender?: string): "setupHeadingFemale" | "setupHeadingMale" | "setupHeadingNeutral" {
  if (gender === "female") return "setupHeadingFemale";
  if (gender === "male") return "setupHeadingMale";
  return "setupHeadingNeutral";
}

export default function NurseSetupPage() {
  const router = useRouter();
  const { appUser, loading } = useProtectedRoute({
    allowedRoles: ["nurse"],
    requireApprovedNurse: true,
  });
  const t = useTranslations("nurse.setup");
  const tLoading = useTranslations("nurse.loading");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [gender, setGender] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function checkSetup() {
      const profile = await getNurseProfileByUserId(appUser!.id);
      if (active) {
        setHasProfile(Boolean(profile));
        setGender(profile?.gender);
      }
    }
    void checkSetup();
    return () => {
      active = false;
    };
  }, [appUser]);

  if (loading || !appUser) {
    return <LoadingScreen text={tLoading("profile")} />;
  }

  const onboarding = hasProfile === false;
  const heading = onboarding ? t(setupHeadingKey(gender)) : t("manageHeading");
  const body = onboarding ? t("onboardingBody") : t("manageBody");
  const kicker = onboarding ? t("completeYourProfile") : t("yourNurseProfile");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">{kicker}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{heading}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">{body}</p>
      </section>

      <NurseProfileForm
        userId={appUser.id}
        fullName={appUser.name}
        onSaved={() => {
          if (onboarding) router.replace("/nurse");
          else setHasProfile(true);
        }}
      />
    </div>
  );
}
