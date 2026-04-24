"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, LogOut, ShieldCheck } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { AppUser } from "@/lib/types";
import { logoutUser } from "@/services/authService";
import { useCart } from "@/components/patient/CartContext";

const navItems = [
  { label: "Home", href: "/patient" },
  { label: "Explore", href: "/patient/nurses" },
  { label: "Store", href: "/patient/store" },
  { label: "Profile", href: "/patient/profile" },
];

export default function PatientNavbar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();

  async function onLogout() {
    await logoutUser();
    router.push("/login");
  }

  const initials = user.name
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/85 backdrop-blur shadow-sm">
      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sky-700 transition hover:opacity-80">
            <ShieldCheck className="h-7 w-7" />
            <span className="text-xl font-extrabold tracking-tight">Care Plus</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-bold transition-colors ${
                    active ? "text-sky-700" : "text-slate-500 hover:text-sky-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/patient/cart" className="relative p-2 text-slate-500 hover:text-sky-700 transition group">
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {totalItems > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            <Link href="/patient/profile" className="hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-sky-200 text-sm font-bold text-sky-800 shadow-sm sm:flex hover:shadow-md transition hover:-translate-y-0.5">
              {initials}
            </Link>
            
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-500 transition sm:hidden">
              <LogOut className="h-5 w-5" />
            </button>
            <PatientButton variant="ghost" onClick={onLogout} className="hidden px-3 py-2 text-slate-500 hover:text-rose-600 sm:flex">
              Logout
            </PatientButton>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden scrollbar-hide">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-bold transition-colors shadow-sm ${
                  active ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
