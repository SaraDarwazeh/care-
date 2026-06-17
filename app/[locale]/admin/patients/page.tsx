"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  ShieldCheck,
  Pill,
  Cake,
  Droplet,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { AppUser, PatientProfile } from "@/lib/types";
import { getPatientLocations, getPatientProfile } from "@/services/patientService";
import LoadingScreen from "@/components/common/LoadingScreen";
import SignedReadImage from "@/components/common/SignedReadImage";
import { getCurrentIdToken } from "@/services/authService";
import { getPointsBalance, getPointsLedger } from "@/services/pointsService";
import { fmtNumber } from "@/lib/format";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import type { PointsLedgerEntry } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/lib/csvExport";

interface PatientWithProfile {
  user: AppUser;
  profile: PatientProfile | null;
}

// Admin loyalty card. Reads the patient's balance + last 5 ledger
// entries, and exposes a manual-adjust form (audit-tagged) for support
// cases — refund clawback, goodwill credit, etc.
function PatientRewardsCard({ patientId }: { patientId: string }) {
  const locale = useLocale() as Locale;
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [b, l] = await Promise.all([getPointsBalance(patientId), getPointsLedger(patientId, 5)]);
    setBalance(b);
    setLedger(l);
  }

  useEffect(() => {
    let active = true;
    Promise.all([getPointsBalance(patientId), getPointsLedger(patientId, 5)])
      .then(([b, l]) => {
        if (!active) return;
        setBalance(b);
        setLedger(l);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [patientId]);

  async function submitAdjust() {
    const n = Math.floor(Number(delta));
    if (!n || !reason.trim()) {
      setError("Delta and reason required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await getCurrentIdToken();
      const res = await fetch("/api/points/adjust", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, delta: n, reason: reason.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      setDelta("");
      setReason("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loyalty</p>
        {balance !== null && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            {fmtNumber(balance, locale)} pts
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
        <div>
          <p className="mb-1 text-xs font-bold text-slate-500">Recent activity</p>
          {ledger.length === 0 ? (
            <p className="text-xs text-slate-400">No activity yet</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
                  <span className="font-semibold text-slate-700">{entry.source}</span>
                  <span
                    className={`font-bold ${entry.type === "earn" ? "text-emerald-700" : "text-rose-700"}`}
                    dir="ltr"
                  >
                    {entry.type === "earn" ? "+" : "−"}
                    {entry.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Manual adjust</p>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 100 or -50"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
          />
          {error && <p className="text-xs text-rose-700">{error}</p>}
          <button
            type="button"
            onClick={() => void submitAdjust()}
            disabled={busy}
            className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? "Adjusting…" : "Apply adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Admin-only identity-document card. Renders the signed-read image,
// shows the verification status, and offers verify/reject actions.
function PatientIdentityCard({
  profile,
  onChanged,
}: {
  profile: PatientProfile;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function patch(status: "verified" | "rejected", note?: string) {
    setBusy(status === "verified" ? "verify" : "reject");
    setError(null);
    try {
      const token = await getCurrentIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/patients/verify", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: profile.userId, status, note }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      setShowRejectInput(false);
      setRejectNote("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update verification");
    } finally {
      setBusy(null);
    }
  }

  const status = profile.verificationStatus ?? null;
  const hasUpload = Boolean(profile.idDocumentKey);

  return (
    <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-sky-500" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity verification</p>
        {status === "verified" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Verified
          </span>
        )}
        {status === "pending" && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Pending review
          </span>
        )}
        {status === "rejected" && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Rejected
          </span>
        )}
      </div>

      {!hasUpload ? (
        <p className="text-sm text-slate-500">Patient has not uploaded an ID document yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
          <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <SignedReadImage s3Key={profile.idDocumentKey!} alt="Patient ID document" />
          </div>
          <div className="flex flex-col gap-3">
            {status === "rejected" && profile.verificationNote && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <span className="font-bold">Note:</span> {profile.verificationNote}
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void patch("verified")}
                disabled={busy !== null || status === "verified"}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Verify
              </button>
              <button
                type="button"
                onClick={() => setShowRejectInput((v) => !v)}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
            {showRejectInput && (
              <div className="space-y-2">
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Reason for rejection (sent to the patient)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                  rows={3}
                />
                <button
                  type="button"
                  disabled={!rejectNote.trim() || busy !== null}
                  onClick={() => void patch("rejected", rejectNote.trim())}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Send rejection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
        className="flex w-full items-center justify-between p-6 text-start hover:bg-slate-50"
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
                            <span className="ms-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
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

              <PatientIdentityCard
                profile={profile}
                onChanged={() => onLoadProfile(patient.id)}
              />

              <PatientRewardsCard patientId={patient.id} />
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
  const t = useTranslations("admin.patients");
  const tOrders = useTranslations("admin.orders");
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PatientProfile | null>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
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
  }, [appUser]);

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

  if (authLoading || !appUser || loading) return <LoadingScreen text={t("loading")} />;

  const filtered = patients.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 px-5 py-2.5 text-center shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{tOrders("filterAll")}</p>
            <p className="text-2xl font-extrabold text-slate-800">{patients.length}</p>
          </div>
          <button
            type="button"
            onClick={exportPatientsCsv}
            disabled={exporting || patients.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {exporting ? "…" : tOrders("exportCsv")}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="relative">
          <Users className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t("searchPlaceholder")} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
            <Users className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">{search ? t("noMatches") : t("noPatients")}</p>
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
