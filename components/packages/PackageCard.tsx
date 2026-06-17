"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import type { CarePackage } from "@/lib/types";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";

export default function PackageCard({ pkg }: { pkg: CarePackage }) {
  const t = useTranslations("services.packageCard");
  const locale = useLocale() as Locale;
  const heroImage = pkg.image ?? pkg.images?.[0];
  const hasMultipleDurations = (pkg.durationOptions?.length ?? 0) > 1;
  const title = tLocalized(pkg.title, locale);
  const summary = tLocalized(pkg.summary, locale);

  return (
    <Link
      href={`/services/packages/${pkg.slug ?? pkg.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-brand-soft/50 to-brand-soft/30">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={title}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CalendarDays className="h-12 w-12 text-brand-soft" />
          </div>
        )}
        {pkg.featured && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-50/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow">
            <Sparkles className="h-3 w-3" /> {t("featured")}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-slate-900/70 to-transparent p-4">
          <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow">
            {title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{summary}</p>

        {pkg.highlights && pkg.highlights.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {pkg.highlights.slice(0, 3).map((h, i) => {
              const label = tLocalized(h, locale);
              return (
                <li
                  key={`${label}-${i}`}
                  className="rounded-full bg-brand-soft/30 px-2.5 py-1 text-[11px] font-semibold text-brand-deep"
                >
                  {label}
                </li>
              );
            })}
            {pkg.highlights.length > 3 && (
              <li className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {t("highlightsMore", { n: pkg.highlights.length - 3 })}
              </li>
            )}
          </ul>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {pkg.basePricePerDay ? t("from") : t("pricing")}
            </p>
            {pkg.basePricePerDay ? (
              <p className="text-xl font-extrabold text-slate-900">
                {fmtCurrency(pkg.basePricePerDay, locale, pkg.currency)}
                <span className="ms-1 text-xs font-medium text-slate-500">{t("perDay")}</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-700">{t("nurseRateTimesDays")}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {t("durationDays", { n: pkg.durationDays })}
              {hasMultipleDurations && ` · ${t("flexible")}`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-sm transition group-hover:bg-brand-deep">
            {t("view")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
