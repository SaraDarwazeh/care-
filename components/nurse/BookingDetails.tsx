"use client";

import { useEffect, useState } from "react";
import { BookingWithParticipants } from "@/lib/types";
import PriceBreakdown from "@/components/common/PriceBreakdown";
import { getRecordsForPatient } from "@/services/medicalService";

export default function BookingDetails({ booking }: { booking: BookingWithParticipants }) {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    async function loadRecords() {
      try {
        const r = await getRecordsForPatient(booking.patientId);
        if (!active) return;
        setRecords(r.slice(0, 3));
      } catch (err) { console.error(err); }
    }
    void loadRecords();
    return () => { active = false; };
  }, [booking.patientId]);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
      <h4 className="font-bold">Booking Details</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="text-sm text-slate-600">
          <div><strong>Patient:</strong> {booking.patientName}</div>
          <div><strong>Service:</strong> {booking.service}</div>
          <div><strong>Date:</strong> {booking.date} {booking.time}</div>
          <div><strong>Location:</strong> {booking.location}</div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-2"><strong>Pricing</strong></div>
          <PriceBreakdown pricing={booking.pricing} />
        </div>
      </div>

      <div>
        <h5 className="font-semibold">Recent Records</h5>
        {records.length === 0 ? (
          <p className="text-sm text-slate-500">No recent records for this patient.</p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="mt-2 rounded-lg border border-slate-100 p-2 bg-slate-50">
              <div className="text-sm font-semibold">{r.summary ?? 'Record'}</div>
              <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
