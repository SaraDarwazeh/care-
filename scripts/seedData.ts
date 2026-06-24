import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { STORE_ITEMS } from "../lib/data/store";
import type { StoreItem } from "../lib/types";

type StoreItemSeed = StoreItem;
type SeedRole = "admin" | "nurse" | "patient";
type BookingStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";
type ShiftCode = "A" | "B" | "C";
type Gender = "male" | "female" | "other";
type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: SeedRole;
  status: "approved" | "pending";
}

interface NurseSeedProfile {
  fullName: string;
  profileImage: string;
  bio: string;
  specialization: string;
  services: Array<{ name: string; price: number }>;
  pricePerHour?: number;
  pricePerShift?: { A?: number; B?: number; C?: number };
  rating: number;
  availableDays: Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun">;
  availableHours: { from: string; to: string };
  acceptsOvernight: boolean;
  skills: string[];
  experienceYears: number;
  location: string;
  city: string;
  village: string;
  gender: Gender;
  availableShifts: string[];
  certificates: string[];
  languages: string[];
  transportAvailable: boolean;
  willingToServeLocations: string[];
  carePhilosophy?: string;
  gallery?: string[];
  onLeave?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
}

interface PatientSeedExtras {
  phone: string;
  emergencyContact: { name: string; relationship: string; phone: string };
  allergies: string[];
  currentMedications: string[];
  dateOfBirth: string;
  bloodType: string;
  diseases: string[];
}

