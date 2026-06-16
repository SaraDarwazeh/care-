import type { LocalizedString } from "@/lib/i18nContent";
import type { AddOn } from "@/lib/pricingConstants";

// Single source of truth for the platform's service catalogue. Replaces
// the previous unilingual AVAILABLE_ADDONS list and gives recommendations
// + booking + nurse profile editors a shared vocabulary.
//
// `kind` carves the catalogue into the two operational categories the
// codebase already split informally:
//   - "nursing": medical services delivered by a credentialed nurse
//                (IV, wound care, vitals, etc.). Drives recommendation
//                matching via `indicatedConditions`.
//   - "support": non-medical extras booked alongside a nurse visit
//                (cooking, driving, shopping, companionship). Replaces
//                the legacy AVAILABLE_ADDONS list — same {id, name, price}
//                shape exposed via getSupportAddOns() so booking + pricing
//                math don't change.

export type ServiceKind = "nursing" | "support";

export interface CatalogService {
  id: string;
  kind: ServiceKind;
  label: LocalizedString;
  description: LocalizedString;
  icon: string;
  defaultPrice?: number;
  indicatedConditions?: string[];
}

export const CATALOG_SERVICES: ReadonlyArray<CatalogService> = [
  // ---------- nursing ----------
  {
    id: "iv-injection",
    kind: "nursing",
    label: { en: "IV injection & infusion", ar: "الحقن الوريدي والتسريب" },
    description: {
      en: "Safe administration of intravenous medication or fluids at home.",
      ar: "إعطاء آمن للأدوية الوريدية أو السوائل في المنزل.",
    },
    icon: "Syringe",
    indicatedConditions: ["iv-therapy", "cancer-treatment", "post-surgical-recovery"],
  },
  {
    id: "wound-dressing",
    kind: "nursing",
    label: { en: "Wound dressing & care", ar: "تضميد الجروح والعناية بها" },
    description: {
      en: "Sterile cleaning, dressing changes, and assessment of healing wounds.",
      ar: "تنظيف معقم وتغيير الضمادات وتقييم التئام الجروح.",
    },
    icon: "Bandage",
    indicatedConditions: [
      "wound-care",
      "pressure-ulcers",
      "diabetic-ulcers",
      "post-surgical-recovery",
    ],
  },
  {
    id: "vital-signs-monitoring",
    kind: "nursing",
    label: { en: "Vital signs monitoring", ar: "مراقبة العلامات الحيوية" },
    description: {
      en: "Blood pressure, heart rate, oxygen and temperature checks with documentation.",
      ar: "قياس ضغط الدم ونبض القلب والأكسجين والحرارة مع التوثيق.",
    },
    icon: "Activity",
    indicatedConditions: [
      "hypertension",
      "heart-failure",
      "coronary-artery-disease",
      "arrhythmia",
      "copd",
      "diabetes-type-1",
      "diabetes-type-2",
    ],
  },
  {
    id: "medication-administration",
    kind: "nursing",
    label: { en: "Medication administration", ar: "إعطاء الأدوية" },
    description: {
      en: "Scheduled medication delivery, dosage checks, and side-effect screening.",
      ar: "إعطاء الأدوية في مواعيدها، والتحقق من الجرعات، وتقييم الأعراض.",
    },
    icon: "Pill",
    indicatedConditions: [
      "dementia",
      "parkinsons",
      "epilepsy",
      "depression",
      "anxiety",
      "frailty",
    ],
  },
  {
    id: "blood-draw",
    kind: "nursing",
    label: { en: "Blood sample collection", ar: "سحب عينات الدم" },
    description: {
      en: "In-home venipuncture for labs ordered by your physician.",
      ar: "سحب الدم في المنزل لإجراء التحاليل التي يطلبها الطبيب.",
    },
    icon: "TestTube",
    indicatedConditions: [
      "diabetes-type-1",
      "diabetes-type-2",
      "thyroid-disorder",
      "cancer-treatment",
    ],
  },
  {
    id: "post-operative-care",
    kind: "nursing",
    label: { en: "Post-operative care", ar: "الرعاية بعد العمليات" },
    description: {
      en: "Recovery support after surgery: dressings, mobility, pain checks, and warning signs.",
      ar: "دعم التعافي بعد الجراحة: تضميد، حركة، متابعة الألم، ومراقبة العلامات التحذيرية.",
    },
    icon: "Stethoscope",
    indicatedConditions: ["post-surgical-recovery", "recent-fracture", "wound-care"],
  },
  {
    id: "chronic-disease-management",
    kind: "nursing",
    label: { en: "Chronic disease management", ar: "إدارة الأمراض المزمنة" },
    description: {
      en: "Ongoing visits to monitor and coordinate care for chronic conditions.",
      ar: "زيارات منتظمة لمتابعة وتنسيق الرعاية للحالات المزمنة.",
    },
    icon: "HeartPulse",
    indicatedConditions: [
      "diabetes-type-1",
      "diabetes-type-2",
      "hypertension",
      "heart-failure",
      "copd",
      "asthma",
      "arthritis",
    ],
  },
  {
    id: "elderly-care",
    kind: "nursing",
    label: { en: "Elderly care", ar: "رعاية كبار السن" },
    description: {
      en: "Holistic in-home support for elderly patients — mobility, hygiene, supervision.",
      ar: "رعاية شاملة في المنزل لكبار السن — الحركة، النظافة، الإشراف.",
    },
    icon: "Users",
    indicatedConditions: ["frailty", "fall-risk", "dementia", "incontinence"],
  },
  {
    id: "mother-baby-care",
    kind: "nursing",
    label: { en: "Mother & baby care", ar: "رعاية الأم والطفل" },
    description: {
      en: "Postnatal support for mother and newborn, breastfeeding guidance and checks.",
      ar: "دعم الأم وطفلها بعد الولادة، إرشاد الرضاعة الطبيعية والمتابعة.",
    },
    icon: "Baby",
    indicatedConditions: ["postnatal-recovery", "pregnancy-support", "newborn-care"],
  },
  {
    id: "physical-therapy",
    kind: "nursing",
    label: { en: "Physical therapy", ar: "العلاج الطبيعي" },
    description: {
      en: "Mobility and strength exercises supervised by a trained therapist.",
      ar: "تمارين الحركة والقوة تحت إشراف معالج مدرب.",
    },
    icon: "Dumbbell",
    indicatedConditions: [
      "stroke-recovery",
      "recent-fracture",
      "post-surgical-recovery",
      "arthritis",
      "chronic-back-pain",
      "parkinsons",
    ],
  },
  {
    id: "palliative-support",
    kind: "nursing",
    label: { en: "Palliative & comfort care", ar: "الرعاية التلطيفية والراحة" },
    description: {
      en: "Symptom management and emotional support for serious illness.",
      ar: "إدارة الأعراض ودعم نفسي للحالات الشديدة.",
    },
    icon: "HandHeart",
    indicatedConditions: ["palliative-care", "cancer-treatment"],
  },
  {
    id: "catheter-care-service",
    kind: "nursing",
    label: { en: "Catheter care", ar: "العناية بالقسطرة" },
    description: {
      en: "Insertion, replacement, and ongoing care of urinary catheters.",
      ar: "إدخال القسطرة البولية واستبدالها والعناية المستمرة بها.",
    },
    icon: "Droplet",
    indicatedConditions: ["catheter-care", "incontinence"],
  },
  {
    id: "tube-feeding-service",
    kind: "nursing",
    label: { en: "Tube feeding support", ar: "دعم التغذية بالأنبوب" },
    description: {
      en: "Safe enteral feeding management and tube site care.",
      ar: "إدارة آمنة للتغذية الأنبوبية والعناية بموضع الأنبوب.",
    },
    icon: "Soup",
    indicatedConditions: ["tube-feeding", "stroke-recovery", "palliative-care"],
  },
  {
    id: "dementia-care",
    kind: "nursing",
    label: { en: "Dementia care", ar: "رعاية مرضى الخرف" },
    description: {
      en: "Specialised in-home support for patients with cognitive decline.",
      ar: "دعم متخصص في المنزل لمرضى التراجع الإدراكي.",
    },
    icon: "Brain",
    indicatedConditions: ["dementia", "elderly", "fall-risk"],
  },

  // ---------- support ----------
  {
    id: "cooking",
    kind: "support",
    label: { en: "Cooking", ar: "الطبخ" },
    description: {
      en: "Light meal preparation tailored to the patient's dietary needs.",
      ar: "إعداد وجبات خفيفة تناسب الاحتياجات الغذائية للمريض.",
    },
    icon: "ChefHat",
    defaultPrice: 15,
  },
  {
    id: "transport",
    kind: "support",
    label: { en: "Driving & transportation", ar: "القيادة والنقل" },
    description: {
      en: "Safe transport to and from medical appointments or errands.",
      ar: "نقل آمن من وإلى المواعيد الطبية أو المهام اليومية.",
    },
    icon: "Car",
    defaultPrice: 10,
  },
  {
    id: "shopping",
    kind: "support",
    label: { en: "Shopping assistance", ar: "المساعدة في التسوق" },
    description: {
      en: "Grocery and pharmacy runs for patients who can't shop themselves.",
      ar: "شراء البقالة والأدوية للمرضى غير القادرين على التسوق.",
    },
    icon: "ShoppingBag",
    defaultPrice: 12,
  },
  {
    id: "cleaning",
    kind: "support",
    label: { en: "Light housekeeping", ar: "تنظيف خفيف" },
    description: {
      en: "Tidying, laundry, and dishwashing focused on the patient's living space.",
      ar: "ترتيب وغسيل وغسل الأطباق في مساحة معيشة المريض.",
    },
    icon: "Sparkles",
    defaultPrice: 10,
  },
  {
    id: "companion",
    kind: "support",
    label: { en: "Companionship", ar: "المرافقة" },
    description: {
      en: "Conversation, walks, and social presence — especially valuable for elderly patients.",
      ar: "محادثة ومرافقة في المشي وحضور اجتماعي، خاصة لكبار السن.",
    },
    icon: "HeartHandshake",
    defaultPrice: 20,
  },
  {
    id: "errands",
    kind: "support",
    label: { en: "Errands", ar: "قضاء الحاجات" },
    description: {
      en: "Picking up prescriptions, returns, and small day-to-day tasks.",
      ar: "استلام الوصفات، الإرجاعات، والمهام اليومية الصغيرة.",
    },
    icon: "ListChecks",
    defaultPrice: 12,
  },
];

const CATALOG_BY_ID: Record<string, CatalogService> = CATALOG_SERVICES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, CatalogService>,
);

export function findCatalogService(id: string): CatalogService | undefined {
  return CATALOG_BY_ID[id];
}

export function getCatalogServicesByKind(kind: ServiceKind): CatalogService[] {
  return CATALOG_SERVICES.filter((s) => s.kind === kind);
}

export const NURSING_SERVICES: ReadonlyArray<CatalogService> = getCatalogServicesByKind("nursing");
export const SUPPORT_SERVICES: ReadonlyArray<CatalogService> = getCatalogServicesByKind("support");

// AddOn-shaped projection of the support catalogue. The booking form
// and pricing math consume this exact shape today via AVAILABLE_ADDONS —
// returning it here lets pricingConstants.ts derive its export without
// duplicating data.
export function getSupportAddOns(): AddOn[] {
  return SUPPORT_SERVICES.map((s) => ({
    id: s.id,
    name: s.label.en,
    price: s.defaultPrice ?? 0,
  }));
}
