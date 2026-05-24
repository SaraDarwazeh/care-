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
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
  type CarePackageInput,
} from "@/services/packageService";
import type { CarePackage } from "@/lib/types";

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
  shiftOptions: string;
  basePricePerDay: string;
  image: string;
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
  shiftOptions: "A, B",
  basePricePerDay: "",
  image: "",
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
    shiftOptions: (pkg.shiftOptions ?? []).join(", "),
    basePricePerDay: pkg.basePricePerDay ? String(pkg.basePricePerDay) : "",
    image: pkg.image ?? pkg.images?.[0] ?? "",
    active: pkg.active,
    featured: pkg.featured,
  };
}

function formToInput(form: FormState): CarePackageInput {
  const trimmedId = form.id.trim();
  const slug = (form.slug.trim() || trimmedId).toLowerCase().replace(/\s+/g, "-");
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
    durationDays: Math.max(1, Number(form.durationDays) || 1),
    shiftOptions: splitCsv(form.shiftOptions.toUpperCase()),
    basePricePerDay: form.basePricePerDay ? Number(form.basePricePerDay) : undefined,
    image: form.image.trim() || undefined,
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Base price / day (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePricePerDay}
                  onChange={(e) => setForm({ ...form, basePricePerDay: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="leave empty to use nurse hourly rate"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Hero image URL (optional)
                </label>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="https://..."
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
