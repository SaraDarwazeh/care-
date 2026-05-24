"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
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
}: {
  icon: typeof Activity;
  title: string;
  total: number;
  highlight?: number;
  highlightLabel?: string;
  color: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof highlight === "number" && highlight > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            {highlight} {highlightLabel}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-800">{total}</p>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
    </div>
  );
}

export default function SystemStatusPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Initial fetch — runs once when the user is known. Uses local `active`
  // guard rather than calling `setRefreshing(true)` synchronously in the
  // effect body (banned by react-hooks/set-state-in-effect in React 19).
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
        if (active) setError(err instanceof Error ? err.message : "Failed to load health report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser]);

  // Manual refresh triggered by the Refresh button — setState here is
  // event-driven (not effect-driven), so it's allowed.
  async function refresh() {
    setRefreshing(true);
    try {
      const data = await fetchHealth();
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health report");
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text="Probing system..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Status</h1>
          <p className="text-slate-500 mt-1">
            Live probe of admin SDK configuration and key data counts.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Infrastructure */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Infrastructure
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill
                ok={report.adminSdk.configured}
                label={report.adminSdk.configured ? "Admin SDK configured" : "Admin SDK missing"}
              />
              <StatusPill
                ok={report.adminSdk.canRead}
                label={report.adminSdk.canRead ? "Firestore reads OK" : "Firestore reads failing"}
              />
              <span className="text-xs text-slate-400">
                Probed {new Date(report.generatedAt).toLocaleTimeString()}
              </span>
            </div>
            {report.adminSdk.error && (
              <p className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-mono text-rose-700">
                {report.adminSdk.error}
              </p>
            )}
            {!report.adminSdk.configured && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                Set <code className="font-mono">FIREBASE_ADMIN_PROJECT_ID</code>,{" "}
                <code className="font-mono">FIREBASE_ADMIN_CLIENT_EMAIL</code>, and{" "}
                <code className="font-mono">FIREBASE_ADMIN_PRIVATE_KEY</code> in your environment
                to enable admin-restricted features.
              </div>
            )}
          </div>

          {/* Flags */}
          {report.flags.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-bold text-amber-900">Recommended actions</p>
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

          {/* Counts */}
          {report.counts && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Platform data
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CountCard
                  icon={Users}
                  title="Users"
                  total={report.counts.users.total}
                  color="bg-sky-50 text-sky-600"
                />
                <CountCard
                  icon={Stethoscope}
                  title="Nurses"
                  total={report.counts.nurses.total}
                  highlight={report.counts.nurses.pending}
                  highlightLabel="pending"
                  color="bg-emerald-50 text-emerald-600"
                />
                <CountCard
                  icon={CalendarClock}
                  title="Bookings"
                  total={report.counts.bookings.total}
                  highlight={report.counts.bookings.pending}
                  highlightLabel="pending"
                  color="bg-violet-50 text-violet-600"
                />
                <CountCard
                  icon={ShoppingBag}
                  title="Orders"
                  total={report.counts.orders.total}
                  highlight={report.counts.orders.pending}
                  highlightLabel="pending"
                  color="bg-amber-50 text-amber-600"
                />
                <CountCard
                  icon={HeartHandshake}
                  title="Packages"
                  total={report.counts.packages.total}
                  highlight={
                    report.counts.packages.total - report.counts.packages.active > 0
                      ? report.counts.packages.total - report.counts.packages.active
                      : undefined
                  }
                  highlightLabel="hidden"
                  color="bg-rose-50 text-rose-600"
                />
                <CountCard
                  icon={Bell}
                  title="Notifications"
                  total={report.counts.notifications.total}
                  highlight={report.counts.notifications.unread}
                  highlightLabel="unread"
                  color="bg-slate-50 text-slate-600"
                />
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Quick links
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/admin/nurses"
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-white transition"
              >
                Review nurse signups
              </Link>
              <Link
                href="/admin/bookings"
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-white transition"
              >
                Review bookings
              </Link>
              <Link
                href="/admin/orders"
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-white transition"
              >
                Fulfill orders
              </Link>
              <Link
                href="/admin/packages"
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-white transition"
              >
                Edit packages
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
