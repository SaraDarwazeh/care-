"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";
import EducationSection from "@/components/education/EducationSection";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  ChevronRight,
  Heart,
  HeartHandshake,
  Home as HomeIcon,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { CarePackage, StoreItem } from "@/lib/types";
import { getProducts } from "@/services/storeService";
import { getPublicStats, type PublicStats } from "@/services/publicStats";
import { listFeaturedPackages } from "@/services/packageService";
import PackageCard from "@/components/packages/PackageCard";

/* ═══════════════════════════════════════════════════════════
   PAGE — public marketing surface for /. Same content for
   everyone; authenticated users land on their role dashboard
   via post-login routing and the role-aware navbar logo.
   The "About Care+" entry in the ProfileMenu sends signed-in
   users back here intentionally.
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [featuredPackages, setFeaturedPackages] = useState<CarePackage[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getProducts(), listFeaturedPackages()])
      .then(([p, pkgs]) => {
        if (!alive) return;
        setProducts(p.slice(0, 4));
        setFeaturedPackages(pkgs.slice(0, 3));
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setLoading(false);
      });

    getPublicStats()
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setStatsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const trustItems = stats
    ? [
        { value: stats.verifiedNurses, label: "Verified nurses" },
        { value: stats.familiesServed, label: "Families served" },
        { value: stats.completedBookings, label: "Visits completed" },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <main className="min-h-screen bg-white">
      <PlatformNavbar />

      {/* ══ HERO — editorial split. No carousel. ════════════════
          Left: trust badge → headline → subhead → dual CTA → trust ribbon.
          Right: single warm photo with floating verification chip.
          Compact pacing: a returning visitor sees pillars within one scroll. */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-sky-50/40 via-white to-white pt-10 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* Left: copy + CTAs */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Every nurse verified by Care+
              </div>

              <h1 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-[3rem] lg:text-[3.4rem]">
                Home healthcare<br />
                <span className="text-sky-600">that visits you.</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                Trusted nurses for recovery, elderly support, post-op care, and everyday help — booked in minutes, delivered to your door.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/patient/nurses"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700"
                >
                  Find a Nurse <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register?role=nurse"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3.5 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Join as Nurse
                </Link>
              </div>

              {/* Trust ribbon — only renders when real numbers exist.
                  Folded into the hero so we don't need a separate strip. */}
              {statsLoading ? (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-100 pt-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-6 w-12 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : trustItems.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-100 pt-5">
                  {trustItems.map((s) => (
                    <div key={s.label}>
                      <p className="text-2xl font-extrabold text-slate-900">{s.value.toLocaleString()}</p>
                      <p className="text-xs font-medium text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Right: single warm photo with a floating verification chip */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-2xl shadow-sky-200/60">
                <div className="relative aspect-[4/5] w-full sm:aspect-[5/6]">
                  <Image
                    src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80"
                    alt="A nurse providing compassionate home care"
                    fill
                    priority
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent" />
                </div>
              </div>
              {/* Floating verification chip — sits on the photo as the
                  human-readable proof that "verified" means something. */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 sm:-bottom-6 sm:left-6 sm:translate-x-0">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Approved</p>
                    <p className="text-sm font-semibold text-slate-700">Reviewed by the Care+ team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-12 sm:px-8 sm:space-y-24 sm:py-16">

        {/* ══ PLATFORM PILLARS ═══════════════════════════════════════
            4 compact visual cards — patient sees the whole platform
            inside the first two screen heights. Replaces the old
            EXPLORE section which nested too many explainer blocks. */}
        <section id="explore" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">What Care+ offers</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Four ways we support your family
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/patient/nurses",
                icon: Stethoscope,
                title: "Find a Nurse",
                body: "One-time visits or shift care — book a verified nurse for what you need.",
                iconBg: "bg-sky-100 text-sky-700",
                hover: "hover:border-sky-200",
              },
              {
                href: "/services/packages",
                icon: HeartHandshake,
                title: "Care Packages",
                body: "Multi-day plans for recovery, elderly support, palliative, and more.",
                iconBg: "bg-emerald-100 text-emerald-700",
                hover: "hover:border-emerald-200",
              },
              {
                href: "/patient/store",
                icon: ShoppingBag,
                title: "Medical Store",
                body: "Equipment, supplies, and home-care essentials delivered to your door.",
                iconBg: "bg-violet-100 text-violet-700",
                hover: "hover:border-violet-200",
              },
              {
                href: "/community",
                icon: Users,
                title: "Community",
                body: "Donate or receive medical equipment from families nearby.",
                iconBg: "bg-amber-100 text-amber-700",
                hover: "hover:border-amber-200",
              },
            ].map((pillar) => (
              <Link
                key={pillar.href}
                href={pillar.href}
                className={`group flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 ${pillar.hover} hover:shadow-md`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${pillar.iconBg}`}>
                  <pillar.icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-slate-800">{pillar.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{pillar.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-600 transition group-hover:gap-2">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ══ WHY HOME CARE ══════════════════════════════════════════
            Emotional anchor — three human situations families recognize.
            Trimmed from the old version (no large section header, less padding). */}
        <section id="why" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Who we&rsquo;re here for</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Care when your family needs it most
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: HomeIcon,
                situation: "When a parent needs daily support",
                description: "Elderly care shouldn&rsquo;t mean a care home. Nurses bring routine support — medication, mobility, companionship — directly home.",
                bg: "bg-sky-50",
                border: "border-sky-100",
                iconColor: "text-sky-600 bg-sky-100",
              },
              {
                icon: HeartHandshake,
                situation: "When recovery is harder than expected",
                description: "Post-surgery care is critical and exhausting. A trained nurse handles wound care and monitoring so recovery happens properly.",
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                iconColor: "text-emerald-600 bg-emerald-100",
              },
              {
                icon: Heart,
                situation: "When you can&rsquo;t always be there",
                description: "Life doesn&rsquo;t stop when someone needs care. Families trust Care+ to be present when they can&rsquo;t — with verified, compassionate professionals.",
                bg: "bg-violet-50",
                border: "border-violet-100",
                iconColor: "text-violet-600 bg-violet-100",
              },
            ].map((item) => (
              <div key={item.situation} className={`rounded-3xl border p-6 ${item.bg} ${item.border}`}>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${item.iconColor}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p
                  className="font-bold text-slate-800 leading-snug"
                  dangerouslySetInnerHTML={{ __html: item.situation }}
                />
                <p
                  className="mt-2.5 text-sm leading-relaxed text-slate-600"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ═══════════════════════════════════════════
            Two-column: patient flow + nurse flow. Tightened from
            previous version (smaller header, less vertical padding). */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">The process</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Simple from start to care
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Patients */}
            <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                  <HomeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">For Patients &amp; Families</p>
                  <p className="text-xs text-slate-500">Get care at home in 3 steps</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { n: "1", icon: Search, title: "Browse verified nurses", desc: "Filter by specialization, shift, location." },
                  { n: "2", icon: CalendarCheck, title: "Book in minutes", desc: "Choose date and care type. Confirm. No paperwork." },
                  { n: "3", icon: HeartHandshake, title: "Receive care at home", desc: "A verified nurse arrives ready to help." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
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
              <Link
                href="/patient/nurses"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
              >
                Browse nurses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Nurses */}
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">For Healthcare Professionals</p>
                  <p className="text-xs text-slate-500">Earn on your own schedule</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { n: "1", icon: UserPlus, title: "Build your profile", desc: "Specialization, certifications, services, availability." },
                  { n: "2", icon: ShieldCheck, title: "Get approved", desc: "Our team reviews your credentials and activates your profile." },
                  { n: "3", icon: Banknote, title: "Accept bookings", desc: "Manage your schedule and get paid per completed session." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-extrabold text-white shadow-sm">
                      {s.n}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{s.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/register?role=nurse"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Join as a nurse <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ══ EDUCATION LAYER ════════════════════════════════════════
            Replaces HEALTH TIPS, absorbs the spirit of OUR PROMISE
            and HOW WE VERIFY. Card-driven, admin-managed via
            /admin/education, lightweight by design. */}
        <EducationSection />

        {/* ══ FEATURED PACKAGES ══════════════════════════════════════
            Real packages from Firestore. Hidden when none are active. */}
        {featuredPackages.length > 0 && (
          <section id="packages" className="scroll-mt-20">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Care Packages</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Structured care for specific situations
                </h2>
              </div>
              <Link
                href="/services/packages"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-sky-600 transition hover:text-sky-700"
              >
                Browse all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </section>
        )}

        {/* ══ STORE PREVIEW ══════════════════════════════════════════
            Compact 4-product strip. Hidden by skeletons when loading. */}
        <section id="store" className="scroll-mt-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600">Medical Store</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Supplies, delivered</h2>
            </div>
            <Link
              href="/patient/store"
              className="hidden shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700 sm:block"
            >
              Browse store →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(loading ? Array(4).fill(null) : products).map((item, i) =>
              item ? (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-violet-100 hover:shadow-md"
                >
                  <div className="mb-3 flex h-16 items-center justify-center rounded-xl bg-slate-50 text-3xl">
                    {item.image}
                  </div>
                  <p className="text-sm font-bold leading-tight text-slate-800">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{item.category}</span>
                    <span className="text-sm font-extrabold text-violet-700">${item.price}</span>
                  </div>
                </div>
              ) : (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              ),
            )}
          </div>
        </section>
      </div>

      <PlatformFooter />
    </main>
  );
}
