"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Send,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import {
  confirmMedicalRecord,
  disputeMedicalRecord,
  getRecordById,
  recordStatus,
  submitMedicalRecord,
} from "@/services/medicalService";
import { canPatientReview } from "@/services/reviewService";
import LoadingScreen from "@/components/common/LoadingScreen";
import ObservationForm from "@/components/medical/ObservationForm";
import ReviewForm from "@/components/patient/ReviewForm";
import { MedicalRecord, MedicalRecordStatus, Observation, Vitals } from "@/lib/types";

function VitalCard({ label, value, unit }: { label: string; value: string | number | undefined; unit?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800">
        {value}
        {unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function VitalsRow({ vitals }: { vitals: Vitals }) {
  const hasAny = vitals.bloodPressure || vitals.heartRate || vitals.temperature || vitals.respiratoryRate || vitals.oxygenSaturation;
  if (!hasAny) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mt-3">
      <VitalCard label="Blood Pressure" value={vitals.bloodPressure} unit="mmHg" />
      <VitalCard label="Heart Rate" value={vitals.heartRate} unit="bpm" />
      <VitalCard label="Temperature" value={vitals.temperature} unit="°C" />
      <VitalCard label="Resp. Rate" value={vitals.respiratoryRate} unit="/min" />
      <VitalCard label="O₂ Saturation" value={vitals.oxygenSaturation} unit="%" />
    </div>
  );
}

const STATUS_PRESENTATION: Record<MedicalRecordStatus, { label: string; bg: string; text: string; icon: typeof FileText }> = {
  draft: { label: "Draft — nurse editing", bg: "bg-slate-100", text: "text-slate-700", icon: FileText },
  submitted: { label: "Submitted — awaiting your confirmation", bg: "bg-amber-100", text: "text-amber-800", icon: Clock },
  confirmed: { label: "Confirmed by patient", bg: "bg-emerald-100", text: "text-emerald-800", icon: CheckCircle2 },
  disputed: { label: "Disputed by patient", bg: "bg-rose-100", text: "text-rose-800", icon: ShieldAlert },
};

export default function RecordDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { appUser, loading: authLoading } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");
  // Review eligibility resolved once when the record loads — used to
  // decide whether the patient sees a "Rate this visit" CTA after they
  // confirm. Updated locally when a review is submitted so the panel hides.
  const [canReview, setCanReview] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const r = await getRecordById(id);
      if (!active) return;
      if (!r) { router.replace('/patient/records'); return; }
      setRecord(r);
      setLoading(false);

      // Resolve review eligibility once we know the record's nurse and
      // the current patient. Stays false for nurses and admins.
      if (r.nurseId && appUser?.role === "patient") {
        const check = await canPatientReview(r.nurseId, appUser.id);
        if (active) setCanReview(check.eligible);
      }
    }
    void load();
    return () => { active = false; };
  }, [id, router, appUser]);

  useEffect(() => {
    if (!reviewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setReviewOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reviewOpen]);

  if (authLoading || loading) return <LoadingScreen text="Loading record..." />;
  if (!record) return null;

  const status = recordStatus(record);
  const presentation = STATUS_PRESENTATION[status];
  const StatusIcon = presentation.icon;
  const isPatient = appUser?.role === "patient";
  const isNurse = appUser?.role === "nurse" && appUser.id === record.nurseId;
  const observations = record.observations ?? [];

  const handleAdded = (o: Observation) => {
    setRecord((prev) => prev ? { ...prev, observations: [o, ...(prev.observations ?? [])] } : prev);
  };

  async function withBusy(action: () => Promise<void>) {
    setActionBusy(true);
    try {
      await action();
      // Reload to get fresh status + timestamps.
      const fresh = await getRecordById(id);
      if (fresh) setRecord(fresh);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Record Header */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">{record.summary ?? "Visit Record"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(record.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-sky-50 border border-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">
              {observations.length} Observation{observations.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Status badge */}
          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${presentation.bg}`}>
            <StatusIcon className={`h-4 w-4 ${presentation.text}`} />
            <span className={`text-xs font-bold ${presentation.text}`}>{presentation.label}</span>
          </div>
          {status === "confirmed" && record.confirmedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Confirmed on {new Date(record.confirmedAt).toLocaleString()}
            </p>
          )}
          {status === "disputed" && record.disputeNote && (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Patient&rsquo;s concern</p>
              <p className="mt-1">{record.disputeNote}</p>
              {record.disputedAt && (
                <p className="mt-1 text-xs text-rose-600/80">
                  Raised on {new Date(record.disputedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {record.bookingId && (
            <p className="mt-3 text-xs text-slate-400">Booking ref: {record.bookingId}</p>
          )}

          {/* Action zone */}
          {isPatient && status === "submitted" && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="mb-3 text-sm font-bold text-slate-700">Review this record</p>
              {!disputeOpen ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => withBusy(() => confirmMedicalRecord(record.id))}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {actionBusy ? "Confirming…" : "Confirm — accurate"}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => setDisputeOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Dispute this record
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Briefly describe what&rsquo;s incorrect or missing. The nurse will revise and resubmit.
                  </p>
                  <textarea
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    placeholder="e.g. Heart rate reading on Day 2 doesn't match what I remember from my home monitor."
                    className="min-h-[100px] w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionBusy || !disputeNote.trim()}
                      onClick={() =>
                        withBusy(async () => {
                          await disputeMedicalRecord(record.id, disputeNote.trim());
                          setDisputeOpen(false);
                          setDisputeNote("");
                        })
                      }
                      className="rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {actionBusy ? "Submitting…" : "Submit dispute"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeOpen(false);
                        setDisputeNote("");
                      }}
                      className="rounded-2xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isNurse && (status === "draft" || status === "disputed") && observations.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => withBusy(() => submitMedicalRecord(record.id))}
                className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {status === "disputed"
                  ? actionBusy
                    ? "Resubmitting…"
                    : "Mark as resubmitted"
                  : actionBusy
                  ? "Submitting…"
                  : "Submit to patient"}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                The patient will be asked to confirm the record or raise a concern.
              </p>
            </div>
          )}

          {isPatient && status === "confirmed" && (
            <div className="mt-4 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <ClipboardCheck className="h-4 w-4" /> You confirmed this record. No further action needed.
              </div>
              {canReview && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> Rate this visit
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Your feedback helps other families find the right caregiver.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
                  >
                    <Star className="h-4 w-4" /> Leave a review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observations Timeline */}
        <div>
          <h3 className="text-base font-bold text-slate-700 mb-4">Care Timeline</h3>
          {observations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-500">No observations yet</p>
              <p className="text-xs text-slate-400 mt-1">Your nurse will add notes during or after your visit.</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-100 pointer-events-none" />
              {observations.map((o) => (
                <div key={o.id} className="relative flex gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 z-10">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700">
                        {o.nurseName ?? "Nurse"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(o.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{o.note}</p>
                    {o.vitals && <VitalsRow vitals={o.vitals} />}
                    {o.medicationNote && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">Medication: </span>{o.medicationNote}
                      </div>
                    )}
                    {o.alerts && o.alerts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {o.alerts.map((alert, i) => (
                          <span key={i} className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            <AlertCircle className="mr-1 inline h-3 w-3" />
                            {alert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nurse-only: Add Observation Form */}
        {isNurse && (
          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              Nurse — Add Observation
            </p>
            <ObservationForm
              recordId={record.id}
              nurseId={appUser!.id}
              nurseName={appUser!.name}
              onAdded={handleAdded}
            />
          </div>
        )}
      </div>

      {/* Review modal — opened from the confirmed-state "Rate this visit" panel */}
      {reviewOpen && isPatient && appUser && record.nurseId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setReviewOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Rate your visit</p>
                <h2 className="text-lg font-bold text-slate-800">{record.summary ?? "Visit"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                aria-label="Close"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ReviewForm
                nurseId={record.nurseId}
                patientId={appUser.id}
                patientName={appUser.name}
                onSubmitted={() => {
                  setCanReview(false);
                  setReviewOpen(false);
                }}
                onCancel={() => setReviewOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
