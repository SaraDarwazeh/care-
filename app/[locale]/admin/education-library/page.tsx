"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  PlaySquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import ImageUploadField from "@/components/common/ImageUploadField";
import VideoUploadField from "@/components/educationLibrary/VideoUploadField";
import {
  createEducationVideo,
  deleteEducationVideo,
  getAllVideosForAdmin,
  updateEducationVideo,
  type EducationVideoInput,
} from "@/services/educationLibraryService";
import {
  EDUCATION_VIDEO_CATEGORIES,
  type EducationVideo,
  type EducationVideoCategory,
} from "@/lib/types";
import { buildLocalized, tLocalized } from "@/lib/i18nContent";
import { type Locale } from "@/i18n/config";

const TITLE_MAX = 90;
const DESC_MAX = 500;

interface FormState {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number | undefined;
  category: EducationVideoCategory;
  tagsCsv: string;
  published: boolean;
}

const EMPTY_FORM: FormState = {
  id: "",
  titleEn: "",
  titleAr: "",
  descEn: "",
  descAr: "",
  videoUrl: "",
  thumbnailUrl: "",
  durationSeconds: undefined,
  category: "general",
  tagsCsv: "",
  published: false,
};

function videoToForm(v: EducationVideo): FormState {
  return {
    id: v.id,
    titleEn: v.title.en,
    titleAr: v.title.ar ?? "",
    descEn: v.description.en,
    descAr: v.description.ar ?? "",
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl ?? "",
    durationSeconds: v.durationSeconds,
    category: v.category,
    tagsCsv: (v.tags ?? []).join(", "),
    published: v.published,
  };
}

function fmtDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AdminEducationLibraryPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("educationLibrary.admin");
  const tForm = useTranslations("educationLibrary.admin.form");
  const tRow = useTranslations("educationLibrary.admin.row");
  const tCat = useTranslations("educationLibrary.categories");

  const [videos, setVideos] = useState<EducationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | EducationVideoCategory>("all");

  async function reload() {
    setError(null);
    try {
      const data = await getAllVideosForAdmin();
      setVideos(data);
    } catch (err) {
      console.error("[admin/education-library] load failed", err);
      setError(err instanceof Error ? err.message : t("errors.loadFailed"));
    }
  }

  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getAllVideosForAdmin()
      .then((data) => {
        if (active) setVideos(data);
      })
      .catch((err) => {
        console.error("[admin/education-library] load failed", err);
        if (active) setError(err instanceof Error ? err.message : t("errors.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser, t]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(v: EducationVideo) {
    setEditingId(v.id);
    setForm(videoToForm(v));
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const title = buildLocalized(form.titleEn, form.titleAr);
    const description = buildLocalized(form.descEn, form.descAr);
    if (!title) {
      setError(tForm("errorTitleRequired"));
      return;
    }
    if (!description) {
      setError(tForm("errorDescRequired"));
      return;
    }
    if (!form.videoUrl) {
      setError(tForm("errorVideoRequired"));
      return;
    }

    const tags = form.tagsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const input: EducationVideoInput = {
      id: form.id.trim() || undefined,
      title,
      description,
      videoUrl: form.videoUrl,
      thumbnailUrl: form.thumbnailUrl || undefined,
      durationSeconds: form.durationSeconds,
      category: form.category,
      tags: tags.length > 0 ? tags : undefined,
      published: form.published,
      createdBy: appUser?.id,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateEducationVideo(editingId, input);
      } else {
        await createEducationVideo(input);
      }
      await reload();
      setShowForm(false);
    } catch (err) {
      console.error("[admin/education-library] save failed", err);
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: EducationVideo) {
    if (!confirm(tRow("deleteConfirm"))) return;
    setBusyId(v.id);
    try {
      await deleteEducationVideo(v.id);
      await reload();
    } catch (err) {
      console.error("[admin/education-library] delete failed", err);
      setError(err instanceof Error ? err.message : t("errors.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublished(v: EducationVideo) {
    setBusyId(v.id);
    try {
      await updateEducationVideo(v.id, { published: !v.published });
      await reload();
    } catch (err) {
      console.error("[admin/education-library] publish toggle failed", err);
      setError(err instanceof Error ? err.message : t("errors.publishFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return videos;
    return videos.filter((v) => v.category === filter);
  }, [videos, filter]);

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
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="h-5 w-5" /> {t("addVideo")}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
            filter === "all"
              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
              : "border-slate-200 bg-white text-slate-500 hover:border-sky-200"
          }`}
        >
          {t("filter.all")}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filter === "all" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {videos.length}
          </span>
        </button>
        {EDUCATION_VIDEO_CATEGORIES.map((c) => {
          const count = videos.filter((v) => v.category === c).length;
          const active = filter === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-sky-200"
              }`}
            >
              {tCat(c)}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
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
        <div className="rounded-3xl bg-white shadow-sm border border-sky-200 p-6 sm:p-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? t("editVideo") : t("newVideo")}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500"
              aria-label={tForm("cancel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <VideoUploadField
              value={form.videoUrl}
              onChange={(url, duration) =>
                setForm((prev) => ({
                  ...prev,
                  videoUrl: url,
                  durationSeconds: duration ?? prev.durationSeconds,
                }))
              }
              helperText={tForm("videoFileHelp")}
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                {tForm("thumbnail")}
              </label>
              <ImageUploadField
                scope="education-thumbnail"
                mode="single"
                value={form.thumbnailUrl}
                onChange={(next) => setForm({ ...form, thumbnailUrl: next })}
                helperText={tForm("thumbnailHelp")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("titleEn")}{" "}
                  <span className="font-normal text-slate-400">
                    ({form.titleEn.length}/{TITLE_MAX})
                  </span>
                </label>
                <input
                  required
                  maxLength={TITLE_MAX}
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("titleAr")}{" "}
                  <span className="font-normal text-slate-400">
                    ({form.titleAr.length}/{TITLE_MAX})
                  </span>
                </label>
                <input
                  maxLength={TITLE_MAX}
                  value={form.titleAr}
                  onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  dir="rtl"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("descEn")}{" "}
                  <span className="font-normal text-slate-400">
                    ({form.descEn.length}/{DESC_MAX})
                  </span>
                </label>
                <textarea
                  required
                  maxLength={DESC_MAX}
                  value={form.descEn}
                  onChange={(e) => setForm({ ...form, descEn: e.target.value })}
                  dir="ltr"
                  className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("descAr")}{" "}
                  <span className="font-normal text-slate-400">
                    ({form.descAr.length}/{DESC_MAX})
                  </span>
                </label>
                <textarea
                  maxLength={DESC_MAX}
                  value={form.descAr}
                  onChange={(e) => setForm({ ...form, descAr: e.target.value })}
                  dir="rtl"
                  className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("category")}
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as EducationVideoCategory })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                >
                  {EDUCATION_VIDEO_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tCat(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {tForm("tags")}
                </label>
                <input
                  value={form.tagsCsv}
                  onChange={(e) => setForm({ ...form, tagsCsv: e.target.value })}
                  placeholder="diabetes, hypertension"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">{tForm("tagsHelp")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="h-4 w-4 rounded text-sky-600 focus:ring-brand-soft/50"
                />
                {tForm("published")}
                <span className="text-xs font-normal text-slate-500">{tForm("publishedHelp")}</span>
              </label>
              {typeof form.durationSeconds === "number" && (
                <span className="text-xs font-medium text-slate-500">
                  {tForm("duration")}: {fmtDuration(form.durationSeconds)}{" "}
                  <span className="text-slate-400">({tForm("durationAuto")})</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                {tForm("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-sky-600 font-bold text-white hover:bg-sky-700 shadow-md transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? tForm("saving") : editingId ? tForm("saveUpdate") : tForm("saveCreate")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <PlaySquare className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-bold text-slate-700">{t("noVideos.title")}</p>
          <p className="text-slate-500 text-sm">{t("noVideos.body")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => {
            const hasArTitle = Boolean(v.title.ar);
            const hasArDesc = Boolean(v.description.ar);
            return (
              <div
                key={v.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 sm:w-48 shrink-0 aspect-video">
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-600">
                        <PlaySquare className="h-8 w-8" />
                      </div>
                    )}
                    {v.durationSeconds ? (
                      <span className="absolute end-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {fmtDuration(v.durationSeconds)}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800">{tLocalized(v.title, locale)}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {tCat(v.category)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          v.published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {v.published ? tRow("published") : tRow("draft")}
                      </span>
                      {(!hasArTitle || !hasArDesc) && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          {tRow("arIncomplete")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                      {tLocalized(v.description, locale)}
                    </p>
                    {v.tags && v.tags.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400 truncate">#{v.tags.join("  #")}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => router.push(`/patient/education/${v.id}`)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" /> {tRow("preview")}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(v)}
                      disabled={busyId === v.id}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        v.published
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {v.published ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> {tRow("unpublish")}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> {tRow("publish")}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {tRow("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      disabled={busyId === v.id}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {tRow("delete")}
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