interface ReviewSeedInput {
  id: string;
  nurseId: string;
  patientId: string;
  patientName: string;
  bookingId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface VitalsSeed {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

interface ObservationSeed {
  id: string;
  nurseId: string;
  nurseName: string;
  note: string;
  vitals?: VitalsSeed;
  medicationNote?: string;
  alerts?: string[];
  timestamp: string;
}

interface MedicalRecordSeedInput {
  id: string;
  patientId: string;
  nurseId: string;
  bookingId: string;
  summary: string;
  createdAt: string;
  observations: ObservationSeed[];
}

interface NotificationSeedInput {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
}

interface OrderSeedInput {
  id: string;
  patientId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

interface CommunityPostSeedInput {
  id: string;
  title: string;
  description: string;
  category: string;
  images?: string[];
  location?: string;
  contact: { name?: string; phone?: string; email?: string; notes?: string };
  createdBy?: string;
  createdAt: string;
}

interface BookingSeedInput {
  patientId: string;
  nurseId: string;
  service: string;
  price: number;
  date: string;
  time: string;
  shift: ShiftCode;
  location: string;
  notes: string;
  status: BookingStatus;
  bookingType?: "one-time" | "shift" | "package";
  packageId?: string;
  durationDays?: number;
  durationMinutes?: number;
  rejectionReason?: string;
  pricing?: {
    base: number;
    addons?: { id: string; name: string; price: number }[];
    transport?: number;
    subtotal?: number;
    total?: number;
  };
  patientNameSnapshot?: string;
  patientEmailSnapshot?: string;
  nurseNameSnapshot?: string;
  nurseSpecializationSnapshot?: string;
  nurseProfileImageSnapshot?: string;
  createdAtIso?: string;
}

interface Seeder {
  mode: "admin" | "client";
  createOrGetAuthUser: (user: SeedUser) => Promise<string>;
  ensureUserDoc: (uid: string, user: SeedUser) => Promise<void>;
  ensureNurseProfile: (uid: string, profile: NurseSeedProfile) => Promise<void>;
  ensurePatientProfile: (
    uid: string,
    location: string,
    medicalHistory: string,
    extras: PatientSeedExtras,
  ) => Promise<void>;
  ensureBooking: (input: BookingSeedInput) => Promise<void>;
  ensureReview: (input: ReviewSeedInput) => Promise<void>;
  ensureMedicalRecord: (input: MedicalRecordSeedInput) => Promise<void>;
  ensureNotification: (input: NotificationSeedInput) => Promise<void>;
  ensureOrder: (input: OrderSeedInput) => Promise<void>;
  ensureProduct: (item: StoreItemSeed) => Promise<void>;
  ensureCommunityPost: (input: CommunityPostSeedInput) => Promise<void>;
  setNurseAggregate: (nurseId: string, rating: number, reviewCount: number) => Promise<void>;
}

const villages = [
  "Asira ash-Shamaliya",
  "Beit Iba",
  "Deir Sharaf",
  "Rujeib",
  "Zawata",
  "Tell",
  "Awarta",
  "Sabastiya",
  "Burin",
  "Madama",
];

const servicesCatalog = [
  { name: "wound dressing", basePrice: 24 },
  { name: "IV injection", basePrice: 30 },
  { name: "elderly care", basePrice: 26 },
  { name: "post-operative care", basePrice: 34 },
];

const shifts: Record<ShiftCode, { from: string; to: string; time: string }> = {
  A: { from: "07:00", to: "14:00", time: "08:30" },
  B: { from: "14:00", to: "20:00", time: "15:00" },
  C: { from: "20:00", to: "07:00", time: "21:30" },
};

function loadLocalEnvFile(fileName: string) {
  const fullPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnvFiles() {
  loadLocalEnvFile(".env.local");
  loadLocalEnvFile(".env");
}

function hasAdminCreds() {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

function getAdminPrivateKey() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  return key ? key.replace(/\\n/g, "\n") : undefined;
}

function getRandomRating(index: number) {
  const raw = 3.5 + ((index * 17) % 16) / 10;
  return Math.min(5, Number(raw.toFixed(1)));
}

function getRandomDays(index: number) {
  const daySets: Array<Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun">> = [
    ["Mon", "Tue", "Wed", "Thu"],
    ["Tue", "Wed", "Fri", "Sat"],
    ["Mon", "Thu", "Fri", "Sun"],
    ["Wed", "Thu", "Sat", "Sun"],
    ["Mon", "Tue", "Fri", "Sun"],
  ];

  return daySets[index % daySets.length];
}

function pickShift(index: number): ShiftCode {
  const shiftCodes: ShiftCode[] = ["A", "B", "C"];
  return shiftCodes[index % shiftCodes.length];
}

function bookingDocId(input: BookingSeedInput) {
  const serviceKey = input.service.replace(/\s+/g, "-").toLowerCase();
  return `${input.patientId}-${input.nurseId}-${input.date}-${serviceKey}-${input.shift}`;
}

function buildNurseSeedUsers(): SeedUser[] {
  const approved: SeedUser[] = NURSE_PERSONAS.map((persona) => ({
    fullName: persona.name,
    email: persona.email,
    password: "12345678",
    role: "nurse",
    status: "approved",
  }));
  // Seed two pending nurses so admin/nurses screen always has something to
  // review during live testing.
  const pending: SeedUser[] = [
    {
      fullName: "Salma Jaber",
      email: "nurse.salma@careplus.com",
      password: "12345678",
      role: "nurse",
      status: "pending",
    },
    {
      fullName: "Hisham Najjar",
      email: "nurse.hisham@careplus.com",
      password: "12345678",
      role: "nurse",
      status: "pending",
    },
  ];
  return [...approved, ...pending];
}

// Each nurse seed entry is paired with a stable persona index so gender,
// languages, and certificates remain consistent across seed runs (rather
// than rotating off the `index` and looking different per name on retry).
const NURSE_PERSONAS: Array<{
  name: string;
  email: string;
  gender: Gender;
  pravatar: number;
  certificates: string[];
  languages: string[];
  transportAvailable: boolean;
  skills: string[];
  carePhilosophy: string;
  onLeave?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
}> = [
  {
    name: "Lina Abu Salim", email: "nurse.lina@careplus.com", gender: "female", pravatar: 47,
    certificates: ["RN License", "CPR Certified", "Wound Care Specialist"],
    languages: ["Arabic", "English"], transportAvailable: true,
    skills: ["wound care", "elderly support", "vital monitoring"],
    carePhilosophy: "I treat every patient like family. Calm communication and clean technique matter more than speed.",
  },
  {
    name: "Yousef Taqatqa", email: "nurse.yousef@careplus.com", gender: "male", pravatar: 12,
    certificates: ["RN License", "Advanced Cardiac Life Support"],
    languages: ["Arabic", "English"], transportAvailable: true,
    skills: ["IV therapy", "post-op care", "cardiac monitoring"],
    carePhilosophy: "Clear hand-offs to the family and the patient's physician are what makes home care safe.",
  },
  {
    name: "Rana Darwish", email: "nurse.rana@careplus.com", gender: "female", pravatar: 49,
    certificates: ["RN License", "Geriatric Care Certified", "Dementia Care Training"],
    languages: ["Arabic", "English", "French"], transportAvailable: false,
    skills: ["elderly support", "cooking", "companion care"],
    carePhilosophy: "Routine is medicine for elderly patients. I build calm, predictable days.",
  },
  {
    name: "Khaled Hamed", email: "nurse.khaled@careplus.com", gender: "male", pravatar: 33,
    certificates: ["RN License", "CPR Certified"],
    languages: ["Arabic"], transportAvailable: true,
    skills: ["mobility support", "rehab", "patient support"],
    carePhilosophy: "Rehab patients need both technical care and someone who believes in their recovery.",
  },
  {
    name: "Alaa Sbeih", email: "nurse.alaa@careplus.com", gender: "female", pravatar: 45,
    certificates: ["RN License", "IV Therapy Certified", "Diabetes Educator"],
    languages: ["Arabic", "English"], transportAvailable: true,
    skills: ["IV therapy", "diabetes monitoring", "patient support"],
    carePhilosophy: "Education is care. I want patients to understand their treatment, not just receive it.",
  },
  {
    name: "Mona Hanani", email: "nurse.mona@careplus.com", gender: "female", pravatar: 9,
    certificates: ["RN License", "Palliative Care Specialist"],
    languages: ["Arabic", "English"], transportAvailable: false,
    skills: ["palliative care", "emotional support", "family guidance"],
    carePhilosophy: "Comfort and dignity guide every decision when patients face serious illness.",
  },
  {
    name: "Tariq Odeh", email: "nurse.tariq@careplus.com", gender: "male", pravatar: 60,
    certificates: ["RN License", "Night Care Trained"],
    languages: ["Arabic", "English"], transportAvailable: true,
    skills: ["night care", "vital monitoring", "elderly support"],
    carePhilosophy: "Night shifts demand calm presence and the ability to make good calls without waking the family.",
  },
  {
    name: "Nour Sabra", email: "nurse.nour@careplus.com", gender: "female", pravatar: 36,
    certificates: ["RN License", "Pediatric Care Certified"],
    languages: ["Arabic", "English", "Hebrew"], transportAvailable: true,
    skills: ["pediatric care", "family support", "vital monitoring"],
    carePhilosophy: "Children read the room. Parents need confidence; kids need calm. I aim to give both.",
  },
  {
    name: "Dima Yasin", email: "nurse.dima@careplus.com", gender: "female", pravatar: 24,
    certificates: ["RN License", "Wound Care Specialist", "Diabetes Educator"],
    languages: ["Arabic", "English"], transportAvailable: false,
    skills: ["wound care", "diabetes monitoring", "elderly support"],
    carePhilosophy: "I document carefully — clear notes today save a hospital trip tomorrow.",
    // Seed one nurse on leave so the marketplace 'on leave' badge + the
    // booking validator can be tested end-to-end without manual setup.
    onLeave: true,
    leaveStartDate: isoOffsetDate(-2),
    leaveEndDate: isoOffsetDate(10),
  },
  {
    name: "Omar Al-Khatib", email: "nurse.omar@careplus.com", gender: "male", pravatar: 53,
    certificates: ["RN License", "CPR Certified", "Advanced Cardiac Life Support"],
    languages: ["Arabic", "English"], transportAvailable: true,
    skills: ["IV therapy", "post-op care", "cardiac monitoring"],
    carePhilosophy: "Trust comes from being on time, prepared, and honest about what I see.",
  },
];

const SPECIALIZATION_BY_INDEX = [
  "Wound Care",
  "Post-Operative Recovery",
  "Elderly Home Support",
  "Mobility and Rehab Support",
  "IV and Medication Care",
  "Palliative Home Nursing",
  "Night Shift Home Care",
  "Family Home Nursing",
  "Diabetes Monitoring",
  "Chronic Disease Follow-up",
];

const SHIFT_OPTIONS_BY_INDEX: ShiftCode[][] = [
  ["A", "B"],
  ["A", "B", "C"],
  ["A"],
  ["B", "C"],
  ["A", "B"],
  ["B"],
  ["C"],
  ["A", "B"],
  ["A", "B"],
  ["A", "B", "C"],
];

function isoOffsetDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// Firestore client SDK rejects undefined values; this strips them while
// preserving null, 0, empty strings, and empty arrays.
function stripUndefined<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(input).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as T;
}

function getNurseProfile(index: number, nurseName: string): NurseSeedProfile {
  const persona = NURSE_PERSONAS[index] ?? NURSE_PERSONAS[0];
  const primaryShift = pickShift(index);
  const shiftRange = shifts[primaryShift];
  const availableShifts = SHIFT_OPTIONS_BY_INDEX[index % SHIFT_OPTIONS_BY_INDEX.length];

  const serviceCount = 2 + (index % 3);
  const services = servicesCatalog.slice(0, serviceCount).map((service, serviceIndex) => ({
    name: service.name,
    price: service.basePrice + index + serviceIndex * 3,
  }));

  const village = villages[index % villages.length];
  const secondaryVillage = villages[(index + 3) % villages.length];

  // Seeded nurses get a clean colored-initial avatar via ui-avatars.com
  // rather than a random face from pravatar.cc. Real consented nurse
  // photos replace these after admin re-approval — see
  // docs/MEDIA_CHECKLIST.md. The accent colour rotates by index so the
  // marketplace looks visually varied even without real photos.
  const avatarPalette = ["0ea5e9", "10b981", "8b5cf6", "f59e0b", "ec4899", "06b6d4"];
  const accent = avatarPalette[index % avatarPalette.length];
  const initialsAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nurseName)}&size=400&background=${accent}&color=ffffff&bold=true&format=png&font-size=0.45`;

  return {
    fullName: nurseName,
    profileImage: initialsAvatar,
    bio: `${nurseName.split(" ")[0]} provides attentive home nursing support focused on safety, comfort, and clear communication with patients and families.`,
    specialization: SPECIALIZATION_BY_INDEX[index % SPECIALIZATION_BY_INDEX.length],
    services,
    pricePerHour: 18 + index,
    // Per-shift price = ~8h × hourly + small variance, with shift C carrying
    // the overnight premium baked in (replaces the legacy overnight surcharge).
    pricePerShift: ((): { A?: number; B?: number; C?: number } => {
      const hourly = 18 + index;
      const base = hourly * 8;
      const obj: { A?: number; B?: number; C?: number } = {};
      if (availableShifts.includes("A")) obj.A = base;
      if (availableShifts.includes("B")) obj.B = base + 10;
      if (availableShifts.includes("C")) obj.C = base + 40;
      return obj;
    })(),
    rating: getRandomRating(index),
    availableDays: getRandomDays(index),
    availableHours: { from: shiftRange.from, to: shiftRange.to },
    acceptsOvernight: availableShifts.includes("C"),
    skills: persona.skills,
    experienceYears: 2 + (index % 9),
    location: `Nablus - ${village}`,
    city: "Nablus",
    village,
    gender: persona.gender,
    availableShifts,
    certificates: persona.certificates,
    languages: persona.languages,
    transportAvailable: persona.transportAvailable,
    willingToServeLocations: [village, secondaryVillage, "Nablus city center"],
    carePhilosophy: persona.carePhilosophy,
    gallery: [
      `https://i.pravatar.cc/600?img=${persona.pravatar}`,
      `https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80&w=600`,
    ],
    onLeave: persona.onLeave,
    leaveStartDate: persona.leaveStartDate,
    leaveEndDate: persona.leaveEndDate,
  };
}

