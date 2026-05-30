"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  FileText,
  UserCircle,
  Stethoscope,
  PlusCircle,
  CalendarDays,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
} from "lucide-react";
import type {
  NurseCertificate,
  NurseDay,
  NurseProfile,
  NurseServiceItem,
} from "@/lib/types";
import { getNurseProfileByUserId, saveNurseProfile } from "@/services/nurseService";
import { uploadFile } from "@/services/storageService";
import ImageUploadField from "@/components/common/ImageUploadField";
import { weekOrderFor } from "@/i18n/week";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";

type SectionId = "identity" | "services" | "additional" | "availability" | "credentials";

// Canonical specialization keys. Stored as the localized label the nurse
// picks; the datalist surfaces the controlled vocabulary while still
// accepting free-text entries for backward compatibility with existing
// profiles (per Phase 4 decision).
const SPEC_KEYS = [
  "icu",
  "elderlyCare",
  "pediatric",
  "postOp",
  "woundCare",
  "palliative",
  "homeHealth",
  "midwifery",
  "rehabilitation",
  "general",
] as const;

const SECTIONS: { id: SectionId; icon: typeof UserCircle }[] = [
  { id: "identity",     icon: UserCircle },
  { id: "services",     icon: Stethoscope },
  { id: "additional",   icon: PlusCircle },
  { id: "availability", icon: CalendarDays },
  { id: "credentials",  icon: BookOpen },
];

function normalizeAdditional(raw: unknown): NurseServiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return { name: item, price: 0 };
      if (item && typeof item === "object" && "name" in item) {
        const obj = item as { name?: unknown; price?: unknown };
        return {
          name: String(obj.name ?? ""),
          price: Number(obj.price ?? 0),
        };
      }
      return null;
    })
    .filter((item): item is NurseServiceItem => item !== null && item.name.length > 0);
}

