"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import { useState } from "react";
import ProfileMenu from "@/components/common/ProfileMenu";

interface NavLink {
  label: string;
  href: string;
}

// Public navigation surfaces the four pillars of the platform plus the
// "join as a nurse" CTA. Every link resolves to a real route — no anchor
// links that only work on the homepage. "Home" is explicit (not just the
// logo) so non-technical users always have an obvious way back to /.
const GUEST_NAV: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Care Packages", href: "/services/packages" },
  { label: "Find a Nurse", href: "/patient/nurses" },
  { label: "Community", href: "/community" },
  { label: "Join as Nurse", href: "/register?role=nurse" },
];

// Signed-in PATIENT nav mirrors PatientNavbar's main nav: exploration
// items only (Dashboard / Services / Care Packages / Medical Store /
// Community). "Home" intentionally not here — in SaaS conventions the
// dashboard *is* the user's home. The public marketing surface at `/`
// stays reachable via the "About Care+" entry in the ProfileMenu dropdown.
const PATIENT_NAV: NavLink[] = [
  { label: "Dashboard", href: "/patient" },
  { label: "Services", href: "/services" },
  { label: "Care Packages", href: "/services/packages" },
  { label: "Medical Store", href: "/patient/store" },
  { label: "Community", href: "/community" },
];

// Public-page navigation for signed-in NURSES and ADMINS. They have their
// own sidebar layouts on the role pages; here we just surface "go to your
// workspace" plus a couple of public surfaces.
const STAFF_NAV: NavLink[] = [
  { label: "Workspace", href: "/" }, // overridden per role below
  { label: "Services", href: "/services" },
  { label: "Care Packages", href: "/services/packages" },
  { label: "Community", href: "/community" },
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

function navFor(role?: string): NavLink[] {
  if (role === "patient") return PATIENT_NAV;
  if (role === "nurse" || role === "admin") {
    const items = [...STAFF_NAV];
    items[0] = { label: "Workspace", href: dashboardHref(role) };
    return items;
  }
  return GUEST_NAV;
}

export default function PlatformNavbar() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = navFor(appUser?.role);

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
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-3 lg:flex">
          {appUser ? (
            <ProfileMenu variant="dropdown" />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 hover:shadow"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-4">
            {appUser ? (
              <div className="space-y-1">
                <Link
                  href={dashboardHref(appUser.role)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> Dashboard
                </Link>
                <Link
                  href={profileHref(appUser.role)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> Profile
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-sky-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
