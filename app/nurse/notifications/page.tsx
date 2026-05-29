"use client";

import LoadingScreen from "@/components/common/LoadingScreen";
import NotificationList from "@/components/common/NotificationList";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function NurseNotificationsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["nurse"] });

  if (loading || !appUser) {
    return <LoadingScreen text="Loading notifications..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-2 text-slate-600">
          Booking requests, profile updates, and announcements from the Care+ team.
        </p>
      </div>
      <NotificationList userId={appUser.id} />
    </div>
  );
}
