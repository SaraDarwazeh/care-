"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Tag,
  ArrowRight,
  ListChecks,
  Target,
  ShieldCheck,
} from "lucide-react";
import type { CarePackage } from "@/lib/types";
import { tLocalized } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";
import { fmtCurrency, fmtNumber } from "@/lib/format";

function uniqueImages(pkg: CarePackage): string[] {
  const all: string[] = [];
  if (pkg.image) all.push(pkg.image);
  for (const url of pkg.images ?? []) {
    if (!all.includes(url)) all.push(url);
  }
  return all;
}

export default function PackageDetail({ pkg }: { pkg: CarePackage }) {
  const locale = useLocale() as Locale;
  const images = useMemo(() => uniqueImages(pkg), [pkg]);
  const [activeImage, setActiveImage] = useState(0);
  const heroImage = images[activeImage];

  const title = tLocalized(pkg.title, locale);
  const summary = tLocalized(pkg.summary, locale);
  const description = pkg.description ? tLocalized(pkg.description, locale) : undefined;
  const targetAudience = pkg.targetAudience ? tLocalized(pkg.targetAudience, locale) : undefined;

  // For the booking deep link we always pass the English title so the
  // patient marketplace's `where("service","==",…)` filter resolves
  // against a stable canonical value regardless of viewing locale.
  const bookHref = `/patient/nurses?service=${encodeURIComponent(
    typeof pkg.title === "string" ? pkg.title : pkg.title.en,
  )}&package=${pkg.slug ?? pkg.id}&durationDays=${pkg.durationDays}`;

  const isFixed = (pkg.pricingMode ?? "dynamic") === "fixed";
  const hasMultipleDurations = !isFixed && (pkg.durationOptions?.length ?? 0) > 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN COLUMN */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            {heroImage ? (
              <div className="relative aspect-[16/9] w-full sm:aspect-[2/1]">
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  unoptimized
                  className="object-cover"
                  priority
                />
                {pkg.featured && (
                  <span className="absolute start-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-50/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 shadow">
                    <Sparkles className="h-3.5 w-3.5" /> Featured
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/60 to-transparent p-6">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl">
                    {title}
                  </h1>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
              </div>
            )}

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
                {images.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl transition ${
                      idx === activeImage
                        ? "ring-2 ring-brand ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`Show image ${idx + 1}`}
                  >
                    <Image src={src} alt="" fill unoptimized className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 sm:p-8">
              <p className="text-base leading-relaxed text-slate-600">{summary}</p>
              {description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{description}</p>
              )}

              <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <CalendarDays className="h-4 w-4 text-brand" />
                  <strong className="font-semibold">{pkg.durationDays}</strong> days
                  {hasMultipleDurations && <span className="text-slate-400">· flexible</span>}
                </span>
                {pkg.shiftOptions && pkg.shiftOptions.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                    <Clock className="h-4 w-4 text-brand" />
                    Shifts: <strong className="font-semibold">{pkg.shiftOptions.join(", ")}</strong>
                  </span>
                )}
                {targetAudience && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                    <Users className="h-4 w-4 text-brand" />
                    {targetAudience}
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <ListChecks className="h-4 w-4 text-emerald-600" /> Included care
              </h2>
              <ul className="mt-4 space-y-3">
                {pkg.includedServices.map((s, i) => {
                  const label = tLocalized(s, locale);
                  return (
                    <li key={`${label}-${i}`} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {pkg.outcomes && pkg.outcomes.length > 0 && (
              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <Target className="h-4 w-4 text-brand" /> Expected outcomes
                </h2>
                <ul className="mt-4 space-y-3">
                  {pkg.outcomes.map((o, i) => {
                    const label = tLocalized(o, locale);
                    return (
                      <li key={`${label}-${i}`} className="flex items-start gap-2 text-sm text-slate-700">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          {pkg.careTimeline && pkg.careTimeline.length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <CalendarDays className="h-4 w-4 text-violet-600" /> Care timeline
              </h2>
              <ol className="mt-5 space-y-5 border-s-2 border-brand-mist ps-6">
                {pkg.careTimeline.map((step) => {
                  const stepTitle = tLocalized(step.title, locale);
                  const stepDesc = tLocalized(step.description, locale);
                  return (
                    <li key={`${step.day}-${stepTitle}`} className="relative">
                      <span className="absolute -start-[1.85rem] top-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-soft bg-white text-[10px] font-bold text-brand-deep">
                        D{step.day}
                      </span>
                      <p className="text-base font-bold text-slate-800">{stepTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{stepDesc}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {pkg.recommendedFor && pkg.recommendedFor.length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Users className="h-4 w-4 text-slate-600" /> Recommended for
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {pkg.recommendedFor.map((r, i) => {
                  const label = tLocalized(r, locale);
                  return (
                    <li key={`${label}-${i}`} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft/300" />
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {pkg.highlights && pkg.highlights.length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Tag className="h-4 w-4 text-amber-600" /> Highlights
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {pkg.highlights.map((h, i) => {
                  const label = tLocalized(h, locale);
                  return (
                    <li
                      key={`${label}-${i}`}
                      className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                    >
                      {label}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* PRICING SIDEBAR */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-brand-mist bg-white p-6 shadow-sm">
            {isFixed && pkg.basePricePerDay ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Fixed bundle · {pkg.durationDays} days
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {fmtCurrency(pkg.basePricePerDay * pkg.durationDays, locale, pkg.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {fmtCurrency(pkg.basePricePerDay, locale, pkg.currency)}/day × {pkg.durationDays} days — locked at booking.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Add-ons and tax are added on top at checkout.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">From</p>
                {pkg.basePricePerDay ? (
                  <p className="mt-1 text-3xl font-extrabold text-slate-900">
                    {fmtCurrency(pkg.basePricePerDay, locale, pkg.currency)}
                    <span className="ms-1 text-base font-medium text-slate-500">/day</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    Nurse hourly × duration
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Final price is computed at booking from the nurse&rsquo;s rate, your duration choice,
                  and any add-ons.
                </p>
              </>
            )}

            {hasMultipleDurations && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Duration options
                </p>
                <ul className="space-y-1.5">
                  {pkg.durationOptions!.map((opt) => (
                    <li
                      key={opt.days}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-bold text-slate-700">{tLocalized(opt.label, locale)}</span>
                      <span className="text-xs text-slate-500">
                        {opt.days} days
                        {opt.priceModifier && opt.priceModifier !== 1 && (
                          <span
                            className={`ms-2 font-bold ${
                              opt.priceModifier < 1 ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {opt.priceModifier < 1
                              ? `−${fmtNumber(Math.round((1 - opt.priceModifier) * 100), locale)}%`
                              : `+${fmtNumber(Math.round((opt.priceModifier - 1) * 100), locale)}%`}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href={bookHref}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Book this package <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services/packages"
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
            >
              Back to all packages
            </Link>

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-brand-soft/25 p-3 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p>
                All nurses are verified by Care+. Cancel free up to 24h before your visit
                starts.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
