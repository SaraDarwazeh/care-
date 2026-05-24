"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Pill, Plus, X } from "lucide-react";
import { addObservation } from "@/services/medicalService";
import { Observation, Vitals } from "@/lib/types";

interface ObservationFormProps {
  recordId: string;
  nurseId: string;
  nurseName?: string;
  onAdded?: (o: Observation) => void;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

export default function ObservationForm({ recordId, nurseId, nurseName, onAdded }: ObservationFormProps) {
  const [note, setNote] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [medicationNote, setMedicationNote] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);
  const [alertDraft, setAlertDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAlert() {
    const trimmed = alertDraft.trim();
    if (!trimmed) return;
    if (!alerts.includes(trimmed)) setAlerts((prev) => [...prev, trimmed]);
    setAlertDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const vitals: Vitals = {
      bloodPressure: bp || undefined,
      heartRate: hr ? Number(hr) : undefined,
      temperature: temp ? Number(temp) : undefined,
      respiratoryRate: rr ? Number(rr) : undefined,
      oxygenSaturation: spo2 ? Number(spo2) : undefined,
    };

    const hasVitals = Object.values(vitals).some((v) => v !== undefined);

    try {
      const obs = await addObservation(recordId, {
        nurseId,
        nurseName,
        note,
        vitals: hasVitals ? vitals : undefined,
        medicationNote: medicationNote.trim() || undefined,
        alerts: alerts.length > 0 ? alerts : undefined,
      });
      setNote("");
      setBp("");
      setHr("");
      setTemp("");
      setRr("");
      setSpo2("");
      setMedicationNote("");
      setAlerts([]);
      setAlertDraft("");
      onAdded?.(obs as Observation);
    } catch (err) {
      console.error("[ObservationForm] save failed", err);
      setError(err instanceof Error ? err.message : "Failed to save observation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
      <div>
        <label className={labelClass}>Observation Notes *</label>
        <textarea
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe your clinical observation, patient response, and care provided..."
          className={`${inputClass} min-h-[100px] resize-none`}
        />
      </div>

      <div>
        <p className={`${labelClass} flex items-center gap-1.5`}>
          <Activity className="h-3.5 w-3.5" /> Vitals (optional)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Blood Pressure</label>
            <input
              placeholder="120/80"
              value={bp}
              onChange={(e) => setBp(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Heart Rate (bpm)</label>
            <input
              type="number"
              min="0"
              placeholder="72"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Temp. (°C)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="36.6"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Resp. Rate (/min)</label>
            <input
              type="number"
              min="0"
              placeholder="16"
              value={rr}
              onChange={(e) => setRr(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">O₂ Saturation (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="98"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <Pill className="h-3.5 w-3.5" /> Medication Note (optional)
        </label>
        <input
          value={medicationNote}
          onChange={(e) => setMedicationNote(e.target.value)}
          placeholder="e.g. Administered 500mg Metformin at 14:30"
          className={inputClass}
        />
      </div>

      <div>
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Alerts (optional)
        </label>
        <div className="flex gap-2">
          <input
            value={alertDraft}
            onChange={(e) => setAlertDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAlert();
              }
            }}
            placeholder="e.g. Slight fever onset"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addAlert}
            className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {alerts.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <li
                key={alert}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-100"
              >
                {alert}
                <button
                  type="button"
                  onClick={() => setAlerts((prev) => prev.filter((a) => a !== alert))}
                  className="rounded-full p-0.5 hover:bg-white/60"
                  aria-label={`Remove ${alert}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {loading ? "Saving..." : "Save Observation"}
        </button>
      </div>
    </form>
  );
}
