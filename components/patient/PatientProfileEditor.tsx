"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { EmergencyContact, PatientProfile } from "@/lib/types";
import {
  computeProfileCompleted,
  getMissingFieldLabels,
  getPatientProfile,
  savePatientProfile,
} from "@/services/patientService";
import { useAuth } from "@/hooks/useAuth";

interface FormState {
  phone: string;
  defaultLocation: string;
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
  defaultLocation: "",
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

function profileToForm(profile: PatientProfile): FormState {
  return {
    phone: profile.phone ?? "",
    defaultLocation: profile.defaultLocation ?? "",
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
  return {
    userId,
    phone: form.phone.trim(),
    defaultLocation: form.defaultLocation.trim(),
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
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-2xl bg-slate-100 px-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
        >
          <Plus className="h-4 w-4" /> Add
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
                aria-label={`Remove ${value}`}
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

export default function PatientProfileEditor({ userId }: { userId: string }) {
  const { appUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

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
        {/* Profile Header */}
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
            <Edit2 className="h-4 w-4" /> Edit Profile
          </button>
        </div>

        {/* Completion status */}
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
                {completion ? "Profile complete" : "Profile incomplete — booking is locked"}
              </p>
              {completion ? (
                <p className="mt-1 text-sm text-emerald-700">
                  All required fields are filled. You can book nurses freely.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-amber-700">
                    Add the following to start booking:
                  </p>
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
                {completion ? "Review profile" : "Complete now"}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Navigation List */}
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden divide-y divide-slate-50">
          {[
            { id: "account", label: "Account Information", icon: UserCircle, color: "text-blue-500", bg: "bg-blue-50", onClick: () => setIsEditing(true) },
            { id: "medical", label: "Medical Information", icon: Activity, color: "text-rose-500", bg: "bg-rose-50", onClick: () => setIsEditing(true) },
            { id: "bookings", label: "My Bookings", icon: CalendarClock, color: "text-emerald-500", bg: "bg-emerald-50", href: "/patient/appointments" },
            { id: "payment", label: "Payment Methods", icon: CreditCard, color: "text-violet-500", bg: "bg-violet-50", onClick: () => setIsEditing(true) },
            { id: "reviews", label: "My Reviews", icon: Star, color: "text-amber-500", bg: "bg-amber-50", href: "#" },
            { id: "settings", label: "Settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-100", href: "#" },
            { id: "support", label: "Help & Support", icon: HelpCircle, color: "text-sky-500", bg: "bg-sky-50", href: "#" },
          ].map((item) => {
            const content = (
              <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 text-lg group-hover:text-sky-700 transition">{item.label}</span>
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

  // Live completion preview for the edit form: compute on the form draft so the
  // patient sees progress as they fill fields, not just after saving.
  const previewProfile: PatientProfile = formToProfile(form, userId);
  const previewMissing = getMissingFieldLabels(previewProfile);
  const previewComplete = previewMissing.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Edit Profile</h2>
            <p className="text-slate-500">Required fields are marked with an asterisk.</p>
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
                Profile complete — ready to save
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {previewMissing.length} required field{previewMissing.length === 1 ? "" : "s"} remaining
              </span>
            )}
          </div>
        </div>

        <form className="space-y-8" onSubmit={onSubmit}>
          {/* Contact section */}
          <section>
            <header className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
                <Phone className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Contact</h3>
                <p className="text-xs text-slate-500">How nurses reach you and where they visit.</p>
              </div>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Default Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.defaultLocation}
                  onChange={(e) => setForm({ ...form, defaultLocation: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                  placeholder="Street, building, apartment"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Blood Type</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt || "unset"} value={bt}>
                      {bt || "Prefer not to say"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Emergency contact section */}
          <section>
            <header className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Emergency Contact</h3>
                <p className="text-xs text-slate-500">
                  Who we contact if something goes wrong during a visit.
                </p>
              </div>
            </header>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={form.emergencyContact.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, name: e.target.value },
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Relationship</label>
                <input
                  value={form.emergencyContact.relationship}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, relationship: e.target.value },
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                  placeholder="Spouse, parent, sibling…"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.emergencyContact.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, phone: e.target.value },
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>
          </section>

          {/* Medical section */}
          <section>
            <header className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <Pill className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Medical Information</h3>
                <p className="text-xs text-slate-500">
                  Helps nurses provide safe, appropriate care. Optional but recommended.
                </p>
              </div>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <TagInput
                label="Chronic Conditions"
                placeholder="e.g. Diabetes, Hypertension"
                values={form.diseases}
                onChange={(diseases) => setForm({ ...form, diseases })}
                accent="violet"
              />
              <TagInput
                label="Allergies"
                placeholder="e.g. Penicillin, Latex"
                values={form.allergies}
                onChange={(allergies) => setForm({ ...form, allergies })}
                accent="rose"
              />
              <TagInput
                label="Current Medications"
                placeholder="e.g. Metformin 500mg"
                values={form.currentMedications}
                onChange={(currentMedications) => setForm({ ...form, currentMedications })}
                accent="sky"
              />
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Additional Notes</label>
                <textarea
                  value={form.medicalHistory}
                  onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                  className="min-h-[112px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                  placeholder="Anything else nurses should know — surgeries, family history, mobility limits…"
                />
              </div>
            </div>
          </section>

          {/* Payment section */}
          <section>
            <header className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Payment</h3>
                <p className="text-xs text-slate-500">How you prefer to pay for visits.</p>
              </div>
            </header>
            <div className="flex flex-wrap gap-3">
              {[
                { id: "cash", label: "Cash" },
                { id: "bank", label: "Bank Transfer" },
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
                  {option.label}
                </label>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-8">
            {savedProfile && (
              <button
                type="button"
                onClick={() => {
                  setForm(profileToForm(savedProfile));
                  setIsEditing(false);
                }}
                className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            )}
            <PatientButton
              type="submit"
              loading={saving}
              className="px-8 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-base shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)]"
            >
              {saving ? "Saving..." : "Save Profile"}
            </PatientButton>
          </div>
        </form>
      </div>
    </div>
  );
}
