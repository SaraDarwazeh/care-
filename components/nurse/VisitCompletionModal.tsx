"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, X, Activity, Pill, AlertTriangle, Plus } from "lucide-react";
import type { BookingWithParticipants, Vitals } from "@/lib/types";
import { addObservation, ensureRecordForBooking } from "@/services/medicalService";
import { updateBookingStatus } from "@/services/bookingService";
import { fmtDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { useAuth } from "@/hooks/useAuth";
import { getNurseProfileByUserId } from "@/services/nurseService";

interface VisitCompletionModalProps {
  booking: BookingWithParticipants;
  nurseId: string;
  nurseName?: string;
  onClose: () => void;
  onCompleted: () => void;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft/40";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

function doneTitleKey(gender?: string): "doneTitleFemale" | "doneTitleMale" | "doneTitleNeutral" {
  if (gender === "female") return "doneTitleFemale";
  if (gender === "male") return "doneTitleMale";
  return "doneTitleNeutral";
}

export default function VisitCompletionModal({
  booking,
  nurseId,
  nurseName,
  onClose,
  onCompleted,
}: VisitCompletionModalProps) {
  const t = useTranslations("nurse.visitCompletion");
  const tVitals = useTranslations("nurse.visitCompletion.vitals");
  const tErr = useTranslations("nurse.errors");
  const locale = useLocale() as Locale;
  const { appUser } = useAuth();
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [medicationNote, setMedicationNote] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);
  const [alertDraft, setAlertDraft] = useState("");
  const [step, setStep] = useState<"form" | "saving" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [nurseGender, setNurseGender] = useState<string | undefined>(undefined);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Load nurse gender once for the gender-aware "done" title. Optional —
  // a missing profile just falls back to the neutral form.
  useEffect(() => {
    if (!appUser || appUser.role !== "nurse") return;
    let active = true;
    void getNurseProfileByUserId(appUser.id).then((p) => {
      if (active) setNurseGender(p?.gender);
    });
    return () => { active = false; };
  }, [appUser]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "saving") {
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        const enabled = Array.from(focusables).filter(
          (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
        );
        if (enabled.length === 0) return;
        const first = enabled[0];
        const last = enabled[enabled.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  function addAlert() {
    const trimmed = alertDraft.trim();
    if (!trimmed) return;
    if (!alerts.includes(trimmed)) setAlerts((prev) => [...prev, trimmed]);
    setAlertDraft("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStep("saving");

    const vitals: Vitals = {
      bloodPressure: bp || undefined,
      heartRate: hr ? Number(hr) : undefined,
      temperature: temp ? Number(temp) : undefined,
      respiratoryRate: rr ? Number(rr) : undefined,
      oxygenSaturation: spo2 ? Number(spo2) : undefined,
    };
    const hasVitals = Object.values(vitals).some((v) => v !== undefined);

    try {
      const record = await ensureRecordForBooking({
        bookingId: booking.id,
        patientId: booking.patientId,
        nurseId,
        summary: summary.trim() || undefined,
      });

      if (note.trim() || hasVitals || medicationNote.trim() || alerts.length > 0) {
        await addObservation(record.id, {
          nurseId,
          nurseName,
          // Per Phase 4 rule: user-generated content stored as entered.
          note: note.trim() || "Visit completed.",
          vitals: hasVitals ? vitals : undefined,
          medicationNote: medicationNote.trim() || undefined,
          alerts: alerts.length > 0 ? alerts : undefined,
        });
      }

      await updateBookingStatus(booking.id, "completed");

      setSavedRecordId(record.id);
      setStep("done");
      onCompleted();
    } catch (err) {
      console.error("[VisitCompletionModal] save failed", err);
      setError(err instanceof Error ? err.message : tErr("completeFailed"));
      setStep("form");
    }
  }

  const formattedDate = fmtDate(booking.date, locale, { weekday: "short", month: "short", day: "numeric" });
  const dateLine = booking.time
    ? t("atTime", { date: formattedDate, time: booking.time })
    : t("dateOnly", { date: formattedDate });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-completion-heading"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <button
          onClick={onClose}
          disabled={step === "saving"}
          className="absolute end-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
          aria-label={t("closeAria")}
        >
          <X className="h-5 w-5" />
        </button>

        {step === "done" ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-4" />
            <h2 className="text-xl font-extrabold text-slate-800">{t(doneTitleKey(nurseGender))}</h2>
            <p className="mt-2 text-slate-600">{t("doneBody")}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {savedRecordId && (
                <Link
                  href={`/patient/records/${savedRecordId}`}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
                >
                  {t("openRecord")}
                </Link>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-300 transition"
              >
                {t("done")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{t("kicker")}</p>
              <h2
                id="visit-completion-heading"
                className="mt-1 text-xl font-extrabold text-slate-800"
              >
                {t("headingSeparator", { service: booking.service, patient: booking.patientName })}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{dateLine}</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>{t("summaryLabel")}</label>
                <input
                  ref={firstFieldRef}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder={t("summaryPlaceholder")}
                  dir="auto"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">{t("summaryHelper")}</p>
              </div>

              <div>
                <label className={labelClass}>{t("observationLabel")}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("observationPlaceholder")}
                  dir="auto"
                  className={`${inputClass} min-h-[100px] resize-none`}
                />
              </div>

              <div>
                <p className={`${labelClass} flex items-center gap-1.5`}>
                  <Activity className="h-3.5 w-3.5" /> {t("vitalsLabel")}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{tVitals("bloodPressure")}</label>
                    <input placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} dir="ltr" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{tVitals("heartRate")}</label>
                    <input type="number" min="0" placeholder="72" value={hr} onChange={(e) => setHr(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{tVitals("temperature")}</label>
                    <input type="number" step="0.1" placeholder="36.6" value={temp} onChange={(e) => setTemp(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{tVitals("respiratoryRate")}</label>
                    <input type="number" min="0" placeholder="16" value={rr} onChange={(e) => setRr(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">{tVitals("oxygenSaturation")}</label>
                    <input type="number" min="0" max="100" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <Pill className="h-3.5 w-3.5" /> {t("medicationLabel")}
                </label>
                <input
                  value={medicationNote}
                  onChange={(e) => setMedicationNote(e.target.value)}
                  placeholder={t("medicationPlaceholder")}
                  dir="auto"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("alertsLabel")}
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
                    placeholder={t("alertsPlaceholder")}
                    dir="auto"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addAlert}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("addAlert")}
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
                          aria-label={t("removeAlertAria", { value: alert })}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={step === "saving"}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={step === "saving"}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {step === "saving" ? t("completingButton") : t("completeButton")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
