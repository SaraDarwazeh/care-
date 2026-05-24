"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getRecordById } from "@/services/medicalService";
import LoadingScreen from "@/components/common/LoadingScreen";
import ObservationForm from "@/components/medical/ObservationForm";
import { MedicalRecord, Observation, Vitals } from "@/lib/types";

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

export default function RecordDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { appUser, loading: authLoading } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
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
    }
    void load();
    return () => { active = false; };
  }, [id, router]);

  if (authLoading || loading) return <LoadingScreen text="Loading record..." />;
  if (!record) return null;

  const handleAdded = (o: Observation) => {
    setRecord((prev) => prev ? { ...prev, observations: [o, ...(prev.observations ?? [])] } : prev);
  };

  const observations = record.observations ?? [];

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
          {record.bookingId && (
            <p className="mt-3 text-xs text-slate-400">Booking ref: {record.bookingId}</p>
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
              {/* Timeline line */}
              <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-100 pointer-events-none" />
              {observations.map((o) => (
                <div key={o.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 z-10">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  {/* Observation card */}
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
        {appUser?.role === "nurse" && (
          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">
              Nurse — Add Observation
            </p>
            <ObservationForm
              recordId={record.id}
              nurseId={appUser.id}
              nurseName={appUser.name}
              onAdded={handleAdded}
            />
          </div>
        )}
      </div>
    </div>
  );
}
