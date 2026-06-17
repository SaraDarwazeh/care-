"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Award,
  HandHeart,
  PlayCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { listPublishedVideos } from "@/services/educationLibraryService";
import { getDonationPosts } from "@/services/communityService";
import { getPointsBalance, getPointsLedger } from "@/services/pointsService";
import { useAuth } from "@/hooks/useAuth";
import { useEducationLibraryEnabled } from "@/hooks/useSiteSettings";
import { tLocalized } from "@/lib/i18nContent";
import { fmtNumber } from "@/lib/format";
import type {
  BookingWithParticipants,
  DonationPost,
  EducationVideo,
  PointsLedgerEntry,
} from "@/lib/types";
import type { Locale } from "@/i18n/config";

interface DashboardWarmthRailsProps {
  /**
   * Completed bookings the patient hasn't yet reviewed. Drives the
   * "How was your visit?" prompt. Caller derives this list to keep
   * the rail component free of Firestore queries the dashboard
   * already runs.
   */
  pendingReviewBookings: BookingWithParticipants[];
}

// Bundles four warmth rails (Library / Community / Rewards / After-
// your-visit) into a single component so the dashboard's main file
// doesn't grow another four sections. Each rail loads its own data on
// mount and silently hides if the data is missing.
//
// Why a single composite component instead of four:
//   * keeps the dashboard page focused on layout, not data
//   * a single mount-time effect can dedupe Firestore reads if needed
//   * easier to reorder the rails as one block later
export default function DashboardWarmthRails({
  pendingReviewBookings,
}: DashboardWarmthRailsProps) {
  const { appUser } = useAuth();
  const locale = useLocale() as Locale;
  const t = useTranslations("patient.dashboard.warmth");
  const educationEnabled = useEducationLibraryEnabled();

  const [libraryVideos, setLibraryVideos] = useState<EducationVideo[]>([]);
  const [communityPosts, setCommunityPosts] = useState<DonationPost[]>([]);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [recentLedger, setRecentLedger] = useState<PointsLedgerEntry[]>([]);

  useEffect(() => {
    if (!appUser) return;
    let alive = true;

    if (educationEnabled) {
      listPublishedVideos()
        .then((vs) => {
          if (alive) setLibraryVideos(vs.slice(0, 3));
        })
        .catch((err) => console.warn("[dashboard-warmth] library failed", err));
    }

    getDonationPosts(3)
      .then((ps) => {
        if (alive) setCommunityPosts(ps);
      })
      .catch((err) => console.warn("[dashboard-warmth] community failed", err));

    Promise.all([getPointsBalance(appUser.id), getPointsLedger(appUser.id, 3)])
      .then(([balance, ledger]) => {
        if (!alive) return;
        setPointsBalance(balance);
        setRecentLedger(ledger);
      })
      .catch((err) => console.warn("[dashboard-warmth] points failed", err));

    return () => {
      alive = false;
    };
  }, [appUser, educationEnabled]);

  const topReviewable = useMemo(
    () => pendingReviewBookings.slice(0, 2),
    [pendingReviewBookings],
  );

  return (
    <>
      {/* After-your-visit rail. Surfaces completed bookings the patient
          hasn't reviewed yet — these accumulate forever otherwise. */}
      {topReviewable.length > 0 && (
        <section className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-extrabold text-slate-800">
              {t("postVisit.heading")}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topReviewable.map((booking) => (
              <Link
                key={booking.id}
                href={`/patient/appointments?review=${booking.id}`}
                className="group rounded-2xl bg-white border border-amber-100 p-4 transition hover:border-amber-300 hover:shadow-md"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  {t("postVisit.howWas")}
                </p>
                <p className="mt-1 font-bold text-slate-800 group-hover:text-amber-800">
                  {booking.nurseName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{booking.service}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                  {t("postVisit.cta")} <ArrowRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Library rail */}
      {educationEnabled && libraryVideos.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
                {t("library.kicker")}
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-800">
                {t("library.heading")}
              </h2>
            </div>
            <Link
              href="/patient/education"
              className="inline-flex items-center gap-1 text-sm font-bold text-violet-700 hover:text-violet-800"
            >
              {t("library.browseAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {libraryVideos.map((v) => (
              <Link
                key={v.id}
                href={`/patient/education/${v.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 to-sky-100 text-violet-600">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-slate-800 group-hover:text-violet-700 line-clamp-2 text-sm">
                    {tLocalized(v.title, locale)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Rewards card */}
      {pointsBalance !== null && (pointsBalance > 0 || recentLedger.length > 0) && (
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
                <Award className="h-3.5 w-3.5" /> {t("rewards.kicker")}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                {fmtNumber(pointsBalance, locale)}
                <span className="ms-1 text-sm font-bold text-slate-500">
                  {t("rewards.pointsUnit")}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{t("rewards.subtitle")}</p>
            </div>
            <Link
              href="/patient/profile?section=rewards"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50"
            >
              {t("rewards.viewLedger")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentLedger.length > 0 && (
            <ul className="mt-4 grid gap-1.5">
              {recentLedger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between text-xs text-slate-600"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    {t(`rewards.sources.${entry.source}`)}
                  </span>
                  <span className={`font-bold ${entry.type === "earn" ? "text-emerald-600" : "text-rose-600"}`}>
                    {entry.type === "earn" ? "+" : "−"}
                    {fmtNumber(entry.amount, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Community preview */}
      {communityPosts.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                {t("community.kicker")}
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-800">
                {t("community.heading")}
              </h2>
            </div>
            <Link
              href="/community"
              className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              {t("community.browseAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {communityPosts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="group rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md"
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <HandHeart className="h-4 w-4" />
                </div>
                <p className="font-bold text-slate-800 group-hover:text-emerald-800 line-clamp-2 text-sm">
                  {post.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                  {post.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
