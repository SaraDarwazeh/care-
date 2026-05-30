import type { StoreItem } from "@/lib/types";

// Seed catalog for the products collection. Long-form fields ship as
// LocalizedString so a fresh deployment auto-seeds with bilingual
// content; Arabic copy is the MSA draft pattern from Phase 2-3 and
// should be QA'd by the professional translator before launch.
export const STORE_ITEMS: StoreItem[] = [
  {
    id: "prod_1",
    name: {
      en: "Blood Pressure Monitor",
      ar: "جهاز قياس ضغط الدم",
    },
    description: {
      en: "Easy-to-use automatic upper arm blood pressure monitor with large LCD display and irregular heartbeat indicator.",
      ar: "جهاز آلي لقياس ضغط الدم من أعلى الذراع، سهل الاستخدام مع شاشة LCD كبيرة ومؤشّر لاضطراب نبضات القلب.",
    },
    price: 45.0,
    category: "Monitoring",
    image: "🩺",
  },
  {
    id: "prod_2",
    name: {
      en: "Digital Thermometer",
      ar: "ميزان حرارة رقمي",
    },
    description: {
      en: "Fast and accurate digital thermometer for oral, rectal, or underarm use. Results in 10 seconds.",
      ar: "ميزان حرارة رقمي سريع ودقيق يُستخدم عن طريق الفم أو الشرج أو تحت الإبط، ويعطي النتيجة خلال 10 ثوانٍ.",
    },
    price: 12.0,
    category: "Monitoring",
    image: "🌡️",
  },
  {
    id: "prod_3",
    name: {
      en: "Glucometer Kit",
      ar: "جهاز قياس السكر بالدم",
    },
    description: {
      en: "Complete blood glucose monitoring kit includes meter, 50 test strips, lancets, and carrying case.",
      ar: "طقم متكامل لمراقبة سكر الدم يشمل الجهاز و50 شريط فحص وإبر وحامل خاص.",
    },
    price: 35.0,
    category: "Monitoring",
    image: "💉",
  },
  {
    id: "prod_4",
    name: {
      en: "N95 Masks (5-pack)",
      ar: "كمامات N95 (5 قطع)",
    },
    description: {
      en: "NIOSH-approved N95 respirator masks providing 95% filtration. Protective against airborne particles.",
      ar: "كمامات N95 معتمدة من NIOSH تُوفّر تنقية بنسبة 95% وتحمي من الجزيئات المنتشرة في الهواء.",
    },
    price: 18.0,
    category: "Masks & Protection",
    image: "😷",
  },
  {
    id: "prod_5",
    name: {
      en: "Nitrile Gloves (Box of 100)",
      ar: "قفّازات نتريل (علبة 100 قفّاز)",
    },
    description: {
      en: "Powder-free nitrile examination gloves. Latex-free, puncture-resistant, and ambidextrous.",
      ar: "قفّازات فحص من النتريل خالية من البودرة واللاتكس، مقاومة للثقب وتُستخدم بكلتا اليدين.",
    },
    price: 22.0,
    category: "Masks & Protection",
    image: "🧤",
  },
  {
    id: "prod_6",
    name: {
      en: "Walker with Wheels",
      ar: "مشّاية بعجلات",
    },
    description: {
      en: "Lightweight rolling walker with ergonomic handles, padded seat, and storage pouch for added convenience.",
      ar: "مشّاية متحرّكة خفيفة الوزن، بمقابض مريحة ومقعد مبطّن وحقيبة تخزين للراحة الإضافية.",
    },
    price: 89.0,
    category: "Equipment",
    image: "🦼",
  },
  {
    id: "prod_7",
    name: {
      en: "Wheelchair Cushion",
      ar: "وسادة كرسي متحرّك",
    },
    description: {
      en: "High-density memory foam wheelchair cushion with non-slip base. Helps prevent pressure sores.",
      ar: "وسادة كرسي متحرّك من إسفنج الذاكرة عالي الكثافة بقاعدة مانعة للانزلاق، تساعد على الوقاية من تقرّحات الفراش.",
    },
    price: 42.0,
    category: "Elderly Support",
    image: "🛋️",
  },
  {
    id: "prod_8",
    name: {
      en: "Pill Organizer Weekly",
      ar: "منظّم أدوية أسبوعي",
    },
    description: {
      en: "7-day pill organizer with AM/PM compartments. Color-coded for each day with easy-open lids.",
      ar: "منظّم أدوية لسبعة أيام بتقسيمات للصباح والمساء، مع ألوان مميّزة لكل يوم وأغطية سهلة الفتح.",
    },
    price: 15.0,
    category: "Elderly Support",
    image: "💊",
  },
  {
    id: "prod_9",
    name: {
      en: "Wound Care Kit",
      ar: "طقم العناية بالجروح",
    },
    description: {
      en: "Comprehensive sterile wound care kit including gauze, antiseptic, bandages, and medical tape.",
      ar: "طقم متكامل ومعقّم للعناية بالجروح يشمل شاش، مطهّر، ضمادات، ولاصق طبّي.",
    },
    price: 28.0,
    category: "Recovery",
    image: "🩹",
  },
  {
    id: "prod_10",
    name: {
      en: "Compression Stockings",
      ar: "جوارب ضاغطة",
    },
    description: {
      en: "Medical-grade graduated compression stockings for improved circulation and swelling relief.",
      ar: "جوارب ضاغطة طبّية متدرّجة الضغط، تساعد على تحسين الدورة الدموية وتقليل التورّم.",
    },
    price: 32.0,
    category: "Recovery",
    image: "🧦",
  },
];
