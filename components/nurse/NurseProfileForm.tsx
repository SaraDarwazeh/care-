"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  ProviderKind,
} from "@/lib/types";
import {
  getNurseProfileByUserId,
  saveNurseProfile,
  saveNurseProfileDraft,
  submitNurseProfileForReview,
} from "@/services/nurseService";
import { updateUserDisplayName } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/services/storageService";
import ImageUploadField from "@/components/common/ImageUploadField";
import { weekOrderFor } from "@/i18n/week";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import {
  SUPPORT_SERVICES,
  getCatalogServicesForProvider,
  type CatalogService,
} from "@/lib/serviceTaxonomy";
import { tLocalized } from "@/lib/i18nContent";
import { NURSE_SKILLS, resolveSkillId, findNurseSkill } from "@/lib/nurseSkills";
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  type PricingConfig,
} from "@/services/pricingConfigService";
import {
  findHourlyRange,
  findServiceRange,
  findShiftRange,
  PricingValidationException,
  validateProfilePricing,
  type PricingValidationError,
} from "@/lib/validatePricing";

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

// Match a legacy free-text service name back onto a catalog entry so we
// can attach a serviceId — without that key the admin range can't be
// looked up. Compares EN label, AR label, and the id itself
// case-insensitively. Returns undefined when there's no match.
function resolveServiceIdFromName(
  name: string,
  catalog: CatalogService[],
): string | undefined {
  const lower = name.trim().toLowerCase();
  if (!lower) return undefined;
  const match = catalog.find(
    (s) =>
      s.label.en.toLowerCase() === lower ||
      (s.label.ar && s.label.ar.toLowerCase() === lower) ||
      s.id === lower,
  );
  return match?.id;
}

