import type { EducationCard } from "@/lib/types";

// Starter set of education cards. Used by `educationService.seedIfEmpty()`
// the first time the homepage renders the section against an empty
// collection. Admins can edit, disable, or replace these freely after
// the first load — they're seeded, not enforced.
//
// Card-shape rules (enforced by the admin form):
//   title ≤ 60 chars per locale
//   body  ≤ 180 chars per locale
//
// All copy ships bilingual per Phase 5. Arabic is the MSA draft pattern;
// professional translator QA before launch.

export const DEFAULT_EDUCATION_CARDS: Omit<EducationCard, "createdAt" | "updatedAt">[] = [
  // ── WHY HOME CARE ─────────────────────────────────────────────
  {
    id: "why-comfort",
    kind: "why",
    title: { en: "Recovery happens better at home", ar: "التعافي أسرع في المنزل" },
    body: {
      en: "Familiar surroundings reduce stress and disorientation, especially for elderly patients and those recovering from surgery.",
      ar: "تُقلّل البيئة المألوفة من التوتّر والارتباك، خاصة لدى المسنين والمتعافين من العمليات.",
    },
    icon: "Home",
    accent: "sky",
    order: 1,
    active: true,
  },
  {
    id: "why-one-on-one",
    kind: "why",
    title: { en: "One nurse. Your full attention.", ar: "ممرض واحد. كل الاهتمام لك." },
    body: {
      en: "Unlike a hospital floor where one nurse covers many patients, home care means undivided focus on one person and one care plan.",
      ar: "بخلاف أقسام المستشفى حيث يغطّي ممرض واحد عدة مرضى، تعني الرعاية المنزلية تركيزًا كاملًا على شخص واحد وخطة رعاية واحدة.",
    },
    icon: "Heart",
    accent: "rose",
    order: 2,
    active: true,
  },
  {
    id: "why-family",
    kind: "why",
    title: { en: "Care that fits your family", ar: "رعاية تناسب جدول عائلتك" },
    body: {
      en: "Visits work around school runs, work shifts, and meals — not the other way around. Your routine stays yours.",
      ar: "تُرتَّب الزيارات بما يلائم المدرسة والعمل والوجبات — لا العكس. روتينك يبقى كما هو.",
    },
    icon: "HeartHandshake",
    accent: "emerald",
    order: 3,
    active: true,
  },
  {
    id: "why-cost",
    kind: "why",
    title: { en: "Often more affordable than facilities", ar: "غالبًا أوفر من المرافق الطبية" },
    body: {
      en: "Skip facility overhead. Pay for the hours of care you actually need — by the visit, the shift, or as a structured package.",
      ar: "تجنّب تكاليف المرافق. ادفع مقابل ساعات الرعاية التي تحتاجها فقط — بالزيارة أو الوردية أو ضمن باقة منظَّمة.",
    },
    icon: "Sparkles",
    accent: "amber",
    order: 4,
    active: true,
  },

  // ── FAQ ───────────────────────────────────────────────────────
  {
    id: "faq-pricing",
    kind: "faq",
    title: { en: "How does pricing work?", ar: "كيف يعمل التسعير؟" },
    body: {
      en: "You pay per visit, per shift, or per care package. Prices are shown upfront before you book — no surprise charges or hidden fees.",
      ar: "تدفع بالزيارة أو الوردية أو ضمن باقة رعاية. تُعرض الأسعار قبل الحجز بوضوح — لا رسوم مفاجئة ولا مخفية.",
    },
    icon: "HelpCircle",
    accent: "sky",
    order: 1,
    active: true,
  },
  {
    id: "faq-cancel",
    kind: "faq",
    title: { en: "Can I cancel a booking?", ar: "هل يمكنني إلغاء الحجز؟" },
    body: {
      en: "Yes — cancel any pending booking for free before a nurse accepts. After confirmation, contact your nurse to reschedule.",
      ar: "نعم — يمكنك إلغاء أي حجز قيد المراجعة مجانًا قبل قبول الممرض. بعد التأكيد، تواصل مع الممرض لإعادة الجدولة.",
    },
    icon: "Clock",
    accent: "amber",
    order: 2,
    active: true,
  },
  {
    id: "faq-emergency",
    kind: "faq",
    title: { en: "Is this for emergencies?", ar: "هل المنصة للحالات الطارئة؟" },
    body: {
      en: "No. Care+ is for planned home nursing — recovery, elderly support, post-op care. For emergencies, call your local emergency number.",
      ar: "لا. Care+ للرعاية التمريضية المنزلية المخطَّط لها — التعافي ودعم المسنين والرعاية بعد العمليات. للطوارئ، اتصل برقم الطوارئ المحلي.",
    },
    icon: "Info",
    accent: "rose",
    order: 3,
    active: true,
  },
  {
    id: "faq-records",
    kind: "faq",
    title: { en: "Who sees my medical records?", ar: "من يطّلع على سجلّي الطبي؟" },
    body: {
      en: "Only you, the nurses you book with, and Care+ administrators. Records are encrypted and never shared with third parties.",
      ar: "أنت فقط، والممرضون الذين تحجز معهم، ومسؤولو Care+. السجلات مُشفَّرة ولا تُشارك مع أي طرف ثالث.",
    },
    icon: "Shield",
    accent: "violet",
    order: 4,
    active: true,
  },

  // ── WHAT TO EXPECT ────────────────────────────────────────────
  {
    id: "expect-verification",
    kind: "what-to-expect",
    title: { en: "Every nurse is verified", ar: "كل ممرض موثَّق" },
    body: {
      en: "Profiles, licenses, and certifications are reviewed by the Care+ team before a nurse is activated. Patients only ever see approved nurses.",
      ar: "تُراجَع الملفات والتراخيص والشهادات من فريق Care+ قبل تفعيل الممرض. لا يرى المرضى سوى الممرضين المعتمدين.",
    },
    icon: "ShieldCheck",
    accent: "emerald",
    order: 1,
    active: true,
  },
  {
    id: "expect-first-visit",
    kind: "what-to-expect",
    title: { en: "What happens on the first visit", ar: "ما يحدث في الزيارة الأولى" },
    body: {
      en: "Your nurse reviews your profile, confirms medications and allergies, and starts care. You confirm the visit notes afterward — your records, your sign-off.",
      ar: "يراجع الممرض ملفك ويؤكّد الأدوية والحساسية، ثم تبدأ الرعاية. تؤكّد ملاحظات الزيارة بعدها — سجلاتك بموافقتك.",
    },
    icon: "Calendar",
    accent: "sky",
    order: 2,
    active: true,
  },
  {
    id: "expect-pace",
    kind: "what-to-expect",
    title: { en: "Confirmation usually within hours", ar: "التأكيد عادة خلال ساعات" },
    body: {
      en: "Most nurses respond within a few hours. If a nurse can't make it, we help you find a verified alternative quickly.",
      ar: "يردّ معظم الممرضين خلال ساعات قليلة. إن لم يستطع أحدهم، نساعدك على إيجاد بديل موثَّق بسرعة.",
    },
    icon: "Clock",
    accent: "amber",
    order: 3,
    active: true,
  },
  {
    id: "expect-control",
    kind: "what-to-expect",
    title: { en: "You stay in control", ar: "القرار يبقى لك" },
    body: {
      en: "You set the schedule, the location, and your preferences. Patients can review and dispute medical records if anything looks off.",
      ar: "أنت من يضبط الجدول والموقع والتفضيلات. يمكن للمرضى مراجعة السجلات الطبية والاعتراض عليها إن لاحظوا أي خلل.",
    },
    icon: "Check",
    accent: "violet",
    order: 4,
    active: true,
  },
];
