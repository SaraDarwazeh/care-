"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";
import { getPatientProfile } from "@/services/patientService";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  Stethoscope,
  HeartHandshake,
  BadgeCheck,
  Users,
  Activity,
  ArrowRight,
  Search,
  CalendarCheck,
  Home as HomeIcon,
  UserPlus,
  Banknote,
  Lock,
  Clock,
  CheckCircle,
  Heart,
  Droplets,
  Pill,
  CalendarDays,
} from "lucide-react";
import {
  BookingWithParticipants,
  CarePackage,
  NurseMarketplaceProfile,
  StoreItem,
  PatientProfile,
} from "@/lib/types";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import { getProducts } from "@/services/storeService";
import { getPublicStats, type PublicStats } from "@/services/publicStats";
import { listFeaturedPackages } from "@/services/packageService";
import PackageCard from "@/components/packages/PackageCard";
import ServiceCategoryCard from "@/components/services/ServiceCategoryCard";
import { serviceCategories } from "@/lib/serviceCatalog";

/* ─── hero slides ──────────────────────────────────────── */
const heroSlides = [
  {
    title: "Gentle care for elderly parents, post-op recovery, and everyday support.",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80",
  },
  {
    title: "Professional support that feels human, calm, and reassuring.",
    image: "https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&q=80",
  },
  {
    title: "Find the right nurse. Keep your family cared for.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80",
  },
];

