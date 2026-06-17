"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

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

// Shared "back to parent" link used across every leaf page. The chevron
// renders as ChevronLeft in both locales — the global CSS rule in
// globals.css scaleX-flips every directional lucide icon under
// html[dir="rtl"], so manually swapping for ChevronRight here would
// double-flip and end up pointing the wrong way. Trust the CSS.
export default function BackLink({
  href,
  labelKey = "common.actions.back",
  tone = "muted",
  className,
}: BackLinkProps) {
  // Root-scope translator so callers pass fully-qualified keys
  // (e.g. "common.actions.back", "patient.dashboard.backToDashboard")
  // without having to thread a namespace prop.
  const t = useTranslations();

  const base =
    tone === "prominent"
      ? "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
      : "inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-sky-700";

  return (
    <Link href={href} className={`${base}${className ? ` ${className}` : ""}`}>
      <ChevronLeft className="h-3.5 w-3.5" />
      {t(labelKey)}
    </Link>
  );
}