function getPatientSeedUsers(): Array<SeedUser & { location: string; medicalHistory: string; extras: PatientSeedExtras }> {
  return [
    {
      fullName: "Huda Masri",
      email: "patient.huda@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Asira ash-Shamaliya",
      medicalHistory: "Hypertension, mild anemia, periodic dizziness.",
      extras: {
        phone: "+970599100201",
        emergencyContact: { name: "Karim Masri", relationship: "Son", phone: "+970599100202" },
        allergies: ["Penicillin"],
        currentMedications: ["Amlodipine 5mg daily", "Ferrous sulfate 325mg daily"],
        dateOfBirth: "1958-04-12",
        bloodType: "O+",
        diseases: ["Hypertension", "Mild anemia"],
      },
    },
    {
      fullName: "Ahmad Bisharat",
      email: "patient.ahmad@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Rujeib",
      medicalHistory: "Post-surgery recovery, mobility assistance needed.",
      extras: {
        phone: "+970599100211",
        emergencyContact: { name: "Lina Bisharat", relationship: "Wife", phone: "+970599100212" },
        allergies: [],
        currentMedications: ["Paracetamol 500mg as needed", "Enoxaparin 40mg daily"],
        dateOfBirth: "1972-09-30",
        bloodType: "A+",
        diseases: ["Recent knee surgery"],
      },
    },
    {
      fullName: "Rami Kanaan",
      email: "patient.rami@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Beit Iba",
      medicalHistory: "Type 2 diabetes, insulin routine monitoring.",
      extras: {
        phone: "+970599100221",
        emergencyContact: { name: "Samira Kanaan", relationship: "Sister", phone: "+970599100222" },
        allergies: ["Sulfa drugs"],
        currentMedications: ["Metformin 1000mg twice daily", "Insulin glargine"],
        dateOfBirth: "1965-12-04",
        bloodType: "B+",
        diseases: ["Type 2 diabetes", "Mild neuropathy"],
      },
    },
    {
      fullName: "Maha Touqan",
      email: "patient.maha@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Deir Sharaf",
      medicalHistory: "Elderly care support and daily medication reminders.",
      extras: {
        phone: "+970599100231",
        emergencyContact: { name: "Yara Touqan", relationship: "Daughter", phone: "+970599100232" },
        allergies: ["Latex"],
        currentMedications: ["Donepezil 5mg daily", "Vitamin D 1000IU daily"],
        dateOfBirth: "1949-07-22",
        bloodType: "AB+",
        diseases: ["Mild cognitive impairment"],
      },
    },
    {
      fullName: "Nadia Fares",
      email: "patient.nadia@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Zawata",
      medicalHistory: "Recovering from cesarean section, post-natal support.",
      extras: {
        phone: "+970599100241",
        emergencyContact: { name: "Iyad Fares", relationship: "Husband", phone: "+970599100242" },
        allergies: [],
        currentMedications: ["Ibuprofen 400mg as needed", "Iron supplements"],
        dateOfBirth: "1991-03-18",
        bloodType: "O-",
        diseases: ["Post-natal recovery"],
      },
    },
  ];
}

