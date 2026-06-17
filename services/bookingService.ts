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
import { Booking, BookingStatus, BookingWithParticipants, NurseDay } from "@/lib/types";
import { SHIFT_RANGES } from "@/lib/pricingConstants";
import { notifyBookingCreated, notifyBookingStatusChange } from "@/services/notificationService";

const WEEKDAYS: NurseDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Parse "YYYY-MM-DD" as a local-time Date so .getDay() doesn't drift to the
// previous day in negative UTC offsets.
function localDateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dayOfWeekForIso(iso: string): NurseDay {
  return WEEKDAYS[localDateFromIso(iso).getDay()];
}

export function isPastDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    // compare dates only (ignore time)
    return d.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0);
  } catch {
    return false;
  }
}

// Firestore Web SDK rejects every `undefined` field with "Unsupported
// field value: undefined". The booking payload mixes form-supplied
// fields (packageId / durationDays / shift are conditionally undefined
// per booking type) with name-snapshot fields that fall back to
// undefined when the participant doc is missing or unparsed. Drop
// every undefined before writing so we don't trip the SDK. Same shape
// as the helper in nurseService.ts:99–107.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

type RawBooking = Record<string, unknown>;

export async function validateBooking(input: Omit<Booking, "id" | "status" | "createdAt">) {
  const { db } = ensureClientFirebase();

  // Basic date validation
  if (!input.date) throw new Error("Invalid booking date");
  if (isPastDate(input.date)) throw new Error("Cannot book a past date");

  // Fetch nurse profile + the nurse's user record in parallel. The profile
  // holds the availability + leave fields; the user holds the approval status.
  const [nurseSnap, nurseUserSnap] = await Promise.all([
    getDoc(doc(db, "nurseProfiles", input.nurseId)),
    getDoc(doc(db, "users", input.nurseId)),
  ]);
  if (!nurseSnap.exists()) throw new Error("Selected nurse not found");
  const nurseData = nurseSnap.data() as Record<string, unknown>;
  const nurseUserData = nurseUserSnap.exists()
    ? (nurseUserSnap.data() as Record<string, unknown>)
    : {};

  if (nurseUserData.status !== "approved") {
    throw new Error("Selected nurse is not approved for booking");
  }

  // Shift availability
  if (input.shift) {
    const availableShifts: string[] = Array.isArray(nurseData.availableShifts)
      ? (nurseData.availableShifts as string[])
      : [];
    if (availableShifts.length > 0 && !availableShifts.includes(input.shift)) {
      throw new Error("Selected nurse does not offer the chosen shift");
    }
  }

  // Day-of-week availability. For one-time + shift bookings we check just the
  // booking date; for packages every day in the range must be a working day.
  const availableDays: NurseDay[] = Array.isArray(nurseData.availableDays)
    ? (nurseData.availableDays as NurseDay[])
    : [];
  if (availableDays.length > 0) {
    const occupiedDays: NurseDay[] = [];
    if (input.bookingType === "package") {
      const days = Math.max(1, Number(input.durationDays ?? 1));
      const start = localDateFromIso(input.date);
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        occupiedDays.push(WEEKDAYS[d.getDay()]);
      }
    } else {
      occupiedDays.push(dayOfWeekForIso(input.date));
    }

    const unavailable = occupiedDays.find((d) => !availableDays.includes(d));
    if (unavailable) {
      throw new Error(
        input.bookingType === "package"
          ? `Selected nurse is not available on ${unavailable} (included in this package range)`
          : "Selected nurse is not available on the chosen day",
      );
    }
  }

  // Leave / vacation overlap. An open-ended bound is treated as ±Infinity so
  // half-defined leaves still block bookings on the defined side. With no
  // dates at all, onLeave === true is an indefinite leave that blocks any
  // future booking.
  if (nurseData.onLeave === true) {
    const leaveStart = typeof nurseData.leaveStartDate === "string" && nurseData.leaveStartDate
      ? localDateFromIso(nurseData.leaveStartDate).getTime()
      : -Infinity;
    const leaveEnd = typeof nurseData.leaveEndDate === "string" && nurseData.leaveEndDate
      ? localDateFromIso(nurseData.leaveEndDate).setHours(23, 59, 59, 999)
      : Infinity;

    const bookingStart = localDateFromIso(input.date).getTime();
    const bookingEnd = (() => {
      if (input.bookingType === "package") {
        const days = Math.max(1, Number(input.durationDays ?? 1));
        const end = localDateFromIso(input.date);
        end.setDate(end.getDate() + (days - 1));
        return end.setHours(23, 59, 59, 999);
      }
      return localDateFromIso(input.date).setHours(23, 59, 59, 999);
    })();

    const overlaps = bookingStart <= leaveEnd && bookingEnd >= leaveStart;
    if (overlaps) {
      throw new Error("Selected nurse is on leave during the requested dates");
    }
  }

  // Build time ranges for the requested booking and compare against all existing bookings
  const bookingsRef = collection(db, "bookings");
  const nurseBookingsSnap = await getDocs(query(bookingsRef, where("nurseId", "==", input.nurseId)));

  function parseDateTime(dateStr: string, timeStr: string) {
    const d = new Date(dateStr);
    const parts = String(timeStr ?? "").split(":");
    d.setHours(Number(parts[0] ?? 0), Number(parts[1] ?? 0), 0, 0);
    return d;
  }

  function rangeForBooking(b: RawBooking) {
    // package: full-day spans across multiple days
    if (b.bookingType === "package") {
      const start = new Date(String(b.date ?? ""));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + ((Number(b.durationDays ?? 1)) - 1));
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    // shift bookings
    if (b.shift) {
      const shift = SHIFT_RANGES[String(b.shift)];
      if (!shift) return null;
      const start = parseDateTime(String(b.date ?? ""), shift.start);
      const end = parseDateTime(String(b.date ?? ""), shift.end);
      if (end <= start) end.setDate(end.getDate() + 1); // overnight shift
      return { start, end };
    }

    // one-time booking
    if (b.time) {
      const start = parseDateTime(String(b.date ?? ""), String(b.time ?? ""));
      const duration = Number(b.durationMinutes ?? 60);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      return { start, end };
    }

    return null;
  }

  // range for the requested input
  let requestedRange = rangeForBooking(input as unknown as RawBooking);
  // if input is a package but rangeForBooking expects bookingType string present
  if (input.bookingType === "package") {
    if (!input.packageId) throw new Error("Package selection required for package bookings");
    if (!input.durationDays || input.durationDays < 1) throw new Error("Invalid package duration");
    const start = new Date(input.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + (input.durationDays - 1));
    end.setHours(23, 59, 59, 999);
    requestedRange = { start, end };
  }

  if (!requestedRange) {
    // Cannot determine requested range — defensive fallback
    throw new Error("Invalid booking time specification");
  }

  const conflict = nurseBookingsSnap.docs.some((d) => {
    const b = d.data() as RawBooking;
    const otherRange = rangeForBooking(b);
    if (!otherRange) return false;
    // overlap if ranges intersect
    return requestedRange.start < otherRange.end && requestedRange.end > otherRange.start;
  });

  if (conflict) throw new Error("Selected nurse has existing bookings that overlap the requested time range");

  // Passed validation
  return true;
}

