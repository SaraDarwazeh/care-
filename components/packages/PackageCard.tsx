import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import type { CarePackage } from "@/lib/types";

export default function PackageCard({ pkg }: { pkg: CarePackage }) {
  const heroImage = pkg.image ?? pkg.images?.[0];
  const currency = pkg.currency ?? "$";
  const hasMultipleDurations = (pkg.durationOptions?.length ?? 0) > 1;

  return (
    <Link
      href={`/services/packages/${pkg.slug ?? pkg.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-sky-100 to-sky-50">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={pkg.title}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CalendarDays className="h-12 w-12 text-sky-300" />
          </div>
        )}
        {pkg.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-50/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-slate-900/70 to-transparent p-4">
          <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow">
            {pkg.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{pkg.summary}</p>

        {pkg.highlights && pkg.highlights.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {pkg.highlights.slice(0, 3).map((h) => (
              <li
                key={h}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
              >
                {h}
              </li>
            ))}
            {pkg.highlights.length > 3 && (
              <li className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                +{pkg.highlights.length - 3} more
              </li>
            )}
          </ul>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {pkg.basePricePerDay ? "From" : "Pricing"}
            </p>
            {pkg.basePricePerDay ? (
              <p className="text-xl font-extrabold text-slate-900">
                {currency}
                {pkg.basePricePerDay}
                <span className="ml-1 text-xs font-medium text-slate-500">/day</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-700">Nurse rate × days</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {pkg.durationDays} days{hasMultipleDurations && " · flexible"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition group-hover:bg-sky-700">
            View
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
