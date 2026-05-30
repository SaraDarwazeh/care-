"use client";

import { useTranslations } from "next-intl";
import LoadingScreen from "@/components/common/LoadingScreen";
import NotificationList from "@/components/common/NotificationList";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function NurseNotificationsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["nurse"] });
  const t = useTranslations("nurse.notifications");
  const tLoading = useTranslations("nurse.loading");

  if (loading || !appUser) {
    return <LoadingScreen text={tLoading("notifications")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-slate-600">{t("pageSubtitle")}</p>
      </div>
      <NotificationList userId={appUser.id} />
    </div>
  );
}
