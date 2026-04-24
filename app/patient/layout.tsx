"use client";

import LoadingScreen from "@/components/common/LoadingScreen";
import PatientNavbar from "@/components/patient/PatientNavbar";
import { CartProvider } from "@/components/patient/CartContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["patient"] });

  if (loading || !appUser) {
    return <LoadingScreen text="Preparing your care dashboard..." />;
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#f0fdf4_60%,#ffffff_100%)]">
        <PatientNavbar user={appUser} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </CartProvider>
  );
}
