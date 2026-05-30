import { CalendarClock, HeartHandshake, Pill } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Service catalog. Labels and descriptions are NOT stored here — they live
// in `messages/{locale}/services.json` under `services.categories.{slug}`.
// This file owns only: slug (the URL + translation key), image, CTA href,
// and the booking link hrefs. Icons are looked up by slug via
// `serviceIconForSlug` inside Client Components — keeping the icon
// component out of the data lets RSC serialize this catalog when a
// Server Component passes a `ServiceCategory` into a Client Component.

export type ServiceSlug = "one-time" | "shifts" | "packages";

export interface ServiceBookingLink {
  /** Destination — labels come from messages/services.categories.{slug}.bookingLinks. */
  href: string;
}

export interface ServiceCategory {
  slug: ServiceSlug;
  image: string;
  ctaHref: string;
  bookingLinks: ServiceBookingLink[];
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "one-time",
    image:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80",
    ctaHref: "/services/one-time",
    bookingLinks: [
      { href: "/patient/nurses?service=IV%20injection" },
      { href: "/patient/nurses?service=wound%20dressing" },
      { href: "/patient/nurses?service=post-operative%20care" },
    ],
  },
  {
    slug: "shifts",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd29?auto=format&fit=crop&q=80",
    ctaHref: "/services/shifts",
    bookingLinks: [
      { href: "/patient/nurses?shift=a" },
      { href: "/patient/nurses?shift=b" },
      { href: "/patient/nurses?shift=c" },
    ],
  },
  {
    slug: "packages",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80",
    ctaHref: "/services/packages",
    bookingLinks: [
      { href: "/patient/nurses?service=elderly%20care" },
      { href: "/patient/nurses?service=post-operative%20care" },
      { href: "/patient/nurses?service=wound%20dressing" },
    ],
  },
];

// Slug → icon resolver. Used by Client Components only. Importing it
// into a Server Component is fine; only the resolved value crosses the
// RSC boundary, never the catalog rows.
const ICONS: Record<ServiceSlug, LucideIcon> = {
  "one-time": Pill,
  shifts: CalendarClock,
  packages: HeartHandshake,
};

export function serviceIconForSlug(slug: ServiceSlug): LucideIcon {
  return ICONS[slug];
}

export const serviceCategoryBySlug = serviceCategories.reduce<Record<ServiceSlug, ServiceCategory>>(
  (accumulator, category) => {
    accumulator[category.slug] = category;
    return accumulator;
  },
  {} as Record<ServiceSlug, ServiceCategory>,
);
