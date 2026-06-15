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
import { createLogger } from "@/lib/logger";
import type {
  Booking,
  BookingStatus,
  Notification,
  NotificationType,
  StoreOrder,
} from "@/lib/types";
import { CURRENCY } from "@/lib/config";

const log = createLogger("notificationService");

// Notification bodies are written at create-time as plain strings (see
// design comment above createNotification). For currency amounts in
// those strings, format as "<CODE> <amount>" instead of any specific
// symbol so the body matches the platform's chosen currency.
function fmtAmount(value: number): string {
  return `${CURRENCY} ${value.toFixed(2)}`;
}

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
    log.warn("broadcastToAdmins skipped: no auth token");
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
      log.warn("broadcastToAdmins non-ok", res.status, detail);
    }
  } catch (error) {
    // Notifications are best-effort — never fail the parent transaction.
    log.warn("broadcastToAdmins failed", error);
  }
}

// Default cap: pulls the most recent N to keep client memory bounded.
// Callers can request more via opts.limit (e.g. 100 for an admin export).
export const NOTIFICATIONS_DEFAULT_LIMIT = 50;

export async function getNotificationsForUser(
  userId: string,
  opts: { limit?: number } = {},
): Promise<Notification[]> {
  const { db } = ensureClientFirebase();
  const q = query(collection(db, COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, "id">) }));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cap = opts.limit ?? NOTIFICATIONS_DEFAULT_LIMIT;
  return items.slice(0, cap);
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
      log.warn("subscribeUnreadCount error", err);
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
      log.warn("event helper failed", err);
    });
}

export async function notifyBookingCreated(input: {
  booking: Pick<Booking, "patientId" | "nurseId" | "service" | "date">;
  patientName?: string;
}): Promise<void> {
  const { booking, patientName } = input;
  // Payload carries every variable the templates substitute. `variant`
  // disambiguates multi-recipient types so the renderer picks the right
  // copy (nurse vs admin). Persisted title/body remain English fallbacks
  // for legacy readers and pre-template rendering paths.
  await Promise.all([
    safe(() =>
      createNotification({
        userId: booking.nurseId,
        type: "booking_created",
        title: "New booking request",
        body: `${patientName ?? "A patient"} requested ${booking.service} on ${booking.date}.`,
        link: bookingLinkFor("nurse"),
        payload: {
          variant: "nurse",
          patientName: patientName ?? "",
          service: booking.service,
          date: booking.date,
        },
      }),
    ),
    safe(() =>
      broadcastToAdmins({
        type: "booking_created",
        title: "New booking",
        body: `New booking request for ${booking.service} on ${booking.date}.`,
        link: bookingLinkFor("admin"),
        payload: {
          variant: "admin",
          patientName: patientName ?? "",
          service: booking.service,
          date: booking.date,
        },
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

  // Keyed on BookingStatus directly so we don't have to keep this map in
  // lock-step with the broader NotificationType union (the prior pattern
  // padded missing types with placeholder strings and broke as new
  // notification types landed in Items 2 & 3).
  const titleByStatus: Partial<Record<BookingStatus, string>> = {
    accepted: "Booking accepted",
    rejected: "Booking not accepted",
    completed: "Visit completed",
    cancelled: "Booking cancelled",
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
      title: titleByStatus[newStatus] ?? "Booking",
      body: bodyForRecipient,
      link: bookingLinkFor(recipientRole),
      payload: {
        service: booking.service,
        date: booking.date,
        newStatus,
        actor,
        ...(input.rejectionReason ? { reason: input.rejectionReason } : {}),
      },
    }),
  );
}

export async function notifyOrderCreated(order: Pick<StoreOrder, "id" | "patientId" | "total">): Promise<void> {
  await safe(() =>
    broadcastToAdmins({
      type: "order_created",
      title: "New store order",
      body: `A new order totaling ${fmtAmount(order.total)} is awaiting review.`,
      link: "/admin/orders",
      payload: { orderId: order.id, total: order.total },
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
      payload: { nurseUserId: input.nurseUserId, nurseName: input.nurseName },
    }),
  );
}

export async function notifyPointsEarned(input: {
  userId: string;
  amount: number;
  source: "booking_completed" | "order_delivered" | "review_submitted" | "admin_adjust";
  sourceId?: string;
}): Promise<void> {
  await safe(() =>
    createNotification({
      userId: input.userId,
      type: "points_earned",
      title: `+${input.amount} points`,
      body:
        input.source === "review_submitted"
          ? `You earned ${input.amount} bonus points for leaving a review.`
          : `You earned ${input.amount} loyalty points.`,
      link: "/patient/profile",
      payload: { amount: input.amount, source: input.source, sourceId: input.sourceId },
    }),
  );
}

export async function notifyPointsRedeemed(input: {
  userId: string;
  amount: number;
  orderId: string;
}): Promise<void> {
  await safe(() =>
    createNotification({
      userId: input.userId,
      type: "points_redeemed",
      title: `-${input.amount} points redeemed`,
      body: `You redeemed ${input.amount} points on your order.`,
      link: "/patient/orders",
      payload: { amount: input.amount, orderId: input.orderId },
    }),
  );
}

export async function notifyPatientIdVerified(input: { userId: string }): Promise<void> {
  await safe(() =>
    createNotification({
      userId: input.userId,
      type: "patient_id_verified",
      title: "Identity verified",
      body: "Your identity document was approved. You can now book a nurse.",
      link: "/patient/profile",
    }),
  );
}

export async function notifyPatientIdRejected(input: { userId: string; note?: string }): Promise<void> {
  await safe(() =>
    createNotification({
      userId: input.userId,
      type: "patient_id_rejected",
      title: "Identity verification needs attention",
      body: `Your identity document was not approved.${input.note ? ` ${input.note}` : ""}`,
      link: "/patient/profile",
      payload: input.note ? { note: input.note } : undefined,
    }),
  );
}

export async function notifyNurseProfileResubmit(input: {
  nurseUserId: string;
  nurseName: string;
}): Promise<void> {
  await safe(() =>
    broadcastToAdmins({
      type: "nurse_signup",
      title: "Nurse profile resubmitted",
      body: `${input.nurseName} edited their profile. Re-review required.`,
      link: "/admin/nurses",
      payload: { nurseUserId: input.nurseUserId, nurseName: input.nurseName, resubmit: true },
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
