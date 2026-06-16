"use client";

import { useTranslations, useLocale } from "next-intl";
import { HeartPulse, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { findMedicalCondition } from "@/lib/medicalConditions";
import { tLocalized } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";
import type { PatientProfile } from "@/lib/types";

interface YourHealthProfileProps {
  profile: PatientProfile | null;
}

const CHIP_LIMIT = 8;

// Small companion card on the patient dashboard. Surfaces the canonical
// condition chips driving recommendations so the patient understands
// what's being matched on, and offers an edit shortcut. Hidden when
// the patient has no conditions on file — the recommendations card
// below already nudges them to add some.
export default function YourHealthProfile({ profile }: YourHealthProfileProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("patient.dashboard.yourHealthProfile");

  const canonical = (profile?.conditions ?? [])
    .map((id) => findMedicalCondition(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const custom = profile?.diseases ?? [];
  const total = canonical.length + custom.length;

  if (total === 0) return null;

  const visibleCanonical = canonical.slice(0, CHIP_LIMIT);
  const remainingCanonical = canonical.length - visibleCanonical.length;
  const visibleCustom = custom.slice(0, Math.max(0, CHIP_LIMIT - visibleCanonical.length));
  const remainingCustom = custom.length - visibleCustom.length;
  const remaining = remainingCanonical + remainingCustom;

  return (
    <section className="rounded-3xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-slate-800">
                {t("heading")}
              </h3>
              <p className="text-xs text-slate-500">{t("subtitle")}</p>
            </div>
            <Link
              href="/patient/profile?section=medical"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
            >
              <Pencil className="h-3 w-3" /> {t("edit")}
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleCanonical.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-semibold text-violet-700"
              >
                {tLocalized(c.label, locale)}
              </span>
            ))}
            {visibleCustom.map((value) => (
              <span
                key={`custom:${value}`}
                className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700"
                title={t("customSectionLabel")}
              >
                {value}
              </span>
            ))}
            {remaining > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {t("moreCount", { n: remaining })}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
