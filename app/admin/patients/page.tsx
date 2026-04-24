"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { Users, ChevronDown, ChevronUp, Activity, MapPin, CreditCard } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { AppUser, PatientProfile } from "@/lib/types";
import { getPatientProfile } from "@/services/patientService";
import LoadingScreen from "@/components/common/LoadingScreen";

function PatientRow({ patient }: { patient: AppUser }) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function handleExpand() {
    if (!expanded && !profile) {
      setLoadingProfile(true);
      try {
        const p = await getPatientProfile(patient.id);
        setProfile(p);
      } finally {
        setLoadingProfile(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-sky-300 transition-all">
      <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50" onClick={handleExpand}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-700">
            {patient.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{patient.name}</p>
            <p className="text-sm text-slate-500">{patient.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-violet-100 text-violet-700 uppercase">Patient</span>
          {expanded ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-6 bg-slate-50">
          {loadingProfile ? (
            <p className="text-sm font-medium text-slate-500 animate-pulse">Loading profile...</p>
          ) : profile ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</p>
                </div>
                <p className="font-semibold text-slate-700">{profile.defaultLocation || "Not set"}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-rose-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conditions</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(profile.diseases ?? []).length > 0
                    ? profile.diseases!.map((d) => (
                        <span key={d} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">{d}</span>
                      ))
                    : <p className="text-sm text-slate-400">None recorded</p>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(profile.paymentMethods ?? []).length > 0
                    ? profile.paymentMethods!.map((pm) => (
                        <span key={pm} className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100 capitalize">{pm}</span>
                      ))
                    : <p className="text-sm text-slate-400">None added</p>}
                </div>
              </div>
              {profile.medicalHistory && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medical History</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{profile.medicalHistory}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 font-medium text-sm">
              Patient profile not completed yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPatientsPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { db } = ensureClientFirebase();
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "patient")));
      if (active) {
        setPatients(snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return { id: d.id, name: String(data.name ?? ""), email: String(data.email ?? ""), role: "patient" as const, status: "approved" as const, createdAt: String(data.createdAt ?? "") };
        }));
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading patients..." />;

  const filtered = patients.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Patients</h1>
          <p className="text-slate-500 mt-1">View patient profiles and medical information.</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</p>
          <p className="text-2xl font-extrabold text-slate-800">{patients.length}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search by name or email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
            <Users className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">No patients found</p>
          </div>
        ) : (
          filtered.map((patient) => <PatientRow key={patient.id} patient={patient} />)
        )}
      </div>
    </div>
  );
}
