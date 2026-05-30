"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, MapPin, Clock, ChevronRight, X, FileText, Star } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import SectionContainer from "@/components/patient/SectionContainer";
import ReviewForm from "@/components/patient/ReviewForm";
import { useAuth } from "@/hooks/useAuth";
import type { BookingWithParticipants } from "@/lib/types";
import { getBookingsForPatientWithParticipants, updateBookingStatus } from "@/services/bookingService";
import { getRecordsForPatient } from "@/services/medicalService";
import { canPatientReview } from "@/services/reviewService";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";

const STATUS_STYLES: Record<BookingWithParticipants["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  completed: "bg-sky-100 text-sky-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const STATUS_ORDER: BookingWithParticipants["status"][] = [
  "accepted",
  "pending",
  "completed",
  "rejected",
  "cancelled",
];

function BookingCard({
  booking,
  onCancel,
  cancelling,
  recordId,
  canReview,
  onReview,
}: {
  booking: BookingWithParticipants;
  onCancel: (id: string) => void;
  cancelling: boolean;
  recordId?: string;
  canReview: boolean;
  onReview: (booking: BookingWithParticipants) => void;
}) {
  const tCard = useTranslations("patient.appointments.card");
  const tStatus = useTranslations("patient.bookingStatus");
  const tType = useTranslations("patient.appointments.bookingType");
  const locale = useLocale() as Locale;

  const priceValue = booking.pricing?.total ?? booking.price;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shrink-0 sm:h-12 sm:w-12">
            <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate sm:text-base">{booking.nurseName}</h3>
            <p className="text-xs font-medium text-slate-500 truncate sm:text-sm">{booking.service}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:px-3 sm:text-xs ${STATUS_STYLES[booking.status]}`}
        >
          {tStatus(booking.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tCard("date")}</p>
          <p className="text-sm font-bold text-slate-700">{booking.date}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tCard("time")}</p>
          <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span dir="ltr">{booking.time}</span>
            {booking.shift && (
              <span className="ms-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                {tCard("shiftPrefix", { letter: booking.shift.toUpperCase() })}
              </span>
            )}
          </div>
        </div>
        {booking.location && (
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tCard("location")}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {booking.location}
            </div>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tCard("price")}</p>
          <p className="text-sm font-bold text-emerald-700">{fmtCurrency(priceValue, locale)}</p>
        </div>
        {booking.bookingType && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tCard("type")}</p>
            <p className="text-sm font-medium text-slate-600">{tType(booking.bookingType)}</p>
          </div>
        )}
      </div>

      {booking.status === "rejected" && booking.rejectionReason && (
        <p className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 font-medium">
          {tCard("reasonPrefix", { reason: booking.rejectionReason })}
        </p>
      )}

      {booking.status === "pending" && (
        <button
          type="button"
          disabled={cancelling}
          onClick={() => onCancel(booking.id)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
          {cancelling ? tCard("cancelling") : tCard("cancelAppointment")}
        </button>
      )}

      {booking.status === "completed" && recordId && (
        <Link
          href={`/patient/records/${recordId}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
        >
          <FileText className="h-4 w-4" />
          {tCard("viewVisitNotes")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {booking.status === "completed" && canReview && (
        <button
          type="button"
          onClick={() => onReview(booking)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
        >
          <Star className="h-4 w-4" />
          {tCard("leaveReview")}
        </button>
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const { appUser, loading } = useAuth();
  const t = useTranslations("patient.appointments");
  const tModal = useTranslations("patient.appointments.reviewModal");
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [recordsByBooking, setRecordsByBooking] = useState<Record<string, string>>({});
  const [reviewableNurseIds, setReviewableNurseIds] = useState<Set<string>>(new Set());
  const [reviewingBooking, setReviewingBooking] = useState<BookingWithParticipants | null>(null);

  useEffect(() => {
    if (!appUser) return;

    const patientId = appUser.id;
    let active = true;

    async function loadBookings() {
      try {
        const [items, records] = await Promise.all([
          getBookingsForPatientWithParticipants(patientId),
          getRecordsForPatient(patientId),
        ]);
        if (!active) return;
        setBookings(items);
        const map: Record<string, string> = {};
        records.forEach((r) => {
          if (r.bookingId) map[r.bookingId] = r.id;
        });
        setRecordsByBooking(map);

        const completedNurseIds = Array.from(
          new Set(items.filter((b) => b.status === "completed").map((b) => b.nurseId)),
        );
        const eligibilityResults = await Promise.all(
          completedNurseIds.map(async (nurseId) => ({
            nurseId,
            check: await canPatientReview(nurseId, patientId),
          })),
        );
        if (!active) return;
        const eligible = new Set(
          eligibilityResults.filter((r) => r.check.eligible).map((r) => r.nurseId),
        );
        setReviewableNurseIds(eligible);
      } catch (loadError) {
        console.error("[patient/appointments] failed to load bookings", loadError);
        if (active) setError(t("loadError"));
      } finally {
        if (active) setFetching(false);
      }
    }

    void loadBookings();
    return () => { active = false; };
  }, [appUser, t]);

  useEffect(() => {
    if (!reviewingBooking) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setReviewingBooking(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reviewingBooking]);

  async function handleCancel(bookingId: string) {
    if (cancellingId) return;
    const confirmed = window.confirm(t("cancelConfirm"));
    if (!confirmed) return;
    setCancellingId(bookingId);
    try {
      await updateBookingStatus(bookingId, "cancelled");
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" as const } : b))
      );
    } catch (err) {
      console.error("Failed to cancel booking", err);
      setError(t("cancelError"));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading || !appUser) {
    return <LoadingScreen text={t("loading")} />;
  }

  const sorted = [...bookings].sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
          <p className="mt-1 text-slate-500 font-medium">{t("pageSubtitle")}</p>
        </div>
        <Link
          href="/patient/nurses"
          className="hidden sm:flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
        >
          {t("bookNurse")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {fetching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
          <CalendarClock className="mb-4 h-14 w-14 text-slate-300" />
          <p className="text-lg font-bold text-slate-500 mb-2">{t("emptyTitle")}</p>
          <p className="text-slate-400 text-sm mb-6">{t("emptyBody")}</p>
          <Link
            href="/patient/nurses"
            className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 transition"
          >
            {t("findNurse")}
          </Link>
        </div>
      ) : (
        <SectionContainer
          title={t("bookingCount", { n: sorted.length })}
          description={t("sortedDescription")}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                cancelling={cancellingId === booking.id}
                recordId={recordsByBooking[booking.id]}
                canReview={reviewableNurseIds.has(booking.nurseId)}
                onReview={(b) => setReviewingBooking(b)}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      <Link
        href="/patient/nurses"
        className="sm:hidden flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
      >
        {t("bookNewNurse")} <ChevronRight className="h-4 w-4" />
      </Link>

      {reviewingBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setReviewingBooking(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600">{tModal("kicker")}</p>
                <h2 className="text-lg font-bold text-slate-800">{reviewingBooking.nurseName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                aria-label={tModal("closeLabel")}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ReviewForm
                nurseId={reviewingBooking.nurseId}
                patientId={appUser.id}
                patientName={appUser.name}
                onSubmitted={() => {
                  const submittedNurseId = reviewingBooking.nurseId;
                  setReviewableNurseIds((prev) => {
                    const next = new Set(prev);
                    next.delete(submittedNurseId);
                    return next;
                  });
                  setReviewingBooking(null);
                }}
                onCancel={() => setReviewingBooking(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
