import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";

export interface PublicStats {
  verifiedNurses: number;
  completedBookings: number;
  familiesServed: number; // distinct patientIds with any accepted/completed booking
}

// Empty stats used as a graceful fallback if Firestore reads fail.
const EMPTY: PublicStats = {
  verifiedNurses: 0,
  completedBookings: 0,
  familiesServed: 0,
};

export async function getPublicStats(): Promise<PublicStats> {
  const { db } = ensureClientFirebase();

  try {
    const [nursesCount, completedCount, servedSnap] = await Promise.all([
      getCountFromServer(
        query(
          collection(db, "users"),
          where("role", "==", "nurse"),
          where("status", "==", "approved"),
        ),
      ),
      getCountFromServer(
        query(collection(db, "bookings"), where("status", "==", "completed")),
      ),
      // We need distinct patient ids — Firestore doesn't aggregate distinct,
      // so this is a single read of accepted+completed bookings followed by an
      // in-memory unique. Acceptable while volume is small; will be replaced
      // by a denormalized counter once volume grows.
      getDocs(
        query(
          collection(db, "bookings"),
          where("status", "in", ["accepted", "completed"]),
        ),
      ),
    ]);

    const patientIds = new Set<string>();
    servedSnap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const pid = typeof data.patientId === "string" ? data.patientId : null;
      if (pid) patientIds.add(pid);
    });

    return {
      verifiedNurses: nursesCount.data().count,
      completedBookings: completedCount.data().count,
      familiesServed: patientIds.size,
    };
  } catch (error) {
    console.error("[publicStats] Failed to fetch public stats", error);
    return EMPTY;
  }
}
