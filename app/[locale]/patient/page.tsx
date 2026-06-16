"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  Stethoscope,
  Store,
  UserCircle,
  Star,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  Plus,
  BookOpen,
  Package,
  AlertCircle,
  HeartHandshake,
  FileText,
  History,
  ShoppingBag,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientButton from "@/components/patient/PatientButton";
import RecommendedForYou from "@/components/patient/RecommendedForYou";
import YourHealthProfile from "@/components/patient/YourHealthProfile";
import { useAuth } from "@/hooks/useAuth";
import type {
  BookingWithParticipants,
  CarePackage,
  MedicalRecord,
  NurseMarketplaceProfile,
  PatientProfile,
  StoreItem,
  StoreOrder,
} from "@/lib/types";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import {
  getMissingFieldLabels,
  getPatientProfile,
} from "@/services/patientService";
import { useCart } from "@/components/patient/CartContext";
import { getOrdersForPatient, getProducts } from "@/services/storeService";
import { getRecordsForPatient } from "@/services/medicalService";
import { listPackages } from "@/services/packageService";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";

interface PreviousNurse {
  userId: string;
  fullName: string;
  specialization?: string;
  profileImage?: string;
  visits: number;
  lastVisit: string;
}

interface ActiveCarePlan {
  booking: BookingWithParticipants;
  package?: CarePackage;
  daysRemaining: number;
}

