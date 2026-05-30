"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, CheckCircle, Clock, DollarSign, Star, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseIncomingBookingCard from "@/components/nurse/NurseIncomingBookingCard";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { BookingWithParticipants, NurseMarketplaceProfile } from "@/lib/types";
import { getBookingsForNurseWithParticipants, updateBookingStatus } from "@/services/bookingService";
import { getNurseMarketplaceProfileByUserId } from "@/services/nurseService";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

// Pick the gender-aware welcome key. Pragmatic per Phase 4 decision —
// only the dashboard welcome (and a couple of other high-visibility
// strings) carry gender variants; everywhere else uses neutral copy.
function welcomeKey(gender?: string): "welcomeFemale" | "welcomeMale" | "welcomeNeutral" {
  if (gender === "female") return "welcomeFemale";
  if (gender === "male") return "welcomeMale";
  return "welcomeNeutral";
}

export default function NurseDashboardPage() {
  const router = useRouter();
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const t = useTranslations("nurse.dashboard");
  const tLoading = useTranslations("nurse.loading");
  const tErr = useTranslations("nurse.errors");
  const locale = useLocale() as Locale;
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [profile, setProfile] = useState<NurseMarketplaceProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    async function load() {
      try {
        const p = await getNurseMarketplaceProfileByUserId(appUser!.id);
        if (!p) { router.replace("/nurse/setup"); return; }
        const b = await getBookingsForNurseWithParticipants(appUser!.id);
        if (active) { setProfile(p); setBookings(b); }
      } catch { if (active) setError(tErr("loadDashboard")); }
      finally { if (active) setFetching(false); }
    }
    void load();
    return () => { active = false; };
  }, [appUser, router, tErr]);

  async function handleStatus(id: string, status: "accepted" | "rejected", reason?: string) {
    setLoadingBookingId(id);
    try {
      await updateBookingStatus(id, status, reason);
      const b = await getBookingsForNurseWithParticipants(appUser!.id);
      setBookings(b);
    } catch { setError(tErr("updateFailed")); }
    finally { setLoadingBookingId(null); }
  }

  if (loading || !appUser || fetching) return <LoadingScreen text={tLoading("workspace")} />;

  const pending = bookings.filter(b => b.status === "pending");
  const upcoming = bookings.filter(b => b.status === "accepted");
  const completed = bookings.filter(b => b.status === "completed");
  const totalEarned = completed.reduce((acc, b) => acc + b.price, 0);
  const today = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter(b => b.date === today && b.status === "accepted");

  const stats = [
    { label: t("stats.totalBookings"), value: fmtNumber(bookings.length, locale), icon: CalendarClock, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
    { label: t("stats.pendingRequests"), value: fmtNumber(pending.length, locale), icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: t("stats.upcomingShifts"), value: fmtNumber(upcoming.length, locale), icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: t("stats.totalEarned"), value: fmtCurrency(totalEarned, locale), icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  const firstName = appUser.name.split(" ")[0];
  const welcome = t(welcomeKey(profile?.gender), { name: firstName });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-sky-700 p-6 text-white shadow-xl sm:p-10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-1.5 sm:text-sm sm:mb-2">{t("kicker")}</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{welcome}</h1>
            {profile && <p className="mt-2 text-emerald-100 font-medium">{profile.specialization}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/nurse/bookings" className="inline-flex items-center gap-2 rounded-2xl bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-white border border-white/30 hover:bg-white/30 transition">
                {t("viewAllBookings")} <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/nurse/setup" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-slate-50 transition shadow-md">
                {t("editProfile")}
              </Link>
            </div>
          </div>
          {profile && (
            <div className="hidden sm:flex flex-col items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6">
              <Star className="h-8 w-8 text-amber-300 fill-amber-300" />
              <p className="text-3xl font-extrabold">{fmtNumber(profile.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
              <p className="text-sm text-emerald-200 font-medium">{t("yourRating")}</p>
            </div>
          )}
        </div>
        <div className="absolute -end-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -start-10 -bottom-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        <TrendingUp className="absolute end-8 bottom-0 h-32 w-32 text-white/5" />
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className={`flex flex-col gap-3 rounded-3xl border ${s.border} ${s.bg} p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white ${s.color} shadow-sm sm:h-12 sm:w-12`}>
              <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${s.color} opacity-70 sm:text-xs`}>{s.label}</p>
              <p className="text-xl font-extrabold text-slate-800 sm:text-2xl">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Bookings */}
      {todayBookings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">{t("shiftsToday")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {todayBookings.map(b => (
              <div key={b.id} className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-800 text-lg">{b.patientName}</p>
                  <span className="rounded-xl bg-emerald-500 px-3 py-1 text-xs font-bold text-white">{t("todayBadge")}</span>
                </div>
                <p className="text-sm font-semibold text-emerald-700">{b.service}</p>
                <p className="text-sm text-slate-500 mt-1">{b.time} · {b.location}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Pending Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">{t("incomingRequests")}</h2>
            {pending.length > 0 && (
              <Link href="/nurse/bookings" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">{t("viewAll")}</Link>
            )}
          </div>
          {error && <p className="mb-4 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-12">
              <Clock className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">{t("noPendingRequests")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.slice(0, 3).map(b => (
                <NurseIncomingBookingCard key={b.id} booking={b} busy={loadingBookingId === b.id}
                  onAccept={() => handleStatus(b.id, "accepted")}
                  onReject={(r) => handleStatus(b.id, "rejected", r)} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Schedule */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">{t("upcomingSchedule")}</h2>
            {upcoming.length > 0 && (
              <Link href="/nurse/schedule" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">{t("fullSchedule")}</Link>
            )}
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-12">
              <CalendarClock className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">{t("noUpcomingShifts")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.slice(0, 4).map(b => (
                <div key={b.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{b.patientName}</p>
                      <p className="text-sm text-emerald-600 font-semibold">{b.service}</p>
                      <p className="text-sm text-slate-500 mt-1">{b.date} · {b.time}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.location}</p>
                    </div>
                    <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{t("confirmed")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
