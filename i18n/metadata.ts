import type { Metadata } from "next";
import { LOCALES, DEFAULT_LOCALE } from "./config";

// hreflang generator. Pass the locale-stripped pathname ("/services",
// "/community/foo", etc.) — the helper builds the per-locale URLs and
// the canonical pointing at the default locale variant. Per the plan
// every page should ship reciprocal hreflang to keep Google from
// treating /en and /ar as competing duplicates.
export function buildAlternates(pathname: string): Metadata["alternates"] {
  const tail = pathname === "/" ? "" : pathname;
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = `/${loc}${tail}`;
  }
  return {
    canonical: `/${DEFAULT_LOCALE}${tail}`,
    languages,
  };
}
