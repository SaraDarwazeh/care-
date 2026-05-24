import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { PatientProfile } from "@/lib/types";

// Fields that MUST be present for a patient to book. Keep this list as the
// single source of truth so UI progress + booking gate stay in sync.
export const REQUIRED_PROFILE_FIELDS = [
  "phone",
  "defaultLocation",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

const FIELD_LABELS: Record<RequiredProfileField, string> = {
  phone: "Phone number",
  defaultLocation: "Default address",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
};

function isPresent(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getMissingProfileFields(profile: PatientProfile | null): RequiredProfileField[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  const missing: RequiredProfileField[] = [];
  if (!isPresent(profile.phone)) missing.push("phone");
  if (!isPresent(profile.defaultLocation)) missing.push("defaultLocation");
  if (!isPresent(profile.emergencyContact?.name)) missing.push("emergencyContactName");
  if (!isPresent(profile.emergencyContact?.phone)) missing.push("emergencyContactPhone");
  return missing;
}

export function getMissingFieldLabels(profile: PatientProfile | null): string[] {
  return getMissingProfileFields(profile).map((f) => FIELD_LABELS[f]);
}

export function computeProfileCompleted(profile: PatientProfile | null): boolean {
  return getMissingProfileFields(profile).length === 0;
}

export async function getPatientProfile(userId: string) {
  const { db } = ensureClientFirebase();
  const snapshot = await getDoc(doc(db, "patientProfiles", userId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as PatientProfile;
}

export async function ensurePatientProfile(userId: string) {
  const existing = await getPatientProfile(userId);
  if (existing) {
    return existing;
  }

  const profile: PatientProfile = {
    userId,
    defaultLocation: "",
    medicalHistory: "",
    phone: "",
    diseases: [],
    paymentMethods: [],
    profileCompleted: false,
  };

  const { db } = ensureClientFirebase();
  await setDoc(doc(db, "patientProfiles", userId), profile);
  return profile;
}

export async function savePatientProfile(profile: PatientProfile) {
  // Always compute profileCompleted from the actual data; never trust a client-set flag.
  const normalized: PatientProfile = {
    ...profile,
    profileCompleted: computeProfileCompleted(profile),
  };

  const { db } = ensureClientFirebase();
  await setDoc(doc(db, "patientProfiles", profile.userId), normalized, { merge: true });
  return normalized;
}

export async function updatePatientProfileField(userId: string, field: "defaultLocation" | "medicalHistory", value: string) {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "patientProfiles", userId), {
    [field]: value,
  });
}
