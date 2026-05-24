import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, updateDoc, DocumentData } from "firebase/firestore";
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

  // update parent updatedAt
  await updateDoc(doc(db, "medicalRecords", recordId), { updatedAt: new Date().toISOString() });

  const snap = await getDoc(obsRef);
  return { id: obsRef.id, ...(snap.data() as Record<string, unknown>) } as Observation;
}

export async function getRecordsForPatient(patientId: string): Promise<MedicalRecord[]> {
  const { db } = ensureClientFirebase();
  const ref = collection(db, "medicalRecords");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  const all = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return all.filter((r: Record<string, unknown>) => String(r["patientId"] ?? "") === String(patientId)) as MedicalRecord[];
}

export async function getRecordById(id: string): Promise<MedicalRecord | null> {
  const { db } = ensureClientFirebase();
  const snap = await getDoc(doc(db, "medicalRecords", id));
  if (!snap.exists()) return null;
  const record = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as MedicalRecord;

  // fetch recent observations (denormalized subcollection)
  const obsSnap = await getDocs(collection(db, `medicalRecords/${id}/observations`));
  const observations = obsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Observation[];
  record.observations = observations.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return record;
}

export async function getRecordsForBooking(bookingId: string): Promise<MedicalRecord[]> {
  const { db } = ensureClientFirebase();
  const ref = collection(db, "medicalRecords");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snaps = await getDocs(q);
  const all = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return all.filter((r: Record<string, unknown>) => String(r["bookingId"] ?? "") === String(bookingId)) as MedicalRecord[];
}

const medicalService = { createMedicalRecord, addObservation, getRecordsForPatient, getRecordById, getRecordsForBooking };
export default medicalService;
