"use client";

import { Fragment, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Search, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { BookingWithParticipants, BookingStatus } from "@/lib/types";
import { getBookingsForNurseWithParticipants, updateBookingStatus } from "@/services/bookingService";
import LoadingScreen from "@/components/common/LoadingScreen";
import BookingDetails from "@/components/nurse/BookingDetails";
import VisitCompletionModal from "@/components/nurse/VisitCompletionModal";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  completed: "bg-sky-100 text-sky-700",
  cancelled: "bg-slate-100 text-slate-600",
};

export default function NurseBookingsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const t = useTranslations("nurse.bookings");
  const tStatus = useTranslations("patient.bookingStatus");
  const tLoading = useTranslations("nurse.loading");
  const locale = useLocale() as Locale;
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [completingBooking, setCompletingBooking] = useState<BookingWithParticipants | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!appUser) return;
      const data = await getBookingsForNurseWithParticipants(appUser.id);
      if (!active) return;
      setBookings(data);
      setLoading(false);
    }
    void run();
    return () => { active = false; };
  }, [appUser]);

  async function handleStatus(id: string, status: "accepted" | "rejected") {
    if (status === "rejected") {
      const confirmed = window.confirm(t("rejectConfirm"));
      if (!confirmed) return;
    }
    setUpdatingId(id);
    try {
      await updateBookingStatus(id, status);
      if (appUser) {
        const data = await getBookingsForNurseWithParticipants(appUser.id);
        setBookings(data);
      }
    } finally { setUpdatingId(null); }
  }

  async function reloadBookings() {
    if (!appUser) return;
    const data = await getBookingsForNurseWithParticipants(appUser.id);
    setBookings(data);
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text={tLoading("bookings")} />;

  const filtered = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.patientName.toLowerCase().includes(q) && !b.service.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const headerKeys = ["patient", "service", "dateAndShift", "price", "status", "actions"] as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
          <p className="text-slate-500 mt-1">{t("pageSubtitle")}</p>
        </div>
        <div className="flex gap-3">
          {(["pending", "accepted", "completed", "rejected"] as BookingStatus[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterStatus === s ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-current" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {tStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t("searchPlaceholder")} value={search}
            onChange={e => setSearch(e.target.value)} dir="auto"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CalendarClock className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">{t("emptyTitle")}</p>
            <p className="text-slate-500 text-sm">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {headerKeys.map(key => (
                    <th key={key} className="text-start px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t(`tableHeaders.${key}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <Fragment key={b.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{b.patientName}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{b.patientEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{b.service}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">{b.date}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{b.time}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{fmtCurrency(b.price, locale)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase ${STATUS_COLORS[b.status]}`}>{tStatus(b.status)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {b.status === "pending" && (
                          <>
                            <button onClick={() => handleStatus(b.id, "accepted")} disabled={updatingId === b.id}
                              className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                              <CheckCircle className="h-3.5 w-3.5" /> {t("actions.accept")}
                            </button>
                            <button onClick={() => handleStatus(b.id, "rejected")} disabled={updatingId === b.id}
                              className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50">
                              <XCircle className="h-3.5 w-3.5" /> {t("actions.reject")}
                            </button>
                          </>
                        )}
                        {b.status === "accepted" && (
                          <button
                            onClick={() => setCompletingBooking(b)}
                            disabled={updatingId === b.id}
                            className="flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition disabled:opacity-50"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" /> {t("actions.completeVisit")}
                          </button>
                        )}
                        {(b.status === "completed" || b.status === "rejected" || b.status === "cancelled") && (
                          <span className="text-xs text-slate-400 italic">{t("actions.noAction")}</span>
                        )}
                        <button onClick={() => setOpenId(openId === b.id ? null : b.id)} className="ms-2 text-sm text-sky-600 font-bold">{t("actions.details")}</button>
                      </div>
                    </td>
                  </tr>
                  {openId === b.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4">
                        <BookingDetails booking={b} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {completingBooking && appUser && (
        <VisitCompletionModal
          booking={completingBooking}
          nurseId={appUser.id}
          nurseName={appUser.name}
          onClose={() => setCompletingBooking(null)}
          onCompleted={() => {
            void reloadBookings();
          }}
        />
      )}
    </div>
  );
}
