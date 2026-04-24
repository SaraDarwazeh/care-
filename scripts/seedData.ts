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
  updateDoc,
  where,
} from "firebase/firestore";

type SeedRole = "admin" | "nurse" | "patient";
type BookingStatus = "pending" | "accepted" | "completed";
type ShiftCode = "A" | "B" | "C";

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
  rating: number;
  availableDays: Array<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun">;
  availableHours: { from: string; to: string };
  acceptsOvernight: boolean;
  skills: string[];
  experienceYears: number;
  location: string;
  city: string;
  village: string;
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
}

interface Seeder {
  mode: "admin" | "client";
  createOrGetAuthUser: (user: SeedUser) => Promise<string>;
  ensureUserDoc: (uid: string, user: SeedUser) => Promise<void>;
  ensureNurseProfile: (uid: string, profile: NurseSeedProfile) => Promise<void>;
  ensurePatientProfile: (uid: string, location: string, medicalHistory: string) => Promise<void>;
  ensureBooking: (input: BookingSeedInput) => Promise<void>;
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

function buildNurseSeedUsers() {
  return [
    { fullName: "Lina Abu Salim", email: "nurse.lina@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Yousef Taqatqa", email: "nurse.yousef@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Rana Darwish", email: "nurse.rana@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Khaled Hamed", email: "nurse.khaled@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Alaa Sbeih", email: "nurse.alaa@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Mona Hanani", email: "nurse.mona@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Tariq Odeh", email: "nurse.tariq@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Nour Sabra", email: "nurse.nour@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Dima Yasin", email: "nurse.dima@careplus.com", password: "12345678", role: "nurse", status: "approved" },
    { fullName: "Omar Al-Khatib", email: "nurse.omar@careplus.com", password: "12345678", role: "nurse", status: "approved" },
  ] satisfies SeedUser[];
}

function getNurseProfile(index: number, nurseName: string): NurseSeedProfile {
  const specializationOptions = [
    "Wound Care",
    "Elderly Home Support",
    "Post-Operative Recovery",
    "Chronic Disease Follow-up",
    "IV and Medication Care",
    "Night Shift Home Care",
    "Palliative Home Nursing",
    "Mobility and Rehab Support",
    "Diabetes Monitoring",
    "Family Home Nursing",
  ];

  const shiftCode = pickShift(index);
  const shiftRange = shifts[shiftCode];

  const serviceCount = 2 + (index % 3);
  const services = servicesCatalog.slice(0, serviceCount).map((service, serviceIndex) => ({
    name: service.name,
    price: service.basePrice + index + serviceIndex * 3,
  }));

  const village = villages[index % villages.length];

  return {
    fullName: nurseName,
    profileImage: `https://i.pravatar.cc/300?img=${20 + index}`,
    bio: `${nurseName} provides attentive home nursing support focused on safety, comfort, and clear communication with patients and families.`,
    specialization: specializationOptions[index % specializationOptions.length],
    services,
    pricePerHour: 18 + index,
    rating: getRandomRating(index),
    availableDays: getRandomDays(index),
    availableHours: { from: shiftRange.from, to: shiftRange.to },
    acceptsOvernight: shiftCode === "C" || index % 2 === 0,
    skills: ["cooking", "elderly care", "patient support"],
    experienceYears: 2 + (index % 9),
    location: `Nablus - ${village}`,
    city: "Nablus",
    village,
  };
}

function getPatientSeedUsers() {
  return [
    {
      fullName: "Huda Masri",
      email: "patient.huda@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Asira ash-Shamaliya",
      medicalHistory: "Hypertension, mild anemia, periodic dizziness.",
    },
    {
      fullName: "Ahmad Bisharat",
      email: "patient.ahmad@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Rujeib",
      medicalHistory: "Post-surgery recovery, mobility assistance needed.",
    },
    {
      fullName: "Rami Kanaan",
      email: "patient.rami@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Beit Iba",
      medicalHistory: "Type 2 diabetes, insulin routine monitoring.",
    },
    {
      fullName: "Maha Touqan",
      email: "patient.maha@careplus.com",
      password: "12345678",
      role: "patient",
      status: "approved",
      location: "Nablus - Deir Sharaf",
      medicalHistory: "Elderly care support and daily medication reminders.",
    },
  ] as Array<SeedUser & { location: string; medicalHistory: string }>;
}

function buildBookingSeeds(patientIds: string[], nurseIds: string[]) {
  const statuses: BookingStatus[] = ["pending", "accepted", "completed"];
  const seeds: BookingSeedInput[] = [];

  for (let index = 0; index < 12; index += 1) {
    const patientId = patientIds[index % patientIds.length];
    const nurseId = nurseIds[index % nurseIds.length];
    const shift = pickShift(index);
    const shiftInfo = shifts[shift];
    const service = servicesCatalog[index % servicesCatalog.length];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + ((index % 8) + 1));

    seeds.push({
      patientId,
      nurseId,
      service: service.name,
      price: service.basePrice + index,
      date: targetDate.toISOString().slice(0, 10),
      time: shiftInfo.time,
      shift,
      location: `Nablus - ${villages[(index + 2) % villages.length]}`,
      notes: `Sample booking ${index + 1} for ${service.name}.`,
      status: statuses[index % statuses.length],
    });
  }