function sortBookingsByDateDesc(bookings: Booking[]) {
  return bookings.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function createBooking(input: Omit<Booking, "id" | "status" | "createdAt">) {
  const { db } = ensureClientFirebase();
  await validateBooking(input);

  // Snapshot the participant names onto the booking doc at create time so
  // the appointments + bookings pages can render without an N+1 join.
  const [patientSnap, nurseSnap] = await Promise.all([
    getDoc(doc(db, "users", input.patientId)),
    getDoc(doc(db, "nurseProfiles", input.nurseId)),
  ]);
  const patientData = patientSnap.exists() ? (patientSnap.data() as Record<string, unknown>) : {};
  const nurseData = nurseSnap.exists() ? (nurseSnap.data() as Record<string, unknown>) : {};

  const payload = stripUndefined({
    ...input,
    status: "pending" as BookingStatus,
    createdAt: new Date().toISOString(),
    patientNameSnapshot: typeof patientData.name === "string" ? patientData.name : undefined,
    patientEmailSnapshot: typeof patientData.email === "string" ? patientData.email : undefined,
    nurseNameSnapshot: typeof nurseData.fullName === "string" ? nurseData.fullName : undefined,
    nurseSpecializationSnapshot:
      typeof nurseData.specialization === "string" ? nurseData.specialization : undefined,
    nurseProfileImageSnapshot:
      typeof nurseData.profileImage === "string" ? nurseData.profileImage : undefined,
  });

  const ref = await addDoc(collection(db, "bookings"), payload);
  const booking: Booking = { id: ref.id, ...payload } as Booking;

  // Best-effort notification. Helper itself swallows errors so booking success
  // is never blocked by a notification glitch.
  await notifyBookingCreated({ booking });

  return booking;
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

// Resolve participant names from the snapshot on the booking doc when
// present (set by createBooking after Phase O), falling back to per-booking
// joins for legacy bookings without the snapshot. The fallback keeps the
// page working for any bookings written before the denormalization landed.
async function withParticipants(
  db: ReturnType<typeof ensureClientFirebase>["db"],
  booking: Booking,
): Promise<BookingWithParticipants> {
  const hasSnapshot =
    Boolean(booking.patientNameSnapshot) || Boolean(booking.nurseNameSnapshot);

  if (hasSnapshot) {
    return {
      ...booking,
      patientName: booking.patientNameSnapshot ?? "Unknown patient",
      patientEmail: booking.patientEmailSnapshot ?? "",
      nurseName: booking.nurseNameSnapshot ?? "Unknown nurse",
      nurseSpecialization: booking.nurseSpecializationSnapshot ?? "",
      nurseProfileImage: booking.nurseProfileImageSnapshot ?? "",
    } satisfies BookingWithParticipants;
  }

  const [patientSnapshot, nurseSnapshot] = await Promise.all([
    getDoc(doc(db, "users", booking.patientId)),
    getDoc(doc(db, "nurseProfiles", booking.nurseId)),
  ]);
  const patientData = patientSnapshot.exists() ? (patientSnapshot.data() as Record<string, unknown>) : {};
  const nurseData = nurseSnapshot.exists() ? (nurseSnapshot.data() as Record<string, unknown>) : {};

  return {
    ...booking,
    patientName: String(patientData.name ?? "Unknown patient"),
    patientEmail: String(patientData.email ?? ""),
    nurseName: String(nurseData.fullName ?? "Unknown nurse"),
    nurseSpecialization: String(nurseData.specialization ?? ""),
    nurseProfileImage: String(nurseData.profileImage ?? ""),
  } satisfies BookingWithParticipants;
}

export async function getBookingsForNurseWithParticipants(nurseId: string) {
  const { db } = ensureClientFirebase();
  const bookings = await getBookingsForNurse(nurseId);
  return Promise.all(bookings.map((b) => withParticipants(db, b)));
}

export async function getBookingsForPatientWithParticipants(patientId: string) {
  const { db } = ensureClientFirebase();
  const bookings = await getBookingsForPatient(patientId);
  return Promise.all(bookings.map((b) => withParticipants(db, b)));
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  rejectionReason?: string,
) {
  const { db, auth } = ensureClientFirebase();
  const bookingRef = doc(db, "bookings", bookingId);

  // Read the booking before writing so the post-write notification has the
  // patient/nurse/service/date context without an extra round-trip later.
  const bookingSnap = await getDoc(bookingRef);
  const bookingData = bookingSnap.exists() ? (bookingSnap.data() as Booking) : null;

  const updates: Record<string, string> = { status };
  if (rejectionReason) updates.rejectionReason = rejectionReason;
  await updateDoc(bookingRef, updates);

  if (bookingData && auth.currentUser) {
    const callerUid = auth.currentUser.uid;
    const actor: "patient" | "nurse" | "admin" =
      callerUid === bookingData.nurseId
        ? "nurse"
        : callerUid === bookingData.patientId
          ? "patient"
          : "admin";

    await notifyBookingStatusChange({
      booking: bookingData,
      newStatus: status,
      actor,
      rejectionReason,
    });

    // Loyalty earn — 1 point per ILS spent, on the canonical "completed"
    // state. Idempotency keyed on bookingId so admin re-completions are
    // safe. We import lazily to avoid a circular import (bookingService
    // → pointsService → notificationService → bookingService).
    if (status === "completed") {
      try {
        const { earnPoints } = await import("@/services/pointsService");
        const { POINTS_PER_ILS } = await import("@/lib/pointsConstants");
        const amount = Math.round(Number(bookingData.price ?? 0) * POINTS_PER_ILS);
        if (amount > 0) {
          await earnPoints({
            patientId: bookingData.patientId,
            source: "booking_completed",
            amount,
            sourceId: bookingId,
          });
          const { notifyPointsEarned } = await import("@/services/notificationService");
          await notifyPointsEarned({ userId: bookingData.patientId, amount, source: "booking_completed", sourceId: bookingId });
        }
      } catch (err) {
        console.warn("[bookingService] points earn failed (non-fatal)", err);
      }
    }
  }
}
