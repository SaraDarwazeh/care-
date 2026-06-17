"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import {
  createEducationCard,
  deleteEducationCard,
  getAllEducationCardsForAdmin,
  updateEducationCard,
  type EducationCardInput,
} from "@/services/educationService";
import { EDUCATION_ACCENTS, type EducationCard, type EducationCardKind } from "@/lib/types";
import {
  EDUCATION_ICONS,
  EDUCATION_ICON_CHOICES,
} from "@/components/education/EducationSection";
import { buildLocalized, tLocalized } from "@/lib/i18nContent";

const TITLE_MAX = 60;
const BODY_MAX = 180;

const KIND_LABELS: Record<EducationCardKind, string> = {
  why: "Why home care",
  faq: "FAQ",
  "what-to-expect": "What to expect",
};

// Bilingual form state — per Phase 5 plan, every LocalizedString field
// is edited as a side-by-side EN/AR text pair. submit normalizes via
// buildLocalized() which drops empty Arabic so the stored shape stays
// canonical.
interface FormState {
  id: string;
  kind: EducationCardKind;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  icon: string;
  accent: EducationCard["accent"] | "";
  active: boolean;
}

const EMPTY_FORM: FormState = {
  id: "",
  kind: "why",
  titleEn: "",
  titleAr: "",
  bodyEn: "",
  bodyAr: "",
  icon: "",
  accent: "",
  active: true,
};

function cardToForm(card: EducationCard): FormState {
  return {
    id: card.id,
    kind: card.kind,
    titleEn: card.title.en,
    titleAr: card.title.ar ?? "",
    bodyEn: card.body.en,
    bodyAr: card.body.ar ?? "",
    icon: card.icon ?? "",
    accent: card.accent ?? "",
    active: card.active,
  };
}

function formToInput(form: FormState): EducationCardInput | { error: string } {
  const title = buildLocalized(form.titleEn, form.titleAr);
  const body = buildLocalized(form.bodyEn, form.bodyAr);
  if (!title) return { error: "Title (English) is required." };
  if (!body) return { error: "Body (English) is required." };
  return {
    id: form.id.trim() || undefined,
    kind: form.kind,
    title,
    body,
    icon: form.icon.trim() || undefined,
    accent: form.accent || undefined,
    active: form.active,
  };
}

