"use client";

import { useTranslations } from "next-intl";
import LoadingScreen from "@/components/common/LoadingScreen";
import NotificationList from "@/components/common/NotificationList";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function AdminNotificationsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.notifications");

  if (loading || !appUser) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-slate-500 mt-1">{t("subtitle")}</p>
      </div>
      <NotificationList userId={appUser.id} />
    </div>
  );
}
