"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  Users,
  ChevronDown,
  ChevronUp,
  Activity,
  MapPin,
  CreditCard,
  Phone,
  ShieldAlert,
  Pill,
  Cake,
  Droplet,
  Download,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { AppUser, PatientProfile } from "@/lib/types";
import { getPatientLocations, getPatientProfile } from "@/services/patientService";
import LoadingScreen from "@/components/common/LoadingScreen";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/lib/csvExport";

interface PatientWithProfile {
  user: AppUser;
  profile: PatientProfile | null;
}

function PatientRow({ patient, profile, onLoadProfile }: {
  patient: AppUser;
  profile: PatientProfile | null;
  onLoadProfile: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  async function handleExpand() {
    if (!expanded && !profile) {
      setLoadingProfile(true);
      try {
        await onLoadProfile(patient.id);
      } finally {
        setLoadingProfile(false);
      }
    }
    setExpanded(!expanded);
  }

  const locations = profile ? getPatientLocations(profile) : [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-sky-300 transition-all">
      <button
        type="button"
        onClick={handleExpand}
        className="flex w-full items-center justify-between p-6 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-700">
            {patient.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{patient.name}</p>
            <p className="text-sm text-slate-500">{patient.email}</p>
            {profile?.phone && (
              <p className="text-xs text-slate-400">{profile.phone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
              profile.profileCompleted
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {profile.profileCompleted ? "Profile complete" : "Profile incomplete"}
            </span>
          )}
          {expanded ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-6 bg-slate-50">
          {loadingProfile ? (
            <p className="text-sm font-medium text-slate-500 animate-pulse">Loading profile...</p>
          ) : profile ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Contact */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-sky-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                </div>
                <p className="font-semibold text-slate-700">{profile.phone || "Not set"}</p>
              </div>

              {/* DOB + Blood */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Cake className="h-4 w-4 text-violet-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date of birth</p>
                </div>
                <p className="font-semibold text-slate-700">{profile.dateOfBirth || "Not set"}</p>
                {profile.bloodType && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                    <Droplet className="h-3 w-3" /> {profile.bloodType}
                  </p>
                )}
              </div>

              {/* Emergency contact */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency contact</p>
                </div>
                {profile.emergencyContact ? (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-700">{profile.emergencyContact.name}</p>
                    {profile.emergencyContact.relationship && (
                      <p className="text-xs text-slate-500">{profile.emergencyContact.relationship}</p>
                    )}
                    <p className="text-xs text-slate-500">{profile.emergencyContact.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not set</p>
                )}
              </div>

              {/* Saved locations — spans 2 cols */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm sm:col-span-2 lg:col-span-2">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Saved locations ({locations.length})
                  </p>
                </div>
                {locations.length === 0 ? (
                  <p className="text-sm text-slate-400">No addresses saved</p>
                ) : (
                  <ul className="space-y-1.5">
                    {locations.map((loc) => (
                      <li key={loc.id} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-bold text-slate-700">
                          {loc.label}
                          {loc.isDefault && (
                            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{loc.address}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-violet-500" />
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

              {/* Conditions */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-rose-500" />
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

              {/* Allergies */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allergies</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(profile.allergies ?? []).length > 0
                    ? profile.allergies!.map((a) => (
                        <span key={a} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">{a}</span>
                      ))
                    : <p className="text-sm text-slate-400">None recorded</p>}
                </div>
              </div>

              {/* Current medications */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-sky-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medications</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(profile.currentMedications ?? []).length > 0
                    ? profile.currentMedications!.map((m) => (
                        <span key={m} className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold border border-sky-100">{m}</span>
                      ))
                    : <p className="text-sm text-slate-400">None recorded</p>}
                </div>
              </div>

              {profile.medicalHistory && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medical history</p>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{profile.medicalHistory}</p>
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
  const [profiles, setProfiles] = useState<Record<string, PatientProfile | null>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    const { db } = ensureClientFirebase();
    getDocs(query(collection(db, "users"), where("role", "==", "patient")))
      .then((snap) => {
        if (!active) return;
        setPatients(snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            role: "patient" as const,
            status: "approved" as const,
            createdAt: String(data.createdAt ?? ""),
          };
        }));
      })
      .catch((err) => console.error("[admin/patients] failed to load", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function loadProfile(id: string) {
    if (profiles[id] !== undefined) return;
    const p = await getPatientProfile(id);
    setProfiles((prev) => ({ ...prev, [id]: p }));
  }

  async function exportPatientsCsv() {
    setExporting(true);
    try {
      // Pull every profile that hasn't already been cached.
      const missing = patients.filter((p) => profiles[p.id] === undefined);
      const loaded: Record<string, PatientProfile | null> = { ...profiles };
      await Promise.all(
        missing.map(async (p) => {
          loaded[p.id] = await getPatientProfile(p.id);
        }),
      );
      setProfiles(loaded);

      const rows: PatientWithProfile[] = patients.map((p) => ({
        user: p,
        profile: loaded[p.id] ?? null,
      }));

      const columns: CsvColumn<PatientWithProfile>[] = [
        { header: "Name", accessor: (r) => r.user.name },
        { header: "Email", accessor: (r) => r.user.email },
        { header: "Phone", accessor: (r) => r.profile?.phone ?? "" },
        { header: "Date of birth", accessor: (r) => r.profile?.dateOfBirth ?? "" },
        { header: "Blood type", accessor: (r) => r.profile?.bloodType ?? "" },
        { header: "Default address", accessor: (r) => r.profile?.defaultLocation ?? "" },
        {
          header: "Saved locations",
          accessor: (r) =>
            (r.profile ? getPatientLocations(r.profile) : [])
              .map((l) => `${l.label}: ${l.address}`)
              .join(" | "),
        },
        { header: "Emergency contact name", accessor: (r) => r.profile?.emergencyContact?.name ?? "" },
        { header: "Emergency contact relationship", accessor: (r) => r.profile?.emergencyContact?.relationship ?? "" },
        { header: "Emergency contact phone", accessor: (r) => r.profile?.emergencyContact?.phone ?? "" },
        { header: "Conditions", accessor: (r) => (r.profile?.diseases ?? []).join("; ") },
        { header: "Allergies", accessor: (r) => (r.profile?.allergies ?? []).join("; ") },
        { header: "Current medications", accessor: (r) => (r.profile?.currentMedications ?? []).join("; ") },
        { header: "Payment methods", accessor: (r) => (r.profile?.paymentMethods ?? []).join("; ") },
        { header: "Profile complete", accessor: (r) => (r.profile?.profileCompleted ? "yes" : "no") },
        { header: "Registered at", accessor: (r) => r.user.createdAt },
      ];

      downloadCsv(timestampedFilename("careplus-patients"), rows, columns);
    } catch (err) {
      console.error("[admin/patients] export failed", err);
    } finally {
      setExporting(false);
    }
  }

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading patients..." />;

  const filtered = patients.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Patients</h1>
          <p className="text-slate-500 mt-1">Operational view of patient profiles, contact info, and saved addresses.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</p>
            <p className="text-2xl font-extrabold text-slate-800">{patients.length}</p>
          </div>
          <button
            type="button"
            onClick={exportPatientsCsv}
            disabled={exporting || patients.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {exporting ? "Preparing…" : "Export CSV"}
          </button>
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
          filtered.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              profile={profiles[patient.id] ?? null}
              onLoadProfile={loadProfile}
            />
          ))
        )}
      </div>
    </div>
  );
}
