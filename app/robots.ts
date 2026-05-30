import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated routes — let crawlers learn the locale paths
        // exist (sitemap covers /en + /ar) but stay out of dashboards.
        disallow: ["/api/", "/en/admin/", "/ar/admin/", "/en/nurse/", "/ar/nurse/", "/en/patient/", "/ar/patient/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
