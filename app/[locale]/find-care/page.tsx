"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import PlatformShell from "@/components/layout/PlatformShell";
import FindCareWizard from "@/components/findCare/FindCareWizard";

// New primary entry point for service discovery. Replaces /services
// as the recommended path for first-time visitors; /services stays
// alive for SEO and direct links, but the patient navbar and homepage
// hero point here.
//
// The wizard asks three questions (who is the care for / what's going
// on / when) and maps the answers via lib/findCareMapping.ts to the
// existing marketplace URL contract. No new backend; no new state
// layer; the diagnostic just steers the engine.
export default function FindCarePage() {
  const t = useTranslations("findCare.page");

  return (
    <PlatformShell mode="service">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            {t("kicker")}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            {t("subtitle")}
          </p>
        </header>

        <FindCareWizard />

        <p className="mt-10 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="h-3 w-3" />
          {t("secured")}
        </p>
      </main>
    </PlatformShell>
  );
}