export default function NurseProfileForm({
  userId,
  fullName,
  onSaved,
}: {
  userId: string;
  fullName: string;
  onSaved?: () => void;
}) {
  const t = useTranslations("nurse.profileForm");
  const tSection = useTranslations("nurse.profileForm.sections");
  const tIdentity = useTranslations("nurse.profileForm.identity");
  const tServices = useTranslations("nurse.profileForm.services");
  const tAdditional = useTranslations("nurse.profileForm.additional");
  const tAvail = useTranslations("nurse.profileForm.availability");
  const tCreds = useTranslations("nurse.profileForm.credentials");
  const tDays = useTranslations("nurse.days");
  const tShifts = useTranslations("nurse.shifts");
  const tSpec = useTranslations("nurse.specializations");
  const tErr = useTranslations("nurse.errors");
  const locale = useLocale() as Locale;
  const [activeSection, setActiveSection] = useState<SectionId>("identity");

  // Identity & Bio
  const [profileImage, setProfileImage] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [languages, setLanguages] = useState("");

  // Services & Pricing
  const [specialization, setSpecialization] = useState("");
  const [services, setServices] = useState<NurseServiceItem[]>([{ name: "", price: 0 }]);
  const [pricePerHour, setPricePerHour] = useState<number | undefined>(undefined);
  const [experienceYears, setExperienceYears] = useState(0);
  const [skills, setSkills] = useState("");

  // Additional Services
  const [additionalServices, setAdditionalServices] = useState<NurseServiceItem[]>([]);

  // Availability & Leave
  const orderedDays = weekOrderFor(locale);
  const [availableDays, setAvailableDays] = useState<NurseDay[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [acceptsOvernight, setAcceptsOvernight] = useState(false);
  const [onLeave, setOnLeave] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");

  // Credentials & Gallery
  const [certificates, setCertificates] = useState<NurseCertificate[]>([]);
  const [carePhilosophy, setCarePhilosophy] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const profile = await getNurseProfileByUserId(userId);
      if (!active || !profile) {
        setLoading(false);
        return;
      }

      setProfileImage(profile.profileImage ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setGender(profile.gender ?? "");
      setLanguages((profile.languages ?? []).join(", "));

      setSpecialization(profile.specialization ?? "");
      setServices(profile.services?.length ? profile.services : [{ name: "", price: 0 }]);
      setPricePerHour(profile.pricePerHour);
      setExperienceYears(profile.experienceYears ?? 0);
      setSkills((profile.skills ?? []).join(", "));

      setAdditionalServices(normalizeAdditional(profile.additionalServices));

      setAvailableDays(profile.availableDays?.length ? profile.availableDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setAvailableShifts(profile.availableShifts ?? []);
      setAcceptsOvernight(Boolean(profile.acceptsOvernight));
      setOnLeave(Boolean(profile.onLeave));
      setLeaveStartDate(profile.leaveStartDate ?? "");
      setLeaveEndDate(profile.leaveEndDate ?? "");

      setCertificates(profile.certificates ?? []);
      setCarePhilosophy(profile.carePhilosophy ?? "");
      setGallery(profile.gallery ?? []);

      setLoading(false);
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  function updateService(index: number, key: "name" | "price", value: string) {
    setServices((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item,
      ),
    );
  }

  function updateAdditional(index: number, key: "name" | "price", value: string) {
    setAdditionalServices((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item,
      ),
    );
  }

  function toggleDay(day: NurseDay) {
    setAvailableDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function toggleShift(shift: string) {
    setAvailableShifts((current) => (current.includes(shift) ? current.filter((s) => s !== shift) : [...current, shift]));
  }

  async function handleCertificateUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCertError(null);
    setUploadingCert(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const { url } = await uploadFile(file, { scope: "nurse-certificate" });
          const cert: NurseCertificate = {
            id:
              typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            url,
            uploadedAt: new Date().toISOString(),
          };
          return cert;
        }),
      );
      setCertificates([...certificates, ...uploaded]);
    } catch (err) {
      console.error("[NurseProfileForm] certificate upload failed", err);
      setCertError(err instanceof Error ? err.message : tErr("uploadFailed"));
    } finally {
      setUploadingCert(false);
      if (certInputRef.current) certInputRef.current.value = "";
    }
  }

  const sectionComplete: Record<SectionId, boolean> = {
    identity: bio.trim().length > 0 && location.trim().length > 0 && Boolean(gender),
    services:
      specialization.trim().length > 0 &&
      services.some((s) => s.name.trim().length > 0 && s.price >= 0),
    additional: true,
    availability: availableDays.length > 0 && availableShifts.length > 0,
    credentials: true,
  };

  const allComplete = Object.values(sectionComplete).every(Boolean);
  const incompleteCount = Object.values(sectionComplete).filter((v) => !v).length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSavedFlash(false);

    const payload: Omit<NurseProfile, "rating" | "reviewCount"> = {
      userId,
      fullName,
      profileImage,
      bio,
      location: location.trim() || undefined,
      gender: gender ? (gender as "male" | "female" | "other") : undefined,
      specialization,
      services: services.filter((item) => item.name.trim().length > 0),
      pricePerHour: pricePerHour || undefined,
      experienceYears,
      skills: skills.split(",").map((item) => item.trim()).filter(Boolean),
      languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      additionalServices: additionalServices.filter((item) => item.name.trim().length > 0),
      availableDays,
      availableShifts,
      availableHours: { from: "00:00", to: "23:59" },
      acceptsOvernight,
      onLeave,
      leaveStartDate: onLeave && leaveStartDate ? leaveStartDate : undefined,
      leaveEndDate: onLeave && leaveEndDate ? leaveEndDate : undefined,
      certificates,
      carePhilosophy: carePhilosophy.trim() || undefined,
      gallery,
    };

    await saveNurseProfile(payload);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
    onSaved?.();
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("savingButton")}</div>;
  }

  const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const nextSection = SECTIONS[currentIndex + 1];

  const shiftOptions = [
    { id: "A", labelKey: "morningShort" as const },
    { id: "B", labelKey: "afternoonShort" as const },
    { id: "C", labelKey: "nightShort" as const },
  ];

  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">{t("hubTitle")}</h2>
          <p className="text-sm text-slate-500">
            {t.rich("hubSubtitle", {
              bold: (chunks) => <span className="font-semibold">{chunks}</span>,
            })}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold ${
            allComplete
              ? "border-emerald-100 bg-emerald-50 text-emerald-800"
              : "border-amber-100 bg-amber-50 text-amber-800"
          }`}
        >
          {allComplete ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {t("allComplete")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t("sectionsIncomplete", { n: incompleteCount })}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;
          const complete = sectionComplete[section.id];
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tSection(section.id)}</span>
              <span className={`h-2 w-2 rounded-full ${complete ? "bg-emerald-500" : "bg-amber-400"}`} />
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit}>
        <div className="min-h-[420px]">
          {/* IDENTITY & BIO */}
          {activeSection === "identity" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("fullName")}</label>
                  <input value={fullName} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" />
                </div>
                <ImageUploadField
                  scope="nurse-profile"
                  label={tIdentity("profilePhoto")}
                  value={profileImage}
                  onChange={setProfileImage}
                  helperText={tIdentity("photoHelper")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("locationLabel")}</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder={tIdentity("locationPlaceholder")}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("genderLabel")}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "male" | "female" | "other" | "")}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" disabled>{tIdentity("selectGender")}</option>
                    <option value="female">{tIdentity("female")}</option>
                    <option value="male">{tIdentity("male")}</option>
                    <option value="other">{tIdentity("other")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("bioLabel")}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                  dir="auto"
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder={tIdentity("bioPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("languagesLabel")}</label>
                <input
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder={tIdentity("languagesPlaceholder")}
                  dir="auto"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* SERVICES & PRICING */}
          {activeSection === "services" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("specializationLabel")}</label>
                  <input
                    list="nurse-spec-suggestions"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                    placeholder={tServices("specializationPlaceholder")}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* Localized suggestion vocabulary — free-text entries still accepted */}
                  <datalist id="nurse-spec-suggestions">
                    {SPEC_KEYS.map((key) => (
                      <option key={key} value={tSpec(key)} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-slate-400">{tServices("specializationListLabel")}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("experienceLabel")}</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    required
                    min="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("hourlyRateLabel")}</label>
                <input
                  type="number"
                  value={pricePerHour ?? ""}
                  onChange={(e) => setPricePerHour(e.target.value ? Number(e.target.value) : undefined)}
                  min="0"
                  placeholder={tServices("hourlyRatePlaceholder")}
                  className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{tServices("servicesOffered")}</span>
                  <button
                    type="button"
                    onClick={() => setServices([...services, { name: "", price: 0 }])}
                    className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="h-4 w-4" /> {tServices("addService")}
                  </button>
                </div>
                <div className="space-y-2">
                  {services.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateService(index, "name", e.target.value)}
                        placeholder={tServices("serviceNamePlaceholder")}
                        dir="auto"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateService(index, "price", e.target.value)}
                        placeholder={tServices("pricePlaceholder")}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setServices(services.filter((_, i) => i !== index))}
                        className="rounded-lg bg-red-50 px-3 text-red-600 hover:bg-red-100 text-sm font-bold"
                        aria-label={tServices("removeServiceLabel")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("skillsLabel")}</label>
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder={tServices("skillsPlaceholder")}
                  dir="auto"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* ADDITIONAL SERVICES */}
          {activeSection === "additional" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-800">{tAdditional("intro.title")}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tAdditional("intro.body")}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{tAdditional("yourAddons")}</span>
                  <button
                    type="button"
                    onClick={() => setAdditionalServices([...additionalServices, { name: "", price: 0 }])}
                    className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="h-4 w-4" /> {tAdditional("addAddon")}
                  </button>
                </div>
                {additionalServices.length === 0 ? (
                  <p className="text-sm italic text-slate-500">{tAdditional("noAddons")}</p>
                ) : (
                  <div className="space-y-2">
                    {additionalServices.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          value={item.name}
                          onChange={(e) => updateAdditional(index, "name", e.target.value)}
                          placeholder={tAdditional("addonNamePlaceholder")}
                          dir="auto"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateAdditional(index, "price", e.target.value)}
                          placeholder={tServices("pricePlaceholder")}
                          className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setAdditionalServices(additionalServices.filter((_, i) => i !== index))}
                          className="rounded-lg bg-red-50 px-3 text-red-600 hover:bg-red-100 text-sm font-bold"
                          aria-label={tAdditional("removeAddonLabel")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AVAILABILITY & LEAVE */}
          {activeSection === "availability" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{tAvail("shiftAvailability")}</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {shiftOptions.map((s) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm font-semibold transition-all ${
                        availableShifts.includes(s.id)
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={availableShifts.includes(s.id)}
                        onChange={() => toggleShift(s.id)}
                        className="sr-only"
                      />
                      {tShifts(s.labelKey)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{tAvail("daysAvailable")}</label>
                <div className="flex flex-wrap gap-2">
                  {orderedDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                        availableDays.includes(day) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tDays(day)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={acceptsOvernight}
                  onChange={(e) => setAcceptsOvernight(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <span className="font-semibold text-slate-700">{tAvail("acceptOvernight")}</span>
              </label>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={onLeave}
                    onChange={(e) => setOnLeave(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                  />
                  <span className="font-semibold text-amber-800">{tAvail("onLeaveLabel")}</span>
                </label>
                {onLeave && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-amber-700">{tAvail("leaveStarts")}</label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-amber-700">{tAvail("leaveEnds")}</label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-xs text-amber-700 sm:col-span-2">{tAvail("leaveHelper")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CREDENTIALS & GALLERY */}
          {activeSection === "credentials" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-6">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-600" />
                  <p className="text-sm font-bold text-sky-800">{tCreds("title")}</p>
                </div>
                <p className="mb-3 text-xs text-sky-700/80">{tCreds("intro")}</p>
                <button
                  type="button"
                  onClick={() => certInputRef.current?.click()}
                  disabled={uploadingCert}
                  className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {uploadingCert ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {tCreds("uploadingButton")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> {tCreds("uploadButton")}
                    </>
                  )}
                </button>
                <input
                  ref={certInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={(e) => void handleCertificateUpload(e.target.files)}
                />
                {certError && (
                  <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {certError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700">{tCreds("uploadedHeader", { n: certificates.length })}</h3>
                {certificates.length === 0 ? (
                  <p className="text-sm italic text-slate-500">{tCreds("noCerts")}</p>
                ) : (
                  certificates.map((cert, i) => (
                    <div key={cert.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-3 text-slate-700">
                        <FileText className="h-5 w-5 text-emerald-500" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{cert.name}</p>
                          {cert.url ? (
                            <a
                              href={cert.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-xs font-semibold text-sky-600 hover:underline"
                            >
                              {tCreds("viewFile")}
                            </a>
                          ) : (
                            <p className="text-xs italic text-amber-700">{tCreds("legacyEntry")}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCertificates(certificates.filter((_, idx) => idx !== i))}
                        className="text-sm font-semibold text-red-500 hover:underline"
                      >
                        {tCreds("removeLabel")}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tCreds("carePhilosophyLabel")}</label>
                <textarea
                  value={carePhilosophy}
                  onChange={(e) => setCarePhilosophy(e.target.value)}
                  placeholder={tCreds("carePhilosophyPlaceholder")}
                  dir="auto"
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <ImageUploadField
                mode="multi"
                scope="nurse-gallery"
                label={tCreds("galleryLabel")}
                value={gallery}
                onChange={setGallery}
                helperText={tCreds("galleryHelper")}
                maxFiles={8}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">{t("sectionStatus")}</span>
            {SECTIONS.map((s) => (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                  sectionComplete[s.id] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sectionComplete[s.id] ? "bg-emerald-500" : "bg-amber-400"}`} />
                {tSection(s.id)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {nextSection && (
              <button
                type="button"
                onClick={() => setActiveSection(nextSection.id)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                {t("continueTo", { section: tSection(nextSection.id) })}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? t("savingButton") : savedFlash ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> {t("savedButton")}
                </span>
              ) : (
                t("saveButton")
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
