import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { getCurrentIdToken } from "@/services/authService";
import type {
  Booking,
  BookingStatus,
  Notification,
  NotificationType,
  StoreOrder,
} from "@/lib/types";

const COLLECTION = "notifications";

// ---------- core read/write ----------

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  payload?: Record<string, unknown>;
}

// Single source of truth for writing notifications. Domain services call into
// the event helpers below, not here directly, so all notification text +
// link conventions live in one place.
async function createNotification(input: CreateNotificationInput): Promise<void> {
  const { db } = ensureClientFirebase();
  const doc: Omit<Notification, "id"> = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    payload: input.payload,
    read: false,
    createdAt: new Date().toISOString(),
    deliveredVia: ["in_app"],
  };
  await addDoc(collection(db, COLLECTION), doc);
}

// Broadcast to all admins via a server route that uses the admin SDK.
// Clients can't list /users/{role==admin} (the rules don't allow it for
// non-admins), so we delegate the fan-out to a trusted endpoint.
async function broadcastToAdmins(input: Omit<CreateNotificationInput, "userId">): Promise<void> {
  const token = await getCurrentIdToken();
  if (!token) {
    console.warn("[notificationService] broadcastToAdmins skipped: no auth token");
    return;
  }
  try {
    const res = await fetch("/api/notifications/admins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[notificationService] broadcastToAdmins non-ok", res.status, detail);
    }
  } catch (error) {
    // Notifications are best-effort — never fail the parent transaction.
    console.warn("[notificationService] broadcastToAdmins failed", error);
  }
}

export async function getNotificationsForUser(
  userId: string,
  opts: { limit?: number } = {},
): Promise<Notification[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, "id">) }));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return typeof opts.limit === "number" ? items.slice(0, opts.limit) : items;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { db } = ensureClientFirebase();
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    where("read", "==", false),
  );
  const snap = await getDocs(q);
  return snap.size;
}

