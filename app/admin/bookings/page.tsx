"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { CalendarClock, Filter, Search } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { BookingStatus, BookingWithParticipants } from "@/lib/types";
import { updateBookingStatus } from "@/services/bookingService";
import { doc, getDoc } from "firebase/firestore";
import LoadingScreen from "@/components/common/LoadingScreen";

async function enrichBooking(raw: Record<string, unknown> & { id: string }): Promise<BookingWithParticipants> {
  const { db } = ensureClientFirebase();
  const [patientSnap, nurseSnap] = await Promise.all([
    getDoc(doc(db, "users", String(raw.patientId ?? ""))),
    getDoc(doc(db, "nurseProfiles", String(raw.nurseId ?? ""))),
  ]);
  const patient = patientSnap.exists() ? (patientSnap.data() as Record<string, unknown>) : {};
  const nurse = nurseSnap.exists() ? (nurseSnap.data() as Record<string, unknown>) : {};

  return {
    id: raw.id,
    patientId: String(raw.patientId ?? ""),
    nurseId: String(raw.nurseId ?? ""),
    service: String(raw.service ?? ""),
    price: Number(raw.price ?? 0),
    date: String(raw.date ?? ""),
    time: String(raw.time ?? ""),
    location: String(raw.location ?? ""),
    notes: String(raw.notes ?? ""),
    status: (raw.status as BookingStatus) ?? "pending",
    createdAt: String(raw.createdAt ?? ""),
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : undefined,
    patientName: String(patient.name ?? "Unknown"),
    patientEmail: String(patient.email ?? ""),
    nurseName: String(nurse.fullName ?? "Unknown"),
    nurseSpecialization: String(nurse.specialization ?? ""),
    nurseProfileImage: String(nurse.profileImage ?? ""),
  };
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  completed: "bg-sky-100 text-sky-700",
  cancelled: "bg-slate-100 text-slate-600",
};

export default function AdminBookingsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;
    const { db } = ensureClientFirebase();
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawDocs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }));
      const enriched = await Promise.all(rawDocs.map(enrichBooking));
      setBookings(enriched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appUser]);

  const filtered = bookings.filter((b) => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterDate && b.date !== filterDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.patientName.toLowerCase().includes(q) && !b.nurseName.toLowerCase().includes(q) && !b.service.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleStatus(id: string, status: BookingStatus) {
    setUpdating(id);
    try {
      await updateBookingStatus(id, status);
    } finally {
      setUpdating(null);
    }
  }

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text="Loading bookings..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bookings</h1>
          <p className="text-slate-500 mt-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time updates active
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-slate-800">{bookings.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, nurse, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
        />
        <button
          onClick={() => { setFilterStatus(""); setFilterDate(""); setSearchQuery(""); }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CalendarClock className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">No bookings found</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nurse</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{b.patientName}</p>
                      <p className="text-xs text-slate-400">{b.patientEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700">{b.nurseName}</p>
                      <p className="text-xs text-slate-400">{b.nurseSpecialization}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{b.service}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-600">{b.date}</p>
                      <p className="text-xs text-slate-400">{b.time}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">${b.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {b.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatus(b.id, "accepted")}
                              disabled={updating === b.id}
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStatus(b.id, "rejected")}
                              disabled={updating === b.id}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.status === "accepted" && (
                          <button
                            onClick={() => handleStatus(b.id, "completed")}
                            disabled={updating === b.id}
                            className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition disabled:opacity-50"
                          >
                            Mark Done
                          </button>
                        )}
                        {(b.status === "completed" || b.status === "rejected") && (
                          <span className="text-xs text-slate-400 italic">No action</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
