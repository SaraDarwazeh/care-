"use client";

import PatientNavbar from "@/components/patient/PatientNavbar";
import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";
import { CartProvider } from "@/components/patient/CartContext";
import { useAuth } from "@/hooks/useAuth";

// Some /patient/* surfaces (notably /patient/nurses + /patient/nurses/[id]
// and /patient/store) are guest-browseable. PatientNavbar renders null for
// guests, which previously left those pages with no visible chrome at all
// — a real "where am I?" cue we surfaced in usage testing. Fix: show
// PlatformNavbar for anyone who isn't a signed-in patient, PatientNavbar
// otherwise. Nurses/admins who land here are mid-redirect via the
// per-page useProtectedRoute guard, so PlatformNavbar is a safe fallback.
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const showPatientNavbar = appUser?.role === "patient";

  return (
    <CartProvider>
      <div className="min-h-screen bg-slate-50">
        {showPatientNavbar ? <PatientNavbar /> : <PlatformNavbar />}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <PlatformFooter />
      </div>
    </CartProvider>
  );
}
