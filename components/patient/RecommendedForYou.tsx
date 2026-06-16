"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, HeartPulse, Sparkles, Stethoscope, UserCircle, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import EmptyState from "@/components/common/EmptyState";
import {
  buildDashboardRecommendations,
  type ScoredNurse,
  type ScoredPackage,
  type ScoredService,
} from "@/services/recommendationService";
import { findMedicalCondition } from "@/lib/medicalConditions";
import { tLocalized } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";
import type { CarePackage, NurseMarketplaceProfile, PatientProfile } from "@/lib/types";

interface RecommendedForYouProps {
  profile: PatientProfile | null;
  nurses: ReadonlyArray<NurseMarketplaceProfile>;
  packages: ReadonlyArray<CarePackage>;
}

// Patient dashboard rail driven entirely by the in-memory profile +
// nurses + packages already loaded by the dashboard. No extra Firestore
// round-trips and no AI / external services — deterministic matching
// only. See services/recommendationService.ts for the scoring rules.
export default function RecommendedForYou({
  profile,
  nurses,
  packages,
}: RecommendedForYouProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("patient.dashboard.recommendedForYou");

  const recs = useMemo(
    () =>
      buildDashboardRecommendations({
        profile,
        nurses,
        packages,
        locale,
      }),
    [profile, nurses, packages, locale],
  );

  // Empty state: patient has no conditions on file yet. Push them to
  // the profile editor instead of rendering empty rails.
  if (!recs.hasAnyConditions) {
    return (
      <section className="space-y-3">
        <header className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800">{t("heading")}</h2>
        </header>
        <EmptyState
          icon={HeartPulse}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          ctaLabel={t("emptyCta")}
          ctaHref="/patient/profile?section=medical"
        />
      </section>
    );
  }

  const hasAnything =
    recs.services.length > 0 || recs.nurses.length > 0 || recs.packages.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800">{t("heading")}</h2>
        </div>
        <p className="hidden text-sm text-slate-500 sm:block">{t("subtitle")}</p>
      </header>

      {recs.services.length > 0 && (
        <ServicesRail items={recs.services} />
      )}
      {recs.nurses.length > 0 && (
        <NursesRail items={recs.nurses} />
      )}
      {recs.packages.length > 0 && (
        <PackagesRail items={recs.packages} locale={locale} />
      )}
    </section>
  );
}

// ---------- sub-rails ----------

function MatchedConditionsLine({ matchedIds }: { matchedIds: string[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("patient.dashboard.recommendedForYou");
  const labels = matchedIds
    .map((id) => findMedicalCondition(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => tLocalized(c.label, locale));
  if (labels.length === 0) return null;
  if (labels.length === 1) {
    return <p className="text-[11px] text-slate-500">{t("matchedForOne", { label: labels[0] })}</p>;
  }
  return (
    <p className="text-[11px] text-slate-500">
      {t("matchedFor", { labels: labels.slice(0, 3).join(" · ") })}
    </p>
  );
}

function ServicesRail({ items }: { items: ScoredService[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("patient.dashboard.recommendedForYou");
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
          {t("servicesTitle")}
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => {
          const href = `/patient/nurses?service=${encodeURIComponent(s.service.label.en)}`;
          return (
            <Link
              key={s.service.id}
              href={href}
              className="group flex h-full flex-col rounded-2xl border border-sky-100 bg-sky-50/40 p-4 transition hover:border-sky-300 hover:bg-sky-50"
            >
              <p className="text-sm font-bold text-slate-800 group-hover:text-sky-700">
                {tLocalized(s.service.label, locale)}
              </p>
              <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                {tLocalized(s.service.description, locale)}
              </p>
              <div className="mt-2">
                <MatchedConditionsLine matchedIds={s.matchedConditionIds} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NursesRail({ items }: { items: ScoredNurse[] }) {
  const t = useTranslations("patient.dashboard.recommendedForYou");
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
            {t("nursesTitle")}
          </h3>
        </div>
        <Link
          href="/patient/nurses"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          {t("browseAllNurses")} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((rec) => (
          <Link
            key={rec.nurse.userId}
            href={`/patient/nurses/${rec.nurse.userId}`}
            className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              {rec.nurse.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rec.nurse.profileImage}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <UserCircle className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                  {rec.nurse.fullName}
                </p>
                <p className="truncate text-[11px] text-slate-500">{rec.nurse.specialization}</p>
              </div>
            </div>
            {rec.nurse.location && (
              <p className="mt-2 truncate text-[11px] text-slate-400">{rec.nurse.location}</p>
            )}
            <p className="mt-2 text-[11px] font-semibold text-emerald-700">
              {t("matchedForOne", {
                label: `${rec.matchedServiceIds.length}`,
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PackagesRail({ items, locale }: { items: ScoredPackage[]; locale: Locale }) {
  const t = useTranslations("patient.dashboard.recommendedForYou");
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
            {t("packagesTitle")}
          </h3>
        </div>
        <Link
          href="/services/packages"
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
        >
          {t("browseAllPackages")} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((rec) => (
          <Link
            key={rec.pkg.id}
            href={`/services/packages/${rec.pkg.slug}`}
            className="group flex flex-col rounded-2xl border border-amber-100 bg-amber-50/30 p-4 transition hover:border-amber-300 hover:bg-amber-50"
          >
            <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700">
              {tLocalized(rec.pkg.title, locale)}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {tLocalized(rec.pkg.summary, locale)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
