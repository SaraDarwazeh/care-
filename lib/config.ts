// Single source of truth for region/currency. Switching the currency
// is one constant change; every Intl-based formatter reads from here.

export const CURRENCY = "ILS";

// Where dates/times default to when no IANA timezone is supplied to a
// formatter. Healthcare records lean on a single consistent zone for the
// service region; this can move per market without code changes.
export const TIME_ZONE = "Asia/Amman";

// Forces Latin digits (0-9) in every Intl formatter regardless of locale.
// Decision: clinical clarity for prices, vitals, and dates outweighs
// Arabic-Indic native feel. Keep in sync with the plan's digit policy.
export const NUMBERING_SYSTEM = "latn";

// Public origin used to build absolute URLs in the sitemap, hreflang
// alternates, and any other SEO surface. Override per-environment via
// NEXT_PUBLIC_SITE_URL; the default is a placeholder so non-prod builds
// don't accidentally publish prod-looking URLs.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://careplus.example.com";