interface BookingTemplate {
  status: BookingStatus;
  daysFromNow: number; // negative = past, positive = future
  bookingType: "one-time" | "shift" | "package";
  packageId?: string;
  durationDays?: number;
  rejectionReason?: string;
}

// Mixed-status booking spread covering every BookingStatus and every
// BookingType. Past dates use negative offsets so completed/cancelled
// land in the patient's history; pending/accepted use future dates so
// they're actionable for the nurse + admin during live testing.
const BOOKING_TEMPLATES: BookingTemplate[] = [
  { status: "completed",  daysFromNow: -14, bookingType: "one-time" },
  { status: "completed",  daysFromNow: -10, bookingType: "shift"    },
  { status: "completed",  daysFromNow:  -7, bookingType: "package", packageId: "post-op", durationDays: 7 },
  { status: "completed",  daysFromNow:  -5, bookingType: "one-time" },
  { status: "completed",  daysFromNow:  -3, bookingType: "shift"    },
  { status: "cancelled",  daysFromNow:  -6, bookingType: "one-time" },
  { status: "cancelled",  daysFromNow:  -2, bookingType: "shift"    },
  { status: "rejected",   daysFromNow:  -8, bookingType: "one-time", rejectionReason: "Nurse double-booked that morning." },
  { status: "accepted",   daysFromNow:   2, bookingType: "one-time" },
  { status: "accepted",   daysFromNow:   3, bookingType: "shift"    },
  { status: "accepted",   daysFromNow:   5, bookingType: "package", packageId: "elderly-companion", durationDays: 14 },
  { status: "accepted",   daysFromNow:   7, bookingType: "one-time" },
  { status: "pending",    daysFromNow:   4, bookingType: "one-time" },
  { status: "pending",    daysFromNow:   6, bookingType: "shift"    },
  { status: "pending",    daysFromNow:   9, bookingType: "package", packageId: "palliative", durationDays: 14 },
];

function buildBookingSeeds(patientIds: string[], nurseIds: string[]): BookingSeedInput[] {
  const seeds: BookingSeedInput[] = [];
  if (patientIds.length === 0 || nurseIds.length === 0) return seeds;

  BOOKING_TEMPLATES.forEach((template, index) => {
    const patientId = patientIds[index % patientIds.length];
    // Skip the on-leave nurse for any future bookings so we don't seed
    // self-inconsistent state (the validator would refuse them later).
    const nurseRotation = template.daysFromNow > 0
      ? nurseIds.filter((_, i) => !NURSE_PERSONAS[i]?.onLeave)
      : nurseIds;
    const nurseId = nurseRotation[index % nurseRotation.length];
    const shift = pickShift(index);
    const shiftInfo = shifts[shift];
    const service = servicesCatalog[index % servicesCatalog.length];
    const targetDate = isoOffsetDate(template.daysFromNow);
    const base = service.basePrice + index;
    const transport = template.bookingType === "package" ? 8 : 4;
    const subtotal = base + transport;
    const total = subtotal;

    seeds.push({
      patientId,
      nurseId,
      service: service.name,
      price: total,
      date: targetDate,
      time: shiftInfo.time,
      shift,
      location: `Nablus - ${villages[(index + 2) % villages.length]}`,
      notes: `Seeded ${template.bookingType} ${template.status} booking for ${service.name}.`,
      status: template.status,
      bookingType: template.bookingType,
      packageId: template.packageId,
      durationDays: template.durationDays,
      durationMinutes: template.bookingType === "one-time" ? 60 : undefined,
      rejectionReason: template.rejectionReason,
      pricing: { base, transport, subtotal, total },
      createdAtIso: isoOffsetDate(Math.min(template.daysFromNow - 1, -1)),
    });
  });

  return seeds;
}

function reviewIdFor(nurseId: string, patientId: string): string {
  return `seed-review-${nurseId}-${patientId}`;
}

function buildReviewSeeds(
  completedBookings: Array<{ booking: BookingSeedInput; nurseName: string; patientName: string }>,
): ReviewSeedInput[] {
  // Build at most one review per (nurse, patient) pair so the
  // canPatientReview rule (one-per-pair) is respected.
  const seen = new Set<string>();
  const reviews: ReviewSeedInput[] = [];
  const samples = [
    { rating: 5, comment: "Professional, kind, and right on time. We felt completely safe leaving our mother in her care." },
    { rating: 5, comment: "Made a hard recovery much easier. Clear notes for the family every day." },
    { rating: 4, comment: "Very knowledgeable. Communication could be a little warmer but overall great." },
    { rating: 5, comment: "Calm, attentive, and patient with my elderly father. Highly recommend." },
    { rating: 4, comment: "Punctual and skilled. Helped us through the toughest days after surgery." },
    { rating: 5, comment: "Genuinely caring. Took the time to explain medications and what to watch for." },
  ];

  completedBookings.forEach(({ booking, nurseName, patientName }, index) => {
    const key = `${booking.nurseId}::${booking.patientId}`;
    if (seen.has(key)) return;
    seen.add(key);
    const sample = samples[index % samples.length];
    reviews.push({
      id: reviewIdFor(booking.nurseId, booking.patientId),
      nurseId: booking.nurseId,
      patientId: booking.patientId,
      patientName,
      bookingId: bookingDocId(booking),
      rating: sample.rating,
      comment: sample.comment.replace(/her care/, `${nurseName.split(" ")[0]}'s care`),
      createdAt: new Date(`${booking.date}T12:00:00Z`).toISOString(),
    });
  });
  return reviews;
}

function aggregateReviews(reviews: ReviewSeedInput[]): Map<string, { rating: number; count: number }> {
  const buckets = new Map<string, { sum: number; count: number }>();
  reviews.forEach((r) => {
    const b = buckets.get(r.nurseId) ?? { sum: 0, count: 0 };
    b.sum += r.rating;
    b.count += 1;
    buckets.set(r.nurseId, b);
  });
  const out = new Map<string, { rating: number; count: number }>();
  buckets.forEach((b, nurseId) => {
    out.set(nurseId, {
      rating: Math.round((b.sum / b.count) * 10) / 10,
      count: b.count,
    });
  });
  return out;
}

