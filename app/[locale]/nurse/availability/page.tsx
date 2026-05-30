"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Save, MapPin, Clock, Truck, Moon, CalendarOff } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getNurseProfileByUserId, saveNurseProfile } from "@/services/nurseService";
import LoadingScreen from "@/components/common/LoadingScreen";
import type { NurseDay, NurseProfile } from "@/lib/types";
import { weekOrderFor, sortDaysForLocale } from "@/i18n/week";
import type { Locale } from "@/i18n/config";

const SHIFT_KEYS = [
  { value: "A", labelKey: "A" as const, subKey: "A_sub" as const },
  { value: "B", labelKey: "B" as const, subKey: "B_sub" as const },
  { value: "C", labelKey: "C" as const, subKey: "C_sub" as const },
];

// Canonical service-location vocabulary. Stored as canonical keys so the
// nurse marketplace filter can resolve them; UI shows localized labels.
const LOCATION_KEYS = [
  "Nablus",
  "Ramallah",
  "Jenin",
  "Jerusalem",
  "Hebron",
  "Tulkarm",
  "Qalqilya",
  "Bethlehem",
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function NurseAvailabilityPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["nurse"], requireApprovedNurse: true });
  const t = useTranslations("nurse.availability");
  const tSec = useTranslations("nurse.availability.sections");
  const tDays = useTranslations("nurse.days");
  const tShifts = useTranslations("nurse.shifts");
  const tLocations = useTranslations("nurse.locations");
  const tLoading = useTranslations("nurse.loading");
  const locale = useLocale() as Locale;
  const [profile, setProfile] = useState<NurseProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!appUser) return;
      const p = await getNurseProfileByUserId(appUser.id);
      if (!active) return;
      setProfile(p);
    }
    void load();
    return () => { active = false; };
  }, [appUser]);

  if (loading || !appUser || !profile) return <LoadingScreen text={tLoading("availability")} />;

  const availableDays: NurseDay[] = profile.availableDays ?? [];
  const availableShifts: string[] = profile.availableShifts ?? [];
  const willingToServeLocations: string[] = profile.willingToServeLocations ?? [];
  const transportAvailable: boolean = Boolean(profile.transportAvailable);
  const acceptsOvernight: boolean = Boolean(profile.acceptsOvernight);
  const onLeave: boolean = Boolean(profile.onLeave);
  const leaveStartDate: string = profile.leaveStartDate ?? "";
  const leaveEndDate: string = profile.leaveEndDate ?? "";

  const orderedDays = weekOrderFor(locale);
  const orderedSelected = sortDaysForLocale(availableDays, locale);
  const localizedLocations = (loc: string) => {
    const known = (LOCATION_KEYS as readonly string[]).includes(loc);
    return known ? tLocations(loc) : loc;
  };

  const updateProfile = (patch: Partial<NurseProfile>) =>
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));

  function toggleDay(day: NurseDay) {
    const next = availableDays.includes(day)
      ? availableDays.filter((d) => d !== day)
      : [...availableDays, day];
    updateProfile({ availableDays: next });
  }

  function toggleShift(shift: string) {
    const next = availableShifts.includes(shift)
      ? availableShifts.filter((s) => s !== shift)
      : [...availableShifts, shift];
    updateProfile({ availableShifts: next });
  }

  function toggleLocation(loc: string) {
    const next = willingToServeLocations.includes(loc)
      ? willingToServeLocations.filter((l) => l !== loc)
      : [...willingToServeLocations, loc];
    updateProfile({ willingToServeLocations: next });
  }

  async function save() {
    if (!profile || !appUser) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveNurseProfile({ ...profile, userId: appUser.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pageTitle")}</h1>
          <p className="text-slate-500 mt-1">{t("pageSubtitle")}</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition disabled:opacity-60 shrink-0"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {t("saving")}
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {t("saved")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("save")}
            </>
          )}
        </button>
      </div>

      {/* Working Days */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">{tSec("workingDays")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">{tSec("workingDaysHelp")}</p>
        <div className="flex flex-wrap gap-3">
          {orderedDays.map((day) => {
            const active = availableDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`h-12 w-16 rounded-2xl text-sm font-bold transition-all ${
                  active
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {tDays(day)}
              </button>
            );
          })}
        </div>
        {availableDays.length > 0 && (
          <p className="mt-3 text-xs text-emerald-600 font-semibold">
            {tSec("selectedPrefix", { days: orderedSelected.map((d) => tDays(d)).join(", ") })}
          </p>
        )}
      </div>

      {/* Available Shifts */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
            <Clock className="h-5 w-5 text-sky-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">{tSec("availableShifts")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">{tSec("availableShiftsHelp")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SHIFT_KEYS.map(({ value, labelKey, subKey }) => {
            const active = availableShifts.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleShift(value)}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-5 text-center transition-all ${
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <span className={`text-base font-extrabold ${active ? "text-sky-700" : "text-slate-700"}`}>{tShifts(labelKey)}</span>
                <span className={`text-xs font-medium mt-1 ${active ? "text-sky-500" : "text-slate-400"}`}>{tShifts(subKey)}</span>
                {active && (
                  <CheckCircle2 className="h-4 w-4 text-sky-500 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Locations */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100">
            <MapPin className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">{tSec("serviceLocations")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">{tSec("serviceLocationsHelp")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LOCATION_KEYS.map((loc) => {
            const active = willingToServeLocations.includes(loc);
            return (
              <label
                key={loc}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                  active
                    ? "border-purple-300 bg-purple-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    active ? "border-purple-500 bg-purple-500" : "border-slate-300 bg-white"
                  }`}
                  onClick={() => toggleLocation(loc)}
                >
                  {active && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm font-semibold ${active ? "text-purple-700" : "text-slate-600"}`}
                  onClick={() => toggleLocation(loc)}
                >
                  {localizedLocations(loc)}
                </span>
              </label>
            );
          })}
        </div>
        {willingToServeLocations.length > 0 && (
          <p className="mt-3 text-xs text-purple-600 font-semibold">
            {tSec("locationsSelected", { n: willingToServeLocations.length })}
          </p>
        )}
      </div>

      {/* Extra Options */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 text-lg mb-5">{tSec("additionalOptions")}</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{tSec("transportTitle")}</p>
                <p className="text-xs text-slate-500">{tSec("transportBody")}</p>
              </div>
            </div>
            <Toggle
              checked={transportAvailable}
              onChange={(v) => updateProfile({ transportAvailable: v })}
            />
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{tSec("overnightTitle")}</p>
                <p className="text-xs text-slate-500">{tSec("overnightBody")}</p>
              </div>
            </div>
            <Toggle
              checked={acceptsOvernight}
              onChange={(v) => updateProfile({ acceptsOvernight: v })}
            />
          </div>
        </div>
      </div>

      {/* Leave / Vacation */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
            <CalendarOff className="h-5 w-5 text-rose-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">{tSec("leaveTitle")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">{tSec("leaveIntro")}</p>

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="font-bold text-slate-800 text-sm">{tSec("currentlyOnLeave")}</p>
            <p className="text-xs text-slate-500">{tSec("currentlyOnLeaveHelp")}</p>
          </div>
          <Toggle
            checked={onLeave}
            onChange={(v) => updateProfile({ onLeave: v })}
          />
        </div>

        {onLeave && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{tSec("leaveStarts")}</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => updateProfile({ leaveStartDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-slate-400">{tSec("leaveStartsHelp")}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">{tSec("leaveEnds")}</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => updateProfile({ leaveEndDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-slate-400">{tSec("leaveEndsHelp")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {t("saving")}
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {t("saved")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("save")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
