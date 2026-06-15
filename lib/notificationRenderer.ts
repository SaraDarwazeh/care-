import type { Notification, NotificationType } from "@/lib/types";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

// Render-time resolver. Notifications are persisted with `type` (the
// templateId) and `payload` (the substitution data). At read time we
// look up `notifications.{type}.{...}` and substitute placeholders so a
// user who switches locale sees their inbox in their current language.
//
// Backwards-compat: legacy notifications written before this system
// have no payload (or payload missing fields). They fall through to the
// persisted `title`/`body` strings.

type StrRecord = Record<string, string | number | undefined>;

// `t` is intentionally a permissive ICU-shaped function — we accept the
// next-intl translator without importing its full type.
type T = (key: string, values?: Record<string, string | number>) => string;

interface Rendered {
  title: string;
  body: string;
}

export function renderNotification(
  n: Pick<Notification, "type" | "title" | "body" | "payload">,
  t: T,
  locale: Locale,
): Rendered {
  const fallback = { title: n.title ?? "", body: n.body ?? "" };
  const payload = (n.payload ?? {}) as StrRecord & { variant?: "nurse" | "admin" | "patient" };
  // Each branch returns null when payload is missing the fields it needs
  // (legacy notifications) — caller falls back to persisted copy.
  const rendered = renderByType(n.type, payload, t, locale);
  return rendered ?? fallback;
}

function renderByType(
  type: NotificationType,
  p: StrRecord & { variant?: string },
  t: T,
  locale: Locale,
): Rendered | null {
  const dateStr = p.date ? fmtDate(String(p.date), locale, { month: "short", day: "numeric" }) : "";
  switch (type) {
    case "booking_created": {
      if (!p.service || !p.date) return null;
      const variant = p.variant === "admin" ? "admin" : "nurse";
      const base = `notifications.booking_created.${variant}`;
      return {
        title: t(`${base}.title`),
        body: t(`${base}.body`, {
          patientName: String(p.patientName ?? ""),
          service: String(p.service),
          date: dateStr,
        }),
      };
    }
    case "booking_accepted": {
      if (!p.service || !p.date) return null;
      return {
        title: t("notifications.booking_accepted.title"),
        body: t("notifications.booking_accepted.body", {
          service: String(p.service),
          date: dateStr,
        }),
      };
    }
    case "booking_rejected": {
      if (!p.service || !p.date) return null;
      const reason = p.reason ? String(p.reason) : "";
      return {
        title: t("notifications.booking_rejected.title"),
        body: reason
          ? t("notifications.booking_rejected.bodyWithReason", {
              service: String(p.service),
              date: dateStr,
              reason,
            })
          : t("notifications.booking_rejected.bodyNoReason", {
              service: String(p.service),
              date: dateStr,
            }),
      };
    }
    case "booking_completed": {
      if (!p.service || !p.date) return null;
      return {
        title: t("notifications.booking_completed.title"),
        body: t("notifications.booking_completed.body", {
          service: String(p.service),
          date: dateStr,
        }),
      };
    }
    case "booking_cancelled": {
      if (!p.service || !p.date) return null;
      const key = p.actor === "patient"
        ? "notifications.booking_cancelled.byPatient"
        : "notifications.booking_cancelled.byOther";
      return {
        title: t("notifications.booking_cancelled.title"),
        body: t(key, { service: String(p.service), date: dateStr }),
      };
    }
    case "nurse_signup": {
      if (!p.nurseName) return null;
      return {
        title: t("notifications.nurse_signup.title"),
        body: t("notifications.nurse_signup.body", { nurseName: String(p.nurseName) }),
      };
    }
    case "nurse_approved":
      return {
        title: t("notifications.nurse_approved.title"),
        body: t("notifications.nurse_approved.body"),
      };
    case "nurse_rejected":
      return {
        title: t("notifications.nurse_rejected.title"),
        body: t("notifications.nurse_rejected.body"),
      };
    case "order_created": {
      if (p.total === undefined) return null;
      return {
        title: t("notifications.order_created.title"),
        body: t("notifications.order_created.body", {
          total: fmtCurrency(Number(p.total), locale),
        }),
      };
    }
    case "order_status_changed": {
      const status = p.newStatus ? String(p.newStatus) : "";
      if (!status) return null;
      const statusCopy = t(`notifications.order_status_changed.statusCopy.${status}`);
      return {
        title: t("notifications.order_status_changed.title"),
        body: t("notifications.order_status_changed.body", { statusCopy }),
      };
    }
    case "system_alert": {
      if (!p.message) return null;
      return {
        title: t("notifications.system_alert.title"),
        body: t("notifications.system_alert.body", { message: String(p.message) }),
      };
    }
    case "patient_id_verified": {
      return {
        title: t("notifications.patient_id_verified.title"),
        body: t("notifications.patient_id_verified.body"),
      };
    }
    case "patient_id_rejected": {
      const note = p.note ? String(p.note) : "";
      return {
        title: t("notifications.patient_id_rejected.title"),
        body: note
          ? t("notifications.patient_id_rejected.bodyWithNote", { note })
          : t("notifications.patient_id_rejected.body"),
      };
    }
    case "points_earned": {
      if (p.amount === undefined) return null;
      const sourceKey = p.source ? String(p.source) : "default";
      return {
        title: t("notifications.points_earned.title", { amount: Number(p.amount) }),
        body: t(`notifications.points_earned.body.${sourceKey}`, {
          amount: Number(p.amount),
        }),
      };
    }
    case "points_redeemed": {
      if (p.amount === undefined) return null;
      return {
        title: t("notifications.points_redeemed.title", { amount: Number(p.amount) }),
        body: t("notifications.points_redeemed.body", { amount: Number(p.amount) }),
      };
    }
    default: {
      // Defensive: surface unknown types in dev so we don't silently
      // ship notifications that fall back to the persisted English strings.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[notificationRenderer] no case for type", type);
      }
      return null;
    }
  }
}
