"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  Stethoscope,
  Store,
  UserCircle,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  BookOpen,
  Package,
  AlertCircle,
  HeartHandshake,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientButton from "@/components/patient/PatientButton";
import RecommendedForYou from "@/components/patient/RecommendedForYou";
import YourHealthProfile from "@/components/patient/YourHealthProfile";
import DashboardWarmthRails from "@/components/patient/DashboardWarmthRails";
import { useAuth } from "@/hooks/useAuth";
import type {
  BookingWithParticipants,
  CarePackage,
  NurseMarketplaceProfile,
  PatientProfile,
} from "@/lib/types";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import {
  getMissingFieldLabels,
  getPatientProfile,
} from "@/services/patientService";
import { listPackages } from "@/services/packageService";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";

interface ActiveCarePlan {
  booking: BookingWithParticipants;
  package?: CarePackage;
  daysRemaining: number;
}

export default function PatientHomePage() {
  const { appUser, loading } = useAuth();
  const t = useTranslations("patient.dashboard");
  const tStatus = useTranslations("patient.bookingStatus");
  // Root-scope translator for fully-qualified keys used by patientService
  // helpers (e.g. patient.profile.requiredFields.*).
  const tRoot = useTranslations();
  const tLoading = useTranslations("patient.loading");
  const locale = useLocale() as Locale;
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Per the 2026-06-17 audit, the dashboard was collapsed from 11+
  // sections to 6 (Welcome / Profile-incomplete / Health profile /
  // Recommended for you / Quick actions / Upcoming + Active plans).
  // Recent records, previous nurses, legacy "Recommended Nurses",
  // recent orders, and the store preview were removed — they were
  // either duplicating Recommended For You or surfacing low-frequency
  // content. Records / orders / store remain reachable from Quick
  // Actions and the profile menu, so no functionality was lost.
  useEffect(() => {
    if (!appUser) return;
    const patientId = appUser.id;
    let active = true;

    (async () => {
      try {
        const [bookingsData, nursesData, packagesData, profileData] = await Promise.all([
          getBookingsForPatientWithParticipants(patientId),
          getApprovedNurseMarketplaceProfiles(),
          listPackages(),
          getPatientProfile(patientId),
        ]);

        if (!active) return;
        setBookings(bookingsData);
        // RecommendedForYou consumes the full approved-nurse pool to
        // score matches against the patient's conditions.
        setNurses([...nursesData].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
        setPackages(packagesData);
        setPatientProfile(profileData);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        if (active) setLoadingData(false);
      }
    })();

    return () => { active = false; };
  }, [appUser]);

  const missingProfileFields = useMemo(
    () => getMissingFieldLabels(patientProfile, tRoot),
    [patientProfile, tRoot],
  );
  const isProfileIncomplete = !loadingData && missingProfileFields.length > 0;

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "accepted" || b.status === "pending")
        .slice(0, 3),
    [bookings],
  );

  const activeCarePlans = useMemo<ActiveCarePlan[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pkgById = new Map(packages.map((p) => [p.id, p]));
    return bookings
      .filter((b) => b.bookingType === "package" && (b.status === "accepted" || b.status === "pending") && b.packageId)
      .map((b) => {
        const pkg = pkgById.get(b.packageId!);
        const duration = b.durationDays ?? pkg?.durationDays ?? 0;
        const startDate = new Date(b.date);
        startDate.setHours(0, 0, 0, 0);
        const endTime = startDate.getTime() + (duration - 1) * 86_400_000;
        const remaining = Math.max(0, Math.ceil((endTime - today.getTime()) / 86_400_000));
        return { booking: b, package: pkg, daysRemaining: remaining };
      })
      .slice(0, 2);
  }, [bookings, packages]);

  // Completed bookings the patient hasn't reviewed yet. Drives the
  // "How was your visit?" rail in DashboardWarmthRails. We don't query
  // reviews here — the rail's CTA leads to /patient/appointments where
  // the existing review form handles the canPatientReview check.
  const pendingReviewBookings = useMemo(
    () => bookings.filter((b) => b.status === "completed").slice(0, 4),
    [bookings],
  );


  if (loading) {
    return <LoadingScreen text={tLoading("dashboard")} />;
  }

  if (!appUser) {
    // Per the 2026-06-17 gap audit, the guest fallback used to surface
    // three generic CTAs that did not advertise Library / Community /
    // Packages. The expanded layout below names every guest-browseable
    // surface and reassures visitors that browsing is free — the only
    // gated action is the booking itself.
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
        <section id="home" className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 p-8 sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">{t("guestKicker")}</p>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("guestTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{t("guestSubtitle")}</p>
            <p className="mt-2 text-xs text-slate-500">{t("guestBrowseFree")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/find-care"
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                {t("guestCtaServices")}
              </Link>
              <Link
                href="/patient/nurses"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                {t("guestCtaNurses")}
              </Link>
            </div>
          </div>

          {/* Six tiles naming every guest-browseable surface. Keeps the
              guest dashboard the de-facto sitemap of public-facing
              content — the audit found that visitors couldn't tell
              Library / Community existed otherwise. */}
          <div className="grid gap-2 border-t border-sky-100 bg-white p-4 sm:grid-cols-2 sm:gap-3 sm:p-6 lg:grid-cols-3">
            {[
              { href: "/services/packages", labelKey: "guestExplore.packages", color: "text-emerald-600 bg-emerald-50 border-emerald-100", hover: "hover:border-emerald-300" },
              { href: "/patient/nurses", labelKey: "guestExplore.nurses", color: "text-sky-600 bg-sky-50 border-sky-100", hover: "hover:border-sky-300" },
              { href: "/patient/store", labelKey: "guestExplore.store", color: "text-violet-600 bg-violet-50 border-violet-100", hover: "hover:border-violet-300" },
              { href: "/patient/education", labelKey: "guestExplore.library", color: "text-rose-600 bg-rose-50 border-rose-100", hover: "hover:border-rose-300" },
              { href: "/community", labelKey: "guestExplore.community", color: "text-amber-600 bg-amber-50 border-amber-100", hover: "hover:border-amber-300" },
              { href: "/services", labelKey: "guestExplore.services", color: "text-slate-600 bg-slate-50 border-slate-100", hover: "hover:border-slate-300" },
            ].map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 transition ${tile.hover} ${tile.color.split(" ").filter(c => c.startsWith("border-")).join(" ")}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900">
                    {t(`${tile.labelKey}.title`)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {t(`${tile.labelKey}.body`)}
                  </p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const firstName = appUser.name.split(" ")[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-8 sm:space-y-12 sm:pb-12">
      {/* 1. Welcome card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 p-6 shadow-[0_20px_40px_-15px_rgba(2,132,199,0.5)] text-white sm:p-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md mb-3 sm:text-sm sm:mb-4">
              <HeartPulse className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t("welcomeKicker")}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-5xl mb-2">{t("welcomeTitle", { name: firstName })}</h1>
            <p className="max-w-xl text-sm text-sky-100 font-medium sm:text-lg">{t("welcomeSubtitle")}</p>
            <div className="mt-5 sm:mt-8">
              <Link href="/patient/nurses" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-sky-700 hover:bg-slate-50 transition shadow-lg hover:-translate-y-0.5 sm:px-6 sm:py-3.5 sm:text-base">
                {t("findNurseCta")} <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="hidden lg:block relative h-48 w-48 shrink-0">
            <div className="absolute inset-0 rounded-full bg-white/10 border-4 border-white/20 backdrop-blur-sm animate-pulse" />
            <ShieldCheck className="absolute inset-0 m-auto h-24 w-24 text-white/80" />
          </div>
        </div>
        <div className="absolute -end-20 -top-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -start-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      </section>

      {/* 2. Profile completeness banner */}
      {isProfileIncomplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">{t("profileIncomplete")}</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-amber-800">
                {missingProfileFields.map((label) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/patient/profile?onboarding=true"
              className="shrink-0 self-center rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-200 transition whitespace-nowrap"
            >
              {t("completeProfile")}
            </Link>
          </div>
        </div>
      )}

      {/* Per the 2026-06-17 dashboard-hierarchy pass, transactional
          content (Quick Actions / Upcoming Appointments / Active Care
          Plans) now precedes discovery rails (Health Profile /
          Recommended For You / warmth content). The reasoning: a
          patient opening their dashboard typically wants to take an
          action or check a visit, not be served exploratory content
          first. Discovery rails still surface in the same view, just
          below the fold of the action-first layout. */}

      {/* 3. Quick actions */}
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("quickActions")}</h2>
          <p className="text-slate-500 font-medium">{t("quickActionsSubtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { labelKey: "bookNurseLabel", descKey: "bookNurseDesc", href: "/patient/nurses",     icon: Stethoscope, color: "bg-sky-50 text-sky-600 border-sky-100",         iconBg: "bg-sky-100" },
            { labelKey: "recordsLabel",   descKey: "recordsDesc",   href: "/patient/records",    icon: BookOpen,    color: "bg-emerald-50 text-emerald-600 border-emerald-100", iconBg: "bg-emerald-100" },
            { labelKey: "packagesLabel",  descKey: "packagesDesc",  href: "/services/packages",  icon: Package,     color: "bg-violet-50 text-violet-600 border-violet-100",     iconBg: "bg-violet-100" },
            { labelKey: "storeLabel",     descKey: "storeDesc",     href: "/patient/store",      icon: Store,       color: "bg-amber-50 text-amber-600 border-amber-100",         iconBg: "bg-amber-100" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`rounded-3xl bg-white border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 flex flex-col gap-3 ${action.color}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${action.iconBg}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{t(`actions.${action.labelKey}`)}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t(`actions.${action.descKey}`)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Upcoming appointments */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("upcomingTitle")}</h2>
            <p className="text-slate-500 font-medium">{t("upcomingSubtitle")}</p>
          </div>
          <Link href="/patient/appointments" className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition">
            {t("viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loadingData ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-32 w-full bg-slate-200 rounded-3xl" />
            <div className="h-32 w-full bg-slate-200 rounded-3xl hidden sm:block" />
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
            <CalendarClock className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium mb-4">{t("upcomingEmpty")}</p>
            <PatientButton href="/patient/nurses" className="bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-xl">{t("bookSession")}</PatientButton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <CalendarClock className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg truncate">{booking.nurseName}</h3>
                    <p className="text-sm font-medium text-slate-500 truncate">{booking.service}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center rounded-2xl bg-slate-50 p-4 mt-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t("dateLabel")}</p>
                    <p className="font-bold text-slate-700">{booking.date}{booking.time ? ` · ${booking.time}` : ""}</p>
                  </div>
                  <span className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    booking.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {tStatus(booking.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Active care plans */}
      {!loadingData && activeCarePlans.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("activeCarePlansTitle")}</h2>
              <p className="text-slate-500 font-medium">{t("activeCarePlansSubtitle")}</p>
            </div>
            <Link href="/services/packages" className="hidden sm:flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700 transition">
              {t("browsePackages")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCarePlans.map((plan) => (
              <div key={plan.booking.id} className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shrink-0">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 leading-tight">
                      {plan.package?.title ? tLocalized(plan.package.title, locale) : plan.booking.service}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 truncate">{t("with", { name: plan.booking.nurseName })}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">{t("started")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{plan.booking.date}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">{t("duration")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{t("daysShort", { n: plan.booking.durationDays ?? plan.package?.durationDays ?? 0 })}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider">{t("remaining")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-violet-700">{t("daysShort", { n: plan.daysRemaining })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Health profile snapshot (hidden when no conditions are saved) */}
      <YourHealthProfile profile={patientProfile} />

      {/* 7. Recommended for you — deterministic matches off the patient's
           conditions against the in-memory nurses + packages lists. */}
      <RecommendedForYou profile={patientProfile} nurses={nurses} packages={packages} />

      {/* 8. Warmth rails — post-visit review prompts, Health Hub teaser,
           Rewards balance, and Community preview. Each rail hides
           silently when its backing data is missing so the dashboard
           collapses gracefully. */}
      <DashboardWarmthRails pendingReviewBookings={pendingReviewBookings} />

      <div className="flex items-center justify-center gap-3 pt-2 text-sm font-bold text-slate-500 sm:hidden">
        <Link href="/patient/profile" className="rounded-xl bg-slate-100 px-3 py-2 hover:bg-slate-200 transition">
          <UserCircle className="inline h-4 w-4 me-1" /> {t("profileMobile")}
        </Link>
      </div>
    </div>
  );
}
