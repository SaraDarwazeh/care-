"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  CalendarClock,
  ChevronDown,
  HandHeart,
  HeartHandshake,
  Menu,
  Pill,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "@/components/common/NotificationBell";
import ProfileMenu from "@/components/common/ProfileMenu";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import PointsBalancePill from "@/components/patient/PointsBalancePill";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/components/patient/CartContext";
import { useEducationLibraryEnabled } from "@/hooks/useSiteSettings";

// Patient main nav. Per the 2026-06-17 gap audit, the Browse dropdown
// was added back so users have a single secondary entry point for
// exploration (Nurses / Packages / Shifts / One-time / Library /
// Community) without re-cluttering the primary nav. Find Care remains
// the headline path for users who don't yet know what they need.
const NAV_ITEMS: { key: string; href: string }[] = [
  { key: "dashboard", href: "/patient" },
  { key: "myVisits", href: "/patient/appointments" },
  { key: "findCare", href: "/find-care" },
  { key: "medicalStore", href: "/patient/store" },
];

interface BrowseItem {
  key: string;
  href: string;
  icon: typeof Stethoscope;
}

const BROWSE_ITEMS_BASE: BrowseItem[] = [
  { key: "browseNurses", href: "/patient/nurses", icon: Stethoscope },
  { key: "carePackages", href: "/services/packages", icon: HeartHandshake },
  { key: "shiftCare", href: "/services/shifts", icon: CalendarClock },
  { key: "oneTimeVisits", href: "/services/one-time", icon: Pill },
  { key: "community", href: "/community", icon: HandHeart },
];
const BROWSE_LIBRARY_ITEM: BrowseItem = {
  key: "library",
  href: "/patient/education",
  icon: BookOpen,
};

export default function PatientNavbar() {
  const { appUser } = useAuth();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const tNav = useTranslations("nav");
  const tPatient = useTranslations("patient.navbar");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const browseRef = useRef<HTMLDivElement | null>(null);
  const educationEnabled = useEducationLibraryEnabled();

  // Close the Browse popover on outside click + Escape so it behaves
  // like a real menu, not a sticky overlay.
  useEffect(() => {
    if (!browseOpen) return;
    function onDoc(e: MouseEvent) {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBrowseOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [browseOpen]);

  if (!appUser) return null;

  const browseItems = educationEnabled
    ? [...BROWSE_ITEMS_BASE.slice(0, 4), BROWSE_LIBRARY_ITEM, BROWSE_ITEMS_BASE[4]]
    : BROWSE_ITEMS_BASE;

  function isActive(href: string): boolean {
    if (href === "/patient") return pathname === "/patient";
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const browseIsActive = browseItems.some((b) => isActive(b.href));

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
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-bold transition-colors ${
                    active ? "text-sky-700" : "text-slate-500 hover:text-sky-700"
                  }`}
                >
                  {tNav(item.key)}
                </Link>
              );
            })}

            {/* Browse dropdown */}
            <div ref={browseRef} className="relative">
              <button
                type="button"
                onClick={() => setBrowseOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={browseOpen}
                className={`flex items-center gap-1 text-sm font-bold transition-colors ${
                  browseIsActive || browseOpen
                    ? "text-sky-700"
                    : "text-slate-500 hover:text-sky-700"
                }`}
              >
                {tNav("browse")}
                <ChevronDown className={`h-4 w-4 transition-transform ${browseOpen ? "rotate-180" : ""}`} />
              </button>
              {browseOpen && (
                <div
                  role="menu"
                  className="absolute end-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  {browseItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setBrowseOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Icon className="h-4 w-4" />
                        </span>
                        {tNav(item.key)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block">
              <PointsBalancePill />
            </div>
            <NotificationBell href="/patient/notifications" />
            <Link
              href="/patient/cart"
              className="relative p-2 text-slate-500 hover:text-sky-700 transition group"
              aria-label={tPatient("viewCart")}
            >
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {totalItems > 0 && (
                <span className="absolute end-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="hidden lg:block">
              <LocaleSwitcher />
            </div>

            <ProfileMenu variant="dropdown" />

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:bg-slate-100 lg:hidden"
              aria-label={mobileOpen ? tNav("closeMenu") : tNav("openMenu")}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="mt-4 border-t border-sky-100 pt-4 lg:hidden">
            <div className="mb-2 px-2">
              <LocaleSwitcher variant="menu" />
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
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
                    {tNav(item.key)}
                  </Link>
                );
              })}

              {/* Browse group on mobile — rendered inline so users
                  don't need a second tap to expand it on small screens. */}
              <p className="mt-3 px-4 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {tNav("browse")}
              </p>
              {browseItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4 text-slate-400" /> {tNav(item.key)}
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
