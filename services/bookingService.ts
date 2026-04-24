import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { Booking, BookingStatus, BookingWithParticipants } from "@/lib/types";

function sortBookingsByDateDesc(bookings: Booking[]) {
  return bookings.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function createBooking(input: Omit<Booking, "id" | "status" | "createdAt">) {
  const { db } = ensureClientFirebase();
  const payload = {
    ...input,
    status: "pending" as BookingStatus,
    createdAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, "bookings"), payload);
  return {
    id: ref.id,
    ...payload,
  } satisfies Booking;
}

export async function getBookingsForPatient(patientId: string) {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(query(collection(db, "bookings"), where("patientId", "==", patientId)));
  const bookings = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Booking, "id">) }));
  return sortBookingsByDateDesc(bookings);
}

export async function getBookingsForNurse(nurseId: string) {
  const { db } = ensureClientFirebase();
  const snapshot = await getDocs(query(collection(db, "bookings"), where("nurseId", "==", nurseId)));
  const bookings = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Booking, "id">) }));
  return sortBookingsByDateDesc(bookings);
}

export async function getBookingsForNurseWithParticipants(nurseId: string) {
  const { db } = ensureClientFirebase();
  const bookings = await getBookingsForNurse(nurseId);

  const joined = await Promise.all(
    bookings.map(async (booking) => {
      const [patientSnapshot, nurseSnapshot] = await Promise.all([
        getDoc(doc(db, "users", booking.patientId)),
        getDoc(doc(db, "nurseProfiles", booking.nurseId)),
      ]);

      const patientData = patientSnapshot.exists()
        ? (patientSnapshot.data() as Record<string, unknown>)
        : {};
      const nurseData = nurseSnapshot.exists()
        ? (nurseSnapshot.data() as Record<string, unknown>)
        : {};

      return {
        ...booking,
        patientName: String(patientData.name ?? "Unknown patient"),
        patientEmail: String(patientData.email ?? ""),
        nurseName: String(nurseData.fullName ?? "Unknown nurse"),
        nurseSpecialization: String(nurseData.specialization ?? ""),
        nurseProfileImage: String(nurseData.profileImage ?? ""),
      } satisfies BookingWithParticipants;
    }),
  );

  return joined;
}

export async function getBookingsForPatientWithParticipants(patientId: string) {
  const { db } = ensureClientFirebase();
  const bookings = await getBookingsForPatient(patientId);

  const joined = await Promise.all(
    bookings.map(async (booking) => {
      const [patientSnapshot, nurseSnapshot] = await Promise.all([
        getDoc(doc(db, "users", booking.patientId)),
        getDoc(doc(db, "nurseProfiles", booking.nurseId)),
      ]);

      const patientData = patientSnapshot.exists()
        ? (patientSnapshot.data() as Record<string, unknown>)
        : {};
      const nurseData = nurseSnapshot.exists()
        ? (nurseSnapshot.data() as Record<string, unknown>)
        : {};

      return {
        ...booking,
        patientName: String(patientData.name ?? "Unknown patient"),
        patientEmail: String(patientData.email ?? ""),
        nurseName: String(nurseData.fullName ?? "Unknown nurse"),
        nurseSpecialization: String(nurseData.specialization ?? ""),
        nurseProfileImage: String(nurseData.profileImage ?? ""),
      } satisfies BookingWithParticipants;
    }),
  );

  return joined;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  rejectionReason?: string,
) {
  const { db } = ensureClientFirebase();
  const updates: Record<string, string> = { status };

  if (rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }

  await updateDoc(doc(db, "bookings", bookingId), updates);
}
