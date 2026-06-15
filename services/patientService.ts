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
// `identityVerified` is checked against PatientProfile.verificationStatus
// rather than a flat string — the admin must approve the ID upload before
// the patient's first booking.
export const REQUIRED_PROFILE_FIELDS = [
  "phone",
  "defaultLocation",
  "emergencyContactName",
  "emergencyContactPhone",
  "identityVerified",
] as const;
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

// Fallback labels used when a caller doesn't supply a translator. Kept
// English-only by design — production UI always provides a `t()` callback
// via getMissingFieldLabels(profile, t) and the wrapper components below.
const FIELD_LABELS_EN_FALLBACK: Record<RequiredProfileField, string> = {
  phone: "Phone number",
  defaultLocation: "Default address",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  identityVerified: "Verified identity document",
};

// i18n key under patient.profile.requiredFields.* — caller passes
// `useTranslations()` and we resolve each missing field through it.
// Keep the key list in lock-step with RequiredProfileField above.
const FIELD_TRANSLATION_KEYS: Record<RequiredProfileField, string> = {
  phone: "patient.profile.requiredFields.phone",
  defaultLocation: "patient.profile.requiredFields.defaultLocation",
  emergencyContactName: "patient.profile.requiredFields.emergencyContactName",
  emergencyContactPhone: "patient.profile.requiredFields.emergencyContactPhone",
  identityVerified: "patient.profile.requiredFields.identityVerified",
};

// Which editor section the patient should be deep-linked to in order to
// fix a given missing field. Used by the booking-gate UX.
export const FIELD_TO_SECTION: Record<RequiredProfileField, string> = {
  phone: "personal",
  defaultLocation: "locations",
  emergencyContactName: "emergency",
  emergencyContactPhone: "emergency",
  identityVerified: "identity",
};

export function getFieldTranslationKey(field: RequiredProfileField): string {
  return FIELD_TRANSLATION_KEYS[field];
}

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
  if (profile.verificationStatus !== "verified") missing.push("identityVerified");
  return missing;
}

// Returns rendered labels for missing required fields. When a translator
// is supplied (production callers), each field id resolves through the
// i18n catalog; without one, the English fallback is used so the function
// stays usable in seed scripts and tests.
type Translator = (key: string) => string;
export function getMissingFieldLabels(
  profile: PatientProfile | null,
  translator?: Translator,
): string[] {
  return getMissingProfileFields(profile).map((f) => {
    if (translator) {
      const out = translator(FIELD_TRANSLATION_KEYS[f]);
      // next-intl returns the key path on miss; treat that as a fallback miss.
      if (out && out !== FIELD_TRANSLATION_KEYS[f]) return out;
    }
    return FIELD_LABELS_EN_FALLBACK[f];
  });
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

  // ID re-upload always resets the verification state — admin must
  // re-review. We compare against the persisted profile to detect the
  // change so a no-op save doesn't accidentally re-pending an existing
  // verified document.
  const existing = await getPatientProfile(profile.userId);
  const idChanged =
    isPresent(profile.idDocumentKey) &&
    profile.idDocumentKey !== existing?.idDocumentKey;

  const merged: PatientProfile = {
    ...profile,
    defaultLocation: derivedDefault,
    locations,
    ...(idChanged
      ? {
          verificationStatus: "pending" as const,
          verifiedAt: undefined,
          verifiedBy: undefined,
          verificationNote: undefined,
        }
      : {}),
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