const ORDER_STATUS_COLOR: Record<StoreOrder["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-sky-100 text-sky-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

export default function PatientHomePage() {
  const { appUser, loading } = useAuth();
  const { addToCart } = useCart();
  const t = useTranslations("patient.dashboard");
  const tStatus = useTranslations("patient.bookingStatus");
  const tOrderStatus = useTranslations("patient.orderStatus");
  // Root-scope translator for fully-qualified keys used by patientService
  // helpers (e.g. patient.profile.requiredFields.*).
  const tRoot = useTranslations();
  const tLoading = useTranslations("patient.loading");
  const tNav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    const patientId = appUser.id;
    let active = true;

    (async () => {
      try {
        const [bookingsData, nursesData, productsData, ordersData, recordsData, packagesData, profileData] =
          await Promise.all([
            getBookingsForPatientWithParticipants(patientId),
            getApprovedNurseMarketplaceProfiles(),
            getProducts(),
            getOrdersForPatient(patientId),
            getRecordsForPatient(patientId),
            listPackages(),
            getPatientProfile(patientId),
          ]);

        if (!active) return;
        setBookings(bookingsData);
        // Keep the full approved-nurse pool — RecommendedForYou needs to
        // see everyone to compute matches. The legacy "Recommended Nurses"
        // section slices to the top 4 by rating at render time.
        setNurses([...nursesData].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
        setProducts(productsData);
        setOrders(ordersData);
        setRecords(recordsData);
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

  const previousNurses = useMemo<PreviousNurse[]>(() => {
    const byId = new Map<string, PreviousNurse>();
    bookings
      .filter((b) => b.status === "completed")
      .forEach((b) => {
        const existing = byId.get(b.nurseId);
        if (existing) {
          existing.visits += 1;
          if (b.date > existing.lastVisit) existing.lastVisit = b.date;
        } else {
          byId.set(b.nurseId, {
            userId: b.nurseId,
            fullName: b.nurseName,
            specialization: b.nurseSpecialization,
            profileImage: b.nurseProfileImage,
            visits: 1,
            lastVisit: b.date,
          });
        }
      });
    return Array.from(byId.values())
      .sort((a, b) => b.visits - a.visits || b.lastVisit.localeCompare(a.lastVisit))
      .slice(0, 3);
  }, [bookings]);

  const recentRecords = useMemo(() => records.slice(0, 3), [records]);
  const recentOrders = useMemo(() => orders.slice(0, 2), [orders]);
  const bestSellers = products.slice(0, 3);

  if (loading) {
    return <LoadingScreen text={tLoading("dashboard")} />;
  }

  if (!appUser) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
        <section id="home" className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 p-8 sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">{t("guestKicker")}</p>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("guestTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{t("guestSubtitle")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700">{t("guestCtaServices")}</Link>
              <Link href="/patient/nurses" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">{t("guestCtaNurses")}</Link>
              <Link href="/patient/store" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">{t("guestCtaStore")}</Link>
            </div>
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

      {/* 2b. Health profile snapshot (hidden when no conditions are saved) */}
      <YourHealthProfile profile={patientProfile} />

      {/* 2c. Recommended for you — deterministic matches off the patient's
           conditions against the in-memory nurses + packages lists. */}
      <RecommendedForYou profile={patientProfile} nurses={nurses} packages={packages} />

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

      {/* 6. Recent visit notes */}
      {!loadingData && recentRecords.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("recentRecordsTitle")}</h2>
              <p className="text-slate-500 font-medium">{t("recentRecordsSubtitle")}</p>
            </div>
            <Link href="/patient/records" className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition">
              {t("allRecords")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {recentRecords.map((record) => (
              <Link
                key={record.id}
                href={`/patient/records/${record.id}`}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-emerald-200 hover:shadow-md transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 leading-tight truncate">
                      {record.summary ?? t("visitRecord")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {fmtDate(record.createdAt, locale, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. Previous nurses */}
      {!loadingData && previousNurses.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("previousNursesTitle")}</h2>
              <p className="text-slate-500 font-medium">{t("previousNursesSubtitle")}</p>
            </div>
            <Link href="/patient/appointments" className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition">
              {t("visitHistory")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {previousNurses.map((nurse) => (
              <Link
                key={nurse.userId}
                href={`/patient/nurses/${nurse.userId}`}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-sky-200 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 overflow-hidden">
                    {nurse.profileImage ? (
                      <Image
                        src={nurse.profileImage}
                        alt={nurse.fullName}
                        width={48}
                        height={48}
                        unoptimized
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <History className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{nurse.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{nurse.specialization ?? tNav("findANurse")}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-600">{t("visits", { n: nurse.visits })}</span>
                  <span className="text-slate-400">{t("last", { date: nurse.lastVisit })}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. Recommended nurses */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("recommendedNursesTitle")}</h2>
            <p className="text-slate-500 font-medium">{t("recommendedNursesSubtitle")}</p>
          </div>
          <Link href="/patient/nurses" className="hidden sm:flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition">
            {t("viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide snap-x">
          {loadingData ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="min-w-[280px] h-80 bg-slate-200 rounded-3xl animate-pulse shrink-0" />
            ))
          ) : nurses.length > 0 ? (
            nurses.slice(0, 4).map((nurse) => (
              <div key={nurse.userId} className="min-w-[280px] w-[280px] shrink-0 snap-start rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden group flex flex-col">
                <div className="relative h-48 w-full overflow-hidden">
                  {nurse.profileImage ? (
                    <Image
                      src={nurse.profileImage}
                      alt={nurse.fullName}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-bold text-slate-300">
                      {nurse.fullName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 start-4 end-4 flex items-end justify-between text-white">
                    <div className="min-w-0">
                      <p className="font-extrabold text-lg leading-tight truncate">{nurse.fullName}</p>
                      <p className="text-sm font-medium text-sky-200 truncate">{nurse.specialization}</p>
                    </div>
                    {nurse.rating > 0 && (
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-lg px-2 py-1 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold">{fmtNumber(nurse.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {nurse.services.slice(0, 2).map((s) => (
                      <span key={`${nurse.userId}-${s.name}`} className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        {s.name}
                      </span>
                    ))}
                    {nurse.services.length > 2 && (
                      <span className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                        +{nurse.services.length - 2}
                      </span>
                    )}
                  </div>
                  <Link href={`/patient/nurses/${nurse.userId}`} className="w-full flex items-center justify-center py-2.5 rounded-xl bg-sky-50 text-sky-700 font-bold text-sm hover:bg-sky-600 hover:text-white transition-colors group-hover:shadow-md">
                    {t("bookSessionShort")}
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500">{t("noNurses")}</p>
          )}
        </div>
      </section>

      {/* 9. Recent orders */}
      {!loadingData && recentOrders.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{t("recentOrdersTitle")}</h2>
              <p className="text-slate-500 font-medium">{t("recentOrdersSubtitle")}</p>
            </div>
            <Link href="/patient/orders" className="flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700 transition">
              {t("allOrders")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recentOrders.map((order) => {
              const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
              return (
                <Link
                  key={order.id}
                  href="/patient/orders"
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shrink-0">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">{t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtDate(order.createdAt, locale, { year: "numeric", month: "short", day: "numeric" })}
                          {" · "}{t("items", { n: itemCount })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ORDER_STATUS_COLOR[order.status]}`}>
                        {tOrderStatus(order.status)}
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">{fmtCurrency(order.total, locale)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 10. Medical store preview */}
      {bestSellers.length > 0 && (
        <section className="rounded-3xl bg-violet-50 p-6 sm:p-10 border border-violet-100 relative overflow-hidden">
          <div className="absolute end-0 top-0 h-64 w-64 bg-violet-200/50 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-violet-700 font-bold mb-2">
                  <Store className="h-5 w-5" /> {t("storeKicker")}
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">{t("storeTitle")}</h2>
              </div>
              <Link href="/patient/store" className="hidden sm:flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700 transition bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow">
                {t("browseStore")} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {bestSellers.map((product) => (
                <div key={product.id} className="bg-white rounded-3xl p-5 shadow-sm border border-white hover:border-violet-200 transition-colors group flex flex-col">
                  <div className="h-32 flex items-center justify-center text-6xl bg-slate-50 rounded-2xl mb-4 group-hover:scale-105 transition-transform">
                    {product.image}
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 leading-tight">{tLocalized(product.name, locale)}</h3>
                    <span className="font-extrabold text-violet-700">{fmtCurrency(product.price, locale)}</span>
                  </div>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-600 hover:border-violet-600 hover:text-white transition-all"
                  >
                    <Plus className="h-4 w-4" /> {t("addToCart")}
                  </button>
                </div>
              ))}
            </div>

            <Link href="/patient/store" className="mt-6 sm:hidden w-full flex items-center justify-center gap-1 text-sm font-bold text-violet-600 bg-white px-4 py-3 rounded-xl shadow-sm">
              {t("browseStoreFull")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <div className="flex items-center justify-center gap-3 pt-2 text-sm font-bold text-slate-500 sm:hidden">
        <Link href="/patient/profile" className="rounded-xl bg-slate-100 px-3 py-2 hover:bg-slate-200 transition">
          <UserCircle className="inline h-4 w-4 me-1" /> {t("profileMobile")}
        </Link>
      </div>
    </div>
  );
}
