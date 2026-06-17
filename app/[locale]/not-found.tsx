"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Home, Compass } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Role-aware 404: signed-out users get sent home; signed-in users get
// a one-tap link back to their dashboard so they don't have to
// reconstruct the URL themselves.
export default function LocaleNotFound() {
  const t = useTranslations("notFound");
  const { appUser } = useAuth();

  const dashboardHref =
    appUser?.role === "admin"
      ? "/admin"
      : appUser?.role === "nurse"
        ? "/nurse"
        : appUser?.role === "patient"
          ? "/patient"
          : null;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-full bg-brand-soft/30 p-4 text-brand">
        <Compass className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">{t("body")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-deep"
        >
          <Home className="h-4 w-4" />
          {t("goHome")}
        </Link>
        {dashboardHref && (
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {t("goToDashboard")}
          </Link>
        )}
      </div>
    </main>
  );
}
