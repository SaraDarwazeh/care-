import type { CarePackage } from "@/lib/types";

// Re-export for older imports that pulled the type from this module.
export type { CarePackage };

// DEFAULT_PACKAGES is the canonical seed used to populate the `packages`
// Firestore collection on first read. Admins can then edit/delete/add via the
// admin UI; this file is no longer the source of truth at runtime.
//
// All long-form copy ships bilingual per Phase 5; the seedIfEmpty branch
// in packageService.ts writes these directly into Firestore. Arabic
// strings are the MSA draft — professional translator QA before launch.
export const DEFAULT_PACKAGES: CarePackage[] = [
  {
    id: "post-op",
    slug: "post-op",
    title: { en: "Post-Op Recovery", ar: "التعافي بعد العمليات" },
    summary: {
      en: "Short-term recovery support following surgery — wound care, medication, and gentle daily monitoring at home.",
      ar: "دعم تعافٍ قصير الأمد بعد الجراحة — عناية بالجروح، إدارة دواء، ومتابعة يومية لطيفة في المنزل.",
    },
    description: {
      en: "A focused 7-day plan starting the day you leave the hospital. A trained nurse visits each day to manage your dressings, supervise medications, watch for early signs of infection, and help you regain confidence with movement and self-care.",
      ar: "خطة مركّزة لسبعة أيام تبدأ من يوم خروجك من المستشفى. يزورك ممرض مدرَّب يوميًا لإدارة الضمادات والإشراف على الأدوية ومراقبة بوادر العدوى المبكرة ومساعدتك على استعادة الثقة بالحركة والعناية بنفسك.",
    },
    targetAudience: {
      en: "Adults recovering from elective or post-emergency surgery who need short-term clinical follow-up at home.",
      ar: "البالغون المتعافون من جراحة اختيارية أو طارئة ويحتاجون متابعة سريرية قصيرة الأمد في المنزل.",
    },
    recommendedFor: [
      { en: "Patients discharged in the last 72 hours", ar: "المرضى الذين خرجوا من المستشفى خلال آخر 72 ساعة" },
      { en: "Surgical sites that need regular dressing changes", ar: "مواقع الجراحة التي تستلزم تغيير ضمادات منتظم" },
      { en: "Households without medical training", ar: "المنازل التي لا يتوفّر فيها تدريب طبي" },
    ],
    includedServices: [
      { en: "Wound and incision care", ar: "العناية بالجروح والشقوق" },
      { en: "Medication administration", ar: "إعطاء الأدوية" },
      { en: "Vital signs monitoring", ar: "مراقبة العلامات الحيوية" },
      { en: "Post-op symptom tracking", ar: "متابعة أعراض ما بعد العملية" },
    ],
    highlights: [
      { en: "Daily check-ins", ar: "متابعة يومية" },
      { en: "Wound dressing", ar: "تضميد الجروح" },
      { en: "Medication oversight", ar: "إشراف على الأدوية" },
    ],
    outcomes: [
      { en: "Clean, monitored wound healing", ar: "التئام جروح نظيف ومُراقَب" },
      { en: "Early detection of infection", ar: "اكتشاف العدوى مبكرًا" },
      { en: "Confidence with home recovery", ar: "ثقة بالتعافي في المنزل" },
    ],
    careTimeline: [
      {
        day: 1,
        title: { en: "Settle in", ar: "البدء" },
        description: {
          en: "Nurse reviews discharge notes, sets up medication schedule, inspects wound.",
          ar: "يراجع الممرض أوراق الخروج ويعدّ جدول الأدوية ويفحص الجرح.",
        },
      },
      {
        day: 3,
        title: { en: "First dressing change", ar: "أول تغيير ضمادة" },
        description: {
          en: "Sterile dressing change, pain check, mobility encouragement.",
          ar: "تغيير ضمادة معقّم، فحص الألم، وتشجيع على الحركة.",
        },
      },
      {
        day: 7,
        title: { en: "Recovery review", ar: "مراجعة التعافي" },
        description: {
          en: "Final assessment, hand-off to primary care if further follow-up is needed.",
          ar: "تقييم نهائي وتحويل إلى الرعاية الأولية إن لزم متابعة إضافية.",
        },
      },
    ],
    durationDays: 7,
    durationOptions: [
      { days: 5, label: { en: "5 days", ar: "5 أيام" } },
      { days: 7, label: { en: "1 week", ar: "أسبوع واحد" } },
      { days: 14, label: { en: "2 weeks", ar: "أسبوعان" } },
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
    title: { en: "Elderly Companion Care", ar: "رعاية مرافقة المسنين" },
    summary: {
      en: "A month of companionship and daily-living support for elderly patients — safe routines, meals, and mobility help.",
      ar: "شهر من المرافقة ودعم الحياة اليومية للمسنين — روتين آمن ووجبات ومساعدة على الحركة.",
    },
    description: {
      en: "Built for elderly family members who are mostly independent but benefit from a consistent caregiver. Includes companionship, meal preparation, light housekeeping, mobility assistance, and gentle medication reminders.",
      ar: "مصمَّمة لأفراد العائلة من المسنين الذين يتمتعون بقدر من الاستقلالية لكنّهم يستفيدون من وجود مقدِّم رعاية ثابت. تشمل المرافقة وإعداد الوجبات والتنظيف الخفيف والمساعدة على الحركة والتذكير اللطيف بالأدوية.",
    },
    targetAudience: {
      en: "Elderly individuals living at home who need daily structure, safety, and a familiar face.",
      ar: "كبار السن المقيمون في المنزل ويحتاجون إلى نظام يومي وأمان ووجه مألوف.",
    },
    recommendedFor: [
      { en: "Seniors at risk of social isolation", ar: "كبار السن المعرّضون للعزلة الاجتماعية" },
      { en: "Families that need a reliable daily presence", ar: "العائلات التي تحتاج وجودًا يوميًا موثوقًا" },
      { en: "Patients with mild mobility limitations", ar: "المرضى الذين يعانون من قيود حركة بسيطة" },
    ],
    includedServices: [
      { en: "Companion support", ar: "دعم المرافقة" },
      { en: "Meal preparation", ar: "إعداد الوجبات" },
      { en: "Mobility assistance", ar: "المساعدة على الحركة" },
      { en: "Medication reminders", ar: "تذكير بالأدوية" },
      { en: "Light housekeeping", ar: "تنظيف منزلي خفيف" },
    ],
    highlights: [
      { en: "Daily companionship", ar: "مرافقة يومية" },
      { en: "Meal support", ar: "دعم الوجبات" },
      { en: "Mobility assistance", ar: "مساعدة على الحركة" },
    ],
    outcomes: [
      { en: "Predictable daily routine", ar: "روتين يومي مستقرّ" },
      { en: "Reduced fall risk", ar: "تقليل خطر السقوط" },
      { en: "Peace of mind for family", ar: "راحة بال للعائلة" },
    ],
    careTimeline: [
      {
        day: 1,
        title: { en: "Care plan setup", ar: "إعداد خطة الرعاية" },
        description: {
          en: "Nurse meets the family, reviews preferences, agrees on a daily routine.",
          ar: "يلتقي الممرض بالعائلة ويراجع التفضيلات ويتفق على روتين يومي.",
        },
      },
      {
        day: 7,
        title: { en: "First weekly review", ar: "أول مراجعة أسبوعية" },
        description: {
          en: "Adjust routine based on what's working; share notes with family.",
          ar: "تعديل الروتين وفق ما يعمل جيدًا ومشاركة الملاحظات مع العائلة.",
        },
      },
      {
        day: 30,
        title: { en: "Plan refresh", ar: "تحديث الخطة" },
        description: {
          en: "End-of-month assessment to extend, scale up, or scale down care.",
          ar: "تقييم نهاية الشهر لتمديد الرعاية أو زيادتها أو تقليصها.",
        },
      },
    ],
    durationDays: 30,
    durationOptions: [
      { days: 14, label: { en: "2 weeks", ar: "أسبوعان" } },
      { days: 30, label: { en: "1 month", ar: "شهر واحد" } },
      { days: 60, label: { en: "2 months", ar: "شهران" } },
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
    title: { en: "Total Dependence Care", ar: "رعاية الاعتماد الكامل" },
    summary: {
      en: "Comprehensive 24/7 support for patients who need full daily care, hygiene, feeding, and continuous monitoring.",
      ar: "دعم شامل على مدار الساعة للمرضى الذين يحتاجون رعاية يومية كاملة ونظافة وتغذية ومراقبة مستمرة.",
    },
    description: {
      en: "Designed for patients who cannot manage daily activities independently. Rotating nurses provide round-the-clock personal care, hygiene support, feeding assistance, repositioning, and continuous health monitoring.",
      ar: "مصمَّمة للمرضى الذين لا يستطيعون إنجاز الأنشطة اليومية باستقلال. يقدّم ممرضون بالتناوب رعاية شخصية على مدار الساعة ودعمًا في النظافة والتغذية وتغيير الوضعية ومراقبة صحية مستمرة.",
    },
    targetAudience: {
      en: "Patients with severe mobility loss, dementia, or post-stroke needs requiring full personal care.",
      ar: "المرضى الذين يعانون من فقدان حركة شديد أو خرف أو احتياجات ما بعد السكتة الدماغية، ممن يحتاجون رعاية شخصية كاملة.",
    },
    recommendedFor: [
      { en: "Patients who are bedbound or fully dependent", ar: "المرضى طريحو الفراش أو المعتمدون كليًا" },
      { en: "Families overwhelmed by 24/7 caregiving", ar: "العائلات المُرهَقة من تقديم الرعاية على مدار الساعة" },
      { en: "Post-stroke or late-stage dementia care", ar: "رعاية ما بعد السكتة الدماغية أو الخرف في مراحله المتقدّمة" },
    ],
    includedServices: [
      { en: "Personal hygiene", ar: "النظافة الشخصية" },
      { en: "Feeding assistance", ar: "المساعدة على التغذية" },
      { en: "Medication management", ar: "إدارة الأدوية" },
      { en: "Repositioning and skin care", ar: "تغيير الوضعية والعناية بالجلد" },
      { en: "Vital signs monitoring", ar: "مراقبة العلامات الحيوية" },
    ],
    highlights: [
      { en: "24/7 coverage", ar: "تغطية مستمرة" },
      { en: "Personal care", ar: "رعاية شخصية" },
      { en: "Medication management", ar: "إدارة الأدوية" },
    ],
    outcomes: [
      { en: "Continuous clinical oversight", ar: "إشراف سريري مستمر" },
      { en: "Reduced risk of bedsores", ar: "تقليل خطر تقرّحات الفراش" },
      { en: "Stable medication adherence", ar: "التزام دوائي مستقرّ" },
    ],
    careTimeline: [
      {
        day: 1,
        title: { en: "Intake assessment", ar: "تقييم الاستقبال" },
        description: {
          en: "Detailed medical review, family briefing, schedule of rotating nurses.",
          ar: "مراجعة طبية مفصّلة، إحاطة للعائلة، وجدول لممرضي التناوب.",
        },
      },
      {
        day: 14,
        title: { en: "Mid-month review", ar: "مراجعة منتصف الشهر" },
        description: {
          en: "Adjust care plan with patient's physician if needed.",
          ar: "تعديل خطة الرعاية بالتنسيق مع طبيب المريض إن لزم.",
        },
      },
      {
        day: 30,
        title: { en: "Family update", ar: "تحديث للعائلة" },
        description: {
          en: "Documented progress report and continuation planning.",
          ar: "تقرير موثَّق عن التقدّم وتخطيط للاستمرار.",
        },
      },
    ],
    durationDays: 30,
    durationOptions: [
      { days: 30, label: { en: "1 month", ar: "شهر واحد" } },
      { days: 60, label: { en: "2 months", ar: "شهران" } },
      { days: 90, label: { en: "3 months", ar: "ثلاثة أشهر" } },
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
    title: { en: "Palliative Care", ar: "الرعاية التلطيفية" },
    summary: {
      en: "Comfort-focused care for patients with serious illness — symptom relief, emotional support, and family guidance.",
      ar: "رعاية تُركّز على الراحة للمرضى الذين يعانون من أمراض جدّية — تخفيف الأعراض ودعم نفسي وإرشاد للعائلة.",
    },
    description: {
      en: "A compassionate plan that prioritizes comfort, dignity, and quality of life. Nurses manage pain and symptoms, coordinate with the patient's medical team, and support the family through difficult moments.",
      ar: "خطة رحيمة تُعطي الأولوية للراحة والكرامة وجودة الحياة. يدير الممرضون الألم والأعراض ويُنسّقون مع الفريق الطبي ويُسانِدون العائلة في اللحظات الصعبة.",
    },
    targetAudience: {
      en: "Patients living with serious or progressive illness who value comfort over aggressive treatment.",
      ar: "المرضى الذين يعيشون مع مرض جدّي أو متقدّم ويُؤثرون الراحة على العلاج المكثَّف.",
    },
    recommendedFor: [
      { en: "Patients with advanced chronic illness", ar: "المرضى ذوو الأمراض المزمنة المتقدّمة" },
      { en: "Families needing end-of-life guidance", ar: "العائلات التي تحتاج إرشادًا في مرحلة نهاية الحياة" },
      { en: "Anyone seeking a comfort-first care approach", ar: "كل من يبحث عن مقاربة رعاية تُعطي الراحة الأولوية" },
    ],
    includedServices: [
      { en: "Pain and symptom management", ar: "إدارة الألم والأعراض" },
      { en: "Emotional support", ar: "دعم نفسي" },
      { en: "Care coordination with physicians", ar: "تنسيق الرعاية مع الأطباء" },
      { en: "Family guidance", ar: "إرشاد للعائلة" },
    ],
    highlights: [
      { en: "Pain management", ar: "إدارة الألم" },
      { en: "Emotional support", ar: "دعم نفسي" },
      { en: "Care coordination", ar: "تنسيق الرعاية" },
    ],
    outcomes: [
      { en: "Symptom relief and comfort", ar: "تخفيف الأعراض وراحة المريض" },
      { en: "Coordinated care with the medical team", ar: "رعاية منسَّقة مع الفريق الطبي" },
      { en: "Family supported through every step", ar: "دعم العائلة في كل خطوة" },
    ],
    careTimeline: [
      {
        day: 1,
        title: { en: "Comfort assessment", ar: "تقييم الراحة" },
        description: {
          en: "Understand symptoms, preferences, and goals of care.",
          ar: "فهم الأعراض والتفضيلات وأهداف الرعاية.",
        },
      },
      {
        day: 7,
        title: { en: "Adjust the plan", ar: "تعديل الخطة" },
        description: {
          en: "Refine pain management, sleep, and emotional support routines.",
          ar: "صقل إدارة الألم والنوم وروتين الدعم النفسي.",
        },
      },
      {
        day: 14,
        title: { en: "Family review", ar: "مراجعة مع العائلة" },
        description: {
          en: "Sit-down with family to align on next steps and ongoing support.",
          ar: "جلسة مع العائلة للاتفاق على الخطوات التالية والدعم المستمر.",
        },
      },
    ],
    durationDays: 14,
    durationOptions: [
      { days: 7, label: { en: "1 week", ar: "أسبوع واحد" } },
      { days: 14, label: { en: "2 weeks", ar: "أسبوعان" } },
      { days: 30, label: { en: "1 month", ar: "شهر واحد" } },
    ],
    shiftOptions: ["A", "B", "C"],
    addOns: ["companion"],
    image:
      "https://images.unsplash.com/photo-1580281657521-6b2b7f0b7f6a?auto=format&fit=crop&q=80",
    active: true,
    featured: false,
  },
];
