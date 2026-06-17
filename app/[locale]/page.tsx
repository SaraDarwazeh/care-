"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import PlatformNavbar from "@/components/layout/PlatformNavbar";
import PlatformFooter from "@/components/layout/PlatformFooter";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  HandHeart,
  Heart,
  HeartHandshake,
  Home as HomeIcon,
  MessageCircle,
  PlayCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getPublicStats, type PublicStats } from "@/services/publicStats";
import { listPublishedVideos } from "@/services/educationLibraryService";
import { getDonationPosts } from "@/services/communityService";
import { useEducationLibraryEnabled } from "@/hooks/useSiteSettings";
import type { Locale } from "@/i18n/config";
import type { DonationPost, EducationVideo } from "@/lib/types";
import { fmtNumber } from "@/lib/format";
import { tLocalized } from "@/lib/i18nContent";

/* ═══════════════════════════════════════════════════════════
   PAGE — public marketing surface for /.
   Trimmed per audit (2026-06-17) to three high-signal sections:
     1. Hero
     2. Why families choose Care+ (trust pillars)
     3. How it works (patient-side only)
   Pillars grid, education trust cards, featured packages, and
   the medical-store preview were removed from this page —
   they're still reachable through navigation and SEO routes
   but they were diluting first-impression conversion.
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const t = useTranslations("home");
  const tLib = useTranslations("home.library");
  const tCommunity = useTranslations("home.communityPreview");
  const locale = useLocale() as Locale;
  const educationEnabled = useEducationLibraryEnabled();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [libraryVideos, setLibraryVideos] = useState<EducationVideo[]>([]);
  const [communityPosts, setCommunityPosts] = useState<DonationPost[]>([]);

  useEffect(() => {
    let alive = true;
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

  // Library + community previews load in parallel after the hero. Both
  // are conditional — if there's no content the section collapses
  // silently, so we never ship a broken rail.
  useEffect(() => {
    let alive = true;
    if (educationEnabled) {
      listPublishedVideos()
        .then((vs) => {
          if (alive) setLibraryVideos(vs.slice(0, 3));
        })
        .catch((err) => console.warn("[home] library preview failed", err));
    }
    getDonationPosts(3)
      .then((ps) => {
        if (alive) setCommunityPosts(ps);
      })
      .catch((err) => console.warn("[home] community preview failed", err));
    return () => {
      alive = false;
    };
  }, [educationEnabled]);

  const trustItems = stats
    ? [
        { value: stats.verifiedNurses, label: t("hero.trust.verifiedNurses") },
        { value: stats.familiesServed, label: t("hero.trust.familiesServed") },
        { value: stats.completedBookings, label: t("hero.trust.visitsCompleted") },
      ].filter((item) => item.value > 0)
    : [];

  const whyItems = [
    {
      icon: HomeIcon,
      situation: t("why.parent.situation"),
      description: t("why.parent.description"),
      bg: "bg-brand-soft/30",
      border: "border-brand-mist",
      iconColor: "text-brand bg-brand-soft/50",
    },
    {
      icon: HeartHandshake,
      situation: t("why.recovery.situation"),
      description: t("why.recovery.description"),
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      iconColor: "text-emerald-600 bg-emerald-100",
    },
    {
      icon: Heart,
      situation: t("why.absent.situation"),
      description: t("why.absent.description"),
      bg: "bg-violet-50",
      border: "border-violet-100",
      iconColor: "text-violet-600 bg-violet-100",
    },
  ];

  const patientSteps = [
    { n: "1", icon: Search, title: t("how.patients.step1Title"), desc: t("how.patients.step1Desc") },
    { n: "2", icon: CalendarCheck, title: t("how.patients.step2Title"), desc: t("how.patients.step2Desc") },
    { n: "3", icon: HeartHandshake, title: t("how.patients.step3Title"), desc: t("how.patients.step3Desc") },
  ];

  return (
    <main className="min-h-screen bg-white">
      <PlatformNavbar />

      {/* ══ HERO ══ */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-b from-brand-soft/25 via-white to-white pt-10 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("hero.badge")}
              </div>

              <h1 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-[3rem] lg:text-[3.4rem]">
                {t("hero.headlineA")}
                <br />
                <span className="text-brand-deep">{t("hero.headlineB")}</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-slate-600">{t("hero.subhead")}</p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/find-care"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-hover"
                >
                  {t("hero.ctaFindNurse")} <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:support@careplus.health"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
                >
                  <MessageCircle className="h-4 w-4 text-brand" />
                  {t("hero.contactCta")}
                </a>
              </div>

              {/* Secondary nurse-recruitment link — demoted from a primary
                  CTA. The marketplace front door is patient-first; nurses
                  still find the path via this small line. */}
              <p className="text-xs">
                <Link
                  href="/register?role=nurse"
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {t("hero.joinNurseLink")}
                </Link>
              </p>

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
                      <p className="text-2xl font-extrabold text-slate-900">{fmtNumber(s.value, locale)}</p>
                      <p className="text-xs font-medium text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-2xl shadow-brand-soft/60">
                <div className="relative aspect-[4/5] w-full sm:aspect-[5/6]">
                  <Image
                    src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80"
                    alt={t("hero.imageAlt")}
                    fill
                    priority
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent" />
                </div>
              </div>
              <div className="absolute -bottom-5 start-1/2 -translate-x-1/2 sm:-bottom-6 sm:start-6 sm:translate-x-0">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{t("hero.verified.kicker")}</p>
                    <p className="text-sm font-semibold text-slate-700">{t("hero.verified.subtitle")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-12 sm:px-8 sm:space-y-24 sm:py-16">
        {/* ══ WHY HOME CARE ══ */}
        <section id="why" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">{t("why.kicker")}</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t("why.title")}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {whyItems.map((item) => (
              <div key={item.situation} className={`rounded-3xl border p-6 ${item.bg} ${item.border}`}>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${item.iconColor}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-slate-800 leading-snug">{item.situation}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS — patient steps only ══ */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">{t("how.kicker")}</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t("how.title")}</h2>
          </div>
          <div className="rounded-3xl border border-brand-mist bg-gradient-to-br from-brand-soft/25 to-white p-7 sm:p-10">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <HomeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{t("how.patients.title")}</p>
                <p className="text-xs text-slate-500">{t("how.patients.subtitle")}</p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {patientSteps.map((s) => (
                <div key={s.n} className="rounded-2xl border border-white/60 bg-white/70 p-5 backdrop-blur-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white shadow-sm">
                    {s.n}
                  </div>
                  <p className="font-semibold text-slate-800">{s.title}</p>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <Link
              href="/find-care"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-hover"
            >
              {t("how.patients.cta")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ══ LIBRARY PREVIEW ══
            Per the 2026-06-17 gap audit, the homepage was missing
            visibility for the Library + Community surfaces. These
            two compact previews restore breadth without bringing back
            the old 4-card pillars grid. Both hide silently when the
            backing data is empty so we never ship a broken rail. */}
        {educationEnabled && libraryVideos.length > 0 && (
          <section id="library-preview" className="scroll-mt-20">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600">
                  {tLib("kicker")}
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {tLib("title")}
                </h2>
              </div>
              <Link
                href="/patient/education"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-violet-700 hover:text-violet-800"
              >
                {tLib("browseAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {libraryVideos.map((v) => (
                <Link
                  key={v.id}
                  href={`/patient/education/${v.id}`}
                  className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 to-brand-soft/50 text-violet-600">
                        <PlayCircle className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-slate-800 group-hover:text-violet-700 line-clamp-2">
                      {tLocalized(v.title, locale)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {tLocalized(v.description, locale)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ══ COMMUNITY PREVIEW ══ */}
        {communityPosts.length > 0 && (
          <section id="community-preview" className="scroll-mt-20">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-600">
                  {tCommunity("kicker")}
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {tCommunity("title")}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">{tCommunity("subtitle")}</p>
              </div>
              <Link
                href="/community"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-800"
              >
                {tCommunity("browseAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {communityPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="group rounded-3xl border border-amber-100 bg-amber-50/40 p-5 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <HandHeart className="h-5 w-5" />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-amber-800 line-clamp-2">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {post.description}
                  </p>
                  {post.location && (
                    <p className="mt-2 text-[11px] font-semibold text-amber-700">{post.location}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <PlatformFooter />
    </main>
  );
}
