import type { Locale } from "./config";
import type { NurseDay } from "@/lib/types";

// Per Phase 4 decision: Arabic locale uses Sunday-first week ordering
// (Gulf convention); English keeps Monday-first.
const WEEK_ORDER: Record<Locale, NurseDay[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ar: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function weekOrderFor(locale: Locale): NurseDay[] {
  return WEEK_ORDER[locale];
}

// Sort an existing array of NurseDay tokens into the canonical order
// for the active locale. Useful for "Selected: {days}" displays.
export function sortDaysForLocale(days: NurseDay[], locale: Locale): NurseDay[] {
  const order = WEEK_ORDER[locale];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
