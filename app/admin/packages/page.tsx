"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  HeartHandshake,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  StarOff,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import ImageUploadField from "@/components/common/ImageUploadField";
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
  type CarePackageInput,
} from "@/services/packageService";
import { getPricingConfig } from "@/services/pricingConfigService";
import { AVAILABLE_ADDONS } from "@/lib/pricingConstants";
import type { AddOn } from "@/lib/pricingConstants";
import type {
  CarePackage,
  PackageDurationOption,
  PackagePricingMode,
  PackageTimelineStep,
} from "@/lib/types";

interface FormState {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  targetAudience: string;
  recommendedFor: string;
  includedServices: string;
  highlights: string;
  outcomes: string;
  durationDays: string;
  durationOptions: PackageDurationOption[];
  careTimeline: PackageTimelineStep[];
  shiftOptions: string;
  basePricePerDay: string;
  pricingMode: PackagePricingMode;
  image: string;
  images: string[];
  addOns: string[];
  active: boolean;
  featured: boolean;
}

const EMPTY_FORM: FormState = {
  id: "",
  slug: "",
  title: "",
  summary: "",
  description: "",
  targetAudience: "",
  recommendedFor: "",
  includedServices: "",
  highlights: "",
  outcomes: "",
  durationDays: "",
  durationOptions: [],
  careTimeline: [],
  shiftOptions: "A, B",
  basePricePerDay: "",
  pricingMode: "dynamic",
  image: "",
  images: [],
  addOns: [],
  active: true,
  featured: false,
};

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function packageToForm(pkg: CarePackage): FormState {
  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    summary: pkg.summary,
    description: pkg.description ?? "",
    targetAudience: pkg.targetAudience ?? "",
    recommendedFor: (pkg.recommendedFor ?? []).join("\n"),
    includedServices: (pkg.includedServices ?? []).join("\n"),
    highlights: (pkg.highlights ?? []).join("\n"),
    outcomes: (pkg.outcomes ?? []).join("\n"),
    durationDays: String(pkg.durationDays ?? ""),
    durationOptions: pkg.durationOptions ?? [],
    careTimeline: pkg.careTimeline ?? [],
    shiftOptions: (pkg.shiftOptions ?? []).join(", "),
    basePricePerDay: pkg.basePricePerDay ? String(pkg.basePricePerDay) : "",
    pricingMode: pkg.pricingMode ?? "dynamic",
    image: pkg.image ?? pkg.images?.[0] ?? "",
    images: pkg.images ?? [],
    addOns: pkg.addOns ?? [],
    active: pkg.active,
    featured: pkg.featured,
  };
}

function formToInput(form: FormState): CarePackageInput {
  const trimmedId = form.id.trim();
  const slug = (form.slug.trim() || trimmedId).toLowerCase().replace(/\s+/g, "-");
  const cleanedDurationOptions = form.durationOptions
    .filter((opt) => opt.days > 0 && opt.label.trim().length > 0)
    .map((opt) => ({
      days: opt.days,
      label: opt.label.trim(),
      ...(opt.priceModifier !== undefined && opt.priceModifier !== 1
        ? { priceModifier: opt.priceModifier }
        : {}),
    }));
  const cleanedTimeline = form.careTimeline
    .filter((step) => step.title.trim().length > 0)
    .map((step) => ({
      day: step.day,
      title: step.title.trim(),
      description: step.description.trim(),
    }));
  const images = form.images.filter((url) => url.trim().length > 0);
  return {
    id: trimmedId || undefined,
    slug,
    title: form.title.trim(),
    summary: form.summary.trim(),
    description: form.description.trim() || undefined,
    targetAudience: form.targetAudience.trim() || undefined,
    recommendedFor: splitLines(form.recommendedFor),
    includedServices: splitLines(form.includedServices),
    highlights: splitLines(form.highlights),
    outcomes: splitLines(form.outcomes),
    careTimeline: cleanedTimeline.length > 0 ? cleanedTimeline : undefined,
    durationDays: Math.max(1, Number(form.durationDays) || 1),
    // Fixed-mode packages lock duration, so durationOptions are
    // irrelevant — strip them on save to avoid confusing the booking form.
    durationOptions:
      form.pricingMode === "fixed"
        ? undefined
        : cleanedDurationOptions.length > 0
        ? cleanedDurationOptions
        : undefined,
    shiftOptions: splitCsv(form.shiftOptions.toUpperCase()),
    basePricePerDay: form.basePricePerDay ? Number(form.basePricePerDay) : undefined,
    pricingMode: form.pricingMode,
    image: form.image.trim() || images[0] || undefined,
    images: images.length > 0 ? images : undefined,
    addOns: form.addOns.length > 0 ? form.addOns : undefined,
    active: form.active,
    featured: form.featured,
  };
}

