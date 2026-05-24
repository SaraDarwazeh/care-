"use client";

import { useState } from "react";
import { addObservation } from "@/services/medicalService";
import { Observation } from "@/lib/types";

export default function ObservationForm({ recordId, nurseId, nurseName, onAdded } : { recordId: string; nurseId: string; nurseName?: string; onAdded?: (o: Observation) => void }) {
  const [note, setNote] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const obs = await addObservation(recordId, {
        nurseId,
        nurseName,
        note,
        vitals: {
          bloodPressure: bp || undefined,
          heartRate: hr ? Number(hr) : undefined,
        },
      });
      setNote(""); setBp(""); setHr("");
      onAdded?.(obs as Observation);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
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
        <p className={labelClass}>Vitals (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Blood Pressure</label>
            <input placeholder="e.g. 120/80" value={bp} onChange={(e) => setBp(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Heart Rate (bpm)</label>
            <input type="number" placeholder="e.g. 72" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
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
