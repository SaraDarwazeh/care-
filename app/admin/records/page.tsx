"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { FileText, User, Stethoscope, ClipboardList } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import { BookingWithParticipants } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";

async function enrichBooking(raw: Record<string, unknown> & { id: string }) {
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
    status: raw.status as BookingWithParticipants["status"],
    createdAt: String(raw.createdAt ?? ""),
    patientName: String(patient.name ?? "Unknown"),
    patientEmail: String(patient.email ?? ""),
    nurseName: String(nurse.fullName ?? "Unknown"),
    nurseSpecialization: String(nurse.specialization ?? ""),
  };
}

export default function AdminRecordsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [records, setRecords] = useState<BookingWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { db } = ensureClientFirebase();
      const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
      const raw = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      const enriched = await Promise.all(raw.map(enrichBooking));
      if (active) {
        setRecords(enriched);
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading records..." />;

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.patientName.toLowerCase().includes(q) || r.nurseName.toLowerCase().includes(q) || r.service.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Medical Records</h1>
          <p className="text-slate-500 mt-1">View service logs, notes, and care history.</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Records</p>
          <p className="text-2xl font-extrabold text-slate-800">{records.length}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search by patient, nurse, or service..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 hover:border-sky-200 transition">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Patient</p>
                    <p className="font-bold text-slate-800">{record.patientName}</p>
                    <p className="text-xs text-slate-500">{record.patientEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                    <Stethoscope className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nurse</p>
                    <p className="font-bold text-slate-800">{record.nurseName}</p>
                    <p className="text-xs text-slate-500">{record.nurseSpecialization}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
                    <ClipboardList className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Service</p>
                    <p className="font-bold text-slate-800">{record.service}</p>
                    <p className="text-xs text-slate-500">{record.date} · {record.time}</p>
                  </div>
                </div>
              </div>
              {record.notes && (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{record.notes}</p>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  record.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  record.status === "accepted" ? "bg-sky-100 text-sky-700" :
                  record.status === "rejected" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>{record.status}</span>
                <p className="text-sm font-bold text-slate-800">${record.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
