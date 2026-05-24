import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { CarePackage } from "@/lib/types";

export default function PackageCard({ pkg }: { pkg: CarePackage }) {
  const heroImage = pkg.image ?? pkg.images?.[0];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={pkg.title}
            width={96}
            height={72}
            unoptimized
            className="h-20 w-24 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-20 w-24 shrink-0 rounded-lg bg-sky-50" />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-800">{pkg.title}</h3>
            {pkg.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                <Sparkles className="h-3 w-3" /> Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 line-clamp-3">{pkg.summary}</p>
          <p className="mt-2 text-xs text-slate-500">
            Duration: <strong>{pkg.durationDays} days</strong>
            {pkg.durationOptions && pkg.durationOptions.length > 1 && (
              <span className="text-slate-400"> · flexible</span>
            )}
          </p>
        </div>
      </div>

      {pkg.highlights.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {pkg.highlights.slice(0, 3).map((h) => (
            <li
              key={h}
              className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700"
            >
              {h}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-end pt-4">
        <Link
          href={`/services/packages/${pkg.slug ?? pkg.id}`}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
        >
          View package
        </Link>
      </div>
    </div>
  );
}
