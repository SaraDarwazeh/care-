import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { PatientProfile } from "@/lib/types";

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
  const { db } = ensureClientFirebase();
  await setDoc(doc(db, "patientProfiles", profile.userId), profile, { merge: true });
}

export async function updatePatientProfileField(userId: string, field: "defaultLocation" | "medicalHistory", value: string) {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, "patientProfiles", userId), {
    [field]: value,
  });
}
