import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { SITE_URL } from "@/lib/config";

// Static public surface. Dynamic routes (nurse details, package
// details, community posts) are intentionally omitted — those are
// data-driven and would require a server fetch from the sitemap, which
// runs at build time. Add them with on-demand revalidation if SEO for
// detail pages becomes a priority.
const PUBLIC_PATHS = [
  "",
  "/services",
  "/services/packages",
  "/services/one-time",
  "/services/shifts",
  "/community",
  "/privacy",
  "/terms",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.flatMap((path) =>
    LOCALES.map((locale) => {
      const url = `${SITE_URL}/${locale}${path}`;
      // Each entry advertises the full hreflang map so crawlers learn
      // the locale pairing (the bare /en and /ar variants of the same
      // page are alternates of each other, not competing pages).
      const languages: Record<string, string> = {};
      for (const alt of LOCALES) {
        languages[alt] = `${SITE_URL}/${alt}${path}`;
      }
      languages["x-default"] = `${SITE_URL}/en${path}`;
      return {
        url,
        lastModified: now,
        alternates: { languages },
      };
    }),
  );
}
