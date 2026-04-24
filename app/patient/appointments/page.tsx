"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientCard from "@/components/patient/PatientCard";
import SectionContainer from "@/components/patient/SectionContainer";
import { useAuth } from "@/hooks/useAuth";
import { BookingWithParticipants } from "@/lib/types";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";

function statusClass(status: BookingWithParticipants["status"]) {
  if (status === "accepted") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "completed") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function PatientAppointmentsPage() {
  const { appUser, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const patientId = appUser.id;

    let active = true;

    async function loadBookings() {
      try {
        const items = await getBookingsForPatientWithParticipants(patientId);
        if (active) {
          setBookings(items);
        }
      } catch (loadError) {
        console.error("[patient/appointments] failed to load bookings", loadError);
        if (active) {
          setError("Unable to load appointments right now.");
        }
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    }

    void loadBookings();

    return () => {
      active = false;
    };
  }, [appUser]);

  if (loading || !appUser) {
    return <LoadingScreen text="Loading your appointments..." />;
  }

  return (
    <SectionContainer title="Appointments" description="Track your bookings and current visit status.">
      {error ? <PatientCard><p className="text-sm text-red-600">{error}</p></PatientCard> : null}
      {fetching ? (
        <PatientCard>
          <p className="text-sm text-slate-500">Loading bookings...</p>
        </PatientCard>
      ) : bookings.length === 0 ? (
        <PatientCard>
          <p className="text-sm text-slate-500">No bookings found yet.</p>
        </PatientCard>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <PatientCard key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{booking.nurseName}</p>
                  <p className="text-sm text-slate-500">{booking.service}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {booking.date} at {booking.time}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{booking.location}</p>
                  <p className="mt-2 text-sm text-slate-500">{booking.notes}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(booking.status)}`}
                >
                  {booking.status}
                </span>
              </div>
            </PatientCard>
          ))}
        </div>
      )}
    </SectionContainer>
  );
}
