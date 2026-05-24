"use client";

import LoadingScreen from "@/components/common/LoadingScreen";
import NotificationList from "@/components/common/NotificationList";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function AdminNotificationsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["admin"] });

  if (loading || !appUser) {
    return <LoadingScreen text="Loading notifications..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1">
          Platform events that need your attention — new nurses, new bookings, new orders.
        </p>
      </div>
      <NotificationList userId={appUser.id} />
    </div>
  );
}
