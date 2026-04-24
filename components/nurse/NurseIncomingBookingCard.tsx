import PatientCard from "@/components/patient/PatientCard";
import PatientButton from "@/components/patient/PatientButton";
import { BookingWithParticipants } from "@/lib/types";

function formatStatus(status: BookingWithParticipants["status"]) {
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

export default function NurseIncomingBookingCard({
  booking,
  onAccept,
  onReject,
  busy,
}: {
  booking: BookingWithParticipants;
  onAccept: () => void;
  onReject: (reason?: string) => void;
  busy?: boolean;
}) {
  return (
    <PatientCard>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{booking.patientName}</p>
            <p className="text-sm text-slate-500">{booking.patientEmail}</p>
            <p className="mt-1 text-sm text-slate-600">
              {booking.service} • {booking.date} at {booking.time}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatStatus(booking.status)}`}>
            {booking.status}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-700">Location:</span> {booking.location}</p>
          <p className="mt-1"><span className="font-semibold text-slate-700">Notes:</span> {booking.notes || "No notes provided"}</p>
          {booking.rejectionReason ? (
            <p className="mt-1 text-red-700"><span className="font-semibold">Rejection reason:</span> {booking.rejectionReason}</p>
          ) : null}
        </div>

        {booking.status === "pending" ? (
          <div className="flex gap-2">
            <div className="w-28">
              <PatientButton onClick={onAccept} loading={busy}>
                Accept
              </PatientButton>
            </div>
            <div className="w-28">
              <PatientButton variant="ghost" onClick={() => onReject(window.prompt("Optional rejection reason") ?? undefined)}>
                Reject
              </PatientButton>
            </div>
          </div>
        ) : null}
      </div>
    </PatientCard>
  );
}