function buildMedicalRecordSeeds(
  completedBookings: Array<{ booking: BookingSeedInput; nurseName: string }>,
): MedicalRecordSeedInput[] {
  return completedBookings.map(({ booking, nurseName }, index) => {
    const bookingId = bookingDocId(booking);
    const visitDate = new Date(`${booking.date}T${booking.time || "10:00"}:00Z`);
    const sampleNotes = [
      { note: "Vitals stable. Dressing changed, wound healing well with no signs of infection.", vitals: { bloodPressure: "118/76", heartRate: 72, temperature: 36.7, oxygenSaturation: 98 } },
      { note: "Helped patient with morning routine. Encouraged hydration and gentle movement.", vitals: { bloodPressure: "124/80", heartRate: 78, temperature: 36.5, oxygenSaturation: 97 } },
      { note: "Administered scheduled medication. Patient tolerating regimen well.", vitals: { bloodPressure: "130/82", heartRate: 82, temperature: 36.8, oxygenSaturation: 97 }, medicationNote: "Insulin glargine 12 units administered subcutaneously." },
      { note: "Post-op assessment: range of motion improving. Slight tenderness around incision is within expected range.", vitals: { bloodPressure: "120/78", heartRate: 76, temperature: 36.6, oxygenSaturation: 98 } },
      { note: "Calm shift. Reviewed evening medications with family caregiver.", vitals: { bloodPressure: "126/82", heartRate: 70, temperature: 36.5, oxygenSaturation: 98 } },
    ];
    const sample = sampleNotes[index % sampleNotes.length];
    const followupSample = sampleNotes[(index + 1) % sampleNotes.length];

    return {
      id: `seed-record-${bookingId}`,
      patientId: booking.patientId,
      nurseId: booking.nurseId,
      bookingId,
      summary: `Visit completed for ${booking.service}. ${sample.note.split(".")[0]}.`,
      createdAt: visitDate.toISOString(),
      observations: [
        {
          id: "obs-1",
          nurseId: booking.nurseId,
          nurseName,
          note: sample.note,
          vitals: sample.vitals,
          medicationNote: sample.medicationNote,
          alerts: index % 4 === 0 ? ["Recommend follow-up in 48 hours."] : undefined,
          timestamp: visitDate.toISOString(),
        },
        {
          id: "obs-2",
          nurseId: booking.nurseId,
          nurseName,
          note: followupSample.note,
          vitals: followupSample.vitals,
          timestamp: new Date(visitDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
  });
}

function buildNotificationSeeds(input: {
  adminUid: string;
  nurseIds: string[];
  patientIds: string[];
  pendingNurseIds: string[];
  completedBookings: BookingSeedInput[];
  pendingBookings: BookingSeedInput[];
}): NotificationSeedInput[] {
  const out: NotificationSeedInput[] = [];
  const now = Date.now();
  const minutesAgo = (n: number) => new Date(now - n * 60 * 1000).toISOString();

  // Admin: pending nurse approval + new booking + new order
  input.pendingNurseIds.forEach((nurseUid, i) => {
    out.push({
      id: `seed-notif-admin-nursesignup-${nurseUid}`,
      userId: input.adminUid,
      type: "nurse_signup",
      title: "New nurse registration",
      body: "A new nurse just signed up and is awaiting approval.",
      link: "/admin/nurses",
      read: false,
      createdAt: minutesAgo(120 + i * 30),
      payload: { nurseUserId: nurseUid },
    });
  });
  input.pendingBookings.slice(0, 2).forEach((b, i) => {
    out.push({
      id: `seed-notif-admin-booking-${bookingDocId(b)}`,
      userId: input.adminUid,
      type: "booking_created",
      title: "New booking",
      body: `New booking request for ${b.service} on ${b.date}.`,
      link: "/admin/bookings",
      read: i > 0,
      createdAt: minutesAgo(45 + i * 15),
    });
  });
  out.push({
    id: `seed-notif-admin-order-1`,
    userId: input.adminUid,
    type: "order_created",
    title: "New store order",
    body: "A new order totaling ₪67.00 is awaiting review.",
    link: "/admin/orders",
    read: false,
    createdAt: minutesAgo(30),
  });

  // Nurses: incoming booking + a completed visit ack
  input.pendingBookings.forEach((b, i) => {
    out.push({
      id: `seed-notif-nurse-booking-${bookingDocId(b)}`,
      userId: b.nurseId,
      type: "booking_created",
      title: "New booking request",
      body: `A patient requested ${b.service} on ${b.date}.`,
      link: "/nurse/bookings",
      read: false,
      createdAt: minutesAgo(60 + i * 10),
    });
  });

  // Patients: confirmation, completed, order updates
  input.completedBookings.slice(0, 3).forEach((b, i) => {
    out.push({
      id: `seed-notif-patient-completed-${bookingDocId(b)}`,
      userId: b.patientId,
      type: "booking_completed",
      title: "Visit completed",
      body: `Your visit (${b.service} on ${b.date}) is marked as completed.`,
      link: "/patient/appointments",
      read: i > 0,
      createdAt: new Date(`${b.date}T16:00:00Z`).toISOString(),
    });
  });
  input.pendingBookings.filter((b) => b.status === "accepted").slice(0, 2).forEach((b, i) => {
    out.push({
      id: `seed-notif-patient-accepted-${bookingDocId(b)}`,
      userId: b.patientId,
      type: "booking_accepted",
      title: "Booking accepted",
      body: `Your nurse confirmed ${b.service} on ${b.date}.`,
      link: "/patient/appointments",
      read: false,
      createdAt: minutesAgo(120 + i * 30),
    });
  });
  if (input.patientIds[0]) {
    out.push({
      id: `seed-notif-patient-order-1`,
      userId: input.patientIds[0],
      type: "order_status_changed",
      title: "Order update",
      body: "Your order is out for delivery.",
      link: "/patient/orders",
      read: false,
      createdAt: minutesAgo(20),
    });
  }
  return out;
}

function buildOrderSeeds(patientIds: string[]): OrderSeedInput[] {
  if (patientIds.length === 0) return [];
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();
  const p1 = patientIds[0];
  const p2 = patientIds[1] ?? p1;
  const p3 = patientIds[2] ?? p1;

  return [
    {
      id: `seed-order-${p1}-1`,
      patientId: p1,
      items: [
        { productId: "prod_1", quantity: 1, price: 45 },
        { productId: "prod_8", quantity: 1, price: 15 },
      ],
      total: 60,
      status: "delivered",
      createdAt: daysAgo(12),
    },
    {
      id: `seed-order-${p1}-2`,
      patientId: p1,
      items: [{ productId: "prod_4", quantity: 2, price: 18 }],
      total: 36,
      status: "shipped",
      createdAt: daysAgo(2),
    },
    {
      id: `seed-order-${p2}-1`,
      patientId: p2,
      items: [
        { productId: "prod_9", quantity: 1, price: 28 },
        { productId: "prod_5", quantity: 1, price: 22 },
      ],
      total: 50,
      status: "processing",
      createdAt: daysAgo(1),
    },
    {
      id: `seed-order-${p3}-1`,
      patientId: p3,
      items: [{ productId: "prod_6", quantity: 1, price: 89 }],
      total: 89,
      status: "pending",
      createdAt: daysAgo(0),
    },
  ];
}

function buildCommunityPostSeeds(patientIds: string[]): CommunityPostSeedInput[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "seed-community-1",
      title: "Folding wheelchair — free to a family in need",
      description: "Light folding wheelchair, used for 6 months after my mother's recovery. Clean, fully functional. Pickup in Asira ash-Shamaliya.",
      category: "Wheelchairs",
      location: "Nablus - Asira ash-Shamaliya",
      contact: { name: "Huda Masri", phone: "+970599100201", notes: "Available evenings." },
      createdBy: patientIds[0],
      createdAt: daysAgo(2),
    },
    {
      id: "seed-community-2",
      title: "Adjustable hospital bed (electric)",
      description: "Single electric hospital bed with side rails. Used for my father's post-op recovery. In good working condition.",
      category: "Beds",
      location: "Nablus - Rujeib",
      contact: { name: "Ahmad Bisharat", phone: "+970599100211" },
      createdBy: patientIds[1],
      createdAt: daysAgo(5),
    },
    {
      id: "seed-community-3",
      title: "Standard walker with wheels",
      description: "Walker in great shape, padded handles. Perfect for someone recovering at home.",
      category: "Walkers",
      location: "Nablus - Beit Iba",
      contact: { name: "Rami Kanaan", email: "patient.rami@careplus.com" },
      createdBy: patientIds[2],
      createdAt: daysAgo(7),
    },
    {
      id: "seed-community-4",
      title: "Glucometer + 50 unused test strips",
      description: "Switched to a different model. Including 50 unused test strips and lancets.",
      category: "Equipment",
      location: "Nablus - Deir Sharaf",
      contact: { name: "Maha Touqan", phone: "+970599100231" },
      createdBy: patientIds[3],
      createdAt: daysAgo(10),
    },
    {
      id: "seed-community-5",
      title: "Bedside commode chair",
      description: "Sturdy commode chair, gently used and fully sanitized. Free to any family who needs it.",
      category: "Equipment",
      location: "Nablus - Zawata",
      contact: { name: "Nadia Fares", phone: "+970599100241" },
      createdBy: patientIds[4] ?? patientIds[0],
      createdAt: daysAgo(14),
    },
    {
      id: "seed-community-6",
      title: "Compression stockings — sealed packs",
      description: "Two sealed pairs (medium) of medical compression stockings, never used.",
      category: "Other",
      location: "Nablus city center",
      contact: { name: "Lina Z.", phone: "+970599100299", notes: "Available weekdays after 5pm." },
      createdAt: daysAgo(18),
    },
  ];
}

async function createAdminSeeder(): Promise<Seeder> {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getAdminPrivateKey();

  if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }

  const db = admin.firestore();

  async function createOrGetAuthUser(user: SeedUser) {
    try {
      const existing = await admin.auth().getUserByEmail(user.email);
      return existing.uid;
    } catch {
      const created = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.fullName,
      });
      return created.uid;
    }
  }

  async function ensureUserDoc(uid: string, user: SeedUser) {
    const ref = db.collection("users").doc(uid);
    if ((await ref.get()).exists) return;
    await ref.set({
      id: uid,
      name: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: new Date().toISOString(),
      createdAtServer: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function ensureNurseProfile(uid: string, profile: NurseSeedProfile) {
    const ref = db.collection("nurseProfiles").doc(uid);
    const payload = stripUndefined({ userId: uid, ...profile });
    await ref.set(payload, { merge: true });
  }

  async function ensurePatientProfile(
    uid: string,
    location: string,
    medicalHistory: string,
    extras: PatientSeedExtras,
  ) {
    const ref = db.collection("patientProfiles").doc(uid);
    const profile = {
      userId: uid,
      defaultLocation: location,
      medicalHistory,
      phone: extras.phone,
      emergencyContact: extras.emergencyContact,
      allergies: extras.allergies,
      currentMedications: extras.currentMedications,
      dateOfBirth: extras.dateOfBirth,
      bloodType: extras.bloodType,
      diseases: extras.diseases,
      paymentMethods: [],
      profileCompleted: true,
    };
    await ref.set(profile, { merge: true });
  }

  async function ensureBooking(input: BookingSeedInput) {
    const ref = db.collection("bookings").doc(bookingDocId(input));
    const { createdAtIso, ...rest } = input;
    const payload: Record<string, unknown> = { ...rest, createdAt: createdAtIso ?? new Date().toISOString() };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await ref.set(payload, { merge: true });
  }

  async function ensureReview(input: ReviewSeedInput) {
    const ref = db.collection("reviews").doc(input.id);
    await ref.set(stripUndefined({ ...input }), { merge: true });
  }

  async function ensureMedicalRecord(input: MedicalRecordSeedInput) {
    const ref = db.collection("medicalRecords").doc(input.id);
    const { observations, ...rest } = input;
    await ref.set({ ...rest, updatedAt: new Date().toISOString() }, { merge: true });
    for (const obs of observations) {
      const obsRef = db.collection("medicalRecords").doc(input.id).collection("observations").doc(obs.id);
      const obsPayload: Record<string, unknown> = { ...obs };
      Object.keys(obsPayload).forEach((k) => obsPayload[k] === undefined && delete obsPayload[k]);
      await obsRef.set(obsPayload, { merge: true });
    }
  }

  async function ensureNotification(input: NotificationSeedInput) {
    const ref = db.collection("notifications").doc(input.id);
    const payload: Record<string, unknown> = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      read: input.read,
      createdAt: input.createdAt,
      payload: input.payload,
      deliveredVia: ["in_app"],
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await ref.set(payload, { merge: true });
  }

  async function ensureOrder(input: OrderSeedInput) {
    const ref = db.collection("orders").doc(input.id);
    await ref.set(input, { merge: true });
  }

  async function ensureProduct(item: StoreItemSeed) {
    const ref = db.collection("products").doc(item.id);
    await ref.set(item, { merge: true });
  }

  async function ensureCommunityPost(input: CommunityPostSeedInput) {
    const ref = db.collection("communityPosts").doc(input.id);
    const payload: Record<string, unknown> = { ...input };
    delete (payload as { id?: string }).id;
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await ref.set(payload, { merge: true });
  }

  async function setNurseAggregate(nurseId: string, rating: number, reviewCount: number) {
    const ref = db.collection("nurseProfiles").doc(nurseId);
    await ref.set({ rating, reviewCount }, { merge: true });
  }

  return {
    mode: "admin",
    createOrGetAuthUser,
    ensureUserDoc,
    ensureNurseProfile,
    ensurePatientProfile,
    ensureBooking,
    ensureReview,
    ensureMedicalRecord,
    ensureNotification,
    ensureOrder,
    ensureProduct,
    ensureCommunityPost,
    setNurseAggregate,
  };
}

async function createClientSeeder(): Promise<Seeder> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error("Missing NEXT_PUBLIC Firebase config variables.");
  }

  const app = initializeApp({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId });
  const db = getFirestore(app);

  async function identityToolkit(endpoint: string, body: Record<string, unknown>) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { error?: { message?: string } } & Record<string, unknown>;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Identity Toolkit request failed");
    }

    return payload;
  }

  async function findUidByEmailFromFirestore(email: string) {
    const users = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    if (users.empty) return null;
    return users.docs[0].id;
  }

  async function createOrGetAuthUser(user: SeedUser) {
    try {
      const created = await identityToolkit("accounts:signUp", {
        email: user.email,
        password: user.password,
        returnSecureToken: true,
      });
      return String(created.localId);
    } catch (error) {
      const message = String((error as Error).message || "");
      if (!message.includes("EMAIL_EXISTS")) {
        throw error;
      }

      try {
        const signedIn = await identityToolkit("accounts:signInWithPassword", {
          email: user.email,
          password: user.password,
          returnSecureToken: true,
        });
        return String(signedIn.localId);
      } catch {
        const fallbackUid = await findUidByEmailFromFirestore(user.email);
        if (!fallbackUid) {
          throw new Error(`Email exists in Auth but uid could not be determined for ${user.email}.`);
        }
        return fallbackUid;
      }
    }
  }

  async function ensureUserDoc(uid: string, user: SeedUser) {
    const ref = doc(db, "users", uid);
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, {
      id: uid,
      name: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: new Date().toISOString(),
    });
  }

  async function ensureNurseProfile(uid: string, profile: NurseSeedProfile) {
    const ref = doc(db, "nurseProfiles", uid);
    const payload = stripUndefined({ userId: uid, ...profile });
    await setDoc(ref, payload, { merge: true });
  }

  async function ensurePatientProfile(
    uid: string,
    location: string,
    medicalHistory: string,
    extras: PatientSeedExtras,
  ) {
    const ref = doc(db, "patientProfiles", uid);
    const profile = {
      userId: uid,
      defaultLocation: location,
      medicalHistory,
      phone: extras.phone,
      emergencyContact: extras.emergencyContact,
      allergies: extras.allergies,
      currentMedications: extras.currentMedications,
      dateOfBirth: extras.dateOfBirth,
      bloodType: extras.bloodType,
      diseases: extras.diseases,
      paymentMethods: [],
      profileCompleted: true,
    };
    await setDoc(ref, profile, { merge: true });
  }

  async function ensureBooking(input: BookingSeedInput) {
    const ref = doc(db, "bookings", bookingDocId(input));
    const { createdAtIso, ...rest } = input;
    const payload: Record<string, unknown> = { ...rest, createdAt: createdAtIso ?? new Date().toISOString() };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await setDoc(ref, payload, { merge: true });
  }

  async function ensureReview(input: ReviewSeedInput) {
    const ref = doc(db, "reviews", input.id);
    await setDoc(ref, stripUndefined({ ...input }), { merge: true });
  }

  async function ensureMedicalRecord(input: MedicalRecordSeedInput) {
    const ref = doc(db, "medicalRecords", input.id);
    const { observations, ...rest } = input;
    await setDoc(ref, { ...rest, updatedAt: new Date().toISOString() }, { merge: true });
    for (const obs of observations) {
      const obsRef = doc(db, "medicalRecords", input.id, "observations", obs.id);
      const obsPayload: Record<string, unknown> = { ...obs };
      Object.keys(obsPayload).forEach((k) => obsPayload[k] === undefined && delete obsPayload[k]);
      await setDoc(obsRef, obsPayload, { merge: true });
    }
  }

  async function ensureNotification(input: NotificationSeedInput) {
    const ref = doc(db, "notifications", input.id);
    const payload: Record<string, unknown> = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      read: input.read,
      createdAt: input.createdAt,
      payload: input.payload,
      deliveredVia: ["in_app"],
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await setDoc(ref, payload, { merge: true });
  }

  async function ensureOrder(input: OrderSeedInput) {
    const ref = doc(db, "orders", input.id);
    await setDoc(ref, input, { merge: true });
  }

  async function ensureProduct(item: StoreItemSeed) {
    const ref = doc(db, "products", item.id);
    await setDoc(ref, item, { merge: true });
  }

  async function ensureCommunityPost(input: CommunityPostSeedInput) {
    const ref = doc(db, "communityPosts", input.id);
    const payload: Record<string, unknown> = { ...input };
    delete (payload as { id?: string }).id;
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    await setDoc(ref, payload, { merge: true });
  }

  async function setNurseAggregate(nurseId: string, rating: number, reviewCount: number) {
    const ref = doc(db, "nurseProfiles", nurseId);
    await setDoc(ref, { rating, reviewCount }, { merge: true });
  }

  return {
    mode: "client",
    createOrGetAuthUser,
    ensureUserDoc,
    ensureNurseProfile,
    ensurePatientProfile,
    ensureBooking,
    ensureReview,
    ensureMedicalRecord,
    ensureNotification,
    ensureOrder,
    ensureProduct,
    ensureCommunityPost,
    setNurseAggregate,
  };
}

