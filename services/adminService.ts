import { AppUser } from "@/lib/types";

export async function fetchNurses(): Promise<AppUser[]> {
  const response = await fetch("/api/nurses", { method: "GET" });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string; details?: string };
    console.error("[adminService] fetchNurses failed", payload);
    throw new Error(payload.details ?? payload.message ?? "Failed to fetch nurses");
  }

  const data = (await response.json()) as { nurses: AppUser[] };
  return data.nurses;
}

export async function changeNurseStatus(input: {
  id: string;
  status: "approved" | "rejected";
}) {
  const response = await fetch("/api/nurses/status", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string; details?: string };
    console.error("[adminService] changeNurseStatus failed", payload);
    throw new Error(payload.details ?? payload.message ?? "Failed to update nurse status");
  }
}

import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";

export async function getDashboardStats() {
  const { db } = ensureClientFirebase();
  
  const usersCount = await getCountFromServer(collection(db, "users"));
  const nursesCount = await getCountFromServer(query(collection(db, "users"), where("role", "==", "nurse")));
  const bookingsCount = await getCountFromServer(collection(db, "bookings"));
  const pendingCount = await getCountFromServer(query(collection(db, "users"), where("status", "==", "pending")));

  return {
    totalUsers: usersCount.data().count,
    totalNurses: nursesCount.data().count,
    totalBookings: bookingsCount.data().count,
    pendingApprovals: pendingCount.data().count,
  };
}
