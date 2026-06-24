"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Users,
  Stethoscope,
  CalendarClock,
  ShieldAlert,
  Activity,
  TrendingUp,
  Coins,
  UserCheck,
  Clock,
  ArrowRight,
  FileWarning,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getDashboardStats, type AttentionItem } from "@/services/adminService";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

interface DashboardStats {
  totalUsers: number;
  totalNurses: number;
  totalPatients: number;
  totalBookings: number;
  pendingApprovals: number;
  totalRevenue: number;
  pendingRevenue: number;
  thisMonthRevenue: number;
  // Stats come from the server in canonical English day keys
  // (mon..sun). We translate them at render time so AR week labels
  // appear without a server round-trip.
  bookingTrendDays: string[];
  bookingTrendCounts: number[];
  stalePendingBookingsCount: number;
  stalePendingBookings: AttentionItem[];
  pendingNursePreview: AttentionItem[];
  disputedRecordsCount: number;
  disputedRecordsPreview: AttentionItem[];
}

const DEFAULT_TREND_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminDashboardPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["admin"],
  });
  const t = useTranslations("admin.dashboard");
  const tStats = useTranslations("admin.dashboard.stats");
  const tAtt = useTranslations("admin.dashboard.attention");
  const tTrends = useTranslations("admin.dashboard.trends");
  const tDays = useTranslations("admin.dashboard.trends.days");
  const tRev = useTranslations("admin.dashboard.revenue");
  const locale = useLocale() as Locale;

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalNurses: 0,
    totalPatients: 0,
    totalBookings: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    thisMonthRevenue: 0,
    bookingTrendDays: DEFAULT_TREND_DAYS,
    bookingTrendCounts: [0, 0, 0, 0, 0, 0, 0],
    stalePendingBookingsCount: 0,
    stalePendingBookings: [],
    pendingNursePreview: [],
    disputedRecordsCount: 0,
    disputedRecordsPreview: [],
  });
  const [loading, setLoading] = useState(true);

  // Gate the data fetch on appUser so we don't query Firestore before
  // Firebase Auth has restored the client-side session — otherwise the
  // rule-guarded reads fire while `auth.currentUser` is still null and
  // either bounce with permission-denied or trip
  // `services/adminService.ts` → "You must be signed in to perform this
  // action." See the protected-route hook for why appUser implies auth.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function loadStats() {
      try {
        const data = await getDashboardStats();
        if (active) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStats();
    return () => {
      active = false;
    };
  }, [appUser]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  // All stat tiles share the same brand-tone shell; differentiation
  // comes from the icon glyph. Pre-brand the dashboard assigned each
  // tile its own bright accent (blue/emerald/violet/amber/rose) which
  // read as a rainbow rather than a cohesive admin shell. v2 collapses
  // every operational stat to one teal pair; status-specific colour
  // still appears on chips/badges (approved/pending/rejected) below.
  const statCards = [
    { key: "totalUsers", value: fmtNumber(stats.totalUsers, locale), icon: Users, color: "text-brand-deep", bg: "bg-brand-soft/40" },
    { key: "totalNurses", value: fmtNumber(stats.totalNurses, locale), icon: Stethoscope, color: "text-brand-deep", bg: "bg-brand-soft/40" },
    { key: "totalPatients", value: fmtNumber(stats.totalPatients, locale), icon: UserCheck, color: "text-brand-deep", bg: "bg-brand-soft/40" },
    { key: "totalBookings", value: fmtNumber(stats.totalBookings, locale), icon: CalendarClock, color: "text-brand-deep", bg: "bg-brand-soft/40" },
    { key: "pendingApprovals", value: fmtNumber(stats.pendingApprovals, locale), icon: ShieldAlert, color: "text-brand-sand-strong", bg: "bg-brand-sand/30" },
    { key: "totalRevenue", value: fmtCurrency(stats.totalRevenue, locale, { maximumFractionDigits: 0 }), icon: Coins, color: "text-brand-deep", bg: "bg-brand-soft/40" },
  ] as const;

  const maxCount = Math.max(...stats.bookingTrendCounts, 1);

  const revenueTotal = stats.totalRevenue + stats.pendingRevenue;
  const earnedPct = revenueTotal > 0 ? (stats.totalRevenue / revenueTotal) * 100 : 0;
  const pendingPct = revenueTotal > 0 ? (stats.pendingRevenue / revenueTotal) * 100 : 0;
  const monthPct =
    stats.totalRevenue > 0 ? (stats.thisMonthRevenue / stats.totalRevenue) * 100 : 0;

  function dayLabel(canonical: string): string {
    const key = canonical.slice(0, 3).toLowerCase();
    try {
      return tDays(key);
    } catch {
      return canonical;
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="rounded-3xl bg-gradient-to-br from-brand to-indigo-700 p-6 text-white shadow-lg overflow-hidden relative sm:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2 sm:text-3xl">
            {t("welcome", { name: appUser.name })}
          </h1>
          <p className="text-white/85 max-w-xl text-sm sm:text-lg">{t("subtitle")}</p>
        </div>
        <div className="absolute end-0 top-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <Activity className="absolute end-10 bottom-0 translate-y-1/4 h-48 w-48 text-white/5" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">{t("overviewHeading")}</h2>
        <div className="grid gap-4 grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {statCards.map((stat) => (
            <div key={stat.key} className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-4 hover:-translate-y-1 transition-transform">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm truncate">{tStats(stat.key)}</p>
                <p className="text-xl font-extrabold text-slate-800 sm:text-2xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">{tAtt("heading")}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <AttentionCard
            icon={Clock}
            iconBg="bg-amber-100"
            iconColor="text-amber-700"
            label={tAtt("staleBookings.label")}
            description={tAtt("staleBookings.description")}
            count={stats.stalePendingBookingsCount}
            items={stats.stalePendingBookings}
            href="/admin/bookings"
            cta={tAtt("staleBookings.cta")}
            emptyLabel={tAtt("allClear")}
          />
          <AttentionCard
            icon={ShieldAlert}
            iconBg="bg-violet-100"
            iconColor="text-violet-700"
            label={tAtt("pendingNurses.label")}
            description={tAtt("pendingNurses.description")}
            count={stats.pendingApprovals}
            items={stats.pendingNursePreview}
            href="/admin/nurses"
            cta={tAtt("pendingNurses.cta")}
            emptyLabel={tAtt("allClear")}
          />
          <AttentionCard
            icon={FileWarning}
            iconBg="bg-rose-100"
            iconColor="text-rose-700"
            label={tAtt("disputedRecords.label")}
            description={tAtt("disputedRecords.description")}
            count={stats.disputedRecordsCount}
            items={stats.disputedRecordsPreview}
            href="/admin/records?status=disputed"
            cta={tAtt("disputedRecords.cta")}
            emptyLabel={tAtt("allClear")}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">{tTrends("title")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{tTrends("subtitle")}</p>
            </div>
            <div className="p-2 bg-brand-soft/30 rounded-xl text-brand">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-48 px-2">
            {stats.bookingTrendDays.map((day, idx) => {
              const count = stats.bookingTrendCounts[idx] ?? 0;
              const heightPct = Math.max((count / maxCount) * 100, 4);
              const isToday = idx === stats.bookingTrendDays.length - 1;
              return (
                <div key={day} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-500">{count > 0 ? fmtNumber(count, locale) : ""}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: "140px" }}>
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-to-t from-brand-deep to-brand"
                          : "bg-gradient-to-t from-brand-mist to-brand-soft/50"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${isToday ? "text-brand" : "text-slate-400"}`}>
                    {dayLabel(day)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" />
              {tTrends("pastDays")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
              {tTrends("today")}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">{tRev("title")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{tRev("subtitle")}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="divide-y divide-slate-100 space-y-0">
            <div className="pb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-sm font-semibold text-slate-600">{tRev("totalEarned")}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  {fmtCurrency(stats.totalRevenue, locale)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700" style={{ width: `${earnedPct}%` }} />
              </div>
            </div>

            <div className="py-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-sm font-semibold text-slate-600">{tRev("pending")}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  {fmtCurrency(stats.pendingRevenue, locale)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700" style={{ width: `${pendingPct}%` }} />
              </div>
            </div>

            <div className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand inline-block" />
                  <span className="text-sm font-semibold text-slate-600">{tRev("thisMonth")}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  {fmtCurrency(stats.thisMonthRevenue, locale)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-soft to-brand transition-all duration-700" style={{ width: `${monthPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {tRev("monthShare", { pct: fmtNumber(Math.round(monthPct), locale) })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  count,
  items,
  href,
  cta,
  emptyLabel,
}: {
  icon: typeof Clock;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  count: number;
  items: AttentionItem[];
  href: string;
  cta: string;
  emptyLabel: string;
}) {
  const isEmpty = count === 0;
  const locale = useLocale() as Locale;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-2xl px-3 py-1 text-base font-extrabold ${isEmpty ? "bg-slate-100 text-slate-400" : `${iconBg} ${iconColor}`}`}>
          {fmtNumber(count, locale)}
        </span>
      </div>

      {isEmpty ? (
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="line-clamp-1 text-sm font-bold text-slate-700">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.subtitle}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-deep">
        {cta} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
