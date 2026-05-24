"use client";

import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";
import { CartProvider } from "@/components/patient/CartContext";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-slate-50">
        <PlatformNavbar mode="service" />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <PlatformFooter />
      </div>
    </CartProvider>
  );
}
