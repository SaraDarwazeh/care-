"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";

type ProfileMenuVariant = "dropdown" | "sidebar";

interface ProfileMenuProps {
  variant?: ProfileMenuVariant;
}

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

function initialsOf(name?: string): string {
  if (!name) return "CP";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileMenu({ variant = "dropdown" }: ProfileMenuProps) {
  const router = useRouter();
  const { appUser } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "dropdown") return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [variant]);

  async function onLogout() {
    await logoutUser();
    setOpen(false);
    router.push("/login");
  }

  if (!appUser) return null;

  const initials = initialsOf(appUser.name);
  const dashHref = dashboardHref(appUser.role);
  const profHref = profileHref(appUser.role);

  if (variant === "sidebar") {
    return (
      <div className="space-y-2">
        <Link
          href={profHref}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition hover:border-white/20 hover:bg-white/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{appUser.name}</p>
            <p className="truncate text-xs font-medium capitalize text-white/60">{appUser.role}</p>
          </div>
          <UserCircle className="h-4 w-4 shrink-0 text-white/40" />
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-sky-200 hover:shadow"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-sky-200 text-xs font-bold text-sky-800">
          {initials}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-none text-slate-800">
            {appUser.name.split(" ")[0]}
          </p>
          <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">{appUser.role}</p>
        </div>
        <ChevronDown
          className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
            <p className="text-sm font-semibold text-slate-800">{appUser.name}</p>
            <p className="mt-0.5 text-xs font-medium capitalize text-slate-400">{appUser.role}</p>
          </div>
          <Link
            href={dashHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400" /> Dashboard
          </Link>
          {appUser.role === "patient" && (
            <>
              <Link
                href="/patient/appointments"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <CalendarClock className="h-4 w-4 text-slate-400" /> My Appointments
              </Link>
              <Link
                href="/patient/orders"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ShoppingBag className="h-4 w-4 text-slate-400" /> My Orders
              </Link>
              <Link
                href="/patient/records"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4 text-slate-400" /> Health Records
              </Link>
            </>
          )}
          <Link
            href={profHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UserCircle className="h-4 w-4 text-slate-400" /> Profile &amp; Settings
          </Link>
          <div className="border-t border-slate-100" />
          {/* About Care+ — discoverable but out of the main nav. Lets
              signed-in users visit the public marketing surface on demand
              without ever showing it in the primary navigation. */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Info className="h-4 w-4 text-slate-400" /> About Care+
          </Link>
          <div className="border-t border-slate-100" />
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
