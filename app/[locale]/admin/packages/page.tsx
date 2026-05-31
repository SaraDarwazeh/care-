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
  PackagePricingMode,
} from "@/lib/types";
import { buildLocalized, tLocalized, type LocalizedString } from "@/lib/i18nContent";

// Each timeline step / duration option carries its own bilingual pair.
// The form keeps Arabic next to English so admins translate inline,
// matching the side-by-side convention used in the smaller editors.
interface TimelineStepDraft {
  day: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

interface DurationOptionDraft {
  days: number;
  labelEn: string;
  labelAr: string;
  priceModifier: number;
}

interface FormState {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  targetAudienceEn: string;
  targetAudienceAr: string;
  // Arrays are edited as paired textareas: one column EN, one column AR,
  // entries paired by line index. Admins keep the two columns the same
  // length; an empty Arabic line means "AR not yet authored for this item".
  recommendedForEn: string;
  recommendedForAr: string;
  includedServicesEn: string;
  includedServicesAr: string;
  highlightsEn: string;
  highlightsAr: string;
  outcomesEn: string;
  outcomesAr: string;
  durationDays: string;
  durationOptions: DurationOptionDraft[];
  careTimeline: TimelineStepDraft[];
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
  titleEn: "",
  titleAr: "",
  summaryEn: "",
  summaryAr: "",
  descriptionEn: "",
  descriptionAr: "",
  targetAudienceEn: "",
  targetAudienceAr: "",
  recommendedForEn: "",
  recommendedForAr: "",
  includedServicesEn: "",
  includedServicesAr: "",
  highlightsEn: "",
  highlightsAr: "",
  outcomesEn: "",
  outcomesAr: "",
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

// Pair two newline-separated lists (EN + AR) into LocalizedString[].
// AR lines beyond the EN length are dropped; AR lines short of EN are
// treated as "AR not yet authored" (the LocalizedString omits .ar).
function pairLocalizedLines(en: string, ar: string): LocalizedString[] {
  const enLines = en.split(/\r?\n/).map((l) => l.trim());
  const arLines = ar.split(/\r?\n/).map((l) => l.trim());
  const out: LocalizedString[] = [];
  for (let i = 0; i < enLines.length; i++) {
    if (!enLines[i]) continue;
    const arVal = arLines[i] && arLines[i].length > 0 ? arLines[i] : undefined;
    out.push(arVal ? { en: enLines[i], ar: arVal } : { en: enLines[i] });
  }
  return out;
}

// Inverse: split a LocalizedString[] into two newline-separated strings
// for the form. AR column gets empty placeholder lines where ar is missing
// so the indices stay aligned.
function unpairLocalizedLines(values?: LocalizedString[]): { en: string; ar: string } {
  if (!values || values.length === 0) return { en: "", ar: "" };
  return {
    en: values.map((v) => v.en).join("\n"),
    ar: values.map((v) => v.ar ?? "").join("\n"),
  };
}

function splitCsv(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function packageToForm(pkg: CarePackage): FormState {
  const rec = unpairLocalizedLines(pkg.recommendedFor);
  const inc = unpairLocalizedLines(pkg.includedServices);
  const hl = unpairLocalizedLines(pkg.highlights);
  const out = unpairLocalizedLines(pkg.outcomes);
  return {
    id: pkg.id,
    slug: pkg.slug,
    titleEn: pkg.title.en,
    titleAr: pkg.title.ar ?? "",
    summaryEn: pkg.summary.en,
    summaryAr: pkg.summary.ar ?? "",
    descriptionEn: pkg.description?.en ?? "",
    descriptionAr: pkg.description?.ar ?? "",
    targetAudienceEn: pkg.targetAudience?.en ?? "",
    targetAudienceAr: pkg.targetAudience?.ar ?? "",
    recommendedForEn: rec.en,
    recommendedForAr: rec.ar,
    includedServicesEn: inc.en,
    includedServicesAr: inc.ar,
    highlightsEn: hl.en,
    highlightsAr: hl.ar,
    outcomesEn: out.en,
    outcomesAr: out.ar,
    durationDays: String(pkg.durationDays ?? ""),
    durationOptions: (pkg.durationOptions ?? []).map((o) => ({
      days: o.days,
      labelEn: o.label.en,
      labelAr: o.label.ar ?? "",
      priceModifier: o.priceModifier ?? 1,
    })),
    careTimeline: (pkg.careTimeline ?? []).map((s) => ({
      day: s.day,
      titleEn: s.title.en,
      titleAr: s.title.ar ?? "",
      descriptionEn: s.description.en,
      descriptionAr: s.description.ar ?? "",
    })),
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

function formToInput(form: FormState): CarePackageInput | { error: string } {
  const trimmedId = form.id.trim();
  const slug = (form.slug.trim() || trimmedId).toLowerCase().replace(/\s+/g, "-");
  const title = buildLocalized(form.titleEn, form.titleAr);
  const summary = buildLocalized(form.summaryEn, form.summaryAr);
  if (!title) return { error: "Title (English) is required." };
  if (!summary) return { error: "Summary (English) is required." };
  const cleanedDurationOptions = form.durationOptions
    .filter((opt) => opt.days > 0 && opt.labelEn.trim().length > 0)
    .map((opt) => {
      const label = buildLocalized(opt.labelEn, opt.labelAr);
      return label
        ? {
            days: opt.days,
            label,
            ...(opt.priceModifier !== undefined && opt.priceModifier !== 1
              ? { priceModifier: opt.priceModifier }
              : {}),
          }
        : null;
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);
  const cleanedTimeline = form.careTimeline
    .filter((step) => step.titleEn.trim().length > 0)
    .map((step) => {
      const stitle = buildLocalized(step.titleEn, step.titleAr);
      const sdesc = buildLocalized(step.descriptionEn, step.descriptionAr);
      return stitle && sdesc ? { day: step.day, title: stitle, description: sdesc } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const images = form.images.filter((url) => url.trim().length > 0);
  return {
    id: trimmedId || undefined,
    slug,
    title,
    summary,
    description: buildLocalized(form.descriptionEn, form.descriptionAr),
    targetAudience: buildLocalized(form.targetAudienceEn, form.targetAudienceAr),
    recommendedFor: pairLocalizedLines(form.recommendedForEn, form.recommendedForAr),
    includedServices: pairLocalizedLines(form.includedServicesEn, form.includedServicesAr),
    highlights: pairLocalizedLines(form.highlightsEn, form.highlightsAr),
    outcomes: pairLocalizedLines(form.outcomesEn, form.outcomesAr),
    careTimeline: cleanedTimeline.length > 0 ? cleanedTimeline : undefined,
    durationDays: Math.max(1, Number(form.durationDays) || 1),
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

// Inline bilingual text pair — reduces repetition across the form.
function BiPair({
  labelEn,
  labelAr,
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  required,
  multiline,
  placeholderEn,
  placeholderAr,
}: {
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  onChangeEn: (v: string) => void;
  onChangeAr: (v: string) => void;
  required?: boolean;
  multiline?: boolean;
  placeholderEn?: string;
  placeholderAr?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          {labelEn} {required && <span className="text-rose-500">*</span>}
        </label>
        {multiline ? (
          <textarea required={required} value={valueEn} onChange={(e) => onChangeEn(e.target.value)} dir="ltr"
            className="w-full min-h-[80px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder={placeholderEn} />
        ) : (
          <input required={required} value={valueEn} onChange={(e) => onChangeEn(e.target.value)} dir="ltr"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder={placeholderEn} />
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">{labelAr}</label>
        {multiline ? (
          <textarea value={valueAr} onChange={(e) => onChangeAr(e.target.value)} dir="rtl"
            className="w-full min-h-[80px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder={placeholderAr} />
        ) : (
          <input value={valueAr} onChange={(e) => onChangeAr(e.target.value)} dir="rtl"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder={placeholderAr} />
        )}
      </div>
    </div>
  );
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

  // Both effects gated on appUser so Firestore reads don't fire before
  // auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getPricingConfig()
      .then((cfg) => { if (active) setAddonCatalog(cfg.addons); })
      .catch((err) => console.error("[AdminPackagesPage] failed to load pricing config", err));
    return () => { active = false; };
  }, [appUser]);

  async function reload() {
    const data = await listPackages(true);
    setPackages(data);
  }

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    listPackages(true)
      .then((data) => { if (active) setPackages(data); })
      .catch((err) => {
        console.error("[AdminPackagesPage] failed to load", err);
        if (active) setError("Failed to load packages.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appUser]);

  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(pkg: CarePackage) { setEditingId(pkg.id); setForm(packageToForm(pkg)); setShowForm(true); }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = formToInput(form);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (editingId) {
        await updatePackage(editingId, result);
      } else {
        await createPackage(result);
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
    if (!confirm("Delete this package? This cannot be undone.")) return;
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

  if (authLoading || !appUser || loading) return <LoadingScreen text="Loading…" />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Care Packages</h1>
          <p className="text-slate-500 mt-1">Manage the structured care plans patients can book from the marketplace. English is required; Arabic optional but recommended for launch.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition">
          <Plus className="h-5 w-5" /> Add Package
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      )}

      {showForm && (
        <div className="rounded-3xl bg-white shadow-sm border border-sky-200 p-6 sm:p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">{editingId ? "Edit Package" : "Add New Package"}</h2>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Slug (optional)</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="elderly-companion (defaults to ID)" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Duration (days) *</label>
                <input required type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" />
              </div>
            </div>

            <BiPair labelEn="Title (English)" labelAr="العنوان (العربية)" valueEn={form.titleEn} valueAr={form.titleAr}
              onChangeEn={(v) => setForm({ ...form, titleEn: v })} onChangeAr={(v) => setForm({ ...form, titleAr: v })} required
              placeholderEn="Elderly Companion Care" placeholderAr="رعاية مرافقة المسنين" />

            <BiPair labelEn="Summary (English)" labelAr="الملخّص (العربية)" valueEn={form.summaryEn} valueAr={form.summaryAr}
              onChangeEn={(v) => setForm({ ...form, summaryEn: v })} onChangeAr={(v) => setForm({ ...form, summaryAr: v })} required multiline
              placeholderEn="One or two sentences." placeholderAr="جملة أو جملتان." />

            <BiPair labelEn="Description (English, optional)" labelAr="الوصف (العربية)" valueEn={form.descriptionEn} valueAr={form.descriptionAr}
              onChangeEn={(v) => setForm({ ...form, descriptionEn: v })} onChangeAr={(v) => setForm({ ...form, descriptionAr: v })} multiline
              placeholderEn="Longer description for the detail page." placeholderAr="وصف أطول لصفحة التفاصيل." />

            <BiPair labelEn="Target audience (English, optional)" labelAr="الجمهور المستهدف (العربية)" valueEn={form.targetAudienceEn} valueAr={form.targetAudienceAr}
              onChangeEn={(v) => setForm({ ...form, targetAudienceEn: v })} onChangeAr={(v) => setForm({ ...form, targetAudienceAr: v })}
              placeholderEn="Elderly patients living at home…" placeholderAr="المسنون المقيمون في المنزل…" />

            <p className="text-xs text-slate-500 -mb-2">For lists below: write one item per line in the English column, then a matching translation on the same line in Arabic.</p>

            <BiPair labelEn="Highlights (English, one per line)" labelAr="النقاط البارزة (العربية)" valueEn={form.highlightsEn} valueAr={form.highlightsAr}
              onChangeEn={(v) => setForm({ ...form, highlightsEn: v })} onChangeAr={(v) => setForm({ ...form, highlightsAr: v })} multiline
              placeholderEn={"Daily companionship\nMeal support"} placeholderAr={"مرافقة يومية\nدعم الوجبات"} />

            <BiPair labelEn="Included services (English, one per line)" labelAr="الخدمات المشمولة (العربية)" valueEn={form.includedServicesEn} valueAr={form.includedServicesAr}
              onChangeEn={(v) => setForm({ ...form, includedServicesEn: v })} onChangeAr={(v) => setForm({ ...form, includedServicesAr: v })} multiline
              placeholderEn={"Companion support\nMeal preparation"} placeholderAr={"دعم المرافقة\nإعداد الوجبات"} />

            <BiPair labelEn="Outcomes (English, optional)" labelAr="النتائج المتوقّعة (العربية)" valueEn={form.outcomesEn} valueAr={form.outcomesAr}
              onChangeEn={(v) => setForm({ ...form, outcomesEn: v })} onChangeAr={(v) => setForm({ ...form, outcomesAr: v })} multiline
              placeholderEn={"Predictable daily routine"} placeholderAr={"روتين يومي مستقرّ"} />

            <BiPair labelEn="Recommended for (English, optional)" labelAr="موصى به لـ (العربية)" valueEn={form.recommendedForEn} valueAr={form.recommendedForAr}
              onChangeEn={(v) => setForm({ ...form, recommendedForEn: v })} onChangeAr={(v) => setForm({ ...form, recommendedForAr: v })} multiline
              placeholderEn={"Seniors at risk of isolation"} placeholderAr={"كبار السن المعرّضون للعزلة"} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Shifts (comma-separated)</label>
                <input value={form.shiftOptions} onChange={(e) => setForm({ ...form, shiftOptions: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none" placeholder="A, B, C" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Base price / day {form.pricingMode === "fixed" ? <span className="text-rose-500">*</span> : <span className="font-normal text-slate-400">(optional)</span>}
                </label>
                <input type="number" min="0" step="0.01" value={form.basePricePerDay} onChange={(e) => setForm({ ...form, basePricePerDay: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder={form.pricingMode === "fixed" ? "Required" : "leave empty to use nurse hourly rate"} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pricing mode</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  { id: "fixed" as const, title: "Fixed bundle", desc: "Duration, shifts, and price are locked." },
                  { id: "dynamic" as const, title: "Dynamic", desc: "Patient picks a duration; price recalculates." },
                ]).map((opt) => {
                  const active = form.pricingMode === opt.id;
                  return (
                    <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${active ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-sky-200"}`}>
                      <input type="radio" name="pricingMode" value={opt.id} checked={active} onChange={() => setForm({ ...form, pricingMode: opt.id })} className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{opt.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <ImageUploadField scope="package" label="Hero image (optional)" value={form.image} onChange={(image) => setForm({ ...form, image })}
              helperText="Used as the package cover on cards + detail page." />

            <ImageUploadField mode="multi" scope="package" label="Additional images (optional)" value={form.images} onChange={(images) => setForm({ ...form, images })}
              helperText="Detail-page carousel images." maxFiles={8} />

            {/* Duration options */}
            {form.pricingMode !== "fixed" && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">Duration options</p>
                  <button type="button" onClick={() => setForm({
                    ...form,
                    durationOptions: [...form.durationOptions, { days: Number(form.durationDays) || 7, labelEn: "", labelAr: "", priceModifier: 1 }],
                  })} className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700">
                    <Plus className="h-4 w-4" /> Add option
                  </button>
                </div>
                {form.durationOptions.length === 0 ? (
                  <p className="text-xs italic text-slate-500">No options yet — patients will be locked to the base duration.</p>
                ) : (
                  <div className="space-y-3">
                    {form.durationOptions.map((opt, index) => (
                      <div key={index} className="rounded-xl bg-white p-3 shadow-sm space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[80px_1fr_100px_44px]">
                          <input type="number" min={1} value={opt.days} onChange={(e) => setForm({
                            ...form, durationOptions: form.durationOptions.map((o, i) => i === index ? { ...o, days: Number(e.target.value) || 1 } : o),
                          })} placeholder="Days" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <input value={opt.labelEn} onChange={(e) => setForm({
                            ...form, durationOptions: form.durationOptions.map((o, i) => i === index ? { ...o, labelEn: e.target.value } : o),
                          })} placeholder="Label EN (e.g. 1 week)" dir="ltr" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <input type="number" step="0.05" min={0.1} value={opt.priceModifier} onChange={(e) => setForm({
                            ...form, durationOptions: form.durationOptions.map((o, i) => i === index ? { ...o, priceModifier: Number(e.target.value) || 1 } : o),
                          })} placeholder="Modifier" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <button type="button" onClick={() => setForm({ ...form, durationOptions: form.durationOptions.filter((_, i) => i !== index) })}
                            className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100" aria-label="Remove duration option">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <input value={opt.labelAr} onChange={(e) => setForm({
                          ...form, durationOptions: form.durationOptions.map((o, i) => i === index ? { ...o, labelAr: e.target.value } : o),
                        })} placeholder="التسمية بالعربية" dir="rtl" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Care timeline */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Care timeline</p>
                <button type="button" onClick={() => setForm({
                  ...form, careTimeline: [...form.careTimeline, { day: form.careTimeline.length + 1, titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "" }],
                })} className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700">
                  <Plus className="h-4 w-4" /> Add step
                </button>
              </div>
              {form.careTimeline.length === 0 ? (
                <p className="text-xs italic text-slate-500">No timeline steps configured.</p>
              ) : (
                <div className="space-y-3">
                  {form.careTimeline.map((step, index) => (
                    <div key={index} className="rounded-xl bg-white p-3 shadow-sm space-y-2">
                      <div className="flex items-start gap-2">
                        <input type="number" min={1} value={step.day} onChange={(e) => setForm({
                          ...form, careTimeline: form.careTimeline.map((s, i) => i === index ? { ...s, day: Number(e.target.value) || 1 } : s),
                        })} placeholder="Day" className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <button type="button" onClick={() => setForm({ ...form, careTimeline: form.careTimeline.filter((_, i) => i !== index) })}
                          className="ms-auto rounded-lg bg-rose-50 px-3 py-2 text-rose-600 hover:bg-rose-100" aria-label="Remove timeline step">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input value={step.titleEn} onChange={(e) => setForm({
                          ...form, careTimeline: form.careTimeline.map((s, i) => i === index ? { ...s, titleEn: e.target.value } : s),
                        })} placeholder="Step title (EN)" dir="ltr" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <input value={step.titleAr} onChange={(e) => setForm({
                          ...form, careTimeline: form.careTimeline.map((s, i) => i === index ? { ...s, titleAr: e.target.value } : s),
                        })} placeholder="عنوان الخطوة" dir="rtl" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <textarea value={step.descriptionEn} onChange={(e) => setForm({
                          ...form, careTimeline: form.careTimeline.map((s, i) => i === index ? { ...s, descriptionEn: e.target.value } : s),
                        })} placeholder="What happens on this day (EN)" dir="ltr" className="min-h-[60px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <textarea value={step.descriptionAr} onChange={(e) => setForm({
                          ...form, careTimeline: form.careTimeline.map((s, i) => i === index ? { ...s, descriptionAr: e.target.value } : s),
                        })} placeholder="ما يحدث في هذا اليوم" dir="rtl" className="min-h-[60px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Default add-ons */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-1 text-sm font-bold text-slate-700">Default add-ons</p>
              <p className="mb-3 text-xs text-slate-500">Nurses can override with their own additional services.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {addonCatalog.map((addon) => {
                  const checked = form.addOns.includes(addon.id);
                  return (
                    <label key={addon.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${checked ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-sky-200"}`}>
                      <span className="flex items-center gap-2">
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => setForm({
                          ...form, addOns: checked ? form.addOns.filter((id) => id !== addon.id) : [...form.addOns, addon.id],
                        })} />
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
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" />
                Active (visible to patients)
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400" />
                Featured (homepage / highlighted lists)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-sky-600 font-bold text-white hover:bg-sky-700 shadow-md transition disabled:opacity-50">
                <Check className="h-4 w-4" />{saving ? "Saving..." : editingId ? "Update Package" : "Create Package"}
              </button>
            </div>
          </form>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <HeartHandshake className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No packages yet</p>
          <p className="text-slate-500 text-sm mb-4">Click Add Package to publish your first care plan.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-200 transition">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-800">{tLocalized(pkg.title, "en")}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pkg.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {pkg.active ? "Active" : "Hidden"}
                  </span>
                  {pkg.featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Featured</span>
                  )}
                  {!pkg.title.ar && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">AR title missing</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tLocalized(pkg.summary, "en")}</p>
                <p className="text-xs text-slate-400 mt-2">
                  ID: <span className="font-mono">{pkg.id}</span> · Duration: {pkg.durationDays} days
                  {pkg.shiftOptions && pkg.shiftOptions.length > 0 && (<> · Shifts: {pkg.shiftOptions.join(", ")}</>)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button onClick={() => toggleField(pkg, "featured")} disabled={busyId === pkg.id}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50">
                  {pkg.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}{pkg.featured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={() => toggleField(pkg, "active")} disabled={busyId === pkg.id}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${pkg.active ? "text-slate-600 bg-slate-100 hover:bg-slate-200" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}>
                  {pkg.active ? "Hide" : "Activate"}
                </button>
                <button onClick={() => openEdit(pkg)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 transition">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(pkg.id)} disabled={busyId === pkg.id}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50">
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
