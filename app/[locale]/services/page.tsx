import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import ServiceCategoryCard from "@/components/services/ServiceCategoryCard";
import PlatformShell from "@/components/layout/PlatformShell";
import { serviceCategories } from "@/lib/serviceCatalog";

// /services stays alive for SEO + existing direct links per the
// audit, but the primary CTA now routes through the new /find-care
// diagnostic flow. Patients who land here from a search engine or
// bookmark still see the 4-card billing-mode grid as a fallback;
// patients who tap the primary CTA take the recommended path.
export default function ServicesOverviewPage() {
  const t = useTranslations("services.overview");

  return (
    <PlatformShell mode="service">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-700">
              <ShieldCheck className="h-4 w-4" /> {t("badge")}
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("title")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{t("description")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/find-care"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                <Sparkles className="h-4 w-4" />
                {t("primaryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/patient/nurses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                {t("browseNurses")}
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t("primaryCtaHelp")}</p>
          </div>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {serviceCategories.map((category) => (
            <ServiceCategoryCard key={category.slug} category={category} />
          ))}
        </section>
      </main>
    </PlatformShell>
  );
}
