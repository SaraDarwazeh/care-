import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CheckCircle2, Clock, Sparkles, Users } from "lucide-react";
import type { CarePackage } from "@/lib/types";

export default function PackageDetail({ pkg }: { pkg: CarePackage }) {
  const heroImage = pkg.image ?? pkg.images?.[0];
  const bookHref = `/patient/nurses?service=${encodeURIComponent(pkg.title)}&package=${
    pkg.slug ?? pkg.id
  }&durationDays=${pkg.durationDays}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {heroImage && (
          <div className="relative h-56 w-full sm:h-72">
            <Image
              src={heroImage}
              alt={pkg.title}
              fill
              unoptimized
              className="object-cover"
              priority
            />
            {pkg.featured && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-50/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 shadow">
                <Sparkles className="h-3.5 w-3.5" /> Featured
              </span>
            )}
          </div>
        )}
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{pkg.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{pkg.summary}</p>
          {pkg.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{pkg.description}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-sky-600" />
              <strong className="font-semibold">{pkg.durationDays}</strong> days default
            </span>
            {pkg.shiftOptions && pkg.shiftOptions.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                <Clock className="h-4 w-4 text-sky-600" />
                Shifts: <strong className="font-semibold">{pkg.shiftOptions.join(", ")}</strong>
              </span>
            )}
            {pkg.targetAudience && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5">
                <Users className="h-4 w-4 text-sky-600" />
                {pkg.targetAudience}
              </span>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={bookHref}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Book this package
            </Link>
            <Link
              href="/services/packages"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
            >
              Back to all packages
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Included care</h2>
          <ul className="mt-4 space-y-2">
            {pkg.includedServices.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {pkg.outcomes && pkg.outcomes.length > 0 && (
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Expected outcomes</h2>
            <ul className="mt-4 space-y-2">
              {pkg.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {pkg.recommendedFor && pkg.recommendedFor.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Recommended for</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {pkg.recommendedFor.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pkg.careTimeline && pkg.careTimeline.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Care timeline</h2>
          <ol className="mt-4 space-y-4 border-l-2 border-sky-100 pl-5">
            {pkg.careTimeline.map((step) => (
              <li key={`${step.day}-${step.title}`} className="relative">
                <span className="absolute -left-[1.6rem] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-sky-200 bg-white text-[10px] font-bold text-sky-700">
                  D{step.day}
                </span>
                <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="text-sm text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
