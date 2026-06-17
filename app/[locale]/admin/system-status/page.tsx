"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Users,
  CalendarClock,
  ShoppingBag,
  HeartHandshake,
  Bell,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getCurrentIdToken } from "@/services/authService";
import { fmtDate, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

interface HealthReport {
  adminSdk: { configured: boolean; canRead: boolean; error?: string };
  counts: {
    users: { total: number; admins: number; nurses: number; patients: number };
    nurses: { total: number; pending: number };
    bookings: { total: number; pending: number };
    orders: { total: number; pending: number };
    packages: { total: number; active: number };
    notifications: { total: number; unread: number };
    reviews: { total: number };
  } | null;
  flags: string[];
  generatedAt: string;
}

async function fetchHealth(): Promise<HealthReport> {
  const token = await getCurrentIdToken();
  if (!token) throw new Error("Not signed in.");
  const res = await fetch("/api/admin/health", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Health probe failed (${res.status}) ${text}`);
  }
  return (await res.json()) as HealthReport;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function CountCard({
  icon: Icon,
  title,
  total,
  highlight,
  highlightLabel,
  color,
  locale,
}: {
  icon: typeof Activity;
  title: string;
  total: number;
  highlight?: number;
  highlightLabel?: string;
  color: string;
  locale: Locale;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof highlight === "number" && highlight > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            {fmtNumber(highlight, locale)} {highlightLabel}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-800">{fmtNumber(total, locale)}</p>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
    </div>
  );
}

export default function SystemStatusPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.systemStatus");
  const tCounts = useTranslations("admin.systemStatus.counts");
  const tHi = useTranslations("admin.systemStatus.highlights");
  const tLinks = useTranslations("admin.systemStatus.links");
  const locale = useLocale() as Locale;
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    fetchHealth()
      .then((data) => {
        if (active) {
          setReport(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser, t]);

  async function refresh() {
    setRefreshing(true);
    try {
      const data = await fetchHealth();
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("probing")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <button onClick={() => void refresh()} disabled={refreshing}
          className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      )}

      {report && (
        <>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t("infrastructure")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill ok={report.adminSdk.configured} label={report.adminSdk.configured ? t("adminSdkOk") : t("adminSdkMissing")} />
              <StatusPill ok={report.adminSdk.canRead} label={report.adminSdk.canRead ? t("firestoreOk") : t("firestoreFailing")} />
              <span className="text-xs text-slate-400">
                {t("probedAt", { time: fmtDate(report.generatedAt, locale, { timeStyle: "short" }) })}
              </span>
            </div>
            {report.adminSdk.error && (
              <p className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-mono text-rose-700">{report.adminSdk.error}</p>
            )}
            {!report.adminSdk.configured && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">{t("sdkSetupHint")}</div>
            )}
          </div>

          {report.flags.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-bold text-amber-900">{t("recommendedActions")}</p>
              </div>
              <ul className="space-y-1.5">
                {report.flags.map((flag) => (
                  <li key={flag} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.counts && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t("platformData")}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CountCard locale={locale} icon={Users} title={tCounts("users")} total={report.counts.users.total} color="bg-brand-soft/30 text-brand" />
                <CountCard locale={locale} icon={Stethoscope} title={tCounts("nurses")} total={report.counts.nurses.total} highlight={report.counts.nurses.pending} highlightLabel={tHi("pending")} color="bg-emerald-50 text-emerald-600" />
                <CountCard locale={locale} icon={CalendarClock} title={tCounts("bookings")} total={report.counts.bookings.total} highlight={report.counts.bookings.pending} highlightLabel={tHi("pending")} color="bg-violet-50 text-violet-600" />
                <CountCard locale={locale} icon={ShoppingBag} title={tCounts("orders")} total={report.counts.orders.total} highlight={report.counts.orders.pending} highlightLabel={tHi("pending")} color="bg-amber-50 text-amber-600" />
                <CountCard locale={locale} icon={HeartHandshake} title={tCounts("packages")} total={report.counts.packages.total}
                  highlight={report.counts.packages.total - report.counts.packages.active > 0 ? report.counts.packages.total - report.counts.packages.active : undefined}
                  highlightLabel={tHi("hidden")} color="bg-rose-50 text-rose-600" />
                <CountCard locale={locale} icon={Bell} title={tCounts("notifications")} total={report.counts.notifications.total} highlight={report.counts.notifications.unread} highlightLabel={tHi("unread")} color="bg-slate-50 text-slate-600" />
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t("quickLinks")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/admin/nurses" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-soft hover:bg-white transition">{tLinks("reviewNurses")}</Link>
              <Link href="/admin/bookings" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-soft hover:bg-white transition">{tLinks("reviewBookings")}</Link>
              <Link href="/admin/orders" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-soft hover:bg-white transition">{tLinks("fulfillOrders")}</Link>
              <Link href="/admin/packages" className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-soft hover:bg-white transition">{tLinks("editPackages")}</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
