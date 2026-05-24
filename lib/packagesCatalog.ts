import type { CarePackage } from "@/lib/types";

// Re-export for older imports that pulled the type from this module.
export type { CarePackage };

// DEFAULT_PACKAGES is the canonical seed used to populate the `packages`
// Firestore collection on first read. Admins can then edit/delete/add via the
// admin UI; this file is no longer the source of truth at runtime.
export const DEFAULT_PACKAGES: CarePackage[] = [
  {
    id: "post-op",
    slug: "post-op",
    title: "Post-Op Recovery",
    summary:
      "Short-term recovery support following surgery — wound care, medication, and gentle daily monitoring at home.",
    description:
      "A focused 7-day plan starting the day you leave the hospital. A trained nurse visits each day to manage your dressings, supervise medications, watch for early signs of infection, and help you regain confidence with movement and self-care.",
    targetAudience:
      "Adults recovering from elective or post-emergency surgery who need short-term clinical follow-up at home.",
    recommendedFor: [
      "Patients discharged in the last 72 hours",
      "Surgical sites that need regular dressing changes",
      "Households without medical training",
    ],
    includedServices: [
      "Wound and incision care",
      "Medication administration",
      "Vital signs monitoring",
      "Post-op symptom tracking",
    ],
    highlights: [
      "Daily check-ins",
      "Wound dressing",
      "Medication oversight",
    ],
    outcomes: [
      "Clean, monitored wound healing",
      "Early detection of infection",
      "Confidence with home recovery",
    ],
    careTimeline: [
      { day: 1, title: "Settle in", description: "Nurse reviews discharge notes, sets up medication schedule, inspects wound." },
      { day: 3, title: "First dressing change", description: "Sterile dressing change, pain check, mobility encouragement." },
      { day: 7, title: "Recovery review", description: "Final assessment, hand-off to primary care if further follow-up is needed." },
    ],
    durationDays: 7,
    durationOptions: [
      { days: 5, label: "5 days" },
      { days: 7, label: "1 week" },
      { days: 14, label: "2 weeks" },
    ],
    shiftOptions: ["A", "B"],
    addOns: ["companion"],
    image:
      "https://images.unsplash.com/photo-1580281657521-6b2b7f0b7f6a?auto=format&fit=crop&q=80",
    active: true,
    featured: true,
  },
  {
    id: "elderly-companion",
    slug: "elderly-companion",
    title: "Elderly Companion Care",
    summary:
      "A month of companionship and daily-living support for elderly patients — safe routines, meals, and mobility help.",
    description:
      "Built for elderly family members who are mostly independent but benefit from a consistent caregiver. Includes companionship, meal preparation, light housekeeping, mobility assistance, and gentle medication reminders.",
    targetAudience:
      "Elderly individuals living at home who need daily structure, safety, and a familiar face.",
    recommendedFor: [
      "Seniors at risk of social isolation",
      "Families that need a reliable daily presence",
      "Patients with mild mobility limitations",
    ],
    includedServices: [
      "Companion support",
      "Meal preparation",
      "Mobility assistance",
      "Medication reminders",
      "Light housekeeping",
    ],
    highlights: [
      "Daily companionship",
      "Meal support",
      "Mobility assistance",
    ],
    outcomes: [
      "Predictable daily routine",
      "Reduced fall risk",
      "Peace of mind for family",
    ],
    careTimeline: [
      { day: 1, title: "Care plan setup", description: "Nurse meets the family, reviews preferences, agrees on a daily routine." },
      { day: 7, title: "First weekly review", description: "Adjust routine based on what's working; share notes with family." },
      { day: 30, title: "Plan refresh", description: "End-of-month assessment to extend, scale up, or scale down care." },
    ],
    durationDays: 30,
    durationOptions: [
      { days: 14, label: "2 weeks" },
      { days: 30, label: "1 month" },
      { days: 60, label: "2 months" },
    ],
    shiftOptions: ["A", "B"],
    addOns: ["cooking", "cleaning", "shopping"],
    image:
      "https://images.unsplash.com/photo-1586201375759-6d2f1c7ef3a5?auto=format&fit=crop&q=80",
    active: true,
    featured: true,
  },
  {
    id: "total-dependence",
    slug: "total-dependence",
    title: "Total Dependence Care",
    summary:
      "Comprehensive 24/7 support for patients who need full daily care, hygiene, feeding, and continuous monitoring.",
    description:
      "Designed for patients who cannot manage daily activities independently. Rotating nurses provide round-the-clock personal care, hygiene support, feeding assistance, repositioning, and continuous health monitoring.",
    targetAudience:
      "Patients with severe mobility loss, dementia, or post-stroke needs requiring full personal care.",
    recommendedFor: [
      "Patients who are bedbound or fully dependent",
      "Families overwhelmed by 24/7 caregiving",
      "Post-stroke or late-stage dementia care",
    ],
    includedServices: [
      "Personal hygiene",
      "Feeding assistance",
      "Medication management",
      "Repositioning and skin care",
      "Vital signs monitoring",
    ],
    highlights: [
      "24/7 coverage",
      "Personal care",
      "Medication management",
    ],
    outcomes: [
      "Continuous clinical oversight",
      "Reduced risk of bedsores",
      "Stable medication adherence",
    ],
    careTimeline: [
      { day: 1, title: "Intake assessment", description: "Detailed medical review, family briefing, schedule of rotating nurses." },
      { day: 14, title: "Mid-month review", description: "Adjust care plan with patient's physician if needed." },
      { day: 30, title: "Family update", description: "Documented progress report and continuation planning." },
    ],
    durationDays: 30,
    durationOptions: [
      { days: 30, label: "1 month" },
      { days: 60, label: "2 months" },
      { days: 90, label: "3 months" },
    ],
    shiftOptions: ["A", "B", "C"],
    addOns: ["cooking", "cleaning"],
    image:
      "https://images.unsplash.com/photo-1589758438368-9a4b6f0c0baf?auto=format&fit=crop&q=80",
    active: true,
    featured: false,
  },
  {
    id: "palliative",
    slug: "palliative",
    title: "Palliative Care",
    summary:
      "Comfort-focused care for patients with serious illness — symptom relief, emotional support, and family guidance.",
    description:
      "A compassionate plan that prioritizes comfort, dignity, and quality of life. Nurses manage pain and symptoms, coordinate with the patient's medical team, and support the family through difficult moments.",
    targetAudience:
      "Patients living with serious or progressive illness who value comfort over aggressive treatment.",
    recommendedFor: [
      "Patients with advanced chronic illness",
      "Families needing end-of-life guidance",
      "Anyone seeking a comfort-first care approach",
    ],
    includedServices: [
      "Pain and symptom management",
      "Emotional support",
      "Care coordination with physicians",
      "Family guidance",
    ],
    highlights: [
      "Pain management",
      "Emotional support",
      "Care coordination",
    ],
    outcomes: [
      "Symptom relief and comfort",
      "Coordinated care with the medical team",
      "Family supported through every step",
    ],
    careTimeline: [
      { day: 1, title: "Comfort assessment", description: "Understand symptoms, preferences, and goals of care." },
      { day: 7, title: "Adjust the plan", description: "Refine pain management, sleep, and emotional support routines." },
      { day: 14, title: "Family review", description: "Sit-down with family to align on next steps and ongoing support." },
    ],
    durationDays: 14,
    durationOptions: [
      { days: 7, label: "1 week" },
      { days: 14, label: "2 weeks" },
      { days: 30, label: "1 month" },
    ],
    shiftOptions: ["A", "B", "C"],
    addOns: ["companion"],
    image:
      "https://images.unsplash.com/photo-1580281657521-6b2b7f0b7f6a?auto=format&fit=crop&q=80",
    active: true,
    featured: false,
  },
];