// Live unread counter for the bell badge. Returns the unsubscribe function.
export function subscribeUnreadCount(
  userId: string,
  cb: (count: number) => void,
): () => void {
  const { db } = ensureClientFirebase();
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    where("read", "==", false),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.size),
    (err) => {
      console.warn("[notificationService] subscribeUnreadCount error", err);
      cb(0);
    },
  );
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { db } = ensureClientFirebase();
  await updateDoc(doc(db, COLLECTION, notificationId), {
    read: true,
    readAt: new Date().toISOString(),
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { db } = ensureClientFirebase();
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    where("read", "==", false),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  snap.docs.forEach((d) => {
    batch.update(d.ref, { read: true, readAt: now });
  });
  await batch.commit();
}

// ---------- event helpers (the only API domain services should call) ----------

function bookingLinkFor(role: "patient" | "nurse" | "admin"): string {
  if (role === "nurse") return "/nurse/bookings";
  if (role === "admin") return "/admin/bookings";
  return "/patient/appointments";
}

function safe<T>(fn: () => Promise<T>): Promise<void> {
  return fn()
    .then(() => undefined)
    .catch((err) => {
      console.warn("[notificationService] event helper failed", err);
    });
}

export async function notifyBookingCreated(input: {
  booking: Pick<Booking, "patientId" | "nurseId" | "service" | "date">;
  patientName?: string;
}): Promise<void> {
  const { booking, patientName } = input;
  await Promise.all([
    safe(() =>
      createNotification({
        userId: booking.nurseId,
        type: "booking_created",
        title: "New booking request",
        body: `${patientName ?? "A patient"} requested ${booking.service} on ${booking.date}.`,
        link: bookingLinkFor("nurse"),
        payload: { date: booking.date, service: booking.service },
      }),
    ),
    safe(() =>
      broadcastToAdmins({
        type: "booking_created",
        title: "New booking",
        body: `New booking request for ${booking.service} on ${booking.date}.`,
        link: bookingLinkFor("admin"),
        payload: { date: booking.date, service: booking.service },
      }),
    ),
  ]);
}

// Caller-aware notification — the actor's role determines who hears about it.
export async function notifyBookingStatusChange(input: {
  booking: Pick<Booking, "patientId" | "nurseId" | "service" | "date">;
  newStatus: BookingStatus;
  actor: "patient" | "nurse" | "admin";
  rejectionReason?: string;
}): Promise<void> {
  const { booking, newStatus, actor } = input;

  // Recipient logic:
  // - nurse/admin changing the status → tell the patient
  // - patient changing the status (cancellation) → tell the nurse
  const recipientUserId = actor === "patient" ? booking.nurseId : booking.patientId;
  const recipientRole: "patient" | "nurse" = actor === "patient" ? "nurse" : "patient";

  const typeMap: Record<BookingStatus, NotificationType | null> = {
    pending: null,
    accepted: "booking_accepted",
    rejected: "booking_rejected",
    completed: "booking_completed",
    cancelled: "booking_cancelled",
  };
  const type = typeMap[newStatus];
  if (!type) return;

  const titleMap: Record<typeof type, string> = {
    booking_accepted: "Booking accepted",
    booking_rejected: "Booking not accepted",
    booking_completed: "Visit completed",
    booking_cancelled: "Booking cancelled",
    booking_created: "Booking",
    nurse_signup: "Booking",
    nurse_approved: "Booking",
    nurse_rejected: "Booking",
    order_created: "Booking",
    order_status_changed: "Booking",
    system_alert: "Booking",
  };

  const bodyForRecipient = (() => {
    const visit = `${booking.service} on ${booking.date}`;
    if (newStatus === "accepted") return `Your nurse confirmed ${visit}.`;
    if (newStatus === "rejected") {
      const reason = input.rejectionReason ? ` Reason: ${input.rejectionReason}` : "";
      return `Your booking for ${visit} was not accepted.${reason}`;
    }
    if (newStatus === "completed") return `Your visit (${visit}) is marked as completed.`;
    if (newStatus === "cancelled") {
      return actor === "patient"
        ? `A patient cancelled their booking for ${visit}.`
        : `Your booking for ${visit} was cancelled.`;
    }
    return visit;
  })();

  await safe(() =>
    createNotification({
      userId: recipientUserId,
      type,
      title: titleMap[type],
      body: bodyForRecipient,
      link: bookingLinkFor(recipientRole),
      payload: { date: booking.date, service: booking.service, newStatus, actor },
    }),
  );
}

export async function notifyOrderCreated(order: Pick<StoreOrder, "id" | "patientId" | "total">): Promise<void> {
  await safe(() =>
    broadcastToAdmins({
      type: "order_created",
      title: "New store order",
      body: `A new order totaling $${order.total.toFixed(2)} is awaiting review.`,
      link: "/admin/orders",
      payload: { orderId: order.id },
    }),
  );
}

const ORDER_STATUS_COPY: Record<StoreOrder["status"], string> = {
  pending: "received",
  processing: "being prepared",
  shipped: "out for delivery",
  delivered: "delivered",
};

export async function notifyOrderStatusChange(input: {
  order: Pick<StoreOrder, "id" | "patientId">;
  newStatus: StoreOrder["status"];
}): Promise<void> {
  const { order, newStatus } = input;
  await safe(() =>
    createNotification({
      userId: order.patientId,
      type: "order_status_changed",
      title: "Order update",
      body: `Your order is ${ORDER_STATUS_COPY[newStatus]}.`,
      link: "/patient/orders",
      payload: { orderId: order.id, newStatus },
    }),
  );
}

export async function notifyNurseSignup(input: { nurseUserId: string; nurseName: string }): Promise<void> {
  await safe(() =>
    broadcastToAdmins({
      type: "nurse_signup",
      title: "New nurse registration",
      body: `${input.nurseName} just signed up and is awaiting approval.`,
      link: "/admin/nurses",
      payload: { nurseUserId: input.nurseUserId },
    }),
  );
}

export async function notifyNurseStatusChange(input: {
  nurseUserId: string;
  newStatus: "approved" | "rejected";
}): Promise<void> {
  const approved = input.newStatus === "approved";
  await safe(() =>
    createNotification({
      userId: input.nurseUserId,
      type: approved ? "nurse_approved" : "nurse_rejected",
      title: approved ? "Profile approved" : "Profile not approved",
      body: approved
        ? "Your profile has been approved. You can now receive bookings."
        : "Your profile was not approved at this time. Please contact support for next steps.",
      link: approved ? "/nurse" : "/pending-approval",
      payload: { newStatus: input.newStatus },
    }),
  );
}
