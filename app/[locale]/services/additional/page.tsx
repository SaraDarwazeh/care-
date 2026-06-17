"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Car,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  ListChecks,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import PlatformShell from "@/components/layout/PlatformShell";
import { serviceCategoryBySlug } from "@/lib/serviceCatalog";
import { SUPPORT_SERVICES } from "@/lib/serviceTaxonomy";
import { tLocalized } from "@/lib/i18nContent";
import { dirFor, type Locale } from "@/i18n/config";
import { fmtCurrency } from "@/lib/format";

// Whitelisted icon mapping keeps the lucide tree-shaker happy and lets us
// render exactly the icons referenced by the support catalogue. Falls
// back to Sparkles for any unknown id.
const SUPPORT_ICONS: Record<string, LucideIcon> = {
  ChefHat,
  Car,
  ShoppingBag,
  Sparkles,
  HeartHandshake,
  ListChecks,
};

export default function AdditionalServicesPage() {
  const locale = useLocale() as Locale;
  const tCat = useTranslations("services.categories.additional");
  const tBook = useTranslations("services.booking");
  const tAdditional = useTranslations("services.additional");

  const category = serviceCategoryBySlug["additional"];
  const highlights = tCat.raw("highlights") as string[];
  const BackChevron = dirFor(locale) === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <PlatformShell mode="service">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Link href="/services" className="inline-flex items-center gap-1.5 transition hover:text-sky-700">
            <BackChevron className="h-4 w-4" /> {tBook("breadcrumb")}
          </Link>
          <span>/</span>
          <span className="text-slate-700">{tCat("title")}</span>
        </div>

        {/* Hero */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="relative h-56 w-full sm:h-72">
            <Image src={category.image} alt={tCat("imageAlt")} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 text-white">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
                {tCat("eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">
                {tAdditional("title")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-100 sm:text-base">
                {tAdditional("subtitle")}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">
              {tAdditional("addOnNotice")}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/patient/nurses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                {tAdditional("startBooking")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                {tAdditional("browseAll")}
              </Link>
            </div>
          </div>
        </section>

        {/* Catalogue grid */}
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT_SERVICES.map((service) => {
              const Icon = SUPPORT_ICONS[service.icon] ?? Sparkles;
              return (
                <article
                  key={service.id}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{tLocalized(service.label, locale)}</h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          {tAdditional("kindLabel")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {tLocalized(service.description, locale)}
                      </p>
                      {typeof service.defaultPrice === "number" && service.defaultPrice > 0 ? (
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          {tAdditional("priceLabel", {
                            amount: fmtCurrency(service.defaultPrice, locale),
                          })}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {tAdditional("priceFreeLabel")}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
