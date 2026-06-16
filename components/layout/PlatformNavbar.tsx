"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LogOut, ShieldCheck, UserCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import { useState } from "react";
import ProfileMenu from "@/components/common/ProfileMenu";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

interface NavItem {
  /** Key into messages/{locale}/nav.json. */
  key: string;
  href: string;
}

// Public navigation. Per the 2026-06-17 audit, the centered nav was
// trimmed to keep first-impression focus on the patient conversion
// path. "Find Care" routes to the new /find-care diagnostic instead of
// the billing-mode /services grid (which stays alive for SEO + direct
// links). Nurse recruitment stays as the single dual-sided CTA.
const GUEST_NAV: NavItem[] = [
  { key: "home", href: "/" },
  { key: "findCare", href: "/find-care" },
  { key: "joinAsNurse", href: "/register?role=nurse" },
];

// Mirrors the signed-in patient navbar so a patient briefly bouncing
// through the public shell sees the same surface map.
const PATIENT_NAV: NavItem[] = [
  { key: "dashboard", href: "/patient" },
  { key: "myVisits", href: "/patient/appointments" },
  { key: "findCare", href: "/find-care" },
  { key: "medicalStore", href: "/patient/store" },
];

const STAFF_NAV: NavItem[] = [
  { key: "workspace", href: "/" }, // overridden per role below
  { key: "services", href: "/services" },
];

function dashboardHref(role?: string): string {
  if (role === "nurse") return "/nurse";
  if (role === "admin") return "/admin";
  return "/patient";
}

function profileHref(role?: string): string {
  if (role === "nurse") return "/nurse/setup";
  if (role === "admin") return "/admin/settings";
  return "/patient/profile";
}

function navFor(role?: string): NavItem[] {
  if (role === "patient") return PATIENT_NAV;
  if (role === "nurse" || role === "admin") {
    const items = [...STAFF_NAV];
    items[0] = { key: "workspace", href: dashboardHref(role) };
    return items;
  }
  return GUEST_NAV;
}

export default function PlatformNavbar() {
  const router = useRouter();
  const { appUser } = useAuth();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = navFor(appUser?.role);

  async function onLogout() {
    await logoutUser();
    setMobileOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-8">

        {/* Logo */}
        <Link
          href={appUser ? dashboardHref(appUser.role) : "/"}
          className="flex shrink-0 items-center gap-2 text-sky-700 transition-opacity hover:opacity-75"
        >
          <ShieldCheck className="h-6 w-6" />
          <span className="text-lg font-extrabold tracking-tight">Care+</span>
        </Link>

        {/* Centered nav — desktop only */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-3 lg:flex">
          <LocaleSwitcher />
          {appUser ? (
            <ProfileMenu variant="dropdown" />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 hover:shadow"
              >
                {t("getStarted")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:bg-slate-100 lg:hidden"
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="px-2 pb-2">
              <LocaleSwitcher variant="menu" />
            </div>
            {appUser ? (
              <div className="space-y-1">
                <Link
                  href={dashboardHref(appUser.role)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> {t("dashboard")}
                </Link>
                <Link
                  href={profileHref(appUser.role)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> {t("profile")}
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> {t("signOut")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-sky-700"
                >
                  {t("getStarted")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