export default function AdminEducationPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.education");
  const [cards, setCards] = useState<EducationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | EducationCardKind>("all");

  async function reload() {
    setError(null);
    try {
      const data = await getAllEducationCardsForAdmin();
      setCards(data);
    } catch (err) {
      console.error("[admin/education] load failed", err);
      setError(err instanceof Error ? err.message : "Failed to load cards.");
    }
  }

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getAllEducationCardsForAdmin()
      .then((data) => {
        if (active) setCards(data);
      })
      .catch((err) => {
        console.error("[admin/education] load failed", err);
        if (active) setError(err instanceof Error ? err.message : "Failed to load cards.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(card: EducationCard) {
    setEditingId(card.id);
    setForm(cardToForm(card));
    setShowForm(true);
  }

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
      if (result.title.en.length > TITLE_MAX || (result.title.ar?.length ?? 0) > TITLE_MAX) {
        setError(`Title must be ${TITLE_MAX} characters or fewer (per language).`);
        return;
      }
      if (result.body.en.length > BODY_MAX || (result.body.ar?.length ?? 0) > BODY_MAX) {
        setError(`Body must be ${BODY_MAX} characters or fewer (per language).`);
        return;
      }
      if (editingId) {
        await updateEducationCard(editingId, result);
      } else {
        await createEducationCard(result);
      }
      await reload();
      setShowForm(false);
    } catch (err) {
      console.error("[admin/education] save failed", err);
      setError(err instanceof Error ? err.message : "Failed to save card.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(card: EducationCard) {
    if (!confirm(`Delete "${tLocalized(card.title, "en")}"? This cannot be undone.`)) return;
    setBusyId(card.id);
    try {
      await deleteEducationCard(card.id);
      await reload();
    } catch (err) {
      console.error("[admin/education] delete failed", err);
      setError(err instanceof Error ? err.message : "Failed to delete card.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(card: EducationCard) {
    setBusyId(card.id);
    try {
      await updateEducationCard(card.id, { active: !card.active });
      await reload();
    } catch (err) {
      console.error("[admin/education] toggle failed", err);
      setError(err instanceof Error ? err.message : "Failed to update card.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(card: EducationCard, direction: "up" | "down") {
    const sameKind = cards.filter((c) => c.kind === card.kind);
    const idx = sameKind.findIndex((c) => c.id === card.id);
    if (idx === -1) return;
    const neighbor = direction === "up" ? sameKind[idx - 1] : sameKind[idx + 1];
    if (!neighbor) return;
    setBusyId(card.id);
    try {
      await Promise.all([
        updateEducationCard(card.id, { order: neighbor.order }),
        updateEducationCard(neighbor.id, { order: card.order }),
      ]);
      await reload();
    } catch (err) {
      console.error("[admin/education] reorder failed", err);
      setError(err instanceof Error ? err.message : "Failed to reorder.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => c.kind === filter);
  }, [cards, filter]);

  const counts = useMemo(() => {
    return {
      all: cards.length,
      why: cards.filter((c) => c.kind === "why").length,
      faq: cards.filter((c) => c.kind === "faq").length,
      "what-to-expect": cards.filter((c) => c.kind === "what-to-expect").length,
    };
  }, [cards]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-deep shadow-md shadow-brand/20 transition"
        >
          <Plus className="h-5 w-5" /> {t("addCard")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Kind filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "why", "what-to-expect", "faq"] as const).map((k) => {
          const active = filter === k;
          const label = k === "all" ? "All" : KIND_LABELS[k];
          const count = counts[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-brand bg-brand-soft/30 text-brand-deep shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-brand-soft"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-brand-soft/50 text-brand-deep" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-3xl bg-white shadow-sm border border-brand-soft p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? "Edit card" : "Add new card"}
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Bucket *</label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as EducationCardKind })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="why">Why home care</option>
                  <option value="what-to-expect">What to expect</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Accent</label>
                <select
                  value={form.accent ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accent: (e.target.value || "") as EducationCard["accent"] | "",
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Default (sky)</option>
                  {EDUCATION_ACCENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bilingual title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Title (English) * <span className="font-normal text-slate-400">({form.titleEn.length}/{TITLE_MAX})</span>
                </label>
                <input
                  required
                  maxLength={TITLE_MAX}
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  placeholder="e.g. Recovery happens better at home"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  العنوان (العربية) <span className="font-normal text-slate-400">({form.titleAr.length}/{TITLE_MAX})</span>
                </label>
                <input
                  maxLength={TITLE_MAX}
                  value={form.titleAr}
                  onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  dir="rtl"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  placeholder="مثلًا: التعافي أسرع في المنزل"
                />
              </div>
            </div>

            {/* Bilingual body */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Body (English) * <span className="font-normal text-slate-400">({form.bodyEn.length}/{BODY_MAX})</span>
                </label>
                <textarea
                  required
                  maxLength={BODY_MAX}
                  value={form.bodyEn}
                  onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
                  dir="ltr"
                  className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  placeholder="One or two short sentences. Patients scan, they don't read."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  المحتوى (العربية) <span className="font-normal text-slate-400">({form.bodyAr.length}/{BODY_MAX})</span>
                </label>
                <textarea
                  maxLength={BODY_MAX}
                  value={form.bodyAr}
                  onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
                  dir="rtl"
                  className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  placeholder="جملة أو جملتان قصيرتان. المرضى يتصفّحون لا يقرؤون."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_ICON_CHOICES.map((name) => {
                  const Icon = EDUCATION_ICONS[name];
                  const active = form.icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm({ ...form, icon: active ? "" : name })}
                      title={name}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                        active
                          ? "border-brand bg-brand-soft/30 text-brand-deep"
                          : "border-slate-200 bg-white text-slate-500 hover:border-brand-soft"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 pt-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded text-brand focus:ring-brand-soft/50"
              />
              Active (visible on the homepage)
            </label>

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
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand font-bold text-white hover:bg-brand-deep shadow-md transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : editingId ? "Update card" : "Create card"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">No cards in this bucket</p>
          <p className="text-slate-500 text-sm">Click Add card to create one.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((card) => {
            const sameKind = cards.filter((c) => c.kind === card.kind);
            const idxInKind = sameKind.findIndex((c) => c.id === card.id);
            const canUp = idxInKind > 0;
            const canDown = idxInKind < sameKind.length - 1;
            const hasArTitle = Boolean(card.title.ar);
            const hasArBody = Boolean(card.body.ar);
            return (
              <div
                key={card.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800">{tLocalized(card.title, "en")}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {KIND_LABELS[card.kind]}
                      </span>
                      {!card.active && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Hidden
                        </span>
                      )}
                      {(!hasArTitle || !hasArBody) && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          AR incomplete
                        </span>
                      )}
                    </div>
                    {hasArTitle && (
                      <p className="mt-0.5 text-sm font-bold text-slate-600" dir="rtl">{card.title.ar}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{tLocalized(card.body, "en")}</p>
                    {hasArBody && (
                      <p className="mt-0.5 text-sm text-slate-500 leading-relaxed" dir="rtl">{card.body.ar}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      icon: {card.icon ?? "—"} · accent: {card.accent ?? "default"} · order: {card.order}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => move(card, "up")}
                      disabled={!canUp || busyId === card.id}
                      className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(card, "down")}
                      disabled={!canDown || busyId === card.id}
                      className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(card)}
                      disabled={busyId === card.id}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        card.active
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {card.active ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Show
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-soft/30 px-3 py-2 text-xs font-bold text-brand-deep hover:bg-brand-soft/50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(card)}
                      disabled={busyId === card.id}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
