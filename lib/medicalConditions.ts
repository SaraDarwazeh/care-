import type { LocalizedString } from "@/lib/i18nContent";

// Canonical medical conditions. The id is the wire format; bilingual
// labels live alongside. The recommendation engine matches patient
// `conditions[]` (ids) against service.indicatedConditions (also ids)
// so renaming or translating a label never breaks matching — only the
// id is load-bearing.

export const MEDICAL_CONDITION_GROUPS = [
  "cardiovascular",
  "endocrine",
  "respiratory",
  "neurological",
  "musculoskeletal",
  "mental-health",
  "pediatric",
  "elderly",
  "oncology",
  "maternal",
  "wound-skin",
  "other",
] as const;
export type MedicalConditionGroup = (typeof MEDICAL_CONDITION_GROUPS)[number];

export interface MedicalCondition {
  id: string;
  label: LocalizedString;
  group: MedicalConditionGroup;
  // Conditions that are only relevant in a specific care context
  // (pregnancy, newborn, pediatric) — not standing health data for
  // the typical patient. Hidden from the general patient profile
  // picker; surfaced at booking time when the patient indicates
  // they're booking for a child or expectant mother.
  contextualOnly?: true;
}

// Curated short list — common conditions home-care patients tell us
// about. Easy to extend; ids must stay stable once published.
export const MEDICAL_CONDITIONS: ReadonlyArray<MedicalCondition> = [
  // Cardiovascular
  { id: "hypertension", group: "cardiovascular", label: { en: "Hypertension", ar: "ارتفاع ضغط الدم" } },
  { id: "heart-failure", group: "cardiovascular", label: { en: "Heart failure", ar: "قصور القلب" } },
  { id: "coronary-artery-disease", group: "cardiovascular", label: { en: "Coronary artery disease", ar: "مرض الشريان التاجي" } },
  { id: "arrhythmia", group: "cardiovascular", label: { en: "Arrhythmia", ar: "اضطراب نظم القلب" } },

  // Endocrine
  { id: "diabetes-type-1", group: "endocrine", label: { en: "Type 1 diabetes", ar: "السكري من النوع الأول" } },
  { id: "diabetes-type-2", group: "endocrine", label: { en: "Type 2 diabetes", ar: "السكري من النوع الثاني" } },
  { id: "thyroid-disorder", group: "endocrine", label: { en: "Thyroid disorder", ar: "اضطرابات الغدة الدرقية" } },
  { id: "obesity", group: "endocrine", label: { en: "Obesity", ar: "السمنة" } },

  // Respiratory
  { id: "asthma", group: "respiratory", label: { en: "Asthma", ar: "الربو" } },
  { id: "copd", group: "respiratory", label: { en: "COPD", ar: "الانسداد الرئوي المزمن" } },
  { id: "sleep-apnea", group: "respiratory", label: { en: "Sleep apnea", ar: "انقطاع النفس النومي" } },

  // Neurological
  { id: "stroke-recovery", group: "neurological", label: { en: "Stroke recovery", ar: "التعافي من السكتة الدماغية" } },
  { id: "parkinsons", group: "neurological", label: { en: "Parkinson's disease", ar: "مرض باركنسون" } },
  { id: "dementia", group: "neurological", label: { en: "Dementia / Alzheimer's", ar: "الخرف / ألزهايمر" } },
  { id: "epilepsy", group: "neurological", label: { en: "Epilepsy", ar: "الصرع" } },
  { id: "migraine", group: "neurological", label: { en: "Chronic migraine", ar: "الصداع النصفي المزمن" } },

  // Musculoskeletal
  { id: "arthritis", group: "musculoskeletal", label: { en: "Arthritis", ar: "التهاب المفاصل" } },
  { id: "osteoporosis", group: "musculoskeletal", label: { en: "Osteoporosis", ar: "هشاشة العظام" } },
  { id: "recent-fracture", group: "musculoskeletal", label: { en: "Recent fracture", ar: "كسر حديث" } },
  { id: "post-surgical-recovery", group: "musculoskeletal", label: { en: "Post-surgical recovery", ar: "التعافي بعد الجراحة" } },
  { id: "chronic-back-pain", group: "musculoskeletal", label: { en: "Chronic back pain", ar: "آلام الظهر المزمنة" } },

  // Mental health
  { id: "anxiety", group: "mental-health", label: { en: "Anxiety disorder", ar: "اضطراب القلق" } },
  { id: "depression", group: "mental-health", label: { en: "Depression", ar: "الاكتئاب" } },
  { id: "ptsd", group: "mental-health", label: { en: "PTSD", ar: "اضطراب ما بعد الصدمة" } },

  // Pediatric — contextualOnly: surfaced at booking time, not in the
  // general patient profile picker.
  { id: "newborn-care", group: "pediatric", contextualOnly: true, label: { en: "Newborn care", ar: "رعاية حديثي الولادة" } },
  { id: "pediatric-asthma", group: "pediatric", contextualOnly: true, label: { en: "Pediatric asthma", ar: "ربو الأطفال" } },
  { id: "developmental-support", group: "pediatric", contextualOnly: true, label: { en: "Developmental support", ar: "دعم النمو" } },

  // Elderly
  { id: "frailty", group: "elderly", label: { en: "Frailty", ar: "الوهن" } },
  { id: "fall-risk", group: "elderly", label: { en: "Fall risk", ar: "خطر السقوط" } },
  { id: "incontinence", group: "elderly", label: { en: "Incontinence", ar: "سلس البول" } },

  // Oncology
  { id: "cancer-treatment", group: "oncology", label: { en: "Cancer treatment support", ar: "دعم علاج السرطان" } },
  { id: "palliative-care", group: "oncology", label: { en: "Palliative care", ar: "الرعاية التلطيفية" } },

  // Maternal — contextualOnly: surfaced at booking time, not in the
  // general patient profile picker.
  { id: "pregnancy-support", group: "maternal", contextualOnly: true, label: { en: "Pregnancy support", ar: "دعم الحمل" } },
  { id: "postnatal-recovery", group: "maternal", contextualOnly: true, label: { en: "Postnatal recovery", ar: "التعافي بعد الولادة" } },

  // Wound & skin
  { id: "wound-care", group: "wound-skin", label: { en: "Wound care", ar: "العناية بالجروح" } },
  { id: "pressure-ulcers", group: "wound-skin", label: { en: "Pressure ulcers", ar: "تقرحات الفراش" } },
  { id: "diabetic-ulcers", group: "wound-skin", label: { en: "Diabetic ulcers", ar: "قرح السكري" } },

  // Other
  { id: "catheter-care", group: "other", label: { en: "Catheter care", ar: "العناية بالقسطرة" } },
  { id: "tube-feeding", group: "other", label: { en: "Tube feeding", ar: "التغذية بالأنبوب" } },
  { id: "iv-therapy", group: "other", label: { en: "IV therapy", ar: "العلاج الوريدي" } },
  { id: "ostomy-care", group: "other", label: { en: "Ostomy care", ar: "العناية بفتحات الفغر" } },
];

