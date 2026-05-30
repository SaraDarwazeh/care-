"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PlatformShell from "@/components/layout/PlatformShell";
import PackageCard from "@/components/packages/PackageCard";
import { listPackages } from "@/services/packageService";
import type { CarePackage } from "@/lib/types";

export default function CarePackagesPage() {
  const t = useTranslations("services.packagesList");
  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listPackages()
      .then((data) => {
        if (active) setPackages(data);
      })
      .catch((err) => {
        console.error("[CarePackagesPage] failed to load packages", err);
        if (active) setError(t("loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  return (
    <PlatformShell mode="service">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-3xl font-extrabold text-slate-900">{t("title")}</h1>
          <p className="mt-3 text-slate-600">{t("subtitle")}</p>
        </section>

        {loading ? (
          <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-slate-100/60" />
            ))}
          </section>
        ) : error ? (
          <section className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-medium text-rose-700">
            {error}
          </section>
        ) : packages.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            {t("empty")}
          </section>
        ) : (
          <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </section>
        )}
      </main>
    </PlatformShell>
  );
}
