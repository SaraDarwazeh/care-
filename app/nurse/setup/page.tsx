"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const nurseId = appUser.id;

    let active = true;

    async function checkSetup() {
      const profile = await getNurseProfileByUserId(nurseId);
      if (active && profile) {
        router.replace("/nurse");
      }
    }

    void checkSetup();

    return () => {
      active = false;
    };
  }, [appUser, router]);

  if (loading || !appUser) {
    return <LoadingScreen text="Preparing nurse setup..." />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Complete your profile</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">
          Set up your nurse profile
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Add services, pricing, skills, and availability so patients can book you.
        </p>
      </section>

      <NurseProfileForm
        userId={appUser.id}
        fullName={appUser.name}
        onSaved={() => router.replace("/nurse")}
      />
    </div>
  );
}
