import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminSdkConfigured } from "@/lib/firebase/admin";
import { authErrorResponse, requireRole } from "@/lib/auth/verifyRequest";

interface CountBlock {
  total: number;
  pending: number;
}

interface HealthReport {
  adminSdk: {
    configured: boolean;
    canRead: boolean;
    error?: string;
  };
  counts: {
    users: { total: number; admins: number; nurses: number; patients: number };
    nurses: CountBlock;
    bookings: CountBlock;
    orders: CountBlock;
    packages: { total: number; active: number };
    notifications: { total: number; unread: number };
    reviews: { total: number };
  };
  flags: string[];
  generatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["admin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  if (!isAdminSdkConfigured()) {
    return NextResponse.json(
      {
        adminSdk: { configured: false, canRead: false },
        counts: null,
        flags: ["FIREBASE_ADMIN_* env vars are missing"],
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  const report: HealthReport = {
    adminSdk: { configured: true, canRead: false },
    counts: {
      users: { total: 0, admins: 0, nurses: 0, patients: 0 },
      nurses: { total: 0, pending: 0 },
      bookings: { total: 0, pending: 0 },
      orders: { total: 0, pending: 0 },
      packages: { total: 0, active: 0 },
      notifications: { total: 0, unread: 0 },
      reviews: { total: 0 },
    },
    flags: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    const db = getAdminDb();
    const [users, nursesAll, nursesPending, bookingsAll, bookingsPending, ordersAll, ordersPending, packagesAll, packagesActive, notificationsAll, notificationsUnread, reviewsAll] = await Promise.all([
      db.collection("users").get(),
      db.collection("users").where("role", "==", "nurse").get(),
      db.collection("users").where("role", "==", "nurse").where("status", "==", "pending").get(),
      db.collection("bookings").get(),
      db.collection("bookings").where("status", "==", "pending").get(),
      db.collection("orders").get(),
      db.collection("orders").where("status", "==", "pending").get(),
      db.collection("packages").get(),
      db.collection("packages").where("active", "==", true).get(),
      db.collection("notifications").get(),
      db.collection("notifications").where("read", "==", false).get(),
      db.collection("reviews").get(),
    ]);

    let admins = 0;
    let patients = 0;
    users.docs.forEach((doc) => {
      const role = (doc.data() as Record<string, unknown>).role;
      if (role === "admin") admins++;
      else if (role === "patient") patients++;
    });

    report.adminSdk.canRead = true;
    report.counts.users = {
      total: users.size,
      admins,
      nurses: nursesAll.size,
      patients,
    };
    report.counts.nurses = { total: nursesAll.size, pending: nursesPending.size };
    report.counts.bookings = { total: bookingsAll.size, pending: bookingsPending.size };
    report.counts.orders = { total: ordersAll.size, pending: ordersPending.size };
    report.counts.packages = { total: packagesAll.size, active: packagesActive.size };
    report.counts.notifications = { total: notificationsAll.size, unread: notificationsUnread.size };
    report.counts.reviews = { total: reviewsAll.size };

    // Surface flags for things admins should action.
    if (admins < 2) report.flags.push("Only one admin account — consider adding a backup.");
    if (nursesAll.size === 0) report.flags.push("No nurses signed up yet.");
    if (nursesPending.size > 0) report.flags.push(`${nursesPending.size} nurse(s) awaiting approval.`);
    if (bookingsPending.size > 0) report.flags.push(`${bookingsPending.size} booking(s) awaiting action.`);
    if (ordersPending.size > 0) report.flags.push(`${ordersPending.size} order(s) awaiting fulfillment.`);
    if (packagesAll.size === 0) report.flags.push("No packages exist yet — auto-seed will fire on first /services/packages visit.");
    else if (packagesActive.size === 0) report.flags.push("Packages exist but none are active — marketplace will be empty.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown read error";
    console.error("[api/admin/health] read failed", error);
    report.adminSdk.error = message;
    report.flags.push(`Read failed: ${message}`);
  }

  return NextResponse.json(report, { status: 200 });
}