function backfillServiceIds(
  items: NurseServiceItem[],
  catalog: CatalogService[],
): NurseServiceItem[] {
  return items.map((item) => {
    if (item.serviceId) return item;
    const matched = resolveServiceIdFromName(item.name, catalog);
    return matched ? { ...item, serviceId: matched } : item;
  });
}

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
  onSubmittedForReview,
}: {
  userId: string;
  fullName: string;
  // Fired after a non-onboarding save (already-approved nurse edits
  // their profile, or partial draft save during wizard advance).
  onSaved?: () => void;
  // Fired the first time the nurse hits the final "Submit profile for
  // review" CTA — the setup page uses this to route to
  // /pending-approval so the admin queue gets the notification.
  onSubmittedForReview?: () => void;
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
  const { appUser, refreshProfile } = useAuth();

  // Identity & Bio
  const [fullNameDraft, setFullNameDraft] = useState(fullName);
  const [profileImage, setProfileImage] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [languages, setLanguages] = useState("");

  // Services & Pricing
  const [specialization, setSpecialization] = useState("");
  const [services, setServices] = useState<NurseServiceItem[]>([{ name: "", price: 0 }]);
  const [pricePerHour, setPricePerHour] = useState<number | undefined>(undefined);
  // Per-shift prices: flat charge for picking a single shift. Each is optional;
  // a nurse who doesn't offer overnights leaves shift C empty.
  const [pricePerShiftA, setPricePerShiftA] = useState<number | undefined>(undefined);
  const [pricePerShiftB, setPricePerShiftB] = useState<number | undefined>(undefined);
  const [pricePerShiftC, setPricePerShiftC] = useState<number | undefined>(undefined);
  const [experienceYears, setExperienceYears] = useState(0);
  // Skills are stored as catalog ids (from lib/nurseSkills.ts). Legacy
  // free-text entries that don't match the catalog are kept as raw
  // strings and round-tripped untouched so older saves don't lose data.
  const [skills, setSkills] = useState<string[]>([]);

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

  // Admin-configured price ranges. Loaded once on mount; used both to
  // render allowed-range hints next to each input and to gate the save.
  const providerKind: ProviderKind = appUser?.providerKind ?? "nurse";
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [pricingErrors, setPricingErrors] = useState<Map<string, PricingValidationError>>(
    new Map(),
  );

  // Catalogs scoped to this provider kind. The dropdown shown in the
  // services + additional sections pulls from these so every entry has
  // a serviceId — that's the lookup key for the admin range.
  const serviceCatalog = useMemo<CatalogService[]>(
    () => getCatalogServicesForProvider(providerKind),
    [providerKind],
  );
  const supportCatalog = useMemo<CatalogService[]>(
    () => Array.from(SUPPORT_SERVICES),
    [],
  );

  useEffect(() => {
    void getPricingConfig()
      .then(setPricingConfig)
      .catch((err) => {
        console.warn("[NurseProfileForm] failed to load pricing config", err);
      });
  }, []);

  // Derived view: backfill serviceId on legacy entries by matching their
  // name against the catalog. We render + validate against this derived
  // shape so the lookups work even when the underlying state still
  // carries a free-text entry from before the catalog picker shipped.
  // The user picking a service from the dropdown writes the serviceId
  // back into the underlying state directly.
  const displayedServices = useMemo(
    () => backfillServiceIds(services, serviceCatalog),
    [services, serviceCatalog],
  );
  const displayedAdditionalServices = useMemo(
    () => backfillServiceIds(additionalServices, supportCatalog),
    [additionalServices, supportCatalog],
  );

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const profile = await getNurseProfileByUserId(userId);
      if (!active || !profile) {
        setLoading(false);
        return;
      }

      // Prefer the nurseProfile's persisted fullName; fall back to the
      // prop (which mirrors users/{uid}.name) for older records that
      // never wrote nurseProfile.fullName.
      setFullNameDraft(profile.fullName?.trim() || fullName);
      setProfileImage(profile.profileImage ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setGender(profile.gender ?? "");
      setLanguages((profile.languages ?? []).join(", "));

      setSpecialization(profile.specialization ?? "");
      setServices(profile.services?.length ? profile.services : [{ name: "", price: 0 }]);
      setPricePerHour(profile.pricePerHour);
      setPricePerShiftA(profile.pricePerShift?.A);
      setPricePerShiftB(profile.pricePerShift?.B);
      setPricePerShiftC(profile.pricePerShift?.C);
      setExperienceYears(profile.experienceYears ?? 0);
      // Backfill legacy free-text skills onto catalog ids when possible
      // so the saved record migrates organically on the next Save.
      setSkills(
        (profile.skills ?? []).map((raw) => resolveSkillId(raw) ?? raw),
      );

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
  }, [userId, fullName]);

  // Any edit to the services or pricing fields invalidates the cached
  // error map (indices shift on delete; values change on edit). Clearing
  // here is simpler and more correct than per-key bookkeeping — the
  // submit handler re-validates and re-populates the map on the next
  // save attempt.
  function clearPricingErrors() {
    if (pricingErrors.size > 0) setPricingErrors(new Map());
  }

  function updateService(index: number, key: "name" | "price", value: string) {
    clearPricingErrors();
    setServices((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item,
      ),
    );
  }

  function updateAdditional(index: number, key: "name" | "price", value: string) {
    clearPricingErrors();
    setAdditionalServices((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item,
      ),
    );
  }

  // Catalog-aware pickers — replace both serviceId and the display name
  // atomically so the booking-form name lookup keeps working.
  function pickServiceFromCatalog(index: number, serviceId: string) {
    clearPricingErrors();
    const match = serviceCatalog.find((s) => s.id === serviceId);
    setServices((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              serviceId: match?.id ?? "",
              name: match ? tLocalized(match.label, locale) : item.name,
            }
          : item,
      ),
    );
  }

  function pickAdditionalFromCatalog(index: number, serviceId: string) {
    clearPricingErrors();
    const match = supportCatalog.find((s) => s.id === serviceId);
    setAdditionalServices((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              serviceId: match?.id ?? "",
              name: match ? tLocalized(match.label, locale) : item.name,
            }
          : item,
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

  // Wizard mode flags. A fresh nurse (status "incomplete") sees per-
  // section Next buttons and only the credentials section exposes the
  // final "Submit profile for review" CTA. An already-approved nurse
  // editing their profile sees a regular Save button on every section
  // (save triggers the re-review flow inside saveNurseProfile).
  const isFinalSection = activeSection === "credentials";
  const isFreshOnboarding =
    appUser?.role === "nurse" &&
    (appUser.status === "incomplete" || appUser.status === "pending" || appUser.status === "pending_review");

  function buildPayload(): Omit<NurseProfile, "rating" | "reviewCount"> {
    const trimmedFullName = fullNameDraft.trim() || fullName;
    return {
      userId,
      providerKind,
      fullName: trimmedFullName,
      profileImage,
      bio,
      location: location.trim() || undefined,
      gender: gender ? (gender as "male" | "female" | "other") : undefined,
      specialization,
      services: displayedServices.filter((item) => item.name.trim().length > 0),
      pricePerHour: pricePerHour || undefined,
      pricePerShift: ((): NurseProfile["pricePerShift"] => {
        const obj: { A?: number; B?: number; C?: number } = {};
        if (pricePerShiftA && pricePerShiftA > 0) obj.A = pricePerShiftA;
        if (pricePerShiftB && pricePerShiftB > 0) obj.B = pricePerShiftB;
        if (pricePerShiftC && pricePerShiftC > 0) obj.C = pricePerShiftC;
        return Object.keys(obj).length > 0 ? obj : undefined;
      })(),
      experienceYears,
      skills,
      languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      additionalServices: displayedAdditionalServices.filter((item) => item.name.trim().length > 0),
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
  }

  // Advance to the next section. Only requires the CURRENT section to
  // be valid — earlier sections may still be empty (the nurse can go
  // back). Saves a draft in the background so reloading mid-wizard
  // doesn't lose work. Out-of-range prices block the advance with a
  // row-level error so the nurse fixes the offending input before
  // leaving the section.
  const [sectionWarning, setSectionWarning] = useState(false);

  async function onNext(): Promise<void> {
    if (!nextSection) return;
    if (!sectionComplete[activeSection]) {
      setSectionWarning(true);
      return;
    }
    setSectionWarning(false);
    setSaving(true);
    const payload = buildPayload();
    const localCheck = validateProfilePricing(payload, pricingConfig);
    if (!localCheck.valid) {
      const map = new Map<string, PricingValidationError>();
      localCheck.errors.forEach((e) => map.set(e.key, e));
      setPricingErrors(map);
      setSaving(false);
      return;
    }
    setPricingErrors(new Map());
    try {
      await saveNurseProfileDraft(payload);
    } catch (err) {
      if (err instanceof PricingValidationException) {
        const map = new Map<string, PricingValidationError>();
        err.errors.forEach((e) => map.set(e.key, e));
        setPricingErrors(map);
      } else {
        console.error("[NurseProfileForm] draft save failed", err);
      }
      setSaving(false);
      return;
    }
    setSaving(false);
    setActiveSection(nextSection.id);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSavedFlash(false);

    const payload = buildPayload();
    const trimmedFullName = payload.fullName;

    // Client-side gate: validate the prices against the admin-configured
    // ranges (fetched on mount). The same check runs server-side in
    // saveNurseProfile so a missing or stale pricingConfig here can't
    // bypass the rule — but blocking up front gives the provider precise
    // row-level feedback instead of a generic save failure.
    const localCheck = validateProfilePricing(payload, pricingConfig);
    if (!localCheck.valid) {
      const map = new Map<string, PricingValidationError>();
      localCheck.errors.forEach((e) => map.set(e.key, e));
      setPricingErrors(map);
      // Jump to the section that contains the first error so the
      // provider sees the highlighted row immediately.
      const firstScope = localCheck.errors[0]?.scope;
      if (firstScope === "additional") setActiveSection("additional");
      else if (firstScope === "service" || firstScope === "shift" || firstScope === "hourly")
        setActiveSection("services");
      setSaving(false);
      return;
    }
    setPricingErrors(new Map());

    try {
      if (isFreshOnboarding) {
        // Final submit for review. Flips users/{uid}.status from
        // incomplete to pending_review and notifies admin.
        await submitNurseProfileForReview(payload);
      } else {
        // Already-approved nurse editing — saveNurseProfile runs the
        // re-approval check internally and flips status back to
        // pending_review when significant fields changed.
        await saveNurseProfile(payload);
      }
    } catch (err) {
      // Server-side validation rejection: re-paint the row errors using
      // the structured payload the service threw.
      if (err instanceof PricingValidationException) {
        const map = new Map<string, PricingValidationError>();
        err.errors.forEach((e) => map.set(e.key, e));
        setPricingErrors(map);
        const firstScope = err.errors[0]?.scope;
        if (firstScope === "additional") setActiveSection("additional");
        else if (firstScope) setActiveSection("services");
        setSaving(false);
        return;
      }
      console.error("[NurseProfileForm] save failed", err);
      setSaving(false);
      return;
    }

    // Persist the display name back to users/{uid} + Firebase Auth so
    // the navbar, admin list, and marketplace fallback stay in sync.
    // Best-effort: a failure here doesn't roll back the profile save.
    if (trimmedFullName !== fullName) {
      try {
        await updateUserDisplayName(userId, trimmedFullName);
        await refreshProfile();
      } catch (err) {
        console.warn("[NurseProfileForm] display-name update failed", err);
      }
    }

    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
    if (isFreshOnboarding) {
      // Refresh appUser so the next render sees pending_review and
      // the setup-page redirect kicks in.
      await refreshProfile();
      onSubmittedForReview?.();
    } else {
      onSaved?.();
    }
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
    <div className="rounded-3xl border border-brand-mist bg-white p-6 shadow-sm sm:p-8">
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

      {pricingErrors.size > 0 && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">{tServices("pricingBlockedTitle")}</p>
              <p className="text-xs">
                {tServices("pricingBlockedBody", { n: pricingErrors.size })}
              </p>
            </div>
          </div>
        </div>
      )}

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
                  ? "border-brand bg-brand-soft/30 text-brand-deep shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-brand-soft hover:text-slate-700"
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
                  <input
                    value={fullNameDraft}
                    onChange={(e) => setFullNameDraft(e.target.value)}
                    required
                    dir="auto"
                    placeholder={tIdentity("fullNamePlaceholder")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                  />
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{tIdentity("genderLabel")}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "male" | "female" | "other" | "")}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
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
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("hourlyRateLabel")}</label>
                {(() => {
                  const hourlyRange = findHourlyRange(pricingConfig.hourlyRanges, providerKind);
                  const hourlyErr = pricingErrors.get("hourly");
                  return (
                    <>
                      <input
                        type="number"
                        value={pricePerHour ?? ""}
                        onChange={(e) => setPricePerHour(e.target.value ? Number(e.target.value) : undefined)}
                        min="0"
                        placeholder={tServices("hourlyRatePlaceholder")}
                        className={`w-full max-w-xs rounded-xl border px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                          hourlyErr ? "border-rose-400 text-rose-700" : "border-slate-200"
                        }`}
                      />
                      {hourlyRange ? (
                        <p
                          className={`mt-1 text-[11px] ${
                            hourlyErr ? "font-semibold text-rose-600" : "text-slate-500"
                          }`}
                        >
                          {hourlyErr
                            ? tServices(
                                hourlyErr.reason === "below_min"
                                  ? "rangeErrorBelow"
                                  : "rangeErrorAbove",
                                {
                                  min: hourlyRange.min,
                                  max: hourlyRange.max,
                                  entered: hourlyErr.entered,
                                },
                              )
                            : tServices("allowedRange", {
                                min: hourlyRange.min,
                                max: hourlyRange.max,
                              })}
                        </p>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="mb-1 text-sm font-bold text-emerald-800">{tServices("perShiftTitle")}</p>
                <p className="mb-3 text-xs text-emerald-700">{tServices("perShiftHelp")}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    { key: "A" as const, value: pricePerShiftA, setter: setPricePerShiftA, labelKey: "perShiftALabel" as const },
                    { key: "B" as const, value: pricePerShiftB, setter: setPricePerShiftB, labelKey: "perShiftBLabel" as const },
                    { key: "C" as const, value: pricePerShiftC, setter: setPricePerShiftC, labelKey: "perShiftCLabel" as const },
                  ]).map(({ key, value, setter, labelKey }) => {
                    const range = findShiftRange(pricingConfig.shiftRanges, key, providerKind);
                    const shiftErr = pricingErrors.get(`shift:${key}`);
                    return (
                      <div key={key}>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">{tServices(labelKey)}</label>
                        <input
                          type="number"
                          value={value ?? ""}
                          onChange={(e) => setter(e.target.value ? Number(e.target.value) : undefined)}
                          min="0"
                          placeholder={tServices("perShiftPlaceholder")}
                          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                            shiftErr ? "border-rose-400 text-rose-700" : "border-slate-200"
                          }`}
                        />
                        {range ? (
                          <p
                            className={`mt-1 text-[11px] ${
                              shiftErr ? "font-semibold text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {shiftErr
                              ? tServices(
                                  shiftErr.reason === "below_min"
                                    ? "rangeErrorBelow"
                                    : "rangeErrorAbove",
                                  { min: range.min, max: range.max, entered: shiftErr.entered },
                                )
                              : tServices("allowedRange", { min: range.min, max: range.max })}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{tServices("servicesOffered")}</span>
                  <button
                    type="button"
                    onClick={() => setServices([...services, { name: "", price: 0 }])}
                    className="flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-deep"
                  >
                    <Plus className="h-4 w-4" /> {tServices("addService")}
                  </button>
                </div>
                <div className="space-y-3">
                  {displayedServices.map((item, index) => {
                    const range = item.serviceId
                      ? findServiceRange(pricingConfig.serviceRanges, item.serviceId, providerKind)
                      : undefined;
                    const rowError = pricingErrors.get(`service:${index}`);
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2">
                          <select
                            value={item.serviceId ?? ""}
                            onChange={(e) => pickServiceFromCatalog(index, e.target.value)}
                            className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                              rowError ? "border-rose-400" : "border-slate-200"
                            }`}
                          >
                            <option value="">
                              {tServices("serviceSelectPlaceholder")}
                              {item.name && !item.serviceId
                                ? ` — ${tServices("serviceLegacyHint", { name: item.name })}`
                                : ""}
                            </option>
                            {serviceCatalog.map((s) => (
                              <option key={s.id} value={s.id}>
                                {tLocalized(s.label, locale)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateService(index, "price", e.target.value)}
                            placeholder={tServices("pricePlaceholder")}
                            min="0"
                            className={`w-24 rounded-lg border px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                              rowError ? "border-rose-400 text-rose-700" : "border-slate-200"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              clearPricingErrors();
                              setServices(services.filter((_, i) => i !== index));
                            }}
                            className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100 text-sm font-bold"
                            aria-label={tServices("removeServiceLabel")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {range ? (
                          <p
                            className={`pl-1 text-[11px] ${
                              rowError ? "font-semibold text-rose-600" : "text-slate-500"
                            }`}
                          >
                            {rowError
                              ? tServices(
                                  rowError.reason === "below_min"
                                    ? "rangeErrorBelow"
                                    : "rangeErrorAbove",
                                  { min: range.min, max: range.max, entered: rowError.entered },
                                )
                              : tServices("allowedRange", { min: range.min, max: range.max })}
                          </p>
                        ) : item.serviceId ? (
                          <p className="pl-1 text-[11px] text-slate-400">
                            {tServices("noRangeConfigured")}
                          </p>
                        ) : item.name ? (
                          <p className="pl-1 text-[11px] text-amber-700">
                            {tServices("serviceReSelectHint")}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">{tServices("skillsLabel")}</label>
                <p className="mb-2 text-xs text-slate-500">{tServices("skillsHelp")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {NURSE_SKILLS.map((skill) => {
                    const active = skills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() =>
                          setSkills((current) =>
                            active
                              ? current.filter((s) => s !== skill.id)
                              : [...current, skill.id],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-brand bg-brand-soft/40 text-brand-deep"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-soft"
                        }`}
                      >
                        {tLocalized(skill.label, locale)}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  // Legacy free-text entries that didn't resolve to a
                  // catalog id are still surfaced so the nurse can see
                  // what they previously saved and replace them.
                  const legacy = skills.filter((s) => !findNurseSkill(s));
                  if (legacy.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                      <p className="mb-1.5 text-xs font-semibold text-amber-800">
                        {tServices("skillsLegacyTitle")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {legacy.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setSkills((current) => current.filter((s) => s !== value))
                            }
                            className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:border-amber-400"
                          >
                            {value} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ADDITIONAL SERVICES */}
          {activeSection === "additional" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 rtl:slide-in-from-left-2">
              <div className="rounded-2xl border border-brand-mist bg-brand-soft/20 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-800">{tAdditional("intro.title")}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tAdditional("intro.body")}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{tAdditional("yourAddons")}</span>
                  <button
                    type="button"
                    onClick={() => setAdditionalServices([...additionalServices, { name: "", price: 0 }])}
                    className="flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-deep"
                  >
                    <Plus className="h-4 w-4" /> {tAdditional("addAddon")}
                  </button>
                </div>
                {additionalServices.length === 0 ? (
                  <p className="text-sm italic text-slate-500">{tAdditional("noAddons")}</p>
                ) : (
                  <div className="space-y-3">
                    {displayedAdditionalServices.map((item, index) => {
                      const range = item.serviceId
                        ? findServiceRange(
                            pricingConfig.serviceRanges,
                            item.serviceId,
                            providerKind,
                          )
                        : undefined;
                      const rowError = pricingErrors.get(`additional:${index}`);
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex gap-2">
                            <select
                              value={item.serviceId ?? ""}
                              onChange={(e) => pickAdditionalFromCatalog(index, e.target.value)}
                              className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                                rowError ? "border-rose-400" : "border-slate-200"
                              }`}
                            >
                              <option value="">
                                {tAdditional("addonSelectPlaceholder")}
                                {item.name && !item.serviceId
                                  ? ` — ${tServices("serviceLegacyHint", { name: item.name })}`
                                  : ""}
                              </option>
                              {supportCatalog.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {tLocalized(s.label, locale)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateAdditional(index, "price", e.target.value)}
                              placeholder={tServices("pricePlaceholder")}
                              min="0"
                              className={`w-24 rounded-lg border px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
                                rowError ? "border-rose-400 text-rose-700" : "border-slate-200"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                clearPricingErrors();
                                setAdditionalServices(
                                  additionalServices.filter((_, i) => i !== index),
                                );
                              }}
                              className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100 text-sm font-bold"
                              aria-label={tAdditional("removeAddonLabel")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {range ? (
                            <p
                              className={`pl-1 text-[11px] ${
                                rowError ? "font-semibold text-rose-600" : "text-slate-500"
                              }`}
                            >
                              {rowError
                                ? tServices(
                                    rowError.reason === "below_min"
                                      ? "rangeErrorBelow"
                                      : "rangeErrorAbove",
                                    {
                                      min: range.min,
                                      max: range.max,
                                      entered: rowError.entered,
                                    },
                                  )
                                : tServices("allowedRange", { min: range.min, max: range.max })}
                            </p>
                          ) : item.serviceId ? (
                            <p className="pl-1 text-[11px] text-slate-400">
                              {tServices("noRangeConfigured")}
                            </p>
                          ) : item.name ? (
                            <p className="pl-1 text-[11px] text-amber-700">
                              {tServices("serviceReSelectHint")}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
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
                          ? "border-brand bg-brand-soft/30 text-brand-deep"
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
                        availableDays.includes(day) ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                  className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
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
              <div className="rounded-2xl border-2 border-dashed border-brand-soft bg-brand-soft/30 p-6">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand" />
                  <p className="text-sm font-bold text-brand-deep">{tCreds("title")}</p>
                </div>
                <p className="mb-3 text-xs text-brand-deep/80">{tCreds("intro")}</p>
                <button
                  type="button"
                  onClick={() => certInputRef.current?.click()}
                  disabled={uploadingCert}
                  className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-50"
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
                              className="text-xs font-semibold text-brand hover:underline"
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
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
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

          <div className="flex flex-col items-end gap-1">
            {sectionWarning && !sectionComplete[activeSection] && (
              <p className="text-xs font-semibold text-amber-700">
                {t("completeSectionFirst")}
              </p>
            )}
            <div className="flex items-center gap-3">
              {/* Wizard mechanic: non-final sections show "Next →", the
                  final (credentials) section shows the primary CTA.
                  Already-approved nurses editing their profile see the
                  Save button on every section since they're not going
                  through the onboarding wizard. */}
              {isFreshOnboarding && !isFinalSection ? (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-50"
                >
                  {saving ? t("savingButton") : t("nextStep")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : isFreshOnboarding && isFinalSection ? (
                <button
                  type="submit"
                  disabled={saving || !allComplete}
                  title={!allComplete ? t("completeAllSectionsFirst") : undefined}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {saving ? t("submittingButton") : t("submitForReviewButton")}
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
