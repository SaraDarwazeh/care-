import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { PatientLocation, PatientProfile } from "@/lib/types";

// Returns the canonical list of saved locations for a patient. If the
// profile predates multi-location support, derives a single "Home" entry
// from defaultLocation so callers can treat both shapes uniformly.
export function getPatientLocations(profile: PatientProfile | null): PatientLocation[] {
  if (!profile) return [];
  if (profile.locations && profile.locations.length > 0) return profile.locations;
  if (profile.defaultLocation && profile.defaultLocation.trim().length > 0) {
    return [
      {
        id: "home",
        label: "Home",
        address: profile.defaultLocation,
        isDefault: true,
      },
    ];
  }
  return [];
}

// Picks the address string that should populate the legacy defaultLocation
// field. Used both when saving (derive from locations[]) and when reading
// (fallback if locations[] is missing).
export function pickDefaultAddress(locations: PatientLocation[]): string {
  if (locations.length === 0) return "";
  const flagged = locations.find((loc) => loc.isDefault);
  return (flagged ?? locations[0]).address;
}

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
  // Mirror the chosen default address onto defaultLocation so legacy
  // readers (booking form, admin tables) keep working without changes.
  const locations = profile.locations ?? [];
  const derivedDefault = locations.length > 0
    ? pickDefaultAddress(locations)
    : profile.defaultLocation;

  const merged: PatientProfile = {
    ...profile,
    defaultLocation: derivedDefault,
    locations,
  };

  // Always compute profileCompleted from the actual data; never trust a client-set flag.
  const normalized: PatientProfile = {
    ...merged,
    profileCompleted: computeProfileCompleted(merged),
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
