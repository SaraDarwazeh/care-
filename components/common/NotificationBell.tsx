"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeUnreadCount } from "@/services/notificationService";

interface NotificationBellProps {
  href: string;
  variant?: "light" | "dark";
  className?: string;
}

export default function NotificationBell({
  href,
  variant = "light",
  className = "",
}: NotificationBellProps) {
  const { appUser } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!appUser) return;
    const unsub = subscribeUnreadCount(appUser.id, setUnread);
    return () => unsub();
  }, [appUser]);

  if (!appUser) return null;

  const display = unread > 99 ? "99+" : String(unread);
  const iconColor = variant === "dark" ? "text-slate-300" : "text-slate-500";
  const hoverColor = variant === "dark" ? "hover:text-white" : "hover:text-sky-700";

  return (
    <Link
      href={href}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className={`relative inline-flex items-center justify-center p-2 transition ${iconColor} ${hoverColor} ${className}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
          {display}
        </span>
      )}
    </Link>
  );
}