async function seed() {
  loadEnvFiles();

  const seeder = hasAdminCreds() || process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? await createAdminSeeder().catch(async () => createClientSeeder())
    : await createClientSeeder();

  const adminUser: SeedUser = {
    fullName: "Care Plus Admin",
    email: "admin@careplus.com",
    password: "12345678",
    role: "admin",
    status: "approved",
  };

  const adminUid = await seeder.createOrGetAuthUser(adminUser);
  await seeder.ensureUserDoc(adminUid, adminUser);

  const nurseUsers = buildNurseSeedUsers();
  const approvedNurseIds: string[] = [];
  const pendingNurseIds: string[] = [];
  const nurseNameByUid: Map<string, string> = new Map();
  const nurseProfileByUid: Map<string, NurseSeedProfile> = new Map();

  for (let index = 0; index < nurseUsers.length; index += 1) {
    const nurse = nurseUsers[index];
    const uid = await seeder.createOrGetAuthUser(nurse);
    nurseNameByUid.set(uid, nurse.fullName);
    await seeder.ensureUserDoc(uid, nurse);
    if (nurse.status === "approved") {
      approvedNurseIds.push(uid);
      const profile = getNurseProfile(approvedNurseIds.length - 1, nurse.fullName);
      nurseProfileByUid.set(uid, profile);
      await seeder.ensureNurseProfile(uid, profile);
    } else {
      pendingNurseIds.push(uid);
      // Even pending nurses get a minimal profile so admin can preview their
      // submission before approving.
      const profile = getNurseProfile(approvedNurseIds.length + pendingNurseIds.length - 1, nurse.fullName);
      nurseProfileByUid.set(uid, profile);
      await seeder.ensureNurseProfile(uid, profile);
    }
  }

  const patientUsers = getPatientSeedUsers();
  const patientIds: string[] = [];
  const patientNameByUid: Map<string, string> = new Map();
  const patientEmailByUid: Map<string, string> = new Map();
  for (const patient of patientUsers) {
    const uid = await seeder.createOrGetAuthUser(patient);
    patientIds.push(uid);
    patientNameByUid.set(uid, patient.fullName);
    patientEmailByUid.set(uid, patient.email);
    await seeder.ensureUserDoc(uid, patient);
    await seeder.ensurePatientProfile(uid, patient.location, patient.medicalHistory, patient.extras);
  }

  // Bookings are seeded against approved nurses only so the marketplace +
  // booking flow have realistic, satisfiable references.
  const bookings = buildBookingSeeds(patientIds, approvedNurseIds);
  // Hydrate denormalized snapshot fields so list pages render without joins.
  bookings.forEach((b) => {
    b.patientNameSnapshot = patientNameByUid.get(b.patientId) ?? undefined;
    b.patientEmailSnapshot = patientEmailByUid.get(b.patientId) ?? undefined;
    b.nurseNameSnapshot = nurseNameByUid.get(b.nurseId) ?? undefined;
    const profile = nurseProfileByUid.get(b.nurseId);
    b.nurseSpecializationSnapshot = profile?.specialization;
    b.nurseProfileImageSnapshot = profile?.profileImage;
  });
  for (const booking of bookings) {
    await seeder.ensureBooking(booking);
  }

  // Reviews: one per (nurse, patient) pair drawn from completed bookings.
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const completedDetails = completedBookings.map((booking) => ({
    booking,
    nurseName: nurseNameByUid.get(booking.nurseId) ?? "Nurse",
    patientName: patientNameByUid.get(booking.patientId) ?? "Patient",
  }));
  const reviews = buildReviewSeeds(completedDetails);
  for (const review of reviews) {
    await seeder.ensureReview(review);
  }
  // Refresh cached aggregates on the nurse profile so the rating shown in
  // the marketplace matches the seeded reviews.
  const aggregates = aggregateReviews(reviews);
  for (const [nurseId, agg] of aggregates) {
    await seeder.setNurseAggregate(nurseId, agg.rating, agg.count);
  }

  // Medical records — one per completed booking, with two observations.
  const medicalRecords = buildMedicalRecordSeeds(completedDetails);
  for (const record of medicalRecords) {
    await seeder.ensureMedicalRecord(record);
  }

  // Products — ensure each canonical store item exists (idempotent: services
  // auto-seed when products collection is empty, but this guarantees a fixed
  // set of IDs even after admin edits).
  for (const product of STORE_ITEMS) {
    await seeder.ensureProduct(product);
  }

  // Orders — spread across delivered/shipped/processing/pending.
  const orders = buildOrderSeeds(patientIds);
  for (const order of orders) {
    await seeder.ensureOrder(order);
  }

  // Notifications — across admin/nurse/patient and across types.
  const pendingForNurse = bookings.filter((b) => b.status === "pending" || b.status === "accepted");
  const notifications = buildNotificationSeeds({
    adminUid,
    nurseIds: approvedNurseIds,
    patientIds,
    pendingNurseIds,
    completedBookings,
    pendingBookings: pendingForNurse,
  });
  for (const notification of notifications) {
    await seeder.ensureNotification(notification);
  }

  // Community posts — donations across categories.
  const communityPosts = buildCommunityPostSeeds(patientIds);
  for (const post of communityPosts) {
    await seeder.ensureCommunityPost(post);
  }

  console.log(`Seed complete using ${seeder.mode} mode.`);
  console.log(`Admin:           ${adminUser.email} / ${adminUser.password}`);
  console.log(`Nurses approved: ${approvedNurseIds.length}`);
  console.log(`Nurses pending:  ${pendingNurseIds.length}`);
  console.log(`Patients:        ${patientUsers.length}`);
  console.log(`Bookings:        ${bookings.length} (completed=${completedBookings.length})`);
  console.log(`Reviews:         ${reviews.length}`);
  console.log(`Medical records: ${medicalRecords.length}`);
  console.log(`Orders:          ${orders.length}`);
  console.log(`Notifications:   ${notifications.length}`);
  console.log(`Community posts: ${communityPosts.length}`);
  console.log(`Products:        ${STORE_ITEMS.length}`);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
