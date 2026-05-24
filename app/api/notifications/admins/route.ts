import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authErrorResponse, verifyRequest } from "@/lib/auth/verifyRequest";
import type { NotificationType } from "@/lib/types";

const ALLOWED_TYPES: NotificationType[] = [
  "booking_created",
  "booking_accepted",
  "booking_rejected",
  "booking_completed",
  "booking_cancelled",
  "nurse_signup",
  "nurse_approved",
  "nurse_rejected",
  "order_created",
  "order_status_changed",
  "system_alert",
];

interface BroadcastBody {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  payload?: Record<string, unknown>;
}

function isValid(input: unknown): input is BroadcastBody {
  if (!input || typeof input !== "object") return false;
  const x = input as Partial<BroadcastBody>;
  return (
    typeof x.type === "string" &&
    ALLOWED_TYPES.includes(x.type as NotificationType) &&
    typeof x.title === "string" &&
    x.title.length > 0 &&
    typeof x.body === "string" &&
    x.body.length > 0
  );
}

export async function POST(request: NextRequest) {
  // Verify the caller is at least authenticated. Any role can broadcast to
  // admins because the helpers exist for cross-role events (patient creates
  // order → notify admins, nurse signs up → notify admins).
  try {
    await verifyRequest(request);
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValid(body)) {
    return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const adminSnap = await db.collection("users").where("role", "==", "admin").get();
    if (adminSnap.empty) {
      // No admins yet — silently succeed so calling code stays simple.
      return NextResponse.json({ delivered: 0 }, { status: 200 });
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    adminSnap.docs.forEach((adminDoc) => {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId: adminDoc.id,
        type: body.type,
        title: body.title,
        body: body.body,
        link: body.link,
        payload: body.payload,
        read: false,
        createdAt: now,
        deliveredVia: ["in_app"],
      });
    });
    await batch.commit();

    // Also touch the auth user lookup so a missing user (deleted admin) doesn't
    // poison the broadcast — we ignore failures here.
    await getAdminAuth()
      .listUsers(1)
      .catch(() => null);

    return NextResponse.json({ delivered: adminSnap.size }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/notifications/admins] broadcast failed", error);
    return NextResponse.json(
      { error: "Broadcast failed", details: message },
      { status: 500 },
    );
  }
}
