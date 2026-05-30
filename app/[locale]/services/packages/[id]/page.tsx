"use client";

import { use, useEffect, useState } from "react";
import PlatformShell from "@/components/layout/PlatformShell";
import PackageDetail from "@/components/packages/PackageDetail";
import { getPackageBySlug } from "@/services/packageService";
import type { CarePackage } from "@/lib/types";

export default function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pkg, setPkg] = useState<CarePackage | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getPackageBySlug(id)
      .then((found) => {
        if (active) setPkg(found);
      })
      .catch((err) => {
        console.error("[PackagePage] failed to load package", err);
        if (active) setPkg(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (pkg === undefined) {
    return (
      <PlatformShell mode="service">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </main>
      </PlatformShell>
    );
  }

  if (pkg === null) {
    return (
      <PlatformShell mode="service">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500">
            Package not found.
          </div>
        </main>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell mode="service">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <PackageDetail pkg={pkg} />
      </main>
    </PlatformShell>
  );
}
