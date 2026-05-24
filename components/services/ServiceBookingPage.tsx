import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import type { ServiceCategory } from "@/lib/serviceCatalog";

export default function ServiceBookingPage({ category }: { category: ServiceCategory }) {
  const Icon = category.icon;
  const isPackageCategory = category.slug === "packages";
  const packagePlans = [
    {
      title: "Elderly care bundle",
      summary: "Ongoing help for daily support, reminders, and family check-ins.",
      cadence: "Best for recurring visits",
      href: category.bookingLinks[0].href,
    },
    {
      title: "Post-op recovery bundle",
      summary: "Short-term care after surgery with wound support and monitoring.",
      cadence: "Best for short recovery periods",
      href: category.bookingLinks[1].href,
    },
    {
      title: "Wound care bundle",
      summary: "Focused dressing changes and healing support across multiple visits.",
      cadence: "Best for continuity of care",
      href: category.bookingLinks[2].href,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-slate-500">
        <Link href="/services" className="inline-flex items-center gap-1.5 transition hover:text-sky-700">
          <ChevronLeft className="h-4 w-4" /> Services
        </Link>
        <span>/</span>
        <span className="text-slate-700">{category.title}</span>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="relative h-56 w-full sm:h-72">
            <Image src={category.image} alt={category.title} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 text-white">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Icon className="h-7 w-7" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-200">{category.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{category.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-100 sm:text-base">{category.description}</p>
            </div>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {category.highlights.map((item) => (
                <span key={item} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                  {item}
                </span>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              Pick the service that fits your need, then move into the patient booking flow with the right filter already applied.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={category.bookingLinks[0].href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                Start booking
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/patient/nurses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                Browse all nurses
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Booking paths
          </div>
          <div className="space-y-4">
            {category.bookingLinks.map((link) => (
              <Card key={link.label} title={link.label} description={link.description}>
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Open booking flow
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
        </aside>
      </section>

      {isPackageCategory ? (
        <section className="mt-8 rounded-[2rem] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">Package structure</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">How the care package is organized</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Packages are grouped by the kind of support families usually need most. Each one still routes into the same secure booking flow, but the starting point is easier to understand.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {packagePlans.map((plan) => (
              <Card key={plan.title} title={plan.title} description={plan.summary}>
                <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{plan.cadence}</p>
                  <Link
                    href={plan.href}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                  >
                    Start with this bundle
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
