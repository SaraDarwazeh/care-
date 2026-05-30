"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Package,
  ShieldCheck,
  Sparkles,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/types";
import {
  getNotificationsForUser,
  markAllAsRead,
  markAsRead,
} from "@/services/notificationService";
import type { Locale } from "@/i18n/config";
import { fmtDate } from "@/lib/format";
import { renderNotification } from "@/lib/notificationRenderer";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  booking_created: CalendarClock,
  booking_accepted: CheckCircle2,
  booking_rejected: XCircle,
  booking_completed: CheckCircle2,
  booking_cancelled: XCircle,
  nurse_signup: Sparkles,
  nurse_approved: ShieldCheck,
  nurse_rejected: AlertCircle,
  order_created: Package,
  order_status_changed: Package,
  system_alert: Bell,
};

const TYPE_ACCENT: Record<NotificationType, string> = {
  booking_created: "bg-sky-50 text-sky-600 border-sky-100",
  booking_accepted: "bg-emerald-50 text-emerald-600 border-emerald-100",
  booking_rejected: "bg-rose-50 text-rose-600 border-rose-100",
  booking_completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  booking_cancelled: "bg-slate-50 text-slate-600 border-slate-100",
  nurse_signup: "bg-violet-50 text-violet-600 border-violet-100",
  nurse_approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  nurse_rejected: "bg-rose-50 text-rose-600 border-rose-100",
  order_created: "bg-violet-50 text-violet-600 border-violet-100",
  order_status_changed: "bg-sky-50 text-sky-600 border-sky-100",
  system_alert: "bg-amber-50 text-amber-600 border-amber-100",
};

// Relative time formatter — module-scope so the React-Compiler purity
// rule doesn't fire on the embedded Date.now() call. Locale-aware
// fallback for entries older than a week.
function formatRelative(
  iso: string,
  t: ReturnType<typeof useTranslations>,
  locale: Locale,
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { m: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { h: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { d: days });
  return fmtDate(iso, locale, { month: "short", day: "numeric", year: "numeric" });
}

export default function NotificationList({ userId }: { userId: string }) {
  const t = useTranslations("patient.notifications");
  // Root-scope translator for the notifications namespace — used to render
  // template-based notifications at view time. Scoped t() above can't reach
  // outside `patient.notifications`.
  const tRoot = useTranslations();
  const locale = useLocale() as Locale;
  const [items, setItems] = useState<Notification[] | null>(null);
  const [bulking, setBulking] = useState(false);

  async function load() {
    const data = await getNotificationsForUser(userId);
    setItems(data);
  }

  useEffect(() => {
    let active = true;
    getNotificationsForUser(userId)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        console.error("[NotificationList] failed to load", err);
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function handleMarkRead(id: string) {
    setItems((prev) =>
      prev
        ? prev.map((n) =>
            n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
          )
        : prev,
    );
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("[NotificationList] markAsRead failed", err);
      void load();
    }
  }

  async function handleMarkAll() {
    if (!items || items.every((n) => n.read)) return;
    setBulking(true);
    try {
      await markAllAsRead(userId);
      await load();
    } finally {
      setBulking(false);
    }
  }

  if (items === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16">
        <BellOff className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-700">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-slate-500">{t("emptyBody")}</p>
      </div>
    );
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {unreadCount > 0
            ? t("unreadOfTotal", { unread: unreadCount, total: items.length })
            : t("totalCount", { n: items.length })}
        </p>
        <button
          onClick={handleMarkAll}
          disabled={bulking || unreadCount === 0}
          className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulking ? t("marking") : t("markAllRead")}
        </button>
      </div>

      <ul className="space-y-3">
        {items.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? Bell;
          const accent = TYPE_ACCENT[n.type] ?? "bg-slate-50 text-slate-600 border-slate-100";
          // Render at view time: payload-bearing notifications relocalize
          // when the user switches language; legacy items fall back to
          // their persisted title/body.
          const rendered = renderNotification(n, tRoot, locale);
          const body = (
            <div className="flex gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${accent}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-800 text-sm leading-snug">{rendered.title}</p>
                  <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap pt-0.5">
                    {formatRelative(n.createdAt, t, locale)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{rendered.body}</p>
              </div>
            </div>
          );

          const baseClasses = `block rounded-3xl border p-4 transition ${
            n.read
              ? "border-slate-100 bg-white hover:border-slate-200"
              : "border-sky-100 bg-sky-50/40 hover:border-sky-200"
          }`;

          if (n.link) {
            return (
              <li key={n.id}>
                <Link
                  href={n.link}
                  onClick={() => {
                    if (!n.read) void handleMarkRead(n.id);
                  }}
                  className={baseClasses}
                >
                  {body}
                </Link>
              </li>
            );
          }

          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.read) void handleMarkRead(n.id);
                }}
                className={`w-full text-start ${baseClasses}`}
              >
                {body}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