const CONDITION_BY_ID: Record<string, MedicalCondition> = MEDICAL_CONDITIONS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, MedicalCondition>,
);

export function findMedicalCondition(id: string): MedicalCondition | undefined {
  return CONDITION_BY_ID[id];
}

// Grouped conditions for the picker UI. Pass `{ includeContextual: true }`
// to include pregnancy / pediatric entries — only the booking-time
// "who is this for?" surface should opt in. The patient profile
// picker keeps the default and shows only standing conditions.
export function groupedMedicalConditions(
  options: { includeContextual?: boolean } = {},
): Record<MedicalConditionGroup, MedicalCondition[]> {
  const out = Object.fromEntries(
    MEDICAL_CONDITION_GROUPS.map((g) => [g, [] as MedicalCondition[]]),
  ) as Record<MedicalConditionGroup, MedicalCondition[]>;
  for (const c of MEDICAL_CONDITIONS) {
    if (c.contextualOnly && !options.includeContextual) continue;
    out[c.group].push(c);
  }
  // Empty groups (pediatric / maternal in the default render) stay
  // in the map with an empty array; the picker UI iterates groups
  // with item-count > 0 already, so empty headers don't render.
  return out;
}

// Best-effort canonical-id resolution for legacy free-text disease
// strings. Used by the recommendation engine and by the profile-editor
// migration that suggests canonical equivalents on first edit.
export function matchConditionByLabel(text: string): MedicalCondition | undefined {
  const needle = text.trim().toLowerCase();
  if (!needle) return undefined;
  for (const c of MEDICAL_CONDITIONS) {
    if (c.label.en.toLowerCase() === needle) return c;
    if (c.label.ar && c.label.ar === text.trim()) return c;
    if (c.id === needle.replace(/\s+/g, "-")) return c;
  }
  // Light fallback — substring contains either direction so "DM type 2"
  // catches "Type 2 diabetes" via either side.
  for (const c of MEDICAL_CONDITIONS) {
    const en = c.label.en.toLowerCase();
    if (en.includes(needle) || needle.includes(en)) return c;
  }
  return undefined;
}
