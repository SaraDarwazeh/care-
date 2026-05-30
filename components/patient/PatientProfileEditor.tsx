"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  UserCircle,
  Activity,
  CreditCard,
  CalendarClock,
  Settings,
  HelpCircle,
  Star,
  ChevronRight,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Phone,
  ShieldAlert,
  Pill,
  Plus,
  X,
  MapPin,
  Home,
  Trash2,
} from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import type { EmergencyContact, PatientLocation, PatientProfile } from "@/lib/types";
import {
  computeProfileCompleted,
  getMissingFieldLabels,
  getPatientLocations,
  getPatientProfile,
  savePatientProfile,
} from "@/services/patientService";
import { useAuth } from "@/hooks/useAuth";

type SectionId = "personal" | "locations" | "medical" | "emergency" | "payment";

interface FormState {
  phone: string;
  locations: PatientLocation[];
  dateOfBirth: string;
  bloodType: string;
  diseases: string[];
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string;
  paymentMethods: string[];
  emergencyContact: EmergencyContact;
}

const EMPTY_FORM: FormState = {
  phone: "",
  locations: [],
  dateOfBirth: "",
  bloodType: "",
  diseases: [],
  allergies: [],
  currentMedications: [],
  medicalHistory: "",
  paymentMethods: [],
  emergencyContact: { name: "", relationship: "", phone: "" },
};

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function newLocationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function profileToForm(profile: PatientProfile): FormState {
  const locations = getPatientLocations(profile);
  return {
    phone: profile.phone ?? "",
    locations,
    dateOfBirth: profile.dateOfBirth ?? "",
    bloodType: profile.bloodType ?? "",
    diseases: profile.diseases ?? [],
    allergies: profile.allergies ?? [],
    currentMedications: profile.currentMedications ?? [],
    medicalHistory: profile.medicalHistory ?? "",
    paymentMethods: profile.paymentMethods ?? [],
    emergencyContact: profile.emergencyContact ?? { name: "", relationship: "", phone: "" },
  };
}

function formToProfile(form: FormState, userId: string): PatientProfile {
  const cleanedLocations: PatientLocation[] = form.locations
    .map((loc) => ({
      id: loc.id || newLocationId(),
      label: loc.label.trim() || "Home",
      address: loc.address.trim(),
      isDefault: Boolean(loc.isDefault),
    }))
    .filter((loc) => loc.address.length > 0);

  if (cleanedLocations.length > 0 && !cleanedLocations.some((l) => l.isDefault)) {
    cleanedLocations[0].isDefault = true;
  }

  return {
    userId,
    phone: form.phone.trim(),
    defaultLocation: "",
    locations: cleanedLocations,
    dateOfBirth: form.dateOfBirth || undefined,
    bloodType: form.bloodType || undefined,
    diseases: form.diseases,
    allergies: form.allergies,
    currentMedications: form.currentMedications,
    medicalHistory: form.medicalHistory.trim(),
    paymentMethods: form.paymentMethods,
    emergencyContact:
      form.emergencyContact.name.trim() ||
      form.emergencyContact.phone.trim() ||
      form.emergencyContact.relationship.trim()
        ? {
            name: form.emergencyContact.name.trim(),
            relationship: form.emergencyContact.relationship.trim(),
            phone: form.emergencyContact.phone.trim(),
          }
        : undefined,
  };
}

function isPersonalComplete(form: FormState): boolean {
  return form.phone.trim().length > 0;
}
function isLocationsComplete(form: FormState): boolean {
  return form.locations.some((l) => l.address.trim().length > 0);
}
function isEmergencyComplete(form: FormState): boolean {
  return (
    form.emergencyContact.name.trim().length > 0 &&
    form.emergencyContact.phone.trim().length > 0
  );
}

