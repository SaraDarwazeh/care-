import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  AppUser,
  NurseCertificate,
  NurseMarketplaceProfile,
  NurseProfile,
} from "@/lib/types";
import { notifyNurseProfileResubmit } from "@/services/notificationService";
import { significantProfileSnapshot, sha256Hex } from "@/lib/nurseApprovalSnapshot";
import { getPricingConfig } from "@/services/pricingConfigService";
import {
  PricingValidationException,
  validateProfilePricing,
} from "@/lib/validatePricing";

// Legacy certificate entries were typed filenames (string[]). Coerce them
// into the new NurseCertificate shape so the UI can treat both uniformly.
// Real uploads land as objects with url + uploadedAt populated.
export function coerceCertificates(raw: unknown): NurseCertificate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx): NurseCertificate | null => {
      if (typeof entry === "string") {
        return { id: `legacy-${idx}`, name: entry, url: "", uploadedAt: "" };
      }
      if (entry && typeof entry === "object") {
        const obj = entry as Partial<NurseCertificate>;
        if (typeof obj.name !== "string" || obj.name.length === 0) return null;
        return {
          id: typeof obj.id === "string" && obj.id ? obj.id : `cert-${idx}`,
          name: obj.name,
          url: typeof obj.url === "string" ? obj.url : "",
          uploadedAt: typeof obj.uploadedAt === "string" ? obj.uploadedAt : "",
        };
      }
      return null;
    })
    .filter((c): c is NurseCertificate => c !== null);
}

function mapNurseProfile(user: AppUser, nurseData: Record<string, unknown>): NurseMarketplaceProfile {
  return {
    userId: user.id,
    // Provider kind discriminator. Prefer the nurse-profile doc, fall
    // back to the user-doc copy (set at registration), default to
    // "nurse" for legacy records.
    providerKind:
      nurseData.providerKind === "physio" || nurseData.providerKind === "nurse"
        ? (nurseData.providerKind as "nurse" | "physio")
        : user.providerKind ?? "nurse",
    fullName: String(nurseData.fullName ?? user.name),
    profileImage: String(nurseData.profileImage ?? ""),
    bio: String(nurseData.bio ?? ""),
    specialization: String(nurseData.specialization ?? "General Care"),
    services: Array.isArray(nurseData.services) ? (nurseData.services as NurseProfile["services"]) : [],
    pricePerHour:
      typeof nurseData.pricePerHour === "number" ? nurseData.pricePerHour : undefined,
    pricePerShift:
      nurseData.pricePerShift && typeof nurseData.pricePerShift === "object"
        ? (nurseData.pricePerShift as NurseProfile["pricePerShift"])
        : undefined,
    // rating defaults to 0 when no reviews exist; UI hides the rating pill
    // for nurses with rating === 0 so we don't fake a star count.
    rating: typeof nurseData.rating === "number" ? nurseData.rating : 0,
    reviewCount: typeof nurseData.reviewCount === "number" ? nurseData.reviewCount : 0,
    carePhilosophy: typeof nurseData.carePhilosophy === "string" ? nurseData.carePhilosophy : undefined,
    gallery: Array.isArray(nurseData.gallery) ? (nurseData.gallery as string[]) : undefined,
    availableDays: Array.isArray(nurseData.availableDays)
      ? (nurseData.availableDays as NurseProfile["availableDays"])
      : [],
    availableHours:
      typeof nurseData.availableHours === "object" && nurseData.availableHours
        ? (nurseData.availableHours as NurseProfile["availableHours"])
        : { from: "09:00", to: "17:00" },
    acceptsOvernight: Boolean(nurseData.acceptsOvernight),
    skills: Array.isArray(nurseData.skills) ? (nurseData.skills as string[]) : [],
    experienceYears:
      typeof nurseData.experienceYears === "number" ? nurseData.experienceYears : 0,
    location: typeof nurseData.location === "string" ? nurseData.location : undefined,
    gender: typeof nurseData.gender === "string" ? (nurseData.gender as "male" | "female" | "other") : undefined,
    availableShifts: Array.isArray(nurseData.availableShifts) ? (nurseData.availableShifts as string[]) : [],
    certificates: coerceCertificates(nurseData.certificates),
    languages: Array.isArray(nurseData.languages) ? (nurseData.languages as string[]) : [],
    transportAvailable: Boolean(nurseData.transportAvailable),
    onLeave: Boolean(nurseData.onLeave),
    leaveStartDate: typeof nurseData.leaveStartDate === "string" ? nurseData.leaveStartDate : undefined,
    leaveEndDate: typeof nurseData.leaveEndDate === "string" ? nurseData.leaveEndDate : undefined,
    email: user.email,
    status: user.status,
  };
}

