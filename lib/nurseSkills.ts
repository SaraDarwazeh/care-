import type { LocalizedString } from "@/lib/i18nContent";

// Canonical nurse-skill catalogue. Replaces the free-text comma
// list that the profile form used to accept — that path produced
// patient-side filter chips like "IV placement" rendered raw in any
// locale, because there was no curated label to translate.
//
// Storage shape: nurse.skills[] now holds skill ids from this list.
// Marketplace + filter UI resolves the id to a localized label via
// findNurseSkill() + tLocalized().
//
// Legacy free-text entries on existing profiles render raw as a
// graceful fallback. Best-effort lowercase-EN-label resolution
// happens at profile-load time so older saves recover their ids.

export const NURSE_SKILL_GROUPS = [
  "clinical",
  "monitoring",
  "mobility",
  "patient-care",
  "communication",
] as const;
export type NurseSkillGroup = (typeof NURSE_SKILL_GROUPS)[number];

export interface NurseSkill {
  id: string;
  label: LocalizedString;
  group: NurseSkillGroup;
}

export const NURSE_SKILLS: ReadonlyArray<NurseSkill> = [
  // Clinical procedures
  { id: "iv-placement", group: "clinical", label: { en: "IV placement", ar: "تركيب الكانيولا" } },
  { id: "injections", group: "clinical", label: { en: "Injections", ar: "الحقن" } },
  { id: "wound-dressing", group: "clinical", label: { en: "Wound dressing", ar: "تضميد الجروح" } },
  { id: "catheter-care", group: "clinical", label: { en: "Catheter care", ar: "العناية بالقسطرة" } },
  { id: "tube-feeding", group: "clinical", label: { en: "Tube feeding", ar: "التغذية بالأنبوب" } },
  { id: "ostomy-care", group: "clinical", label: { en: "Ostomy care", ar: "العناية بفتحات الفغر" } },
  { id: "cpr", group: "clinical", label: { en: "CPR & emergency response", ar: "الإنعاش القلبي الرئوي والاستجابة الطارئة" } },

  // Monitoring & assessment
  { id: "vital-signs", group: "monitoring", label: { en: "Vital signs monitoring", ar: "مراقبة العلامات الحيوية" } },
  { id: "blood-glucose-monitoring", group: "monitoring", label: { en: "Blood glucose monitoring", ar: "مراقبة سكر الدم" } },
  { id: "medication-administration", group: "monitoring", label: { en: "Medication administration", ar: "إعطاء الأدوية" } },
  { id: "oxygen-therapy", group: "monitoring", label: { en: "Oxygen therapy", ar: "العلاج بالأكسجين" } },

  // Mobility & rehabilitation
  { id: "mobility-support", group: "mobility", label: { en: "Mobility support", ar: "دعم الحركة" } },
  { id: "pressure-injury-prevention", group: "mobility", label: { en: "Pressure-injury prevention", ar: "الوقاية من تقرحات الفراش" } },
  { id: "post-op-care", group: "mobility", label: { en: "Post-operative care", ar: "الرعاية بعد العمليات" } },

  // Patient-care specializations
  { id: "elderly-care", group: "patient-care", label: { en: "Elderly care", ar: "رعاية المسنين" } },
  { id: "chronic-disease-management", group: "patient-care", label: { en: "Chronic disease management", ar: "إدارة الأمراض المزمنة" } },
  { id: "palliative-care", group: "patient-care", label: { en: "Palliative care", ar: "الرعاية التلطيفية" } },
  { id: "dementia-care", group: "patient-care", label: { en: "Dementia & Alzheimer's care", ar: "رعاية الخرف وألزهايمر" } },

  // Communication
  { id: "patient-education", group: "communication", label: { en: "Patient & family education", ar: "تثقيف المريض والعائلة" } },
  { id: "care-coordination", group: "communication", label: { en: "Care coordination", ar: "تنسيق الرعاية" } },
];

const SKILL_BY_ID: Record<string, NurseSkill> = NURSE_SKILLS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, NurseSkill>,
);

export function findNurseSkill(id: string): NurseSkill | undefined {
  return SKILL_BY_ID[id];
}

// Best-effort match of a legacy free-text skill name onto a catalog
// id. Compares the English label case-insensitively, then the id
// itself, then the Arabic label. Returns undefined if no match — the
// caller keeps the raw string and renders it as-is.
export function resolveSkillId(rawText: string): string | undefined {
  const lower = rawText.trim().toLowerCase();
  if (!lower) return undefined;
  const match = NURSE_SKILLS.find(
    (s) =>
      s.label.en.toLowerCase() === lower ||
      s.id === lower ||
      (s.label.ar && s.label.ar.toLowerCase() === lower),
  );
  return match?.id;
}
