"use client";

import { useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientProfileEditor from "@/components/patient/PatientProfileEditor";
import { useAuth } from "@/hooks/useAuth";

export default function PatientProfilePage() {
  const { appUser, loading } = useAuth();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  if (loading || !appUser) {
    return <LoadingScreen text="Loading profile..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {isOnboarding && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="font-bold text-sky-800">Welcome to Care Plus!</p>
          <p className="text-sm text-sky-700 mt-1">Please complete your profile before booking a nurse. Add your phone number and address to get started.</p>
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