  return seeds;
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
    if ((await ref.get()).exists) {
      await ref.update({ profileImage: profile.profileImage });
      return;
    }
    await ref.set({ userId: uid, ...profile });
  }

  async function ensurePatientProfile(uid: string, location: string, medicalHistory: string) {
    const ref = db.collection("patientProfiles").doc(uid);
    if ((await ref.get()).exists) return;
    await ref.set({ userId: uid, defaultLocation: location, medicalHistory });
  }

  async function ensureBooking(input: BookingSeedInput) {
    const ref = db.collection("bookings").doc(bookingDocId(input));
    if ((await ref.get()).exists) return;
    await ref.set({ ...input, createdAt: new Date().toISOString() });
  }

  return {
    mode: "admin",
    createOrGetAuthUser,
    ensureUserDoc,
    ensureNurseProfile,
    ensurePatientProfile,
    ensureBooking,
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
    if ((await getDoc(ref)).exists()) {
      await updateDoc(ref, { profileImage: profile.profileImage });
      return;
    }
    await setDoc(ref, { userId: uid, ...profile });
  }

  async function ensurePatientProfile(uid: string, location: string, medicalHistory: string) {
    const ref = doc(db, "patientProfiles", uid);
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, { userId: uid, defaultLocation: location, medicalHistory });
  }

  async function ensureBooking(input: BookingSeedInput) {
    const ref = doc(db, "bookings", bookingDocId(input));
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, { ...input, createdAt: new Date().toISOString() });
  }

  return {
    mode: "client",
    createOrGetAuthUser,
    ensureUserDoc,
    ensureNurseProfile,
    ensurePatientProfile,
    ensureBooking,
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
  const nurseIds: string[] = [];
  for (let index = 0; index < nurseUsers.length; index += 1) {
    const nurse = nurseUsers[index];
    const uid = await seeder.createOrGetAuthUser(nurse);
    nurseIds.push(uid);
    await seeder.ensureUserDoc(uid, nurse);
    await seeder.ensureNurseProfile(uid, getNurseProfile(index, nurse.fullName));
  }

  const patientUsers = getPatientSeedUsers();
  const patientIds: string[] = [];
  for (const patient of patientUsers) {
    const uid = await seeder.createOrGetAuthUser(patient);
    patientIds.push(uid);
    await seeder.ensureUserDoc(uid, patient);
    await seeder.ensurePatientProfile(uid, patient.location, patient.medicalHistory);
  }

  const bookings = buildBookingSeeds(patientIds, nurseIds);
  for (const booking of bookings) {
    await seeder.ensureBooking(booking);
  }

  console.log(`Seed complete using ${seeder.mode} mode.`);
  console.log(`Admin: ${adminUser.email} / ${adminUser.password}`);
  console.log(`Nurses: ${nurseUsers.length}`);
  console.log(`Patients: ${patientUsers.length}`);
  console.log(`Bookings: ${bookings.length}`);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
