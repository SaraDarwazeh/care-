"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlaySquare, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSiteSettings, updateSiteSettings } from "@/services/siteSettingsService";

// Self-contained editor for global feature flags. Currently owns the
// Education Library toggle only; new flags slot in beside it without
// touching the settings page shell.
export default function FeatureFlagsEditor() {
  const { appUser } = useAuth();
  const t = useTranslations("educationLibrary.settings");

  const [enabled, setEnabled] = useState<boolean>(true);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((s) => {
        if (!active) return;
        setEnabled(s.educationLibraryEnabled !== false);
        setUpdatedAt(s.updatedAt);
      })
      .catch((err) => {
        console.error("[FeatureFlagsEditor] load failed", err);
        if (active) setError(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    if (saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      await updateSiteSettings({ educationLibraryEnabled: next }, appUser?.id);
      setUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error("[FeatureFlagsEditor] save failed", err);
      setEnabled(!next);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          <PlaySquare className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800 text-lg">{t("heading")}</h3>
          <p className="text-slate-500 text-sm leading-relaxed mt-1">{t("description")}</p>
          {updatedAt && (
            <p className="mt-2 text-xs text-slate-400">
              {t("savedAt", { when: new Date(updatedAt).toLocaleString() })}
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={loading || saving}
          aria-pressed={enabled}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-sky-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
            }`}
          />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs font-bold">
        {saving ? (
          <span className="flex items-center gap-1 text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> {t("saving")}
          </span>
        ) : (
          <span className={enabled ? "text-emerald-600" : "text-slate-400"}>
            {enabled ? t("toggleOn") : t("toggleOff")}
          </span>
        )}
      </div>
    </div>
  );
}
