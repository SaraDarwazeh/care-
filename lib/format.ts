import { CURRENCY, NUMBERING_SYSTEM, TIME_ZONE } from "./config";
import type { Locale } from "@/i18n/config";

// Centralized Intl helpers. Every other module imports from here so the
// digit-policy and currency decisions live in one place. Do not call
// Intl.* directly elsewhere — it bypasses the numbering-system override.

function toDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function fmtDate(
  input: string | number | Date,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIME_ZONE,
    numberingSystem: NUMBERING_SYSTEM,
    ...opts,
  }).format(toDate(input));
}

export function fmtDateTime(
  input: string | number | Date,
  locale: Locale,
): string {
  return fmtDate(input, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtNumber(
  value: number,
  locale: Locale,
  opts: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    numberingSystem: NUMBERING_SYSTEM,
    ...opts,
  }).format(value);
}

// Currency accepts an options bag so callers can override fraction digits
// for compact stat cards. Default behaviour (2 fraction digits) is unchanged.
export function fmtCurrency(
  value: number,
  locale: Locale,
  optsOrCurrency: Intl.NumberFormatOptions | string = {},
): string {
  const opts: Intl.NumberFormatOptions =
    typeof optsOrCurrency === "string"
      ? { currency: optsOrCurrency }
      : optsOrCurrency;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
    numberingSystem: NUMBERING_SYSTEM,
    ...opts,
  }).format(value);
}

export function fmtRelative(
  input: string | number | Date,
  locale: Locale,
): string {
  const target = toDate(input).getTime();
  const now = Date.now();
  const diffSec = Math.round((target - now) / 1000);
  const abs = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    numberingSystem: NUMBERING_SYSTEM,
  } as Intl.RelativeTimeFormatOptions);

  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), "day");
  if (abs < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), "month");
  return rtf.format(Math.round(diffSec / 31_536_000), "year");
}
