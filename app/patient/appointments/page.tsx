"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Clock, ChevronRight, X } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import SectionContainer from "@/components/patient/SectionContainer";
import { useAuth } from "@/hooks/useAuth";
import { BookingWithParticipants } from "@/lib/types";
import { getBookingsForPatientWithParticipants, updateBookingStatus } from "@/services/bookingService";

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
}: {
  booking: BookingWithParticipants;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4">
      {/* Header */}
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
          {booking.status}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
          <p className="text-sm font-bold text-slate-700">{booking.date}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
          <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {booking.time}
            {booking.shift && (
              <span className="ml-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                Shift {booking.shift}
              </span>
            )}
          </div>
        </div>
        {booking.location && (
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {booking.location}
            </div>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price</p>
          <p className="text-sm font-bold text-emerald-700">
            {booking.pricing?.total != null
              ? `$${booking.pricing.total.toFixed(2)}`
              : `$${booking.price.toFixed(2)}`}
          </p>
        </div>
        {booking.bookingType && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
            <p className="text-sm font-medium text-slate-600 capitalize">{booking.bookingType}</p>
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {booking.status === "rejected" && booking.rejectionReason && (
        <p className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 font-medium">
          Reason: {booking.rejectionReason}
        </p>
      )}

      {/* Cancel button for pending */}
      {booking.status === "pending" && (
        <button
          type="button"
          disabled={cancelling}
          onClick={() => onCancel(booking.id)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
          {cancelling ? "Cancelling..." : "Cancel Appointment"}
        </button>
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const { appUser, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;

    const patientId = appUser.id;
    let active = true;

    async function loadBookings() {
      try {
        const items = await getBookingsForPatientWithParticipants(patientId);
        if (active) setBookings(items);
      } catch (loadError) {
        console.error("[patient/appointments] failed to load bookings", loadError);
        if (active) setError("Unable to load appointments right now.");
      } finally {
        if (active) setFetching(false);
      }
    }

    void loadBookings();
    return () => { active = false; };
  }, [appUser]);

  async function handleCancel(bookingId: string) {
    if (cancellingId) return;
    const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
    if (!confirmed) return;
    setCancellingId(bookingId);
    try {
      await updateBookingStatus(bookingId, "cancelled");
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" as const } : b))
      );
    } catch (err) {
      console.error("Failed to cancel booking", err);
      setError("Failed to cancel appointment. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading || !appUser) {
    return <LoadingScreen text="Loading your appointments..." />;
  }

  // Sort bookings by status priority then by date desc
  const sorted = [...bookings].sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Appointments</h1>
          <p className="mt-1 text-slate-500 font-medium">
            All your bookings — past and upcoming.
          </p>
        </div>
        <Link
          href="/patient/nurses"
          className="hidden sm:flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
        >
          Book a Nurse <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Content */}
      {fetching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
          <CalendarClock className="mb-4 h-14 w-14 text-slate-300" />
          <p className="text-lg font-bold text-slate-500 mb-2">No appointments yet</p>
          <p className="text-slate-400 text-sm mb-6">Book your first nurse to get started.</p>
          <Link
            href="/patient/nurses"
            className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 transition"
          >
            Find a Nurse
          </Link>
        </div>
      ) : (
        <SectionContainer
          title={`${sorted.length} Booking${sorted.length !== 1 ? "s" : ""}`}
          description="Sorted by status — active bookings appear first."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                cancelling={cancellingId === booking.id}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Mobile CTA */}
      <Link
        href="/patient/nurses"
        className="sm:hidden flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
      >
        Book a New Nurse <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
