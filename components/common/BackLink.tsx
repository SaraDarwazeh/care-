"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { dirFor, type Locale } from "@/i18n/config";

interface BackLinkProps {
  /** Destination href. Locale-prefix is handled by next-intl's Link. */
  href: string;
  /**
   * Fully-qualified i18n key for the label (e.g.
   * "common.actions.back" or "patient.dashboard.backToDashboard").
   * Defaults to "common.actions.back".
   */
  labelKey?: string;
  /** Tone — defaults to muted; "prominent" gives a higher-contrast pill. */
  tone?: "muted" | "prominent";
  /** Extra classes appended after the base styling. */
  className?: string;
}

// Shared "back to parent" link used across every leaf page. The icon
// flips for RTL — ChevronLeft on LTR locales, ChevronRight on RTL — so
// the visual direction always matches "previous page" regardless of
// the user's reading order.
//
// Previously the codebase had 9 inline implementations of this exact
// pattern with two icon variants (ChevronLeft vs ArrowLeft) and slight
// styling drift. Standardising on one component gives us a single
// place to evolve the affordance later (history-aware back, focus
// outline, etc.).
export default function BackLink({
  href,
  labelKey = "common.actions.back",
  tone = "muted",
  className,
}: BackLinkProps) {
  const locale = useLocale() as Locale;
  // Root-scope translator so callers pass fully-qualified keys
  // (e.g. "common.actions.back", "patient.dashboard.backToDashboard")
  // without having to thread a namespace prop.
  const t = useTranslations();
  const Icon = dirFor(locale) === "rtl" ? ChevronRight : ChevronLeft;

  const base =
    tone === "prominent"
      ? "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
      : "inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-sky-700";

  return (
    <Link href={href} className={`${base}${className ? ` ${className}` : ""}`}>
      <Icon className="h-3.5 w-3.5" />
      {t(labelKey)}
    </Link>
  );
}
