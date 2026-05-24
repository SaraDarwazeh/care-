import { CalendarClock, HeartHandshake, Pill } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ServiceSlug = "one-time" | "shifts" | "packages";

export interface ServiceBookingLink {
  label: string;
  description: string;
  href: string;
}

export interface ServiceCategory {
  slug: ServiceSlug;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  bookingLinks: ServiceBookingLink[];
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "one-time",
    eyebrow: "Fast, single-visit care",
    title: "One-Time Services",
    description: "Book an individual healthcare task without setting up a long care plan.",
    image:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80",
    icon: Pill,
    highlights: ["IV Injection", "Wound Care", "Post-op Care"],
    ctaLabel: "Explore one-time care",
    ctaHref: "/services/one-time",
    bookingLinks: [
      {
        label: "IV Injection",
        description: "Quick medication support for one-time visits.",
        href: "/patient/nurses?service=IV%20injection",
      },
      {
        label: "Wound Care",
        description: "Dressing changes and recovery support.",
        href: "/patient/nurses?service=wound%20dressing",
      },
      {
        label: "Post-op Care",
        description: "Short-term support after surgery.",
        href: "/patient/nurses?service=post-operative%20care",
      },
    ],
  },
  {
    slug: "shifts",
    eyebrow: "Flexible schedule coverage",
    title: "Shift-Based Care",
    description: "Choose the right shift and arrange a nurse around your daily routine.",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd29?auto=format&fit=crop&q=80",
    icon: CalendarClock,
    highlights: ["Shift A", "Shift B", "Shift C"],
    ctaLabel: "Browse shifts",
    ctaHref: "/services/shifts",
    bookingLinks: [
      {
        label: "Shift A",
        description: "Morning coverage for early-day support.",
        href: "/patient/nurses?shift=a",
      },
      {
        label: "Shift B",
        description: "Afternoon care for daytime routines.",
        href: "/patient/nurses?shift=b",
      },
      {
        label: "Shift C",
        description: "Night coverage for overnight support.",
        href: "/patient/nurses?shift=c",
      },
    ],
  },
  {
    slug: "packages",
    eyebrow: "Bundled care plans",
    title: "Care Packages",
    description: "Bundle recurring needs into a clearer plan for elderly, post-op, or wound care.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80",
    icon: HeartHandshake,
    highlights: ["Elderly Package", "Post-op Recovery", "Wound Care Package"],
    ctaLabel: "See packages",
    ctaHref: "/services/packages",
    bookingLinks: [
      {
        label: "Elderly Package",
        description: "Matched to elderly care nurses and family support.",
        href: "/patient/nurses?service=elderly%20care",
      },
      {
        label: "Post-op Recovery",
        description: "Ideal for recovery support after surgery.",
        href: "/patient/nurses?service=post-operative%20care",
      },
      {
        label: "Wound Care Package",
        description: "Bundled support for wound dressing and healing.",
        href: "/patient/nurses?service=wound%20dressing",
      },
    ],
  },
];

export const serviceCategoryBySlug = serviceCategories.reduce<Record<ServiceSlug, ServiceCategory>>(
  (accumulator, category) => {
    accumulator[category.slug] = category;
    return accumulator;
  },
  {} as Record<ServiceSlug, ServiceCategory>,
);
