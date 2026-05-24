import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  DocumentData,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { MedicalRecord, Observation } from "@/lib/types";

export async function createMedicalRecord(input: Omit<MedicalRecord, "id" | "createdAt">) {
  const { db } = ensureClientFirebase();
  const payload = {
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, "medicalRecords"), payload as DocumentData);
  return { id: ref.id, ...payload } as MedicalRecord;
}

export async function addObservation(recordId: string, obs: Omit<Observation, "id" | "timestamp">) {
  const { db } = ensureClientFirebase();
  const obsRef = await addDoc(collection(db, `medicalRecords/${recordId}/observations`), {
    ...obs,
    timestamp: new Date().toISOString(),
  } as DocumentData);

  await updateDoc(doc(db, "medicalRecords", recordId), { updatedAt: new Date().toISOString() });

  const snap = await getDoc(obsRef);
  return { id: obsRef.id, ...(snap.data() as Record<string, unknown>) } as Observation;
}

export async function getRecordsForPatient(patientId: string): Promise<MedicalRecord[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, "medicalRecords"), where("patientId", "==", patientId));
  const snaps = await getDocs(q);
  const records = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as MedicalRecord[];
  return records.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getRecordsForNurse(nurseId: string): Promise<MedicalRecord[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, "medicalRecords"), where("nurseId", "==", nurseId));
  const snaps = await getDocs(q);
  const records = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as MedicalRecord[];
  return records.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getRecordById(id: string): Promise<MedicalRecord | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, "medicalRecords", id));
  if (!snap.exists()) return null;
  const record = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as MedicalRecord;

  const obsSnap = await getDocs(collection(db, `medicalRecords/${id}/observations`));
  const observations = obsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Observation[];
  record.observations = observations.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return record;
}

export async function getRecordsForBooking(bookingId: string): Promise<MedicalRecord[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, "medicalRecords"), where("bookingId", "==", bookingId));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as MedicalRecord[];
}

// Idempotent: returns the existing record for a booking if one exists, otherwise creates one.
// This is the canonical entry point for the visit-completion workflow.
export async function ensureRecordForBooking(input: {
  bookingId: string;
  patientId: string;
  nurseId: string;
  summary?: string;
}): Promise<MedicalRecord> {
  const existing = await getRecordsForBooking(input.bookingId);
  if (existing.length > 0) {
    if (input.summary && !existing[0].summary) {
      const { db } = ensureClientFirebase();
      await updateDoc(doc(db, "medicalRecords", existing[0].id), {
        summary: input.summary,
        updatedAt: new Date().toISOString(),
      });
      existing[0].summary = input.summary;
    }
    return existing[0];
  }

  return createMedicalRecord({
    patientId: input.patientId,
    nurseId: input.nurseId,
    bookingId: input.bookingId,
    summary: input.summary,
  });
}

const medicalService = {
  createMedicalRecord,
  addObservation,
  getRecordsForPatient,
  getRecordsForNurse,
  getRecordById,
  getRecordsForBooking,
  ensureRecordForBooking,
};
export default medicalService;
