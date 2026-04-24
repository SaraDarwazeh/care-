"use client";

import { useEffect, useState } from "react";
import { Users, Stethoscope, CalendarClock, ShieldAlert, Activity, TrendingUp } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getDashboardStats } from "@/services/adminService";

export default function AdminDashboardPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["admin"],
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNurses: 0,
    totalBookings: 0,
    pendingApprovals: 0,
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
    return () => { active = false; };
  }, []);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text="Loading dashboard metrics..." />;
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Nurses", value: stats.totalNurses, icon: Stethoscope, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Total Bookings", value: stats.totalBookings, icon: CalendarClock, color: "text-violet-600", bg: "bg-violet-100" },
    { label: "Pending Approvals", value: stats.pendingApprovals, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-700 p-8 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome back, {appUser.name}!</h1>
          <p className="text-sky-100 max-w-xl text-lg">Here's what's happening across the Care Plus platform today.</p>
        </div>
        <div className="absolute right-0 top-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <Activity className="absolute right-10 bottom-0 translate-y-1/4 h-48 w-48 text-white/5" />
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Platform Overview</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <div key={i} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 flex items-center gap-4 hover:-translate-y-1 transition-transform">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Placeholder Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Booking Trends</h3>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
            <p className="text-slate-400 font-medium">Chart Visualization Coming Soon</p>
          </div>
        </div>
        
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Revenue Overview</h3>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
            <p className="text-slate-400 font-medium">Chart Visualization Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
