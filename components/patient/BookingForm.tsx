"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, ChevronLeft, MapPin, Calendar, Clock, Stethoscope, HeartHandshake, ListChecks } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { Booking, CarePackage, NurseMarketplaceProfile } from "@/lib/types";
import AddOnItem from "@/components/common/AddOnItem";
import { createBooking } from "@/services/bookingService";
import { getPatientProfile } from "@/services/patientService";
import { listPackages } from "@/services/packageService";
import {
  AVAILABLE_ADDONS,
  SHIFT_BILLED_HOURS,
  SHIFT_LABELS,
  TAX_RATE,
  round2,
} from "@/lib/pricingConstants";

export default function BookingForm({
  patientId,
  nurse,
  initialService,
  initialShift,
  initialPackage,
  initialDurationDays,
  onBooked,
}: {
  patientId: string;
  nurse: NurseMarketplaceProfile;
  initialService?: string;
  initialShift?: string;
  initialPackage?: string;
  initialDurationDays?: number;
  onBooked?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [bookingType, setBookingType] = useState<"one-time" | "shift" | "package">(() =>
    initialPackage ? "package" : initialShift ? "shift" : "one-time",
  );
  const [packageId, setPackageId] = useState<string | undefined>(initialPackage);
  const [durationDays, setDurationDays] = useState<number>(initialDurationDays ?? 1);
  const [addOns, setAddOns] = useState<string[]>([]);

  const [service, setService] = useState(() => {
    const matchedService = nurse.services.find((item) => item.name.toLowerCase() === initialService?.toLowerCase());
    return matchedService?.name ?? nurse.services[0]?.name ?? "General Visit";
  });
  const [shift, setShift] = useState(() => initialShift?.toUpperCase() ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tncAccepted, setTncAccepted] = useState(false);
  type ServerPricing = {
    base: number;
    addons?: { id: string; name: string; price: number }[];
    transport?: number;
    overnight?: number;
    subtotal: number;
    tax: number;
    total: number;
  } | null;

  const [serverPricing, setServerPricing] = useState<ServerPricing>(null);

  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const serviceOptions = useMemo(() => nurse.services, [nurse.services]);

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
      if (profile?.defaultLocation) setLocation(profile.defaultLocation);
      setProfileCompleted(!!profile?.profileCompleted);
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

  const selectedPrice = useMemo(() => {
    const selected = nurse.services.find((item) => item.name === service);
    return selected?.price ?? nurse.pricePerHour ?? 0;
  }, [nurse.pricePerHour, nurse.services, service]);

  const selectedPackage = useMemo(() => {
    if (!packageId) return null;
    return packages.find((p) => p.id === packageId || p.slug === packageId) ?? null;
  }, [packageId, packages]);

  const selectedDurationOption = useMemo(() => {
    if (!selectedPackage?.durationOptions) return null;
    return selectedPackage.durationOptions.find((opt) => opt.days === durationDays) ?? null;
  }, [selectedPackage, durationDays]);

  const pricing = useMemo(() => {
    let base = 0;
    if (bookingType === "shift") {
      base = selectedPrice * SHIFT_BILLED_HOURS;
    } else if (bookingType === "package") {
      const days = Math.max(1, durationDays || 1);
      let perDay = selectedPrice * SHIFT_BILLED_HOURS;
      if (selectedPackage?.basePricePerDay && selectedPackage.basePricePerDay > 0) {
        perDay = selectedPackage.basePricePerDay;
      }
      const modifier = selectedDurationOption?.priceModifier ?? 1;
      base = round2(perDay * days * modifier);
    } else {
      base = selectedPrice;
    }
    const addons = AVAILABLE_ADDONS.filter((a) => addOns.includes(a.id));
    const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
    const transport = 0;
    const subtotal = round2(base + addonsTotal + transport);
    const tax = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + tax);
    return { base, addons, transport, subtotal, tax, total };
  }, [selectedPrice, bookingType, addOns, durationDays, selectedPackage, selectedDurationOption]);

  // When the user reaches the review step, ask the server to compute the
  // canonical price using the same payload we'll send on submit. Intentionally
  // depends only on `step` — we want one authoritative quote per arrival at
  // the review step, not a refetch on every keystroke.
  useEffect(() => {
    if (step !== 5) return;
    let active = true;
    const payload = {
      nurseId: nurse.userId,
      service,
      bookingType,
      packageId: bookingType === "package" ? packageId : undefined,
      durationDays: bookingType === "package" ? durationDays : undefined,
      shift: bookingType === "shift" ? shift : undefined,
      pricing: {
        addons: AVAILABLE_ADDONS.filter((a) => addOns.includes(a.id)).map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
        })),
      },
    };

    fetch("/api/bookings/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((json) => {
        if (active && json?.success) setServerPricing(json.pricing);
      })
      .catch((e) => {
        console.error("Pricing fetch failed", e);
      });

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

    // For shift bookings we derive the start time from the shift code so the
    // server's conflict checker has a consistent value. One-time bookings use
    // the time picker; packages span full days so the time field is informational.
    const shiftStartTimes: Record<string, string> = { A: "07:00", B: "14:00", C: "20:00" };
    let bookingTime = "";
    if (bookingType === "shift") {
      bookingTime = shiftStartTimes[shift] ?? "";
    } else if (bookingType === "one-time") {
      bookingTime = time;
    }

    type PricingLike = { base: number; addons?: { id: string; name: string; price: number }[]; transport?: number; subtotal: number; tax: number; total: number };
    const serverPriceObj: PricingLike = (serverPricing ?? pricing) as PricingLike;

    const booking: Omit<Booking, "id" | "status" | "createdAt"> = {
      patientId,
      nurseId: nurse.userId,
      service,
      bookingType,
      packageId: bookingType === "package" ? packageId : undefined,
      durationDays: bookingType === "package" ? durationDays : undefined,
      shift: bookingType === "shift" ? shift : undefined,
      price: serverPriceObj.total,
      pricing: {
        base: serverPriceObj.base,
        addons: (serverPriceObj.addons ?? []).map((a) => ({ id: a.id, name: a.name, price: a.price })),
        transport: serverPriceObj.transport,
        subtotal: serverPriceObj.subtotal,
        tax: serverPriceObj.tax,
        total: serverPriceObj.total,
      },
      date,
      time: bookingTime,
      location,
      notes: `${notes}${bookingType === "shift" ? `\nShift: ${shift}` : ""}`.trim(),
    };

    try {
      await createBooking(booking);
      setSuccess(true);
      onBooked?.();
      setTimeout(() => {
        router.push("/patient/appointments");
      }, 3000);
    } catch (e) {
      console.error(e);
      // Handle error visually if needed
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
        <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
        <h3 className="text-2xl font-bold text-slate-800">Booking Confirmed</h3>
        <p className="mt-2 text-slate-600">Your request has been sent to {nurse.fullName}. You will be notified once they review it.</p>
        <p className="text-sm text-slate-500 mt-2">You will be redirected to your appointments shortly...</p>
        <button
          onClick={() => { setSuccess(false); setStep(1); }}
          className="mt-6 rounded-xl bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Book Another Visit
        </button>
      </div>
    );
  }

  if (loadingProfile) {
    return <div className="p-8 text-center text-slate-500">Verifying patient profile...</div>;
  }

  if (!profileCompleted) {
    return (
      <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center shadow-sm">
        <h3 className="text-xl font-bold text-orange-800 mb-2">Profile Incomplete</h3>
        <p className="text-orange-700 mb-6 text-sm">You must complete your patient profile (including contact and medical information) before booking a nurse.</p>
        <PatientButton href="/patient/profile" className="bg-orange-600 hover:bg-orange-700 text-white border-0">
          Complete Profile Now
        </PatientButton>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Book a Visit</h2>
          <p className="text-sm text-slate-500">Step {step} of {totalSteps}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">Est. Total</p>
          <p className="text-lg font-bold text-sky-700">${pricing.total.toLocaleString()}</p>
        </div>
      </div>

      {bookingType === "package" && selectedPackage && (
        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Care package</p>
                <p className="mt-0.5 text-base font-bold leading-tight text-slate-800">{selectedPackage.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{selectedPackage.summary}</p>
              </div>
            </div>
            <Link
              href={`/services/packages/${selectedPackage.slug ?? selectedPackage.id}`}
              target="_blank"
              className="shrink-0 text-xs font-bold text-sky-700 underline-offset-2 hover:underline"
            >
              Full details →
            </Link>
          </div>

          <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Default duration</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{selectedPackage.durationDays} days</p>
            </div>
            {selectedPackage.shiftOptions && selectedPackage.shiftOptions.length > 0 && (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Shift coverage</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {selectedPackage.shiftOptions.length === 3 ? "24/7 (A · B · C)" : selectedPackage.shiftOptions.join(" · ")}
                </p>
              </div>
            )}
            {selectedPackage.basePricePerDay ? (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Base rate</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  ${selectedPackage.basePricePerDay}/day
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 p-3">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pricing</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">Nurse hourly × days</p>
              </div>
            )}
          </div>

          {selectedPackage.includedServices.length > 0 && (
            <div className="mt-3 rounded-xl bg-white/80 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <ListChecks className="h-3 w-3" /> Included care
              </p>
              <ul className="grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                {selectedPackage.includedServices.slice(0, 6).map((service) => (
                  <li key={service} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i + 1 <= step ? "bg-sky-600" : "bg-sky-100"}`} />
        ))}
      </div>

      <form onSubmit={onSubmit}>
        {/* Step progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step {step} of {totalSteps}</p>
            <p className="text-xs text-slate-400">{Math.round((step / totalSteps) * 100)}% complete</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {["Type", "Service", "Schedule", "Add-ons", "Review"].map((label, i) => (
              <span
                key={i}
                className={`text-[10px] sm:text-xs font-medium ${i + 1 <= step ? "text-sky-600" : "text-slate-300"}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-[250px]">
          {/* Step 1: Service */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Stethoscope className="h-5 w-5 text-sky-600"/> Select Service</h3>
              <div className="mb-3">
                <label className="mb-2 block text-sm font-medium text-slate-700">Booking Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "one-time" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-600"}`}>
                    <input type="radio" name="bookingType" value="one-time" checked={bookingType === "one-time"} onChange={() => setBookingType("one-time")} className="sr-only" /> One-time
                  </label>
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "shift" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-600"}`}>
                    <input type="radio" name="bookingType" value="shift" checked={bookingType === "shift"} onChange={() => setBookingType("shift")} className="sr-only" /> Shift
                  </label>
                  <label className={`cursor-pointer rounded-xl border px-2 py-2.5 text-sm text-center font-medium transition-all ${bookingType === "package" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-600"}`}>
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
                    Package
                  </label>
                </div>
              </div>

              {bookingType === "package" && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Select Package</label>
                  <select
                    value={packageId ?? ""}
                    onChange={(e) => handleSelectPackage(e.target.value)}
                    disabled={packagesLoading}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 disabled:bg-slate-50"
                  >
                    <option value="">
                      {packagesLoading ? "Loading packages..." : "Choose a package..."}
                    </option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} · {pkg.durationDays}d
                      </option>
                    ))}
                  </select>
                  {packageId && (
                    <p className="mt-2 text-xs text-slate-500">
                      {packages.find((p) => p.id === packageId)?.summary ??
                        "Package duration and pricing will be applied at checkout."}
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-3">
                {serviceOptions.map((item) => (
                  <label key={item.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${service === item.name ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 hover:border-sky-300"}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="service" 
                        value={item.name} 
                        checked={service === item.name} 
                        onChange={() => setService(item.name)} 
                        className="h-4 w-4 text-sky-600 focus:ring-sky-600" 
                      />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">${item.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Shift / schedule choice (only meaningful for shift bookings) */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Clock className="h-5 w-5 text-sky-600"/> {bookingType === "shift" ? "Select Shift" : "Visit Timing"}</h3>
              {bookingType === "shift" ? (
                <div className="grid gap-3">
                  {(["A", "B", "C"] as const).map((id) => (
                    <label key={id} className={`flex cursor-pointer items-center rounded-xl border p-4 transition-all ${shift === id ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 hover:border-sky-300"}`}>
                      <input
                        type="radio"
                        name="shift"
                        value={id}
                        checked={shift === id}
                        onChange={() => setShift(id)}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-600 mr-3"
                      />
                      <span className="font-medium text-slate-700">{SHIFT_LABELS[id]}</span>
                    </label>
                  ))}
                </div>
              ) : bookingType === "package" ? (
                <div className="space-y-3">
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Packages run as full-day care plans, so you don&rsquo;t pick a single shift. You&rsquo;ll set the start date and duration next.
                  </p>
                  {selectedPackage?.shiftOptions && selectedPackage.shiftOptions.length > 0 && (
                    <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800">
                        Coverage:{" "}
                        {selectedPackage.shiftOptions.length === 3
                          ? "24/7 across all shifts"
                          : selectedPackage.shiftOptions
                              .map((s) => SHIFT_LABELS[s] ?? `Shift ${s}`)
                              .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        The assigned nurse will cover the shifts above for the duration of your package.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  One-time visits don&rsquo;t require a shift — you&rsquo;ll pick a preferred time next.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Date (+ optional time for one-time) */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Calendar className="h-5 w-5 text-sky-600"/> Select Date</h3>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{bookingType === "package" ? "Start Date" : "Date of Visit"}</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              {bookingType === "one-time" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Preferred Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">The nurse will confirm or propose an adjusted slot after reviewing your request.</p>
                </div>
              )}
              {bookingType === "package" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Package Duration</label>
                  {selectedPackage?.durationOptions && selectedPackage.durationOptions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {selectedPackage.durationOptions.map((opt) => (
                        <label
                          key={opt.days}
                          className={`flex cursor-pointer flex-col items-start rounded-xl border px-3 py-3 text-sm transition-all ${
                            durationDays === opt.days
                              ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-sky-300"
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
                          <span className="font-semibold">{opt.label}</span>
                          <span className="text-xs text-slate-500">{opt.days} days</span>
                          {opt.priceModifier && opt.priceModifier !== 1 && (
                            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              {opt.priceModifier < 1
                                ? `Save ${Math.round((1 - opt.priceModifier) * 100)}%`
                                : `+${Math.round((opt.priceModifier - 1) * 100)}%`}
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><MapPin className="h-5 w-5 text-sky-600"/> Service Location</h3>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full Address / Location</label>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Street name, building, apartment number..."
                />
                <p className="mt-2 text-xs text-slate-500">We pre-filled this based on your profile default location.</p>
              </div>
            </div>
          )}

          {/* Step 5: Notes & Submit */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 font-semibold text-slate-800">Final Details</h3>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 mb-4 space-y-1">
                {bookingType === "package" && selectedPackage && (
                  <p>
                    <strong>Package:</strong> {selectedPackage.title}
                  </p>
                )}
                <p><strong>Service:</strong> {service}</p>
                <p>
                  <strong>{bookingType === "package" ? "Start date" : "Date"}:</strong> {date}
                  {bookingType === "shift" && shift && ` (${SHIFT_LABELS[shift]})`}
                  {bookingType === "one-time" && time && ` at ${time}`}
                  {bookingType === "package" &&
                    ` · ${selectedDurationOption?.label ?? `${durationDays} day${durationDays > 1 ? "s" : ""}`}`}
                </p>
                <p><strong>Location:</strong> {location}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 mb-4">
                <p className="font-medium mb-2">Add-on Services</p>
                <div className="grid gap-2">
                  {AVAILABLE_ADDONS.map((a) => (
                    <AddOnItem key={a.id} id={a.id} name={a.name} price={a.price} checked={addOns.includes(a.id)} onChange={(checked) => {
                      setAddOns((prev) => checked ? [...prev, a.id] : prev.filter((p) => p !== a.id));
                    }} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <p className="text-sm text-slate-500">Pricing Summary</p>
                <div className="mt-3 flex justify-between"><span className="text-sm">Base</span><span className="font-bold">${pricing.base}</span></div>
                {pricing.addons.length > 0 && pricing.addons.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm text-slate-600"><span>{a.name}</span><span>${a.price}</span></div>
                ))}
                <div className="flex justify-between text-sm text-slate-600"><span>Tax</span><span>${pricing.tax}</span></div>
                <div className="mt-3 flex justify-between text-base font-bold text-slate-800"><span>Total</span><span>${pricing.total}</span></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Additional Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Describe your care needs or how to enter the building..."
                />
              </div>
              {/* T&C acknowledgment */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 mt-4">
                <input
                  type="checkbox"
                  id="tnc-accept"
                  checked={tncAccepted}
                  onChange={(e) => setTncAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="tnc-accept" className="text-xs text-slate-600 leading-relaxed">
                  I agree to the <Link href="/terms" className="text-sky-600 hover:underline" target="_blank">Terms of Service</Link> and <Link href="/privacy" className="text-sky-600 hover:underline" target="_blank">Privacy Policy</Link>. I confirm that the medical information I provided is accurate.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Form Navigation Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${step === 1 ? "text-transparent cursor-default" : "text-slate-600 hover:text-slate-800"}`}
          >
            <ChevronLeft className="h-4 w-4" /> Back
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
              className="flex items-center gap-1 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
            >
              Next Step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                loading ||
                !date ||
                !location ||
                !tncAccepted ||
                (bookingType === "shift" && !shift) ||
                (bookingType === "one-time" && !time) ||
                (bookingType === "package" && !packageId)
              }
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Confirm Booking"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