function TagInput({
  label,
  placeholder,
  values,
  onChange,
  accent = "sky",
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  accent?: "sky" | "rose" | "violet";
}) {
  const t = useTranslations("patient.profile.editor.tag");
  const [draft, setDraft] = useState("");

  const accentClasses = {
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  }[accent];

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          dir="auto"
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-2xl bg-slate-100 px-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
        >
          <Plus className="h-4 w-4" /> {t("add")}
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${accentClasses}`}
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/60"
                aria-label={t("removeAria", { value })}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LocationsEditor({
  locations,
  onChange,
}: {
  locations: PatientLocation[];
  onChange: (next: PatientLocation[]) => void;
}) {
  const t = useTranslations("patient.profile.editor.locations");

  function update(index: number, patch: Partial<PatientLocation>) {
    onChange(locations.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function remove(index: number) {
    const next = locations.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((l) => l.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    onChange(next);
  }

  function add() {
    const isFirst = locations.length === 0;
    onChange([
      ...locations,
      { id: newLocationId(), label: "Home", address: "", isDefault: isFirst },
    ]);
  }

  function makeDefault(index: number) {
    onChange(locations.map((loc, i) => ({ ...loc, isDefault: i === index })));
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Home className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-600">{t("noAddressesTitle")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("noAddressesBody")}</p>
        <button
          type="button"
          onClick={add}
          className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> {t("addAddress")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.map((loc, index) => (
        <div
          key={loc.id || index}
          className={`rounded-2xl border p-4 transition ${
            loc.isDefault ? "border-sky-200 bg-sky-50/40" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">{t("label")}</label>
                  <input
                    value={loc.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder={t("labelPlaceholder")}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    {t("address")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={loc.address}
                    onChange={(e) => update(index, { address: e.target.value })}
                    placeholder={t("addressPlaceholder")}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {loc.isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 font-bold text-sky-700">
                    <CheckCircle2 className="h-3 w-3" /> {t("defaultAddress")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeDefault(index)}
                    className="font-bold text-slate-500 hover:text-sky-700"
                  >
                    {t("setDefault")}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label={t("removeLabel")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:border-sky-300 hover:text-sky-700"
      >
        <Plus className="h-4 w-4" /> {t("addAnother")}
      </button>
    </div>
  );
}

function SectionTabButton({
  active,
  complete,
  onClick,
  icon: Icon,
  label,
  completeLabel,
  incompleteLabel,
}: {
  active: boolean;
  complete: boolean;
  onClick: () => void;
  icon: typeof UserCircle;
  label: string;
  completeLabel: string;
  incompleteLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${
        active
          ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={`h-2 w-2 rounded-full ${
          complete ? "bg-emerald-500" : "bg-amber-400"
        }`}
        aria-label={complete ? completeLabel : incompleteLabel}
      />
    </button>
  );
}

export default function PatientProfileEditor({ userId }: { userId: string }) {
  const { appUser } = useAuth();
  const t = useTranslations("patient.profile.editor");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [activeSection, setActiveSection] = useState<SectionId>("personal");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const profile = await getPatientProfile(userId);
        if (!active) return;
        if (profile) {
          setSavedProfile(profile);
          setForm(profileToForm(profile));
        } else {
          setIsEditing(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [userId]);

  const missingLabels = getMissingFieldLabels(savedProfile);
  const completion = computeProfileCompleted(savedProfile);

  function togglePayment(method: string) {
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const profile = formToProfile(form, userId);
      const saved = await savePatientProfile(profile);
      setSavedProfile(saved);
      setForm(profileToForm(saved));
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden flex items-center p-6 gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-100 text-3xl font-extrabold text-sky-700 ring-4 ring-slate-50">
            {appUser?.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">{appUser?.name}</h2>
            <p className="text-slate-500 font-medium">{appUser?.email}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="hidden sm:flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100 transition"
          >
            <Edit2 className="h-4 w-4" /> {t("editProfile")}
          </button>
        </div>

        <div
          className={`rounded-3xl p-5 shadow-sm border ${
            completion
              ? "border-emerald-100 bg-emerald-50"
              : "border-amber-100 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {completion ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div className="flex-1">
              <p className={`font-bold ${completion ? "text-emerald-800" : "text-amber-800"}`}>
                {completion ? t("completeTitle") : t("incompleteTitle")}
              </p>
              {completion ? (
                <p className="mt-1 text-sm text-emerald-700">{t("completeBody")}</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-amber-700">{t("incompleteIntro")}</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {missingLabels.map((label) => (
                      <li key={label} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${
                  completion
                    ? "text-emerald-700 hover:text-emerald-800"
                    : "text-amber-700 hover:text-amber-800"
                }`}
              >
                {completion ? t("reviewProfile") : t("completeNow")}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {savedProfile && (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <MapPin className="h-4 w-4 text-sky-600" /> {t("savedAddresses")}
              </h3>
              <button
                onClick={() => {
                  setActiveSection("locations");
                  setIsEditing(true);
                }}
                className="text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                {t("manage")}
              </button>
            </div>
            {getPatientLocations(savedProfile).length === 0 ? (
              <p className="text-sm text-slate-500">{t("noAddressesYet")}</p>
            ) : (
              <ul className="space-y-2">
                {getPatientLocations(savedProfile).map((loc) => (
                  <li
                    key={loc.id}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {loc.label}
                        {loc.isDefault && (
                          <span className="ms-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                            {t("defaultBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{loc.address}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-3xl bg-white shadow-sm overflow-hidden divide-y divide-slate-50">
          {[
            { id: "account", labelKey: "account", icon: UserCircle, color: "text-blue-500", bg: "bg-blue-50", onClick: () => { setActiveSection("personal"); setIsEditing(true); } },
            { id: "medical", labelKey: "medical", icon: Activity, color: "text-rose-500", bg: "bg-rose-50", onClick: () => { setActiveSection("medical"); setIsEditing(true); } },
            { id: "bookings", labelKey: "bookings", icon: CalendarClock, color: "text-emerald-500", bg: "bg-emerald-50", href: "/patient/appointments" },
            { id: "payment", labelKey: "payment", icon: CreditCard, color: "text-violet-500", bg: "bg-violet-50", onClick: () => { setActiveSection("payment"); setIsEditing(true); } },
            { id: "reviews", labelKey: "reviews", icon: Star, color: "text-amber-500", bg: "bg-amber-50", href: "#" },
            { id: "settings", labelKey: "settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-100", href: "#" },
            { id: "support", labelKey: "support", icon: HelpCircle, color: "text-sky-500", bg: "bg-sky-50", href: "#" },
          ].map((item) => {
            const content = (
              <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 text-lg group-hover:text-sky-700 transition">{t(`menu.${item.labelKey}`)}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-sky-600 transition group-hover:translate-x-1" />
              </div>
            );

            if (item.href) {
              return <Link key={item.id} href={item.href} className="block">{content}</Link>;
            }

            return (
              <div key={item.id} onClick={item.onClick}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const previewProfile: PatientProfile = formToProfile(form, userId);
  const previewMissing = getMissingFieldLabels(previewProfile);
  const previewComplete = previewMissing.length === 0;

  const sectionComplete: Record<SectionId, boolean> = {
    personal: isPersonalComplete(form),
    locations: isLocationsComplete(form),
    medical: true,
    emergency: isEmergencyComplete(form),
    payment: true,
  };

  const sections: { id: SectionId; tabKey: string; icon: typeof UserCircle }[] = [
    { id: "personal", tabKey: "personal", icon: UserCircle },
    { id: "locations", tabKey: "locations", icon: MapPin },
    { id: "medical", tabKey: "medical", icon: Pill },
    { id: "emergency", tabKey: "emergency", icon: ShieldAlert },
    { id: "payment", tabKey: "payment", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">{t("header")}</h2>
            <p className="text-slate-500">{t("requiredHint")}</p>
          </div>
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold sm:max-w-xs ${
              previewComplete
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-amber-100 bg-amber-50 text-amber-800"
            }`}
          >
            {previewComplete ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("previewComplete")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("previewRemaining", { n: previewMissing.length })}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto pb-1">
          {sections.map((s) => (
            <SectionTabButton
              key={s.id}
              active={activeSection === s.id}
              complete={sectionComplete[s.id]}
              onClick={() => setActiveSection(s.id)}
              icon={s.icon}
              label={t(`tabs.${s.tabKey}`)}
              completeLabel={t("tabState.complete")}
              incompleteLabel={t("tabState.incomplete")}
            />
          ))}
        </div>

        <form className="space-y-8" onSubmit={onSubmit}>
          {activeSection === "personal" && (
            <section className="animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
                  <Phone className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t("personal.title")}</h3>
                  <p className="text-xs text-slate-500">{t("personal.subtitle")}</p>
                </div>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t("personal.phone")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                    placeholder={t("personal.phonePlaceholder")}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t("personal.dob")}</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t("personal.bloodType")}</label>
                  <select
                    value={form.bloodType}
                    onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt || "unset"} value={bt}>
                        {bt || t("personal.preferNotToSay")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeSection === "locations" && (
            <section className="animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
                  <MapPin className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t("locations.title")}</h3>
                  <p className="text-xs text-slate-500">{t("locations.subtitle")}</p>
                </div>
              </header>
              <LocationsEditor
                locations={form.locations}
                onChange={(locations) => setForm({ ...form, locations })}
              />
            </section>
          )}

          {activeSection === "medical" && (
            <section className="animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <Pill className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t("medical.title")}</h3>
                  <p className="text-xs text-slate-500">{t("medical.subtitle")}</p>
                </div>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <TagInput
                  label={t("medical.conditions")}
                  placeholder={t("medical.conditionsPlaceholder")}
                  values={form.diseases}
                  onChange={(diseases) => setForm({ ...form, diseases })}
                  accent="violet"
                />
                <TagInput
                  label={t("medical.allergies")}
                  placeholder={t("medical.allergiesPlaceholder")}
                  values={form.allergies}
                  onChange={(allergies) => setForm({ ...form, allergies })}
                  accent="rose"
                />
                <TagInput
                  label={t("medical.medications")}
                  placeholder={t("medical.medicationsPlaceholder")}
                  values={form.currentMedications}
                  onChange={(currentMedications) => setForm({ ...form, currentMedications })}
                  accent="sky"
                />
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t("medical.notes")}</label>
                  <textarea
                    value={form.medicalHistory}
                    onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                    dir="auto"
                    className="min-h-[112px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                    placeholder={t("medical.notesPlaceholder")}
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "emergency" && (
            <section className="animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t("emergency.title")}</h3>
                  <p className="text-xs text-slate-500">{t("emergency.subtitle")}</p>
                </div>
              </header>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t("emergency.name")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    dir="auto"
                    value={form.emergencyContact.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergencyContact: { ...form.emergencyContact, name: e.target.value },
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                    placeholder={t("emergency.namePlaceholder")}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t("emergency.relationship")}</label>
                  <input
                    value={form.emergencyContact.relationship}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergencyContact: { ...form.emergencyContact, relationship: e.target.value },
                      })
                    }
                    dir="auto"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                    placeholder={t("emergency.relationshipPlaceholder")}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {t("emergency.phone")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    dir="ltr"
                    value={form.emergencyContact.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergencyContact: { ...form.emergencyContact, phone: e.target.value },
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                    placeholder={t("emergency.phonePlaceholder")}
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "payment" && (
            <section className="animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t("payment.title")}</h3>
                  <p className="text-xs text-slate-500">{t("payment.subtitle")}</p>
                </div>
              </header>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "cash", labelKey: "cash" as const },
                  { id: "bank", labelKey: "bank" as const },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 px-6 py-3 text-sm font-bold transition-all ${
                      form.paymentMethods.includes(option.id)
                        ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.paymentMethods.includes(option.id)}
                      onChange={() => togglePayment(option.id)}
                    />
                    {t(`payment.${option.labelKey}`)}
                  </label>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">{t("sectionStatus")}</span>
              {sections.map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                    sectionComplete[s.id] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      sectionComplete[s.id] ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  {t(`tabs.${s.tabKey}`)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3">
              {savedProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(profileToForm(savedProfile));
                    setIsEditing(false);
                  }}
                  className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  {t("cancel")}
                </button>
              )}
              <PatientButton
                type="submit"
                loading={saving}
                className="px-8 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-base shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)]"
              >
                {saving ? t("saving") : t("save")}
              </PatientButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
