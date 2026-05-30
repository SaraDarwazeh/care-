// Locale registry. Add a new locale here and the rest of the i18n
// stack (middleware, layout, switcher, formatters) picks it up.
// Direction is hard-coded per locale because we only support two and
// CLDR-based detection is overkill.

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return DIRECTION[locale];
}

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}
