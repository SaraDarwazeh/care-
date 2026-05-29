"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/common/NotificationBell";
import ProfileMenu from "@/components/common/ProfileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/components/patient/CartContext";

// Patient main nav follows the same exploration-oriented structure as the
// public site (Home / Services / Packages / Store / Community) so signed-in
// patients have a consistent mental model. Operational items (My
// Appointments / My Orders / Health Records / Profile) live in the
// ProfileMenu attached to the avatar — they are about the patient's own
// account, not platform-wide exploration.
// "Home" intentionally not in the main nav — in SaaS conventions the
// dashboard *is* the user's home. The public marketing surface at `/`
// stays reachable via the "About Care+" entry in the ProfileMenu dropdown.
const navItems = [
  { label: "Dashboard", href: "/patient" },
  { label: "Services", href: "/services" },
  { label: "Care Packages", href: "/services/packages" },
  { label: "Medical Store", href: "/patient/store" },
  { label: "Community", href: "/community" },
];

export default function PatientNavbar() {
  const { appUser } = useAuth();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!appUser) return null;

  function isActive(href: string): boolean {
    if (href === "/patient") return pathname === "/patient";
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/85 backdrop-blur shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/patient" className="flex items-center gap-2 text-sky-700 transition hover:opacity-80">
            <ShieldCheck className="h-7 w-7" />
            <span className="text-xl font-extrabold tracking-tight">Care+</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);
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
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell href="/patient/notifications" />
            <Link
              href="/patient/cart"
              className="relative p-2 text-slate-500 hover:text-sky-700 transition group"
              aria-label="View cart"
            >
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {totalItems > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            <ProfileMenu variant="dropdown" />

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:bg-slate-100 lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="mt-4 border-t border-sky-100 pt-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      active ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
