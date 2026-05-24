"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserCircle, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import { useState } from "react";

interface NavLink {
  label: string;
  href: string;
}

// Public navigation surfaces the four pillars of the platform plus the
// "join as a nurse" CTA. Every link resolves to a real route — no anchor
// links that only work on the homepage.
const GUEST_NAV: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "Care Packages", href: "/services/packages" },
  { label: "Find a Nurse", href: "/patient/nurses" },
  { label: "Community", href: "/community" },
  { label: "Join as Nurse", href: "/register?role=nurse" },
];

// Public-page navigation for signed-in PATIENTS. Browsing pages get the
// same surfaces as guests plus a dashboard shortcut.
const PATIENT_NAV: NavLink[] = [
  { label: "Dashboard", href: "/patient" },
  { label: "Appointments", href: "/patient/appointments" },
  { label: "Find a Nurse", href: "/patient/nurses" },
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
  if (role === "admin") return "/admin";
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
  const initials = appUser?.name
    ? appUser.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "CP";

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
          <span className="text-lg font-extrabold tracking-tight">Care Plus</span>
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
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-sky-200 hover:shadow"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-sky-200 text-xs font-bold text-sky-800">
                  {initials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 leading-none">{appUser.name.split(" ")[0]}</p>
                  <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">{appUser.role}</p>
                </div>
              </button>
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  href={dashboardHref(appUser.role)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> Dashboard
                </Link>
                <Link
                  href={profileHref(appUser.role)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" /> Profile
                </Link>
                <div className="border-t border-slate-100" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
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
