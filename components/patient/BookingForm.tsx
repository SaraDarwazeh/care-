"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, ChevronLeft, MapPin, Calendar, Clock, Stethoscope, HeartHandshake, ListChecks } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import type { Booking, CarePackage, NurseMarketplaceProfile, PatientLocation } from "@/lib/types";
import AddOnItem from "@/components/common/AddOnItem";
import { createBooking } from "@/services/bookingService";
import {
  FIELD_TO_SECTION,
  getFieldTranslationKey,
  getMissingProfileFields,
  getPatientLocations,
  getPatientProfile,
  type RequiredProfileField,
} from "@/services/patientService";
import { listPackages } from "@/services/packageService";
import { getPricingConfig } from "@/services/pricingConfigService";
import type { PricingConfig } from "@/services/pricingConfigService";
import { getLastPreferences, saveLastPreferences } from "@/lib/bookingPreferences";
import {
  AVAILABLE_ADDONS,
  SHIFT_LABELS,
  round2,
} from "@/lib/pricingConstants";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";
import { findCatalogService } from "@/lib/serviceTaxonomy";
import { getCurrentIdToken } from "@/services/authService";

export default function BookingForm({
  patientId,
  nurse,
  initialService,
  initialShift,
  initialPackage,
  initialDurationDays,
  initialBookingType,
  onBooked,
}: {
  patientId: string;
  nurse: NurseMarketplaceProfile;
  initialService?: string;
  initialShift?: string;
  initialPackage?: string;
  initialDurationDays?: number;
  // Explicit booking-mode signal from the referrer. Lets /services/packages
  // links pass bookingType=package even when they don't pre-select a
  // specific package, so the form opens at the right tab instead of
  // forcing the patient to re-pick a mode they already chose upstream.
  initialBookingType?: "one-time" | "shift" | "package";
  onBooked?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("patient.booking");
  // Root translator so we can resolve fully-qualified required-field
  // labels returned by patientService.getFieldTranslationKey.
  const tRoot = useTranslations();
  const tBanner = useTranslations("patient.booking.packageBanner");
  const tS1 = useTranslations("patient.booking.step1");
  const tS2 = useTranslations("patient.booking.step2");
  const tS3 = useTranslations("patient.booking.step3");
  const tS4 = useTranslations("patient.booking.step4");
  const tS5 = useTranslations("patient.booking.step5");
  const tAdditionalKind = useTranslations("services.additional");
  const tLabels = useTranslations("patient.booking.stepLabels");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const lastPrefs = useMemo(() => getLastPreferences(), []);

  const [bookingType, setBookingType] = useState<"one-time" | "shift" | "package">(() => {
    // Explicit referrer signal wins (e.g. user came from /services/packages).
    if (initialBookingType) return initialBookingType;
    if (initialPackage) return "package";
    if (initialShift) return "shift";
    if (lastPrefs?.bookingType) return lastPrefs.bookingType;
    return "one-time";
  });
  const [packageId, setPackageId] = useState<string | undefined>(initialPackage);
  const [durationDays, setDurationDays] = useState<number>(
    initialDurationDays ?? lastPrefs?.durationDays ?? 1,
  );
  const [addOns, setAddOns] = useState<string[]>(() => lastPrefs?.addOnIds ?? []);

  const [service, setService] = useState(() => {
    const fromUrl = nurse.services.find((item) => item.name.toLowerCase() === initialService?.toLowerCase());
    if (fromUrl) return fromUrl.name;
    const fromPrefs = lastPrefs?.service
      ? nurse.services.find((item) => item.name.toLowerCase() === lastPrefs.service?.toLowerCase())
      : undefined;
    if (fromPrefs) return fromPrefs.name;
    // Fallback when a nurse hasn't defined any services. Localized so
    // the placeholder doesn't render as English to AR users. (The form
    // also surfaces a "no services" state in the picker; this just keeps
    // the persisted booking.service field non-empty.)
    return nurse.services[0]?.name ?? t("generalVisitFallback");
  });
  const [shift, setShift] = useState(() => {
    if (initialShift) return initialShift.toUpperCase();
    if (lastPrefs?.shift) return lastPrefs.shift.toUpperCase();
    return "";
  });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [savedLocations, setSavedLocations] = useState<PatientLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [notes, setNotes] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);
  // Specific missing required fields, so the booking-gate screen can
  // tell the patient exactly what's missing (and deep-link to the
  // relevant editor section — especially identity verification).
  const [missingFields, setMissingFields] = useState<RequiredProfileField[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tncAccepted, setTncAccepted] = useState(false);
  // Shape returned by /api/bookings/pricing. `tax` is kept optional only
  // so legacy server builds that still emit the field don't break the
  // type check; new servers never set it.
  type ServerPricing = {
    base: number;
    addons?: { id: string; name: string; price: number }[];
    transport?: number;
    overnight?: number;
    subtotal: number;
    tax?: number;
    total: number;
  } | null;

  const [serverPricing, setServerPricing] = useState<ServerPricing>(null);

  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);

  useEffect(() => {
    let active = true;
    getPricingConfig()
      .then((cfg) => {
        if (active) setPricingConfig(cfg);
      })
      .catch((err) => {
        console.error("[BookingForm] failed to load pricing config", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const globalAddons = pricingConfig?.addons ?? AVAILABLE_ADDONS;
  const shiftBilledHours = pricingConfig?.shiftBilledHours ?? 8;

  const serviceOptions = useMemo(() => nurse.services, [nurse.services]);

  const effectiveAddons = useMemo(() => {
    const custom = nurse.additionalServices ?? [];
    if (custom.length > 0) {
      return custom.map((item, idx) => ({
        id: `nurse-${(item.name || `addon-${idx}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: item.name,
        price: item.price,
      }));
    }
    return globalAddons.map((a) => ({ id: a.id, name: a.name, price: a.price }));
  }, [nurse.additionalServices, globalAddons]);

  const usingNurseAddons = (nurse.additionalServices?.length ?? 0) > 0;

  async function ensurePackagesLoaded() {
    if (packages.length > 0 || packagesLoading) return;
    setPackagesLoading(true);
    try {
      const data = await listPackages();
      setPackages(data);
    } catch (err) {
      console.error("[BookingForm] failed to load packages", err);
    } finally {
      setPackagesLoading(false);
    }
  }

  function handleSelectPackage(rawId: string) {
    const id = rawId || undefined;
    setPackageId(id);
    if (!id) return;
    const match = packages.find((p) => p.id === id || p.slug === id);
    if (match?.durationDays) {
      setDurationDays(match.durationDays);
    }
  }

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      const profile = await getPatientProfile(patientId);
      if (!active) return;
      const locations = getPatientLocations(profile);
      setSavedLocations(locations);
      const preferred = locations.find((l) => l.isDefault) ?? locations[0];
      if (preferred) {
        setSelectedLocationId(preferred.id);
        setLocation(preferred.address);
        setUseCustomLocation(false);
      } else {
        setUseCustomLocation(true);
        if (profile?.defaultLocation) setLocation(profile.defaultLocation);
      }
      setProfileCompleted(!!profile?.profileCompleted);
      setMissingFields(getMissingProfileFields(profile));
      setLoadingProfile(false);

      if (initialPackage) {
        try {
          const data = await listPackages();
          if (active) setPackages(data);
        } catch (err) {
          console.error("[BookingForm] failed to preload packages", err);
        }
      }
    }
    void fetchProfile();
    return () => { active = false; };
  }, [patientId, initialPackage]);

  function pickSavedLocation(id: string) {
    const match = savedLocations.find((l) => l.id === id);
    if (!match) return;
    setSelectedLocationId(id);
    setLocation(match.address);
    setUseCustomLocation(false);
  }

  function switchToCustomLocation() {
    setUseCustomLocation(true);
    setSelectedLocationId("");
    setLocation("");
  }

  const selectedPrice = useMemo(() => {
    const selected = nurse.services.find((item) => item.name === service);
    return selected?.price ?? nurse.pricePerHour ?? 0;
  }, [nurse.pricePerHour, nurse.services, service]);

  const selectedPackage = useMemo(() => {
    if (!packageId) return null;
    return packages.find((p) => p.id === packageId || p.slug === packageId) ?? null;
  }, [packageId, packages]);

  const isFixedPackage = (selectedPackage?.pricingMode ?? "dynamic") === "fixed";

  const effectiveDurationDays = isFixedPackage && selectedPackage
    ? selectedPackage.durationDays
    : durationDays;

  const selectedDurationOption = useMemo(() => {
    if (isFixedPackage) return null;
    if (!selectedPackage?.durationOptions) return null;
    return selectedPackage.durationOptions.find((opt) => opt.days === effectiveDurationDays) ?? null;
  }, [isFixedPackage, selectedPackage, effectiveDurationDays]);

  // Per-shift price for the nurse, indexed by shift letter. Undefined for
  // any shift the nurse hasn't priced — we fall back to hourly × N below
  // so legacy nurses keep working. Memoized so referential identity
  // doesn't churn the pricing useMemo on every render.
  const nursePricePerShift = useMemo(() => nurse.pricePerShift ?? {}, [nurse.pricePerShift]);

  const pricing = useMemo(() => {
    let base = 0;
    if (bookingType === "shift") {
      const shiftKey = (shift?.toUpperCase() ?? "") as "A" | "B" | "C";
      const flat = nursePricePerShift[shiftKey];
      base = typeof flat === "number" && flat > 0 ? flat : selectedPrice * shiftBilledHours;
    } else if (bookingType === "package") {
      const days = Math.max(1, effectiveDurationDays || 1);
      let perDay = selectedPrice * shiftBilledHours;
      if (selectedPackage?.basePricePerDay && selectedPackage.basePricePerDay > 0) {
        perDay = selectedPackage.basePricePerDay;
      }
      const modifier = isFixedPackage ? 1 : (selectedDurationOption?.priceModifier ?? 1);
      base = round2(perDay * days * modifier);
    } else {
      base = selectedPrice;
    }
    const addons = effectiveAddons.filter((a) => addOns.includes(a.id));
    const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
    const transport = 0;
    const subtotal = round2(base + addonsTotal + transport);
    const total = subtotal;
    return { base, addons, transport, subtotal, total };
  }, [selectedPrice, bookingType, addOns, effectiveDurationDays, isFixedPackage, selectedPackage, selectedDurationOption, effectiveAddons, shiftBilledHours, shift, nursePricePerShift]);

  useEffect(() => {
    if (step !== 5) return;
    let active = true;
    const payload = {
      nurseId: nurse.userId,
      service,
      bookingType,
      packageId: bookingType === "package" ? packageId : undefined,
      durationDays: bookingType === "package" ? effectiveDurationDays : undefined,
      shift: bookingType === "shift" ? shift : undefined,
      pricing: {
        addons: effectiveAddons.filter((a) => addOns.includes(a.id)).map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
        })),
      },
    };

    async function fetchServerPricing() {
      try {
        const token = await getCurrentIdToken();
        if (!token) {
          throw new Error("Missing auth token for pricing request");
        }

        const res = await fetch("/api/bookings/pricing", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (active && json?.success) setServerPricing(json.pricing);
      } catch (e) {
        console.error("Pricing fetch failed", e);
      }
    }

    void fetchServerPricing();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setSuccess(false);

    const shiftStartTimes: Record<string, string> = { A: "07:00", B: "14:00", C: "20:00" };
    let bookingTime = "";
    if (bookingType === "shift") {
      bookingTime = shiftStartTimes[shift] ?? "";
    } else if (bookingType === "one-time") {
      bookingTime = time;
    }

    // Tax was removed in the ILS / tax-removal pass; the field is kept
    // optional on the type only for tolerant reads of historical
    // bookings (PriceBreakdown handles `pricing.tax > 0` for legacy
    // records). New bookings never set it.
    type PricingLike = { base: number; addons?: { id: string; name: string; price: number }[]; transport?: number; subtotal: number; total: number };
    const serverPriceObj: PricingLike = (serverPricing ?? pricing) as PricingLike;

    const booking: Omit<Booking, "id" | "status" | "createdAt"> = {
      patientId,
      nurseId: nurse.userId,
      service,
      bookingType,
      packageId: bookingType === "package" ? packageId : undefined,
      durationDays: bookingType === "package" ? effectiveDurationDays : undefined,
      shift: bookingType === "shift" ? shift : undefined,
      price: serverPriceObj.total,
      pricing: {
        base: serverPriceObj.base,
        addons: (serverPriceObj.addons ?? []).map((a) => ({ id: a.id, name: a.name, price: a.price })),
        transport: serverPriceObj.transport,
        subtotal: serverPriceObj.subtotal,
        total: serverPriceObj.total,
      },
      date,
      time: bookingTime,
      location,
      notes: `${notes}${bookingType === "shift" ? `\nShift: ${shift}` : ""}`.trim(),
    };

    try {
      await createBooking(booking);
      saveLastPreferences({
        bookingType,
        service,
        shift: bookingType === "shift" ? shift : undefined,
        durationDays: bookingType === "package" ? effectiveDurationDays : undefined,
        addOnIds: addOns,
      });
      setSuccess(true);
      onBooked?.();
      setTimeout(() => {
        router.push("/patient/appointments");
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  // Section visibility per the responsive layout strategy: mobile shows
  // the active step only (wizard); desktop (lg+) shows every section
  // stacked vertically. We use CSS so there's no SSR mismatch and no
  // viewport-detection hook.
  const sectionVis = (n: number) =>
    `${step === n ? "" : "hidden"} lg:block ${n > 1 ? "lg:mt-10 lg:border-t lg:border-slate-100 lg:pt-10" : ""}`;

  // Whether the booking is submittable. Identical to the previous
  // "step 5" submit-disabled clause; computed once so the desktop and
  // mobile Submit buttons share the rule.
  const submitDisabled =
    loading ||
    !date ||
    !location ||
    !tncAccepted ||
    (bookingType === "shift" && !shift) ||
    (bookingType === "one-time" && !time) ||
    (bookingType === "package" && !packageId);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
        <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
        <h3 className="text-2xl font-bold text-slate-800">{t("successTitle")}</h3>
        <p className="mt-2 text-slate-600">{t("successBody", { name: nurse.fullName })}</p>
        <p className="text-sm text-slate-500 mt-2">{t("successRedirect")}</p>
        <button
          onClick={() => { setSuccess(false); setStep(1); }}
          className="mt-6 rounded-xl bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          {t("bookAnother")}
        </button>
      </div>
    );
  }

  if (loadingProfile) {
    return <div className="p-8 text-center text-slate-500">{t("verifyingProfile")}</div>;
  }

  if (!profileCompleted) {
    // Pick the deep-link target: identity verification is the most
    // surprising blocker (it requires admin review on top of just
    // filling fields), so we surface it specifically when it's the
    // missing piece. Everything else opens the profile editor's
    // matching section via ?section=.
    const identityMissing = missingFields.includes("identityVerified");
    const primaryMissing = identityMissing
      ? "identityVerified"
      : missingFields[0];
    const ctaSection = primaryMissing ? FIELD_TO_SECTION[primaryMissing] : undefined;
    const ctaHref = ctaSection
      ? `/patient/profile?section=${ctaSection}`
      : "/patient/profile";
    const ctaLabel = identityMissing
      ? t("profileMissingIdentityCTA")
      : t("profileGenericCTA");

    return (
      <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center shadow-sm">
        <h3 className="text-xl font-bold text-orange-800 mb-2">{t("profileIncompleteTitle")}</h3>
        <p className="text-orange-700 mb-4 text-sm">{t("profileIncompleteBody")}</p>
        {missingFields.length > 0 && (
          <div className="mx-auto mb-6 max-w-sm rounded-2xl border border-orange-200 bg-white px-4 py-3 text-start">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
              {t("profileMissingFieldsIntro")}
            </p>
            <ul className="mt-2 space-y-1">
              {missingFields.map((field) => (
                <li key={field} className="flex items-center gap-2 text-sm text-orange-900">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  {tRoot(getFieldTranslationKey(field))}
                </li>
              ))}
            </ul>
          </div>
        )}
        <PatientButton href={ctaHref} className="bg-orange-600 hover:bg-orange-700 text-white border-0">
          {ctaLabel}
        </PatientButton>
      </div>
    );
  }

  const stepLabelOrder = ["type", "service", "schedule", "addons", "review"] as const;

  return (
    <>
    <div className="rounded-3xl border border-brand-mist bg-white p-6 pb-24 lg:pb-6 shadow-sm">
      {/* Prominent running-total banner. Per the 2026-06-17 audit, the
          old header showed the estimated total in a small text-end pill
          which patients consistently missed until the final step. The
          larger, separated panel keeps pricing visible from step 1 and
          surfaces the base + add-on breakdown inline so a patient never
          has to guess how the total was calculated. */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand to-brand-deep p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              {t("estimatedTotal")}
            </p>
            <p className="mt-1 text-3xl font-extrabold leading-none tracking-tight">
              {fmtCurrency(pricing.total, locale)}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-white/80">{t("step", { current: step, total: totalSteps })}</p>
            <p className="mt-0.5 text-xs font-medium text-white/75">{t("title")}</p>
          </div>
        </div>
        {pricing.base > 0 && (
          <div className="mt-4 grid gap-1.5 border-t border-white/30 pt-3 text-xs">
            <div className="flex items-center justify-between text-white/90">
              <span>{tS5("base")}</span>
              <span className="font-semibold">{fmtCurrency(pricing.base, locale)}</span>
            </div>
            {pricing.addons.length > 0 &&
              pricing.addons.map((a) => {
                const catalog = findCatalogService(a.id);
                const label = catalog ? tLocalized(catalog.label, locale) : a.name;
                return (
                  <div key={a.id} className="flex items-center justify-between text-white/90">
                    <span>+ {label}</span>
                    <span className="font-semibold">{fmtCurrency(a.price, locale)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {bookingType === "package" && selectedPackage && (
        <div className="mb-6 rounded-2xl border border-brand-mist bg-brand-soft/30/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-deep">{tBanner("kicker")}</p>
                <p className="mt-0.5 text-base font-bold leading-tight text-slate-800">{tLocalized(selectedPackage.title, locale)}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{tLocalized(selectedPackage.summary, locale)}</p>
              </div>
            </div>
            <Link
              href={`/services/packages/${selectedPackage.slug ?? selectedPackage.id}`}
              target="_blank"
              className="shrink-0 text-xs font-bold text-brand-deep underline-offset-2 hover:underline"
            >
              {tBanner("fullDetails")}
            </Link>
          </div>

          <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{tBanner("defaultDuration")}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{tBanner("days", { n: selectedPackage.durationDays })}</p>
            </div>
            {selectedPackage.shiftOptions && selectedPackage.shiftOptions.length > 0 && (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{tBanner("shiftCoverage")}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {selectedPackage.shiftOptions.length === 3 ? tBanner("twentyFourSeven") : selectedPackage.shiftOptions.join(" · ")}
                </p>
              </div>
            )}
            {selectedPackage.basePricePerDay ? (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{tBanner("baseRate")}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {tBanner("perDay", { price: fmtCurrency(selectedPackage.basePricePerDay, locale) })}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{tBanner("pricing")}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{tBanner("nurseHourlyTimesDays")}</p>
              </div>
            )}
          </div>

          {selectedPackage.includedServices.length > 0 && (
            <div className="mt-3 rounded-xl bg-white/80 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <ListChecks className="h-3 w-3" /> {tBanner("includedCare")}
              </p>
              <ul className="grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                {selectedPackage.includedServices.slice(0, 6).map((svc, i) => {
                  const label = tLocalized(svc, locale);
                  return (
                    <li key={`${label}-${i}`} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step pip indicator + numbered progress bar. Wizard chrome —
          mobile only. Desktop renders the full form linearly. */}
      <div className="lg:hidden mb-8 flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i + 1 <= step ? "bg-brand" : "bg-brand-soft/50"}`} />
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("step", { current: step, total: totalSteps })}</p>
            <p className="text-xs text-slate-400">{t("percentComplete", { n: Math.round((step / totalSteps) * 100) })}</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {stepLabelOrder.map((labelKey, i) => (
              <span
                key={labelKey}
                className={`text-[10px] sm:text-xs font-medium ${i + 1 <= step ? "text-brand" : "text-slate-300"}`}
              >
                {tLabels(labelKey)}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-[250px]">
          <div className={`${sectionVis(1)} space-y-4 animate-in fade-in slide-in-from-right-4 rtl:slide-in-from-left-4`}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Stethoscope className="h-5 w-5 text-brand"/> {tS1("title")}</h3>
              <div className="mb-3">
                <label className="mb-2 block text-sm font-medium text-slate-700">{tS1("bookingType")}</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "one-time" ? "border-brand bg-brand-soft/30 text-brand-deep" : "border-slate-200 text-slate-600"}`}>
                    <input type="radio" name="bookingType" value="one-time" checked={bookingType === "one-time"} onChange={() => setBookingType("one-time")} className="sr-only" /> {tS1("oneTime")}
                  </label>
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "shift" ? "border-brand bg-brand-soft/30 text-brand-deep" : "border-slate-200 text-slate-600"}`}>
                    <input type="radio" name="bookingType" value="shift" checked={bookingType === "shift"} onChange={() => setBookingType("shift")} className="sr-only" /> {tS1("shift")}
                  </label>
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "package" ? "border-brand bg-brand-soft/30 text-brand-deep" : "border-slate-200 text-slate-600"}`}>
                    <input
                      type="radio"
                      name="bookingType"
                      value="package"
                      checked={bookingType === "package"}
                      onChange={() => {
                        setBookingType("package");
                        void ensurePackagesLoaded();
                      }}
                      className="sr-only"
                    />{" "}
                    {tS1("package")}
                  </label>
                </div>
              </div>

              {bookingType === "package" && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{tS1("selectPackage")}</label>
                  <select
                    value={packageId ?? ""}
                    onChange={(e) => handleSelectPackage(e.target.value)}
                    disabled={packagesLoading}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 disabled:bg-slate-50"
                  >
                    <option value="">
                      {packagesLoading ? tS1("loadingPackages") : tS1("choosePackage")}
                    </option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {tLocalized(pkg.title, locale)} · {pkg.durationDays}d
                      </option>
                    ))}
                  </select>
                  {packageId && (
                    <p className="mt-2 text-xs text-slate-500">
                      {(() => {
                        const summary = packages.find((p) => p.id === packageId)?.summary;
                        return summary ? tLocalized(summary, locale) : tS1("packageDurationApplied");
                      })()}
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-3">
                {serviceOptions.map((item) => (
                  <label key={item.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${service === item.name ? "border-brand bg-brand-soft/30 shadow-sm" : "border-slate-200 hover:border-brand-soft"}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="service"
                        value={item.name}
                        checked={service === item.name}
                        onChange={() => setService(item.name)}
                        className="h-4 w-4 text-brand focus:ring-brand"
                      />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{fmtCurrency(item.price, locale)}</span>
                  </label>
                ))}
              </div>
            </div>

          <div className={`${sectionVis(2)} space-y-4 animate-in fade-in slide-in-from-right-4 rtl:slide-in-from-left-4`}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Clock className="h-5 w-5 text-brand"/> {bookingType === "shift" ? tS2("selectShift") : tS2("visitTiming")}</h3>
              {bookingType === "shift" ? (
                <div className="grid gap-3">
                  {(["A", "B", "C"] as const).map((id) => {
                    const flat = nursePricePerShift[id];
                    const hasFlat = typeof flat === "number" && flat > 0;
                    const fallbackPrice = selectedPrice * shiftBilledHours;
                    const displayPrice = hasFlat ? flat : fallbackPrice;
                    return (
                      <label key={id} className={`flex cursor-pointer items-center rounded-xl border p-4 transition-all ${shift === id ? "border-brand bg-brand-soft/30 shadow-sm" : "border-slate-200 hover:border-brand-soft"}`}>
                        <input
                          type="radio"
                          name="shift"
                          value={id}
                          checked={shift === id}
                          onChange={() => setShift(id)}
                          className="h-4 w-4 text-brand focus:ring-brand me-3"
                        />
                        <span className="flex-1 font-medium text-slate-700">{SHIFT_LABELS[id]}</span>
                        {displayPrice > 0 && (
                          <span className="text-sm font-bold text-brand-deep">{fmtCurrency(displayPrice, locale)}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : bookingType === "package" ? (
                <div className="space-y-3">
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{tS2("packageFullDayNote")}</p>
                  {selectedPackage?.shiftOptions && selectedPackage.shiftOptions.length > 0 && (
                    <div className="rounded-xl border border-brand-mist bg-brand-soft/30/60 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800">
                        {tS2("coveragePrefix", {
                          value: selectedPackage.shiftOptions.length === 3
                            ? tS2("twentyFourSevenAll")
                            : selectedPackage.shiftOptions
                                .map((s) => SHIFT_LABELS[s] ?? `Shift ${s}`)
                                .join(" · "),
                        })}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{tS2("coverageHelper")}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{tS2("oneTimeNoShift")}</p>
              )}
            </div>

          <div className={`${sectionVis(3)} space-y-4 animate-in fade-in slide-in-from-right-4 rtl:slide-in-from-left-4`}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Calendar className="h-5 w-5 text-brand"/> {tS3("title")}</h3>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{bookingType === "package" ? tS3("startDate") : tS3("dateOfVisit")}</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
                />
              </div>
              {bookingType === "one-time" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{tS3("preferredTime")}</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
                  />
                  <p className="mt-1 text-xs text-slate-500">{tS3("timeHelper")}</p>
                </div>
              )}
              {bookingType === "package" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{tS3("packageDuration")}</label>
                  {isFixedPackage ? (
                    <div className="rounded-xl border border-brand-mist bg-brand-soft/30/60 p-4">
                      <p className="text-sm font-bold text-slate-800">{tS3("fixedBundleTitle", { n: selectedPackage?.durationDays ?? 0 })}</p>
                      <p className="mt-1 text-xs text-slate-600">{tS3("fixedBundleBody")}</p>
                    </div>
                  ) : selectedPackage?.durationOptions && selectedPackage.durationOptions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {selectedPackage.durationOptions.map((opt) => (
                        <label
                          key={opt.days}
                          className={`flex cursor-pointer flex-col items-start rounded-xl border px-3 py-3 text-sm transition-all ${
                            durationDays === opt.days
                              ? "border-brand bg-brand-soft/30 text-brand-deep shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-brand-soft"
                          }`}
                        >
                          <input
                            type="radio"
                            name="durationOption"
                            value={opt.days}
                            checked={durationDays === opt.days}
                            onChange={() => setDurationDays(opt.days)}
                            className="sr-only"
                          />
                          <span className="font-semibold">{tLocalized(opt.label, locale)}</span>
                          <span className="text-xs text-slate-500">{tS3("daysShort", { n: opt.days })}</span>
                          {opt.priceModifier && opt.priceModifier !== 1 && (
                            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              {opt.priceModifier < 1
                                ? tS3("savePercent", { n: Math.round((1 - opt.priceModifier) * 100) })
                                : tS3("addPercent", { n: Math.round((opt.priceModifier - 1) * 100) })}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
                    />
                  )}
                </div>
              )}
            </div>

          <div className={`${sectionVis(4)} space-y-4 animate-in fade-in slide-in-from-right-4 rtl:slide-in-from-left-4`}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><MapPin className="h-5 w-5 text-brand"/> {tS4("title")}</h3>
              {savedLocations.length > 0 && !useCustomLocation && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">{tS4("pickSaved")}</label>
                  <div className="grid gap-2">
                    {savedLocations.map((loc) => (
                      <label
                        key={loc.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                          selectedLocationId === loc.id
                            ? "border-brand bg-brand-soft/30 shadow-sm"
                            : "border-slate-200 hover:border-brand-soft"
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedLocation"
                          value={loc.id}
                          checked={selectedLocationId === loc.id}
                          onChange={() => pickSavedLocation(loc.id)}
                          className="mt-1 h-4 w-4 text-brand focus:ring-brand"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {loc.label}
                            {loc.isDefault && (
                              <span className="ms-2 rounded-full bg-brand-soft/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep">
                                {tS4("defaultLabel")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{loc.address}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={switchToCustomLocation}
                    className="text-xs font-bold text-brand hover:text-brand-deep"
                  >
                    {tS4("useDifferent")}
                  </button>
                </div>
              )}
              {(savedLocations.length === 0 || useCustomLocation) && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{tS4("fullAddress")}</label>
                  <input
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
                    placeholder={tS4("addressPlaceholder")}
                  />
                  {savedLocations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const preferred = savedLocations.find((l) => l.isDefault) ?? savedLocations[0];
                        if (preferred) pickSavedLocation(preferred.id);
                      }}
                      className="mt-2 text-xs font-bold text-brand hover:text-brand-deep"
                    >
                      {tS4("useSavedInstead")}
                    </button>
                  )}
                  {savedLocations.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      {tS4.rich("tipSaveAddresses", {
                        profileLink: (chunks) => (
                          <Link href="/patient/profile" className="font-bold text-brand hover:underline">{chunks}</Link>
                        ),
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

          <div className={`${sectionVis(5)} space-y-4 animate-in fade-in slide-in-from-right-4 rtl:slide-in-from-left-4`}>
              <h3 className="mb-4 font-semibold text-slate-800">{tS5("title")}</h3>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 mb-4 space-y-1">
                {bookingType === "package" && selectedPackage && (
                  <p>
                    <strong>{tS5("packageLabel")}</strong> {tLocalized(selectedPackage.title, locale)}
                  </p>
                )}
                <p><strong>{tS5("serviceLabel")}</strong> {service}</p>
                <p>
                  <strong>{bookingType === "package" ? tS5("startDateLabel") : tS5("dateLabel")}</strong> {date}
                  {bookingType === "shift" && shift && ` ${tS5("shiftSuffix", { shift: SHIFT_LABELS[shift] })}`}
                  {bookingType === "one-time" && time && ` ${tS5("atTime", { time })}`}
                  {bookingType === "package" && ` · ${selectedDurationOption?.label ? tLocalized(selectedDurationOption.label, locale) : tS5("daysSuffix", { n: effectiveDurationDays })}`}
                </p>
                <p><strong>{tS5("locationLabel")}</strong> {location}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 mb-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{tS5("addOnsTitle")}</p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {tAdditionalKind("kindLabel")}
                    </span>
                  </div>
                  {usingNurseAddons && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {tS5("offeredBy", { name: nurse.fullName.split(" ")[0] })}
                    </span>
                  )}
                </div>
                {effectiveAddons.length === 0 ? (
                  <p className="text-xs italic text-slate-500">{tS5("noAddons")}</p>
                ) : (
                  <div className="grid gap-2">
                    {effectiveAddons.map((a) => {
                      // Look up a catalogue entry so we can render the
                      // bilingual label. Custom nurse-defined add-ons
                      // (no catalogue id) fall back to the stored name.
                      const catalog = findCatalogService(a.id);
                      const displayName = catalog
                        ? tLocalized(catalog.label, locale)
                        : a.name;
                      return (
                        <AddOnItem
                          key={a.id}
                          id={a.id}
                          name={displayName}
                          price={a.price}
                          checked={addOns.includes(a.id)}
                          onChange={(checked) => {
                            setAddOns((prev) => (checked ? [...prev, a.id] : prev.filter((p) => p !== a.id)));
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <p className="text-sm text-slate-500">{tS5("pricingSummary")}</p>
                <div className="mt-3 flex justify-between"><span className="text-sm">{tS5("base")}</span><span className="font-bold">{fmtCurrency(pricing.base, locale)}</span></div>
                {pricing.addons.length > 0 && pricing.addons.map((a) => {
                  const catalog = findCatalogService(a.id);
                  const label = catalog ? tLocalized(catalog.label, locale) : a.name;
                  return (
                    <div key={a.id} className="flex justify-between text-sm text-slate-600"><span>{label}</span><span>{fmtCurrency(a.price, locale)}</span></div>
                  );
                })}
                <div className="mt-3 flex justify-between text-base font-bold text-slate-800"><span>{tS5("total")}</span><span>{fmtCurrency(pricing.total, locale)}</span></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tS5("additionalNotes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  dir="auto"
                  className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
                  placeholder={tS5("notesPlaceholder")}
                />
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 mt-4">
                <input
                  type="checkbox"
                  id="tnc-accept"
                  checked={tncAccepted}
                  onChange={(e) => setTncAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="tnc-accept" className="text-xs text-slate-600 leading-relaxed">
                  {tS5("tncIntro")} <Link href="/terms" className="text-brand hover:underline" target="_blank">{tS5("tncTerms")}</Link> {tS5("tncAnd")} <Link href="/privacy" className="text-brand hover:underline" target="_blank">{tS5("tncPrivacy")}</Link>{tS5("tncTail")}
                </label>
              </div>
            </div>
        </div>

        {/* Mobile wizard chrome — Back/Next/Submit. Hidden on desktop
            (lg+) where the form shows all sections vertically and only
            the desktop submit button below is used. */}
        <div className="lg:hidden mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${step === 1 ? "text-transparent cursor-default" : "text-slate-600 hover:text-slate-800"}`}
          >
            <ChevronLeft className="h-4 w-4" /> {t("back")}
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && bookingType === "package" && !packageId) ||
                (step === 2 && bookingType === "shift" && !shift) ||
                (step === 3 && !date) ||
                (step === 3 && bookingType === "one-time" && !time)
              }
              className="flex items-center gap-1 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-50"
            >
              {t("nextStep")} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? t("submitting") : t("confirmBooking")}
            </button>
          )}
        </div>

        {/* Desktop submit (lg+). The mobile wizard chrome above takes
            care of Back/Next/Submit at small viewports; on desktop the
            form is one long page, so we only need a Confirm button at
            the end. Pricing already lives in the prominent header
            panel and stays in view because the booking form itself is
            sticky in the nurse-detail right column. */}
        <div className="hidden lg:flex mt-10 items-center justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={submitDisabled}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-10 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            {loading ? t("submitting") : t("confirmBooking")}
          </button>
        </div>
      </form>
    </div>

    {/* Mobile sticky bottom summary. On mobile the booking form is not
        sticky in its parent (the nurse detail page only sticks the
        right column at lg+), so as the patient scrolls down to fill
        fields the prominent price banner at the top scrolls off-
        screen. This pinned bar keeps the running total in view at all
        times. Hidden on desktop where the sticky parent column does
        the same job. */}
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {t("estimatedTotal")}
          </p>
          <p className="text-xl font-extrabold tracking-tight text-slate-900">
            {fmtCurrency(pricing.total, locale)}
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          {t("step", { current: step, total: totalSteps })}
        </p>
      </div>
    </div>
    </>
  );
}
