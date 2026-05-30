"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, MapPin, Clock } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { BookingWithParticipants } from "@/lib/types";
import { getBookingsForNurseWithParticipants } from "@/services/bookingService";
import LoadingScreen from "@/components/common/LoadingScreen";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

const TIME_TO_SHIFT_KEY: Record<string, "A_full" | "B_full" | "C_full"> = {
  "07:00": "A_full",
  "14:00": "B_full",
  "20:00": "C_full",
};

export default function NurseSchedulePage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const t = useTranslations("nurse.schedule");
  const tShifts = useTranslations("nurse.shifts");
  const tLoading = useTranslations("nurse.loading");
  const locale = useLocale() as Locale;
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getBookingsForNurseWithParticipants(appUser.id).then(data => {
      if (active) {
        setBookings(data.filter(b => b.status === "accepted").sort((a, b) => a.date.localeCompare(b.date)));
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [appUser]);

  if (authLoading || !appUser || loading) return <LoadingScreen text={tLoading("schedule")} />;

  const grouped = bookings.reduce<Record<string, BookingWithParticipants[]>>((acc, b) => {
    if (!acc[b.date]) acc[b.date] = [];
    acc[b.date].push(b);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
        <p className="text-slate-500 mt-1">{t("pageSubtitle")}</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-20">
          <CalendarClock className="h-14 w-14 text-slate-300 mb-4" />
          <p className="text-xl font-bold text-slate-700">{t("emptyTitle")}</p>
          <p className="text-slate-500 mt-2">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayBookings]) => {
            const isToday = date === today;
            const dateObj = new Date(date + "T00:00:00");
            const formatted = fmtDate(date, locale, { weekday: "long", month: "long", day: "numeric" });

            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isToday ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <p className="text-lg font-extrabold">{dateObj.getDate()}</p>
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${isToday ? "text-emerald-600" : "text-slate-800"}`}>
                      {formatted} {isToday && <span className="ms-2 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{t("todayBadge")}</span>}
                    </p>
                    <p className="text-sm text-slate-500">{t("shiftCount", { n: dayBookings.length })}</p>
                  </div>
                </div>

                <div className="space-y-3 ms-16">
                  {dayBookings.map(b => {
                    const shiftKey = TIME_TO_SHIFT_KEY[b.time];
                    const shiftLabel = shiftKey ? tShifts(shiftKey) : b.time;
                    return (
                      <div key={b.id} className={`rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${isToday ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <p className="font-bold text-slate-800 text-lg">{b.patientName}</p>
                            <p className="text-sm font-semibold text-emerald-600">{b.service}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {shiftLabel}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                {b.location}
                              </span>
                            </div>
                            {b.notes && (
                              <div className="rounded-xl bg-white border border-slate-100 px-3 py-2 text-xs text-slate-500">
                                <span className="font-bold text-slate-600">{t("noteLabel")} </span>{b.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-end shrink-0">
                            <p className="text-xl font-extrabold text-slate-800">{fmtCurrency(b.price, locale)}</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{t("perSession")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
