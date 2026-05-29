"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  CalendarClock,
  ShieldAlert,
  Activity,
  TrendingUp,
  DollarSign,
  UserCheck,
  Clock,
  ArrowRight,
  FileWarning,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getDashboardStats, type AttentionItem } from "@/services/adminService";

interface DashboardStats {
  totalUsers: number;
  totalNurses: number;
  totalPatients: number;
  totalBookings: number;
  pendingApprovals: number;
  totalRevenue: number;
  pendingRevenue: number;
  thisMonthRevenue: number;
  bookingTrendDays: string[];
  bookingTrendCounts: number[];
  stalePendingBookingsCount: number;
  stalePendingBookings: AttentionItem[];
  pendingNursePreview: AttentionItem[];
  disputedRecordsCount: number;
  disputedRecordsPreview: AttentionItem[];
}

export default function AdminDashboardPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["admin"],
  });

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalNurses: 0,
    totalPatients: 0,
    totalBookings: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    thisMonthRevenue: 0,
    bookingTrendDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    bookingTrendCounts: [0, 0, 0, 0, 0, 0, 0],
    stalePendingBookingsCount: 0,
    stalePendingBookings: [],
    pendingNursePreview: [],
    disputedRecordsCount: 0,
    disputedRecordsPreview: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text="Loading dashboard metrics..." />;
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Nurses",
      value: stats.totalNurses,
      icon: Stethoscope,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Total Patients",
      value: stats.totalPatients,
      icon: UserCheck,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: CalendarClock,
      color: "text-sky-600",
      bg: "bg-sky-100",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: ShieldAlert,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(0)}`,
      icon: DollarSign,
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
  ];

  // Bar chart: calculate max for relative height
  const maxCount = Math.max(...stats.bookingTrendCounts, 1);

  // Revenue breakdown for progress bars
  const revenueTotal = stats.totalRevenue + stats.pendingRevenue;
  const earnedPct = revenueTotal > 0 ? (stats.totalRevenue / revenueTotal) * 100 : 0;
  const pendingPct = revenueTotal > 0 ? (stats.pendingRevenue / revenueTotal) * 100 : 0;
  const monthPct =
    stats.totalRevenue > 0 ? (stats.thisMonthRevenue / stats.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-700 p-6 text-white shadow-lg overflow-hidden relative sm:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2 sm:text-3xl">
            Welcome back, {appUser.name}!
          </h1>
          <p className="text-sky-100 max-w-xl text-sm sm:text-lg">
            Here are the latest updates across the Care+ platform today.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <Activity className="absolute right-10 bottom-0 translate-y-1/4 h-48 w-48 text-white/5" />
      </div>

      {/* Metrics Grid — operators want the big-picture overview first. */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Platform Overview</h2>
        <div className="grid gap-4 grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-4 hover:-translate-y-1 transition-transform"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${stat.bg} ${stat.color}`}
              >
                <stat.icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm truncate">{stat.label}</p>
                <p className="text-xl font-extrabold text-slate-800 sm:text-2xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Attention — after the overview so operators triage with
          context, not before they've seen the platform's baseline state. */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Needs attention</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <AttentionCard
            icon={Clock}
            iconBg="bg-amber-100"
            iconColor="text-amber-700"
            label="Stale pending bookings"
            description="Bookings older than 24h waiting on a nurse response."
            count={stats.stalePendingBookingsCount}
            items={stats.stalePendingBookings}
            href="/admin/bookings"
            cta="Review bookings"
          />
          <AttentionCard
            icon={ShieldAlert}
            iconBg="bg-violet-100"
            iconColor="text-violet-700"
            label="Pending nurse approvals"
            description="New nurses awaiting credential review."
            count={stats.pendingApprovals}
            items={stats.pendingNursePreview}
            href="/admin/nurses"
            cta="Review approvals"
          />
          <AttentionCard
            icon={FileWarning}
            iconBg="bg-rose-100"
            iconColor="text-rose-700"
            label="Disputed medical records"
            description="Patients have flagged something inaccurate."
            count={stats.disputedRecordsCount}
            items={stats.disputedRecordsPreview}
            href="/admin/records?status=disputed"
            cta="Open disputed queue"
          />
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Trends - Bar Chart */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Booking Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days activity</p>
            </div>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-500">
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
                  <span className="text-xs font-bold text-slate-500">{count > 0 ? count : ""}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: "140px" }}>
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-to-t from-sky-600 to-sky-400"
                          : "bg-gradient-to-t from-indigo-200 to-indigo-100"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-bold ${isToday ? "text-sky-600" : "text-slate-400"}`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" />
              Past days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />
              Today
            </span>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Revenue Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Completed booking earnings</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="divide-y divide-slate-100 space-y-0">
            {/* Total Earned */}
            <div className="pb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-sm font-semibold text-slate-600">Total Earned</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  ${stats.totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                  style={{ width: `${earnedPct}%` }}
                />
              </div>
            </div>

            {/* Pending Revenue */}
            <div className="py-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-sm font-semibold text-slate-600">Pending Revenue</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  ${stats.pendingRevenue.toFixed(2)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700"
                  style={{ width: `${pendingPct}%` }}
                />
              </div>
            </div>

            {/* This Month */}
            <div className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block" />
                  <span className="text-sm font-semibold text-slate-600">This Month</span>
                </div>
                <span className="text-sm font-extrabold text-slate-800">
                  ${stats.thisMonthRevenue.toFixed(2)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700"
                  style={{ width: `${monthPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {monthPct.toFixed(0)}% of total earned revenue
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
}) {
  const isEmpty = count === 0;
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
        <span
          className={`shrink-0 rounded-2xl px-3 py-1 text-base font-extrabold ${
            isEmpty ? "bg-slate-100 text-slate-400" : `${iconBg} ${iconColor}`
          }`}
        >
          {count}
        </span>
      </div>

      {isEmpty ? (
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          All clear — nothing waiting on you.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="line-clamp-1 text-sm font-bold text-slate-700">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.subtitle}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