// Firestore client SDK rejects undefined values. Profile fields that are
// genuinely "not set" (no pricePerHour, no leave dates, no carePhilosophy)
// arrive as undefined from the form — drop them so the write succeeds.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

// Accepts everything EXCEPT the aggregate fields that reviewService owns.
// Without this Omit, a profile save would overwrite the cached rating /
// reviewCount that reviewService recomputes after every new review.
//
// Re-approval: if the nurse is currently "approved" and any significant
// field changed vs. the last-approved snapshot, flips users/{uid}.status
// back to "pending" and notifies admin. First-time setup (no approval
// yet) doesn't trigger this branch.
export async function saveNurseProfile(input: Omit<NurseProfile, "rating" | "reviewCount">) {
  const { db } = ensureClientFirebase();

  // Authoritative pricing gate. The form runs the same check before
  // submitting, but a stale or skipped client check can't bypass this:
  // any out-of-range value throws before the Firestore write happens.
  const pricingConfig = await getPricingConfig();
  const check = validateProfilePricing(input, pricingConfig);
  if (!check.valid) {
    throw new PricingValidationException(check.errors);
  }

  const cleaned = stripUndefined(input as unknown as Record<string, unknown>);
  await setDoc(doc(db, "nurseProfiles", input.userId), cleaned, { merge: true });

  // Re-approval check is best-effort: if it fails we don't want to block
  // the profile save itself. The next admin sweep will catch any drift.
  try {
    const userRef = doc(db, "users", input.userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data() as Record<string, unknown>;
    if (userData.status !== "approved") return;

    const newHash = await sha256Hex(significantProfileSnapshot(input));
    const lastHash =
      typeof userData.lastApprovedProfileHash === "string"
        ? userData.lastApprovedProfileHash
        : "";
    if (lastHash && lastHash === newHash) return;

    await updateDoc(userRef, { status: "pending" });
    await notifyNurseProfileResubmit({
      nurseUserId: input.userId,
      nurseName: input.fullName,
    });
  } catch (err) {
    console.warn("[nurseService] re-approval check failed (non-fatal)", err);
  }
}


export async function getNurseProfileByUserId(userId: string) {
  const { db } = ensureClientFirebase();
  const snapshot = await getDoc(doc(db, "nurseProfiles", userId));

  if (!snapshot.exists()) {
    return null;
  }

  // Run legacy-certificate coercion here too so the nurse profile editor
  // sees a normalized shape (string[] entries become objects with url:"").
  const raw = snapshot.data() as Record<string, unknown>;
  const profile = raw as unknown as NurseProfile;
  return {
    ...profile,
    certificates: coerceCertificates(raw.certificates),
  };
}

export async function getApprovedNurseMarketplaceProfiles() {
  const { db } = ensureClientFirebase();
  const usersRef = collection(db, "users");
  const nurseUsersSnapshot = await getDocs(query(usersRef, where("role", "==", "nurse")));

  const approvedNurses = nurseUsersSnapshot.docs
    .map((item) => item.data() as AppUser)
    .filter((user) => user.status === "approved");

  const joined = await Promise.all(
    approvedNurses.map(async (user) => {
      const profileSnapshot = await getDoc(doc(db, "nurseProfiles", user.id));
      if (!profileSnapshot.exists()) {
        return null;
      }

      return mapNurseProfile(user, profileSnapshot.data() as Record<string, unknown>);
    }),
  );

  return joined.filter(Boolean) as NurseMarketplaceProfile[];
}

export async function getNurseMarketplaceProfileByUserId(userId: string) {
  const { db } = ensureClientFirebase();
  const userSnapshot = await getDoc(doc(db, "users", userId));
  const profileSnapshot = await getDoc(doc(db, "nurseProfiles", userId));

  if (!userSnapshot.exists() || !profileSnapshot.exists()) {
    return null;
  }

  const user = { id: userSnapshot.id, ...(userSnapshot.data() as Record<string, unknown>) } as AppUser;
  if (user.role !== "nurse" || user.status !== "approved") {
    return null;
  }

  return mapNurseProfile(user, profileSnapshot.data() as Record<string, unknown>);
}

export async function nurseProfileExists(userId: string) {
  const profile = await getNurseProfileByUserId(userId);
  return Boolean(profile);
}
