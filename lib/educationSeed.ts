import type { EducationCard } from "@/lib/types";

// Starter set of education cards. Used by `educationService.seedIfEmpty()`
// the first time the homepage renders the section against an empty
// collection. Admins can edit, disable, or replace these freely after
// the first load — they're seeded, not enforced.
//
// Card-shape rules (enforced by the admin form):
//   title ≤ 60 chars
//   body  ≤ 180 chars
// These limits are intentional — the surface is a scannable card grid,
// not a blog. If a single card needs more than 180 chars, the message
// probably needs to be split into two cards.

export const DEFAULT_EDUCATION_CARDS: Omit<EducationCard, "createdAt" | "updatedAt">[] = [
  // ── WHY HOME CARE ─────────────────────────────────────────────
  {
    id: "why-comfort",
    kind: "why",
    title: "Recovery happens better at home",
    body: "Familiar surroundings reduce stress and disorientation, especially for elderly patients and those recovering from surgery.",
    icon: "Home",
    accent: "sky",
    order: 1,
    active: true,
  },
  {
    id: "why-one-on-one",
    kind: "why",
    title: "One nurse. Your full attention.",
    body: "Unlike a hospital floor where one nurse covers many patients, home care means undivided focus on one person and one care plan.",
    icon: "Heart",
    accent: "rose",
    order: 2,
    active: true,
  },
  {
    id: "why-family",
    kind: "why",
    title: "Care that fits your family",
    body: "Visits work around school runs, work shifts, and meals — not the other way around. Your routine stays yours.",
    icon: "HeartHandshake",
    accent: "emerald",
    order: 3,
    active: true,
  },
  {
    id: "why-cost",
    kind: "why",
    title: "Often more affordable than facilities",
    body: "Skip facility overhead. Pay for the hours of care you actually need — by the visit, the shift, or as a structured package.",
    icon: "Sparkles",
    accent: "amber",
    order: 4,
    active: true,
  },

  // ── FAQ ───────────────────────────────────────────────────────
  {
    id: "faq-pricing",
    kind: "faq",
    title: "How does pricing work?",
    body: "You pay per visit, per shift, or per care package. Prices are shown upfront before you book — no surprise charges or hidden fees.",
    icon: "HelpCircle",
    accent: "sky",
    order: 1,
    active: true,
  },
  {
    id: "faq-cancel",
    kind: "faq",
    title: "Can I cancel a booking?",
    body: "Yes — cancel any pending booking for free before a nurse accepts. After confirmation, contact your nurse to reschedule.",
    icon: "Clock",
    accent: "amber",
    order: 2,
    active: true,
  },
  {
    id: "faq-emergency",
    kind: "faq",
    title: "Is this for emergencies?",
    body: "No. Care+ is for planned home nursing — recovery, elderly support, post-op care. For emergencies, call your local emergency number.",
    icon: "Info",
    accent: "rose",
    order: 3,
    active: true,
  },
  {
    id: "faq-records",
    kind: "faq",
    title: "Who sees my medical records?",
    body: "Only you, the nurses you book with, and Care+ administrators. Records are encrypted and never shared with third parties.",
    icon: "Shield",
    accent: "violet",
    order: 4,
    active: true,
  },

  // ── WHAT TO EXPECT ────────────────────────────────────────────
  {
    id: "expect-verification",
    kind: "what-to-expect",
    title: "Every nurse is verified",
    body: "Profiles, licenses, and certifications are reviewed by the Care+ team before a nurse is activated. Patients only ever see approved nurses.",
    icon: "ShieldCheck",
    accent: "emerald",
    order: 1,
    active: true,
  },
  {
    id: "expect-first-visit",
    kind: "what-to-expect",
    title: "What happens on the first visit",
    body: "Your nurse reviews your profile, confirms medications and allergies, and starts care. You confirm the visit notes afterward — your records, your sign-off.",
    icon: "Calendar",
    accent: "sky",
    order: 2,
    active: true,
  },
  {
    id: "expect-pace",
    kind: "what-to-expect",
    title: "Confirmation usually within hours",
    body: "Most nurses respond within a few hours. If a nurse can't make it, we help you find a verified alternative quickly.",
    icon: "Clock",
    accent: "amber",
    order: 3,
    active: true,
  },
  {
    id: "expect-control",
    kind: "what-to-expect",
    title: "You stay in control",
    body: "You set the schedule, the location, and your preferences. Patients can review and dispute medical records if anything looks off.",
    icon: "Check",
    accent: "violet",
    order: 4,
    active: true,
  },
];