/* ─── status badge helper ───────────────────────────────── */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending nurse confirmation", color: "text-amber-600 bg-amber-50 border-amber-200" },
  accepted:  { label: "Confirmed",                  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  completed: { label: "Completed",                  color: "text-slate-500 bg-slate-50 border-slate-200" },
  rejected:  { label: "Not accepted",               color: "text-rose-600 bg-rose-50 border-rose-200" },
  cancelled: { label: "Cancelled",                  color: "text-slate-400 bg-slate-50 border-slate-200" },
};

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const { appUser } = useAuth();

  const [nurses,   setNurses]   = useState<NurseMarketplaceProfile[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [slide,    setSlide]    = useState(0);

  const [stats,        setStats]        = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [featuredPackages, setFeaturedPackages] = useState<CarePackage[]>([]);

  const [bookings,        setBookings]        = useState<BookingWithParticipants[]>([]);
  const [patientProfile,  setPatientProfile]  = useState<PatientProfile | null>(null);
  const [patientReady,    setPatientReady]    = useState(false);

  /* public data */
  useEffect(() => {
    let alive = true;
    Promise.all([
      getApprovedNurseMarketplaceProfiles(),
      getProducts(),
      listFeaturedPackages(),
    ])
      .then(([n, p, pkgs]) => {
        if (!alive) return;
        // Sort nurses by rating so the homepage shows our best-rated approved
        // nurses first — same sort the patient dashboard uses.
        setNurses([...n].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5));
        setProducts(p.slice(0, 4));
        setFeaturedPackages(pkgs.slice(0, 3));
      })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false); });

    getPublicStats()
      .then((s) => { if (alive) setStats(s); })
      .catch(console.error)
      .finally(() => { if (alive) setStatsLoading(false); });

    return () => { alive = false; };
  }, []);

  /* patient personalisation */
  useEffect(() => {
    if (!appUser || appUser.role !== "patient") return;
    let alive = true;
    Promise.all([
      getBookingsForPatientWithParticipants(appUser.id),
      getPatientProfile(appUser.id),
    ])
      .then(([b, p]) => { if (alive) { setBookings(b); setPatientProfile(p); } })
      .catch(console.error)
      .finally(() => { if (alive) setPatientReady(true); });
    return () => { alive = false; };
  }, [appUser]);

  /* auto-advance carousel */
  useEffect(() => {
    const id = window.setInterval(() => setSlide((c) => (c + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(id);
  }, []);

  const isPatient = appUser?.role === "patient";
  const nextBooking = bookings.find((b) => b.status === "accepted" || b.status === "pending");
  const profileIncomplete = patientReady && !patientProfile?.profileCompleted;

  /* ─── render ─────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-white">
      <PlatformNavbar />

      {/* ══ HERO ══════════════════════════════════════════ */}
      <section id="home" className="relative overflow-hidden bg-white pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col-reverse items-center gap-10 lg:flex-row lg:gap-16">

            {/* Left: copy */}
            <div className="w-full space-y-6 lg:w-[52%]">

              {/* Guest headline */}
              {!isPatient && (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Every nurse reviewed &amp; approved by our team
                  </div>

                  <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                    Trusted Home Care,<br />
                    <span className="text-sky-600">at Your Doorstep.</span>
                  </h1>

                  <p className="max-w-lg text-lg leading-relaxed text-slate-500">
                    Professional nurses for your loved ones — compassionate, verified, and
                    available to come to you.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <Link
                      href="/patient/nurses"
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700"
                    >
                      Find a Nurse <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-sky-600 hover:underline"
                    >
                      Create a free account
                    </Link>
                  </div>

                  {(() => {
                    const items = stats
                      ? [
                          { value: stats.verifiedNurses, label: "Verified nurses" },
                          { value: stats.familiesServed, label: "Families served" },
                          { value: stats.completedBookings, label: "Completed visits" },
                        ].filter((item) => item.value > 0)
                      : [];

                    if (statsLoading) {
                      return (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="space-y-1">
                              <div className="h-6 w-12 animate-pulse rounded bg-slate-100" />
                              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (items.length === 0) return null;

                    return (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
                        {items.map((s) => (
                          <div key={s.label}>
                            <p className="text-xl font-extrabold text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-400">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Patient personalised hero */}
              {isPatient && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-sky-600 mb-1">Welcome back</p>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      {appUser!.name.split(" ")[0]}, your care is here.
                    </h1>
                  </div>

                  {/* Next booking card */}
                  {patientReady && nextBooking ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
                        {STATUS_LABELS[nextBooking.status]?.label ?? nextBooking.status}
                      </p>
                      <p className="font-bold text-slate-800">{nextBooking.service}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        with {nextBooking.nurseName} · {nextBooking.date}
                        {nextBooking.time ? ` · ${nextBooking.time}` : ""}
                      </p>
                      <Link
                        href="/patient/appointments"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                      >
                        View all appointments <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : patientReady ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">No upcoming appointments yet.</p>
                      <Link
                        href="/patient/nurses"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
                      >
                        Book your first nurse <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  )}

                  {/* Profile reminder */}
                  {profileIncomplete && (
                    <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm text-amber-700 font-medium">Complete your profile to enable booking</p>
                      <Link href="/patient/profile?onboarding=true" className="text-xs font-bold text-amber-700 underline hover:text-amber-800">
                        Complete →
                      </Link>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Book a Nurse",    href: "/patient/nurses",       color: "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100" },
                      { label: "Appointments",    href: "/patient/appointments",  color: "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200" },
                      { label: "Medical Records", href: "/patient/records",       color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100" },
                      { label: "Health Store",    href: "/patient/store",         color: "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100" },
                    ].map((a) => (
                      <Link key={a.href} href={a.href}
                        className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-bold transition ${a.color}`}>
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: image carousel */}
            <div className="w-full lg:w-[48%]">
              <div className="relative overflow-hidden rounded-3xl bg-slate-100 shadow-xl shadow-slate-200/70">
                <div className="relative aspect-[4/3] w-full">
                  {heroSlides.map((s, i) => (
                    <div key={s.image} className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`}>
                      <Image src={s.image} alt={s.title} fill className="object-cover" priority={i === 0} unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    </div>
                  ))}

                  {/* Slide caption */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-sm font-medium leading-snug text-white/90">
                      {heroSlides[slide].title}
                    </p>
                  </div>

                  {/* Carousel controls */}
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
                    <button type="button" aria-label="Previous"
                      onClick={() => setSlide((c) => (c - 1 + heroSlides.length) % heroSlides.length)}
                      className="rounded-full p-1 text-white/70 transition hover:text-white">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {heroSlides.map((_, i) => (
                      <button key={i} type="button" aria-label={`Slide ${i + 1}`} aria-pressed={i === slide}
                        onClick={() => setSlide(i)}
                        className={`rounded-full transition-all ${i === slide ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/40 hover:bg-white/60"}`}
                      />
                    ))}
                    <button type="button" aria-label="Next"
                      onClick={() => setSlide((c) => (c + 1) % heroSlides.length)}
                      className="rounded-full p-1 text-white/70 transition hover:text-white">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST STATS — real numbers only, hidden when empty ══ */}
      {(() => {
        const trustItems = stats
          ? [
              { label: "Verified Nurses",     value: stats.verifiedNurses,   icon: ShieldCheck, color: "text-emerald-500" },
              { label: "Families Served",     value: stats.familiesServed,   icon: Users,       color: "text-sky-500"     },
              { label: "Completed Visits",    value: stats.completedBookings, icon: Activity,   color: "text-violet-500"  },
            ].filter((item) => item.value > 0)
          : [];

        if (statsLoading) {
          return (
            <section className="border-y border-slate-100 bg-slate-50 py-8">
              <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-4 sm:px-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (trustItems.length === 0) return null;

        return (
          <section className="border-y border-slate-100 bg-slate-50 py-8">
            <div className={`mx-auto grid max-w-5xl gap-6 px-4 sm:px-8 ${trustItems.length === 1 ? "grid-cols-1" : trustItems.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {trustItems.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <p className="text-2xl font-extrabold text-slate-800">{s.value.toLocaleString()}</p>
                  <p className="text-xs font-medium text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-8 sm:space-y-24 sm:py-20">

        {/* ══ EXPLORE THE PLATFORM ═════════════════════════════
            Surfaces the four primary domains the platform offers so
            patients know what they can do here before scrolling further. */}
        <section id="explore" className="scroll-mt-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Explore the Platform</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Three ways to receive care, plus a healthcare store
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              Pick the path that matches what you need — a single visit, a recurring
              shift schedule, or a structured multi-day package.
            </p>
          </div>

          {/* Plain-English IA explainer — the difference between every label
              in the platform's navigation, in one place. */}
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Services vs. Packages</p>
              <p className="mt-1 text-sm text-slate-600">
                <strong>Services</strong> are individual visits or shift coverage you book one at a time.
                <strong className="ml-1">Care packages</strong> bundle a structured multi-day plan around an outcome (post-op recovery, elderly companion care, etc.).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Store vs. Community</p>
              <p className="mt-1 text-sm text-slate-600">
                <strong>Medical Store</strong> is for paid supplies fulfilled by our team.
                <strong className="ml-1">Community</strong> is a free space for families to share donations and exchange medical items.
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {serviceCategories.map((category) => (
              <ServiceCategoryCard key={category.slug} category={category} />
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/patient/store"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Healthcare Store</p>
                  <p className="text-sm text-slate-500">Medical supplies delivered via the same admin team.</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-500 transition" />
            </Link>
            <Link
              href="/community"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Community</p>
                  <p className="text-sm text-slate-500">Donations, exchanges, and family support around care.</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition" />
            </Link>
          </div>
        </section>

        {/* ══ WHY HOME CARE ══════════════════════════════════
            Emotional anchor: human situations families recognize.
            This section creates empathy before any product pitch. */}
        <section id="why" className="scroll-mt-20">
          <div className="mb-8 sm:mb-12 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Who We&rsquo;re Here For</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Care when your family needs it most
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              Families come to us at different moments. We&rsquo;re built for all of them.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: HomeIcon,
                situation: "When a parent needs daily support",
                description: "Elderly care shouldn't mean a care home. Our nurses bring routine support — medication reminders, mobility help, and quiet companionship — directly home.",
                color: "bg-sky-50 border-sky-100",
                iconColor: "text-sky-600 bg-sky-100",
              },
              {
                icon: HeartHandshake,
                situation: "When recovery feels harder than expected",
                description: "Post-surgery care is critical and exhausting. A trained nurse handles wound care, vital monitoring, and rehabilitation support so recovery happens properly.",
                color: "bg-emerald-50 border-emerald-100",
                iconColor: "text-emerald-600 bg-emerald-100",
              },
              {
                icon: Heart,
                situation: "When you can't always be there",
                description: "Life doesn't stop when someone needs care. Families trust Care Plus to be present when they can't — with verified, compassionate professionals.",
                color: "bg-violet-50 border-violet-100",
                iconColor: "text-violet-600 bg-violet-100",
              },
            ].map((item) => (
              <div key={item.situation} className={`rounded-2xl border p-6 ${item.color}`}>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${item.iconColor}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-slate-800 leading-snug">{item.situation}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ══════════════════════════════════ */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mb-8 sm:mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">The Process</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              Simple from start to care
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-slate-500">
              We keep the process clear so you can focus on what matters.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Patients */}
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-8">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                  <HomeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">For Patients &amp; Families</p>
                  <p className="text-xs text-slate-500">Get care at home in 3 steps</p>
                </div>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", icon: Search,       title: "Browse Verified Nurses",    desc: "Filter by specialization, shift, gender, and location." },
                  { n: "2", icon: CalendarCheck, title: "Book in Minutes",           desc: "Choose your date, care type, and confirm. No paperwork." },
                  { n: "3", icon: HeartHandshake,title: "Receive Care at Home",      desc: "A verified nurse arrives at your door, ready to help." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-sm font-extrabold text-white shadow-sm">
                      {s.n}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{s.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/patient/nurses" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 transition">
                Browse nurses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Nurses */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">For Healthcare Professionals</p>
                  <p className="text-xs text-slate-500">Earn on your own schedule</p>
                </div>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", icon: UserPlus,      title: "Build Your Profile",        desc: "Add specialization, certifications, services, and availability." },
                  { n: "2", icon: ShieldCheck,   title: "Get Approved in 24h",       desc: "Our team reviews your credentials and activates your profile." },
                  { n: "3", icon: Banknote,      title: "Accept Bookings &amp; Earn",desc: "Manage your schedule and get paid per completed session." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-extrabold text-white shadow-sm">
                      {s.n}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: s.title }} />
                      <p className="mt-0.5 text-sm text-slate-500" dangerouslySetInnerHTML={{ __html: s.desc }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register?role=nurse" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                Join as a nurse <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ══ OUR PROMISE ════════════════════════════════════
            Trust & safety — must appear before nurse listings.
            Patients share medical data and home address here.
            They need reassurance before seeing any profiles. */}
        <section id="promise" className="scroll-mt-20">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 sm:p-12">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Our Commitment</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
                Your care. Your family. Our promise.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-base text-slate-500">
                Every nurse, every booking, and every piece of your data is handled with the care it deserves.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  color: "text-sky-600 bg-sky-100",
                  title: "Every Nurse Verified",
                  body: "Profiles, certifications, and stated qualifications are reviewed by our team before a nurse is activated.",
                },
                {
                  icon: Lock,
                  color: "text-emerald-600 bg-emerald-100",
                  title: "Your Data is Protected",
                  body: "Medical history and personal information is encrypted and only visible to your nurse and our admin team.",
                },
                {
                  icon: Clock,
                  color: "text-violet-600 bg-violet-100",
                  title: "Fast Response",
                  body: "Most nurses confirm within a few hours. If a nurse can't make it, we help you find an alternative quickly.",
                },
                {
                  icon: CheckCircle,
                  color: "text-amber-600 bg-amber-100",
                  title: "Care on Your Terms",
                  body: "You set the schedule, location, and preferences. Cancel or reschedule without penalty before confirmation.",
                },
              ].map((p) => (
                <div key={p.title} className="rounded-xl bg-white border border-slate-100 p-5 shadow-sm">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${p.color}`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <p className="font-bold text-slate-800">{p.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-400">
              Questions about how we handle your information?{" "}
              <Link href="/privacy" className="text-sky-600 hover:underline font-medium">Read our Privacy Policy</Link>
              {" "}or{" "}
              <Link href="/terms" className="text-sky-600 hover:underline font-medium">Terms of Service</Link>.
            </p>
          </div>
        </section>

        {/* ══ FEATURED NURSES ════════════════════════════════ */}
        <section id="nurses" className="scroll-mt-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">
                {isPatient ? "Nurses for You" : "Top Rated"}
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
                {isPatient ? "Nurses available in your area" : "Meet our nurses"}
              </h2>
              <p className="mt-2 text-base text-slate-500">
                {isPatient
                  ? "Verified professionals ready to provide care."
                  : "Reviewed and approved by the Care Plus team."}
              </p>
            </div>
            <Link href="/patient/nurses" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 sm:flex transition">
              Browse all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-5 overflow-x-auto pb-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-72 w-64 shrink-0 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : nurses.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 text-center">
              <p className="text-sm text-slate-500">No nurses listed yet. Check back soon.</p>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 pt-2 snap-x">
              {nurses.map((nurse) => (
                <Link key={nurse.userId} href={`/patient/nurses/${nurse.userId}`}
                  className="group snap-center relative flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    {nurse.profileImage ? (
                      <Image src={nurse.profileImage} alt={nurse.fullName} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl font-bold text-slate-300">
                        {nurse.fullName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <p className="text-sm font-bold leading-none">{nurse.fullName}</p>
                          <BadgeCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        </div>
                        <p className="text-xs text-emerald-300">{nurse.specialization}</p>
                      </div>
                      {nurse.rating > 0 && (
                        <div className="flex items-center gap-1 rounded-lg bg-black/30 px-2 py-0.5 text-xs font-bold backdrop-blur-sm">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {nurse.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col p-4">
                    <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {nurse.bio || "Dedicated healthcare professional providing exceptional home care."}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-400">Starting at</p>
                      <p className="text-sm font-extrabold text-slate-800">
                        ${nurse.pricePerHour ?? 0}<span className="text-xs font-normal text-slate-400">/hr</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ══ HEALTH TIPS ════════════════════════════════════
            Genuine care guidance — not promotional.
            Signals that Care Plus is a healthcare partner,
            not just a booking service. */}
        <section id="tips" className="scroll-mt-20">
          <div className="mb-10 max-w-xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Health Guidance</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              Small habits that support recovery
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              A few things worth knowing — whether care is just beginning or ongoing.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Droplets,
                color: "text-sky-600 bg-sky-50 border-sky-100",
                iconBg: "bg-sky-100 text-sky-600",
                title: "Hydration during recovery",
                body: "Adequate fluid intake helps the body process medications, reduce inflammation, and rebuild tissue. Encourage 6–8 glasses of water daily — more if your nurse recommends it.",
                note: "Tip for post-op and elderly patients",
              },
              {
                icon: Pill,
                color: "text-violet-600 bg-violet-50 border-violet-100",
                iconBg: "bg-violet-100 text-violet-600",
                title: "Medication schedules matter",
                body: "Consistent timing is as important as the dose. A home nurse can help set alarms, explain interactions, and flag anything that seems off — especially with multiple prescriptions.",
                note: "Relevant for chronic and post-surgical care",
              },
              {
                icon: CalendarDays,
                color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                iconBg: "bg-emerald-100 text-emerald-600",
                title: "What to prepare for your first visit",
                body: "Have a list of current medications, any known allergies, and recent test results ready. Your nurse will review these before beginning care. It saves time and improves safety.",
                note: "First-time patients",
              },
            ].map((tip) => (
              <div key={tip.title} className={`rounded-2xl border p-6 ${tip.color}`}>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${tip.iconBg}`}>
                  <tip.icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-slate-800">{tip.title}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{tip.body}</p>
                <p className="mt-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{tip.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW WE VERIFY NURSES ═══════════════════════════
            Replaces the previous testimonials block with the actual
            verification process. Honest, falsifiable, and gives families
            something concrete to evaluate before booking. */}
        <section id="verification" className="scroll-mt-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">How We Verify Nurses</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              No nurse appears here until we&rsquo;ve reviewed them
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
              Every nurse on Care Plus goes through the same steps before patients can book them. We&rsquo;ll keep adding to this list as our verification process matures.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: UserPlus,
                title: "Profile submission",
                body: "Nurses provide their full name, contact, specialization, services offered, certifications, and years of experience.",
              },
              {
                step: "2",
                icon: ShieldCheck,
                title: "Admin review",
                body: "Our team reviews each submission. Certifications and stated qualifications are checked against the documents the nurse uploads.",
              },
              {
                step: "3",
                icon: BadgeCheck,
                title: "Activation",
                body: "Only approved nurses appear in the marketplace. Patients see the same verified status on every profile and listing.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sm font-extrabold text-sky-700">
                    {s.step}
                  </span>
                  <s.icon className="h-5 w-5 text-sky-600" />
                </div>
                <p className="font-bold text-slate-800">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            We do not yet perform third-party background checks. We&rsquo;re upfront about this so you know what &ldquo;verified&rdquo; means on Care Plus today.
          </p>
        </section>

        {/* ══ FEATURED PACKAGES ════════════════════════════════
            Real care packages from Firestore. Section is hidden when
            there are no active packages — we never fake plans. */}
        {featuredPackages.length > 0 && (
          <section id="packages" className="scroll-mt-20">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">
                  Care Packages
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
                  Multi-day care plans built for real situations
                </h2>
                <p className="mt-3 max-w-2xl text-base text-slate-500">
                  Each package covers a defined timeline, included services, and what to
                  expect from your nurse — no guesswork.
                </p>
              </div>
              <Link
                href="/services/packages"
                className="hidden shrink-0 items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 sm:flex transition"
              >
                Browse all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </section>
        )}

        {/* ══ MEDICAL STORE PREVIEW ══════════════════════════ */}
        <section id="store" className="scroll-mt-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600">Care Plus Store</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Medical Supplies</h2>
              <p className="mt-1.5 text-sm text-slate-500">Quality home care essentials, delivered.</p>
            </div>
            <Link href="/patient/store" className="hidden shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700 sm:block transition">
              Browse store →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(loading ? Array(4).fill(null) : products).map((item, i) =>
              item ? (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-violet-100 hover:shadow-md transition">
                  <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-slate-50 text-4xl">{item.image}</div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{item.category}</span>
                    <span className="text-sm font-extrabold text-violet-700">${item.price}</span>
                  </div>
                </div>
              ) : (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
              )
            )}
          </div>
          <div className="mt-6 text-center">
            <Link href="/patient/store"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-100 transition"
            >
              Browse all supplies <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

      </div>

      <PlatformFooter />
    </main>
  );
}
