import { LOCALES } from "@/i18n/config";

// Strip a leading locale segment from an internal pathname so it can be
// safely handed to next-intl's locale-aware router (localePrefix: "always"),
// which always re-adds the active locale. Without this, replaying a stored
// path that already carries a locale (e.g. the `redirect` query param set by
// the middleware) double-prefixes it: /en + /en/foo → /en/en/foo → 404.
//
// The `/${locale}/` boundary (note the trailing slash) guarantees we only
// strip a true locale *segment* — "/enroll" is left untouched because it
// neither equals "/en" nor starts with "/en/".
export function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}
