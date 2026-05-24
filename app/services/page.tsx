import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import ServiceCategoryCard from "@/components/services/ServiceCategoryCard";
import PlatformShell from "@/components/layout/PlatformShell";
import { serviceCategories } from "@/lib/serviceCatalog";

export default function ServicesOverviewPage() {
  return (
    <PlatformShell mode="service">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-700">
              <ShieldCheck className="h-4 w-4" /> Services
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Choose the right care path before you book.</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Care Plus groups the main services into one-time visits, shift coverage, and care packages so families can move into the right booking flow faster.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/patient/nurses" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700">
                Browse nurses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">
                Back to home
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          {serviceCategories.map((category) => (
            <ServiceCategoryCard key={category.slug} category={category} />
          ))}
        </section>
      </main>
    </PlatformShell>
  );
}
