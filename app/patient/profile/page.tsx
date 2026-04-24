"use client";

import LoadingScreen from "@/components/common/LoadingScreen";
import PatientProfileEditor from "@/components/patient/PatientProfileEditor";
import { useAuth } from "@/hooks/useAuth";

export default function PatientProfilePage() {
  const { appUser, loading } = useAuth();

  if (loading || !appUser) {
    return <LoadingScreen text="Loading profile..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">My Profile</h1>
        <p className="mt-2 text-slate-600">
          Manage your personal details, medical history, and preferences to streamline your booking experience.
        </p>
      </div>

      <PatientProfileEditor userId={appUser.id} />
    </div>
  );
}
