"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { ServiceCategory } from "@/lib/serviceCatalog";
import ServiceIcon from "@/components/services/ServiceIcon";

export default function ServiceCategoryCard({
  category,
  dark = false,
}: {
  category: ServiceCategory;
  dark?: boolean;
}) {
  const tCat = useTranslations(`services.categories.${category.slug}`);
  const tCard = useTranslations("services.card");
  const highlights = tCat.raw("highlights") as string[];

  return (
    <Link
      href={category.ctaHref}
      className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${
        dark
          ? "border-white/10 bg-white/5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] hover:border-white/20 hover:bg-white/8"
          : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-sky-200 hover:shadow-lg"
      }`}
    >
      <div className="relative h-36 w-full overflow-hidden">
        <Image
          src={category.image}
          alt={tCat("imageAlt")}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          unoptimized
        />
        <div
          className={`absolute inset-0 ${
            dark
              ? "bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"
              : "bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent"
          }`}
        />
        <div className="absolute start-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-sky-700 shadow-md backdrop-blur">
          <ServiceIcon slug={category.slug} className="h-5 w-5" />
        </div>
        <div className="absolute bottom-4 start-4 end-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-200/90">{tCat("eyebrow")}</p>
          <h3 className="mt-2 text-xl font-extrabold tracking-tight text-white">{tCat("title")}</h3>
        </div>
      </div>

      <div className={`space-y-4 p-5 ${dark ? "bg-transparent" : "bg-white"}`}>
        <p className={`text-sm leading-relaxed ${dark ? "text-slate-200" : "text-slate-600"}`}>
          {tCat("description")}
        </p>

        <div className="flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                dark ? "bg-white/10 text-white" : "bg-sky-50 text-sky-700"
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
            dark ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-sky-200" : "text-slate-400"}`}>
              {tCard("nextStep")}
            </p>
            <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{tCat("ctaLabel")}</p>
          </div>
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${dark ? "bg-white text-sky-700" : "bg-sky-600 text-white"}`}>
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