export default function AdminPackagesPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const [packages, setPackages] = useState<CarePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addonCatalog, setAddonCatalog] = useState<AddOn[]>(AVAILABLE_ADDONS as AddOn[]);

  useEffect(() => {
    let active = true;
    getPricingConfig()
      .then((cfg) => {
        if (active) setAddonCatalog(cfg.addons);
      })
      .catch((err) => {
        console.error("[AdminPackagesPage] failed to load pricing config", err);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    const data = await listPackages(true);
    setPackages(data);
  }

  useEffect(() => {
    let active = true;
    listPackages(true)
      .then((data) => {
        if (active) setPackages(data);
      })
      .catch((err) => {
        console.error("[AdminPackagesPage] failed to load", err);
        if (active) setError("Failed to load packages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(pkg: CarePackage) {
    setEditingId(pkg.id);
    setForm(packageToForm(pkg));
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = formToInput(form);
      if (!payload.title || !payload.summary) {
        setError("Title and summary are required.");
        return;
      }
      if (payload.pricingMode === "fixed" && !payload.basePricePerDay) {
        setError("Fixed-mode packages need a base price per day so the total is unambiguous.");
        return;
      }
      if (editingId) {
        await updatePackage(editingId, payload);
      } else {
        await createPackage(payload);
      }
      await reload();
      setShowForm(false);
    } catch (err) {
      console.error("[AdminPackagesPage] save failed", err);
      setError(err instanceof Error ? err.message : "Failed to save package.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this package permanently?")) return;
    setBusyId(id);
    try {
      await deletePackage(id);
      await reload();
    } catch (err) {
      console.error("[AdminPackagesPage] delete failed", err);
      setError(err instanceof Error ? err.message : "Failed to delete package.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleField(pkg: CarePackage, field: "active" | "featured") {
    setBusyId(pkg.id);
    try {
      await updatePackage(pkg.id, { [field]: !pkg[field] } as Partial<CarePackageInput>);
      await reload();
    } catch (err) {
      console.error("[AdminPackagesPage] toggle failed", err);
      setError(err instanceof Error ? err.message : "Failed to update package.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text="Loading packages..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Care Packages</h1>
          <p className="text-slate-500 mt-1">
            Manage the structured care plans patients can book from the marketplace.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="h-5 w-5" /> Add Package
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl bg-white shadow-sm border border-sky-200 p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? "Edit Package" : "Add New Package"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Title *
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="Elderly Companion Care"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Slug (optional)
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="elderly-companion (defaults to ID)"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Summary *
                </label>
                <textarea
                  required
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="w-full min-h-[70px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="One or two sentences that explain what this package is."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="Longer description for the detail page."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Duration (days) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Shifts (comma-separated)
                </label>
                <input
                  value={form.shiftOptions}
                  onChange={(e) => setForm({ ...form, shiftOptions: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="A, B, C"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Pricing mode
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    {
                      id: "fixed" as const,
                      title: "Fixed bundle",
                      desc: "Duration, shifts, and price are locked. The patient books the package as-is. Requires a base price per day.",
                    },
                    {
                      id: "dynamic" as const,
                      title: "Dynamic",
                      desc: "Patient picks a duration from the options below; price recalculates per choice.",
                    },
                  ]).map((opt) => {
                    const active = form.pricingMode === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                          active
                            ? "border-sky-500 bg-sky-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-sky-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pricingMode"
                          value={opt.id}
                          checked={active}
                          onChange={() => setForm({ ...form, pricingMode: opt.id })}
                          className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{opt.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Base price / day{" "}
                  {form.pricingMode === "fixed" ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="font-normal text-slate-400">(optional)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePricePerDay}
                  onChange={(e) => setForm({ ...form, basePricePerDay: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={
                    form.pricingMode === "fixed"
                      ? "Required — fixed price per day"
                      : "leave empty to use nurse hourly rate"
                  }
                />
              </div>
              <div>
                <ImageUploadField
                  scope="package"
                  label="Hero image (optional)"
                  value={form.image}
                  onChange={(image) => setForm({ ...form, image })}
                  helperText="Used as the package cover on cards + detail page."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Target audience (optional)
                </label>
                <input
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="Elderly patients living at home..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Highlights (one per line)
                </label>
                <textarea
                  value={form.highlights}
                  onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                  className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={"Daily companionship\nMeal support"}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Included services (one per line)
                </label>
                <textarea
                  value={form.includedServices}
                  onChange={(e) => setForm({ ...form, includedServices: e.target.value })}
                  className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={"Companion support\nMeal preparation"}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Outcomes (one per line, optional)
                </label>
                <textarea
                  value={form.outcomes}
                  onChange={(e) => setForm({ ...form, outcomes: e.target.value })}
                  className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={"Predictable daily routine"}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Recommended for (one per line, optional)
                </label>
                <textarea
                  value={form.recommendedFor}
                  onChange={(e) => setForm({ ...form, recommendedFor: e.target.value })}
                  className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={"Seniors at risk of isolation"}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUploadField
                  mode="multi"
                  scope="package"
                  label="Additional images (optional)"
                  value={form.images}
                  onChange={(images) => setForm({ ...form, images })}
                  helperText="All images appear in the detail-page carousel. The first one is used as the hero if no hero is set above."
                  maxFiles={8}
                />
              </div>
            </div>

            {/* Duration options — only relevant for dynamic-mode packages. */}
            {form.pricingMode === "fixed" ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-800">Fixed-mode pricing</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Patients will book this package at its locked duration of{" "}
                  <strong>{Math.max(1, Number(form.durationDays) || 1)} day(s)</strong>. Duration options
                  are disabled — switch to <strong>Dynamic</strong> above if you want patients to choose.
                </p>
              </div>
            ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Duration options</p>
                  <p className="text-xs text-slate-500">
                    Let patients pick alternative lengths. Modifier 1.0 = base price, 0.9 = 10% discount.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      durationOptions: [
                        ...form.durationOptions,
                        { days: Number(form.durationDays) || 7, label: "", priceModifier: 1 },
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-4 w-4" /> Add option
                </button>
              </div>
              {form.durationOptions.length === 0 ? (
                <p className="text-xs italic text-slate-500">
                  No options yet — patients will be locked to the base duration.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.durationOptions.map((opt, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[80px_1fr_100px_44px]">
                      <input
                        type="number"
                        min={1}
                        value={opt.days}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            durationOptions: form.durationOptions.map((o, i) =>
                              i === index ? { ...o, days: Number(e.target.value) || 1 } : o,
                            ),
                          })
                        }
                        placeholder="Days"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={opt.label}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            durationOptions: form.durationOptions.map((o, i) =>
                              i === index ? { ...o, label: e.target.value } : o,
                            ),
                          })
                        }
                        placeholder="Label (e.g. 1 week)"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.05"
                        min={0.1}
                        value={opt.priceModifier ?? 1}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            durationOptions: form.durationOptions.map((o, i) =>
                              i === index
                                ? { ...o, priceModifier: Number(e.target.value) || 1 }
                                : o,
                            ),
                          })
                        }
                        placeholder="Modifier"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            durationOptions: form.durationOptions.filter((_, i) => i !== index),
                          })
                        }
                        className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100"
                        aria-label="Remove duration option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Care timeline */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Care timeline</p>
                  <p className="text-xs text-slate-500">
                    Step-by-step milestones shown on the package detail page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      careTimeline: [
                        ...form.careTimeline,
                        { day: form.careTimeline.length + 1, title: "", description: "" },
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-4 w-4" /> Add step
                </button>
              </div>
              {form.careTimeline.length === 0 ? (
                <p className="text-xs italic text-slate-500">No timeline steps configured.</p>
              ) : (
                <div className="space-y-3">
                  {form.careTimeline.map((step, index) => (
                    <div key={index} className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <input
                          type="number"
                          min={1}
                          value={step.day}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              careTimeline: form.careTimeline.map((s, i) =>
                                i === index ? { ...s, day: Number(e.target.value) || 1 } : s,
                              ),
                            })
                          }
                          placeholder="Day"
                          className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                          value={step.title}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              careTimeline: form.careTimeline.map((s, i) =>
                                i === index ? { ...s, title: e.target.value } : s,
                              ),
                            })
                          }
                          placeholder="Step title"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              careTimeline: form.careTimeline.filter((_, i) => i !== index),
                            })
                          }
                          className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100"
                          aria-label="Remove timeline step"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        value={step.description}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            careTimeline: form.careTimeline.map((s, i) =>
                              i === index ? { ...s, description: e.target.value } : s,
                            ),
                          })
                        }
                        placeholder="What happens on this day…"
                        className="mt-2 w-full min-h-[60px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Default add-ons */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-1 text-sm font-bold text-slate-700">Default add-ons</p>
              <p className="mb-3 text-xs text-slate-500">
                Suggested add-ons attached to this package by default. Nurses can override these
                with their own additional services.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {addonCatalog.map((addon) => {
                  const checked = form.addOns.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() =>
                            setForm({
                              ...form,
                              addOns: checked
                                ? form.addOns.filter((id) => id !== addon.id)
                                : [...form.addOns, addon.id],
                            })
                          }
                        />
                        <span className="font-bold">{addon.name}</span>
                      </span>
                      <span className="text-xs font-bold">${addon.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                />
                Active (visible to patients)
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400"
                />
                Featured (homepage / highlighted lists)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-sky-600 font-bold text-white hover:bg-sky-700 shadow-md transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : editingId ? "Update Package" : "Create Package"}
              </button>
            </div>
          </form>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <HeartHandshake className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No packages yet</p>
          <p className="text-slate-500 text-sm mb-4">
            Click Add Package to publish your first care plan.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-200 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-800">{pkg.title}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      pkg.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pkg.active ? "Active" : "Hidden"}
                  </span>
                  {pkg.featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{pkg.summary}</p>
                <p className="text-xs text-slate-400 mt-2">
                  ID: <span className="font-mono">{pkg.id}</span> · Duration: {pkg.durationDays} days
                  {pkg.shiftOptions && pkg.shiftOptions.length > 0 && (
                    <> · Shifts: {pkg.shiftOptions.join(", ")}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleField(pkg, "featured")}
                  disabled={busyId === pkg.id}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50"
                >
                  {pkg.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                  {pkg.featured ? "Unfeature" : "Feature"}
                </button>
                <button
                  onClick={() => toggleField(pkg, "active")}
                  disabled={busyId === pkg.id}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    pkg.active
                      ? "text-slate-600 bg-slate-100 hover:bg-slate-200"
                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  {pkg.active ? "Hide" : "Activate"}
                </button>
                <button
                  onClick={() => openEdit(pkg)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  disabled={busyId === pkg.id}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {busyId === pkg.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
