import { AppUser } from "@/lib/types";
import { getCurrentIdToken } from "@/services/authService";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getCurrentIdToken();
  if (!token) {
    throw new Error("You must be signed in to perform this action.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchNurses(): Promise<AppUser[]> {
  const headers = await authHeaders();
  const response = await fetch("/api/nurses", { method: "GET", headers });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      details?: string;
      error?: string;
    };
    console.error("[adminService] fetchNurses failed", payload);
    throw new Error(
      payload.details ?? payload.message ?? payload.error ?? "Failed to fetch nurses",
    );
  }

  const data = (await response.json()) as { nurses: AppUser[] };
  return data.nurses;
}

export async function changeNurseStatus(input: {
  id: string;
  status: "approved" | "rejected";
}) {
  const headers = await authHeaders();
  const response = await fetch("/api/nurses/status", {
    method: "PATCH",
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      details?: string;
      error?: string;
    };
    console.error("[adminService] changeNurseStatus failed", payload);
    throw new Error(
      payload.details ?? payload.message ?? payload.error ?? "Failed to update nurse status",
    );
  }
}

import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";

export interface AttentionItem {
  id: string;
  kind: "stale-booking" | "pending-nurse" | "disputed-record";
  title: string;
  subtitle?: string;
  link: string;
  ageHours?: number;
}

// Tunable threshold for what counts as a "stale" pending booking. 24h is
// the operational SLA we promise nurses for accept/reject responses.
const STALE_PENDING_BOOKING_HOURS = 24;

export async function getDashboardStats() {
  const { db } = ensureClientFirebase();

  const [usersCount, nursesCount, patientsCount, bookingsCount, pendingCount, completedSnap] =
    await Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(query(collection(db, "users"), where("role", "==", "nurse"))),
      getCountFromServer(query(collection(db, "users"), where("role", "==", "patient"))),
      getCountFromServer(collection(db, "bookings")),
      getCountFromServer(query(collection(db, "users"), where("status", "==", "pending"))),
      getDocs(query(collection(db, "bookings"), where("status", "==", "completed"))),
    ]);

  // Revenue from completed bookings
  let totalRevenue = 0;
  let pendingRevenue = 0;
  completedSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    totalRevenue += Number(data.price ?? 0);
  });

  // Pending revenue (accepted but not completed)
  const acceptedSnap = await getDocs(
    query(collection(db, "bookings"), where("status", "==", "accepted"))
  );
  acceptedSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    pendingRevenue += Number(data.price ?? 0);
  });

  // Last 7 days booking counts
  const days: string[] = [];
  const dayCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]);
    dayCounts.push(0);
  }

  // Fetch last 50 bookings to tally per-day counts (lightweight approximation)
  const recentSnap = await getDocs(
    query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(50))
  );
  recentSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const created = new Date(String(data.createdAt ?? ""));
    const now = new Date();
    const diffDays = Math.floor(
      (now.setHours(0, 0, 0, 0) - created.setHours(0, 0, 0, 0)) / 86400000
    );
    if (diffDays >= 0 && diffDays < 7) {
      dayCounts[6 - diffDays] += 1;
    }
  });

  // This month revenue
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  let thisMonthRevenue = 0;
  completedSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const created = new Date(String(data.createdAt ?? ""));
    if (created >= thisMonthStart) {
      thisMonthRevenue += Number(data.price ?? 0);
    }
  });

  // Operational "needs attention" surfaces — stale pending bookings, pending
  // nurse approvals (preview list), and disputed medical records.
  const nowMs = Date.now();
  const staleThresholdMs = STALE_PENDING_BOOKING_HOURS * 3600 * 1000;

  const pendingBookingsSnap = await getDocs(
    query(collection(db, "bookings"), where("status", "==", "pending"))
  );
  const stalePendingBookings: AttentionItem[] = pendingBookingsSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const created = new Date(String(data.createdAt ?? "")).getTime();
      const ageMs = nowMs - created;
      return {
        id: d.id,
        ageMs,
        patientName: String(data.patientNameSnapshot ?? ""),
        nurseName: String(data.nurseNameSnapshot ?? ""),
        service: String(data.service ?? ""),
        date: String(data.date ?? ""),
      };
    })
    .filter((entry) => entry.ageMs >= staleThresholdMs)
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, 5)
    .map<AttentionItem>((entry) => ({
      id: entry.id,
      kind: "stale-booking",
      title: `${entry.patientName || "Patient"} · ${entry.service || "service"}`,
      subtitle: `Pending ${Math.round(entry.ageMs / 3600000)}h · nurse: ${entry.nurseName || "—"}`,
      link: "/admin/bookings",
      ageHours: Math.round(entry.ageMs / 3600000),
    }));
  const stalePendingBookingsCount = pendingBookingsSnap.docs.filter((d) => {
    const created = new Date(String(d.data().createdAt ?? "")).getTime();
    return nowMs - created >= staleThresholdMs;
  }).length;

  const pendingNursesSnap = await getDocs(
    query(collection(db, "users"), where("status", "==", "pending"), where("role", "==", "nurse"))
  );
  const pendingNursePreview: AttentionItem[] = pendingNursesSnap.docs.slice(0, 5).map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      kind: "pending-nurse",
      title: String(data.name ?? "Pending nurse"),
      subtitle: String(data.email ?? ""),
      link: "/admin/nurses",
    };
  });

  const disputedSnap = await getDocs(
    query(collection(db, "medicalRecords"), where("status", "==", "disputed"))
  );
  const disputedRecordsCount = disputedSnap.docs.length;
  const disputedRecordsPreview: AttentionItem[] = disputedSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const disputedAt = String(data.disputedAt ?? data.updatedAt ?? data.createdAt ?? "");
      return {
        id: d.id,
        disputedAt,
        summary: String(data.summary ?? "Visit record"),
        note: String(data.disputeNote ?? ""),
      };
    })
    .sort((a, b) => b.disputedAt.localeCompare(a.disputedAt))
    .slice(0, 5)
    .map<AttentionItem>((entry) => ({
      id: entry.id,
      kind: "disputed-record",
      title: entry.summary,
      subtitle: entry.note ? `“${entry.note.slice(0, 80)}${entry.note.length > 80 ? "…" : ""}”` : "Awaiting nurse revision",
      link: `/patient/records/${entry.id}`,
    }));

  return {
    totalUsers: usersCount.data().count,
    totalNurses: nursesCount.data().count,
    totalPatients: patientsCount.data().count,
    totalBookings: bookingsCount.data().count,
    pendingApprovals: pendingCount.data().count,
    totalRevenue,
    pendingRevenue,
    thisMonthRevenue,
    bookingTrendDays: days,
    bookingTrendCounts: dayCounts,
    // Operational signals — populated regardless of which collections are empty.
    stalePendingBookingsCount,
    stalePendingBookings,
    pendingNursePreview,
    disputedRecordsCount,
    disputedRecordsPreview,
  };
}
