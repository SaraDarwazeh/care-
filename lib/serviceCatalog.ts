import { CalendarClock, HeartHandshake, Pill, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Service catalog. Labels and descriptions are NOT stored here — they live
// in `messages/{locale}/services.json` under `services.categories.{slug}`.
// This file owns only: slug (the URL + translation key), image, CTA href,
// and the booking link hrefs. Icons are looked up by slug via
// `serviceIconForSlug` inside Client Components — keeping the icon
// component out of the data lets RSC serialize this catalog when a
// Server Component passes a `ServiceCategory` into a Client Component.

export type ServiceSlug = "one-time" | "shifts" | "packages" | "additional";

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
    // bookingType=shift is implicit when shift=… is present, but the
    // explicit param is harmless and keeps every link self-describing.
    bookingLinks: [
      { href: "/patient/nurses?bookingType=shift&shift=a" },
      { href: "/patient/nurses?bookingType=shift&shift=b" },
      { href: "/patient/nurses?bookingType=shift&shift=c" },
    ],
  },
  {
    slug: "packages",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80",
    ctaHref: "/services/packages",
    // bookingType=package opens the booking form at package mode even
    // when no specific package is pre-selected. Previously the form
    // defaulted to one-time, forcing the patient to re-choose package.
    bookingLinks: [
      { href: "/patient/nurses?bookingType=package&service=elderly%20care" },
      { href: "/patient/nurses?bookingType=package&service=post-operative%20care" },
      { href: "/patient/nurses?bookingType=package&service=wound%20dressing" },
    ],
  },
  {
    slug: "additional",
    image:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80",
    ctaHref: "/services/additional",
    bookingLinks: [
      { href: "/patient/nurses?additional=cooking" },
      { href: "/patient/nurses?additional=transport" },
      { href: "/patient/nurses?additional=companion" },
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
  additional: Sparkles,
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
