/**
 * Seed a handful of placeholder Education Library videos so the
 * patient feed has something to render before admins curate the real
 * catalogue.
 *
 * Run: npx tsx scripts/seedEducationLibrary.ts
 *
 * Requires the Firebase Admin SDK creds (FIREBASE_ADMIN_PROJECT_ID,
 * FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) — same set
 * that scripts/seedData.ts uses. Idempotent: each seed entry has a
 * fixed id, so re-runs overwrite cleanly without producing duplicates.
 *
 * The video files come from Google's gtv-videos-bucket — public sample
 * MP4s used in countless video player demos. Treat them as visual
 * placeholders only; replace with your own content via the admin
 * panel.
 */

import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const COLLECTION = "educationVideos";
const SAMPLE_BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

interface SeedVideo {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  videoFile: string;
  thumbFile: string;
  category:
    | "general"
    | "preventive"
    | "post-op"
    | "chronic"
    | "pediatric"
    | "elderly"
    | "wellness"
    | "nutrition"
    | "mental-health";
  durationSeconds: number;
  tags: string[];
}

const SEEDS: SeedVideo[] = [
  {
    id: "seed-stay-active",
    titleEn: "Staying active at home, safely",
    titleAr: "ابقَ نشيطًا في المنزل بأمان",
    descEn:
      "Short demonstration of gentle daily movement routines patients can do at home. Reduces stiffness without straining joints.",
    descAr:
      "عرض قصير لتمارين حركة يومية لطيفة يمكن للمرضى ممارستها في المنزل. تقلل التيبس دون إجهاد المفاصل.",
    videoFile: "BigBuckBunny.mp4",
    thumbFile: "images/BigBuckBunny.jpg",
    category: "wellness",
    durationSeconds: 90,
    tags: ["mobility", "exercise"],
  },
  {
    id: "seed-managing-meds",
    titleEn: "Managing your medications",
    titleAr: "إدارة أدويتك بفعالية",
    descEn:
      "How to organize, track, and never miss a dose. A quick walkthrough for patients and caregivers managing multiple prescriptions.",
    descAr:
      "كيفية تنظيم وتتبع أدويتك دون نسيان أي جرعة. شرح سريع للمرضى ومقدمي الرعاية الذين يديرون عدة وصفات.",
    videoFile: "ElephantsDream.mp4",
    thumbFile: "images/ElephantsDream.jpg",
    category: "chronic",
    durationSeconds: 75,
    tags: ["medication", "routine"],
  },
  {
    id: "seed-recovery-after-surgery",
    titleEn: "First week after surgery: what to expect",
    titleAr: "الأسبوع الأول بعد الجراحة: ما تتوقعه",
    descEn:
      "Practical guidance from our care team on rest, wound care, and warning signs to watch during the critical post-op window.",
    descAr:
      "إرشادات عملية من فريق الرعاية حول الراحة والعناية بالجرح والعلامات التحذيرية خلال الفترة الحرجة بعد الجراحة.",
    videoFile: "ForBiggerEscapes.mp4",
    thumbFile: "images/ForBiggerEscapes.jpg",
    category: "post-op",
    durationSeconds: 110,
    tags: ["surgery", "recovery"],
  },
  {
    id: "seed-healthy-eating",
    titleEn: "Healthy eating on a budget",
    titleAr: "غذاء صحي بميزانية معقولة",
    descEn:
      "Simple meal-planning tips with affordable ingredients. Built around the food patterns most common in our region.",
    descAr:
      "نصائح بسيطة لتخطيط الوجبات بمكونات بأسعار معقولة، مبنية على الأنماط الغذائية الشائعة في منطقتنا.",
    videoFile: "ForBiggerFun.mp4",
    thumbFile: "images/ForBiggerFun.jpg",
    category: "nutrition",
    durationSeconds: 60,
    tags: ["nutrition", "budget"],
  },
  {
    id: "seed-blood-pressure",
    titleEn: "Checking your blood pressure correctly",
    titleAr: "قياس ضغط الدم بشكل صحيح",
    descEn:
      "A two-minute refresher on home blood pressure measurement: arm position, cuff size, and when to call your nurse.",
    descAr:
      "تذكير سريع في دقيقتين حول قياس ضغط الدم في المنزل: وضعية الذراع، مقاس الكفّة، ومتى تتصل بممرضك.",
    videoFile: "ForBiggerJoyrides.mp4",
    thumbFile: "images/ForBiggerJoyrides.jpg",
    category: "preventive",
    durationSeconds: 80,
    tags: ["hypertension", "vitals"],
  },
  {
    id: "seed-elderly-falls",
    titleEn: "Preventing falls at home",
    titleAr: "الوقاية من السقوط في المنزل",
    descEn:
      "Room-by-room walkthrough of small fixes that dramatically reduce fall risk for elderly family members.",
    descAr:
      "جولة في غرف المنزل لتعديلات بسيطة تقلّل بشكل كبير خطر السقوط لكبار السن في العائلة.",
    videoFile: "ForBiggerMeltdowns.mp4",
    thumbFile: "images/ForBiggerMeltdowns.jpg",
    category: "elderly",
    durationSeconds: 95,
    tags: ["falls", "home-safety"],
  },
  {
    id: "seed-when-to-call",
    titleEn: "When to call your nurse vs. the hospital",
    titleAr: "متى تتصل بممرضك ومتى بالمستشفى",
    descEn:
      "Decision-making framework for families: which symptoms warrant a Care+ nurse visit, and which mean a trip to emergency.",
    descAr:
      "إطار اتخاذ القرار للعائلات: أيّ الأعراض يستدعي زيارة ممرّض Care+، وأيّها يستوجب التوجه إلى الطوارئ.",
    videoFile: "Sintel.mp4",
    thumbFile: "images/Sintel.jpg",
    category: "general",
    durationSeconds: 70,
    tags: ["emergency", "decision-making"],
  },
  {
    id: "seed-newborn-feeding",
    titleEn: "Newborn feeding basics for new parents",
    titleAr: "أساسيات تغذية المولود للوالدين الجدد",
    descEn:
      "First-week feeding tips from our maternal-care team: positions, frequency, and what's normal vs. what to flag.",
    descAr:
      "نصائح الأسبوع الأول من فريق رعاية الأمومة: الوضعيات، عدد المرات، وما هو طبيعي مقابل ما يستوجب الانتباه.",
    videoFile: "TearsOfSteel.mp4",
    thumbFile: "images/TearsOfSteel.jpg",
    category: "pediatric",
    durationSeconds: 105,
    tags: ["newborn", "feeding"],
  },
  {
    id: "seed-stress-anxiety",
    titleEn: "Caring for someone with anxiety",
    titleAr: "رعاية شخص يعاني من القلق",
    descEn:
      "Practical, non-clinical strategies family caregivers can use to support a loved one through anxious moments.",
    descAr:
      "استراتيجيات عملية وغير سريرية يمكن لمقدّمي الرعاية في العائلة استخدامها لدعم أحبّائهم في لحظات القلق.",
    videoFile: "VolkswagenGTIReview.mp4",
    thumbFile: "images/VolkswagenGTIReview.jpg",
    category: "mental-health",
    durationSeconds: 90,
    tags: ["anxiety", "caregiving"],
  },
  {
    id: "seed-hydration-elderly",
    titleEn: "Hydration for elderly family members",
    titleAr: "ترطيب كبار السن في العائلة",
    descEn:
      "Why elderly patients drink less than they need, and simple routines that keep them hydrated through the day.",
    descAr:
      "لماذا يشرب كبار السن أقلّ مما يحتاجون، وأنشطة بسيطة تُبقيهم رطبين طوال اليوم.",
    videoFile: "SubaruOutbackOnStreetAndDirt.mp4",
    thumbFile: "images/SubaruOutbackOnStreetAndDirt.jpg",
    category: "elderly",
    durationSeconds: 65,
    tags: ["hydration", "elderly"],
  },
  {
    id: "seed-back-pain",
    titleEn: "Quick relief for everyday back pain",
    titleAr: "تخفيف سريع لآلام الظهر اليومية",
    descEn:
      "Three gentle stretches the Care+ physical-therapy team recommends for non-specific lower back pain.",
    descAr:
      "ثلاث تمارين تمديد لطيفة يوصي بها فريق العلاج الطبيعي في Care+ لآلام أسفل الظهر غير المُحدّدة.",
    videoFile: "WhatCarCanYouGetForAGrand.mp4",
    thumbFile: "images/WhatCarCanYouGetForAGrand.jpg",
    category: "wellness",
    durationSeconds: 85,
    tags: ["back-pain", "physical-therapy"],
  },
];

function loadLocalEnvFile(filename: string) {
  const fullPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadLocalEnvFile(".env.local");
  loadLocalEnvFile(".env");

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      console.error(
        "[seed-edu] Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
      );
      process.exit(1);
    }
  }

  const db = admin.firestore();
  const now = new Date().toISOString();

  let order = 1;
  for (const seed of SEEDS) {
    const payload = {
      title: { en: seed.titleEn, ar: seed.titleAr },
      description: { en: seed.descEn, ar: seed.descAr },
      videoUrl: `${SAMPLE_BASE}/${seed.videoFile}`,
      thumbnailUrl: `${SAMPLE_BASE}/${seed.thumbFile}`,
      durationSeconds: seed.durationSeconds,
      category: seed.category,
      tags: seed.tags,
      published: true,
      order: order++,
      viewCount: 0,
      saveCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
    };
    await db.collection(COLLECTION).doc(seed.id).set(payload);
    console.log(`[seed-edu] wrote ${seed.id} (${seed.category})`);
  }

  console.log(`[seed-edu] done — ${SEEDS.length} videos seeded.`);
}

main().catch((err) => {
  console.error("[seed-edu] failed", err);
  process.exit(1);
});
