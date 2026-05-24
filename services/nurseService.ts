import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  AppUser,
  NurseMarketplaceProfile,
  NurseProfile,
} from "@/lib/types";

function mapNurseProfile(user: AppUser, nurseData: Record<string, unknown>): NurseMarketplaceProfile {
  return {
    userId: user.id,
    fullName: String(nurseData.fullName ?? user.name),
    profileImage: String(nurseData.profileImage ?? ""),
    bio: String(nurseData.bio ?? ""),
    specialization: String(nurseData.specialization ?? "General Care"),
    services: Array.isArray(nurseData.services) ? (nurseData.services as NurseProfile["services"]) : [],
    pricePerHour:
      typeof nurseData.pricePerHour === "number" ? nurseData.pricePerHour : undefined,
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
    certificates: Array.isArray(nurseData.certificates) ? (nurseData.certificates as string[]) : [],
    languages: Array.isArray(nurseData.languages) ? (nurseData.languages as string[]) : [],
    transportAvailable: Boolean(nurseData.transportAvailable),
    onLeave: Boolean(nurseData.onLeave),
    leaveStartDate: typeof nurseData.leaveStartDate === "string" ? nurseData.leaveStartDate : undefined,
    leaveEndDate: typeof nurseData.leaveEndDate === "string" ? nurseData.leaveEndDate : undefined,
    email: user.email,
    status: user.status,
  };
}

// Accepts everything EXCEPT the aggregate fields that reviewService owns.
// Without this Omit, a profile save would overwrite the cached rating /
// reviewCount that reviewService recomputes after every new review.
export async function saveNurseProfile(input: Omit<NurseProfile, "rating" | "reviewCount">) {
  const { db } = ensureClientFirebase();
  await setDoc(doc(db, "nurseProfiles", input.userId), input, { merge: true });
}

export async function getNurseProfileByUserId(userId: string) {
  const { db } = ensureClientFirebase();
  const snapshot = await getDoc(doc(db, "nurseProfiles", userId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as NurseProfile;
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
