"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Loader2, PlaySquare, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSiteSettings, updateSiteSettings } from "@/services/siteSettingsService";
import type { SiteSettings } from "@/lib/types";

// Self-contained editor for global feature flags. Each flag renders as
// its own card so new flags slot in without touching the settings
// shell. Cards share copy + toggle behaviour through the FlagCard
// sub-component below.
export default function FeatureFlagsEditor() {
  const { appUser } = useAuth();

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((s) => {
        if (active) setSettings(s);
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

  async function updateFlag(
    patch: Partial<Pick<SiteSettings, "educationLibraryEnabled" | "physiotherapyEnabled">>,
  ) {
    try {
      await updateSiteSettings(patch, appUser?.id);
      setSettings((prev) => ({ ...(prev ?? {}), ...patch, updatedAt: new Date().toISOString() }));
    } catch (err) {
      console.error("[FeatureFlagsEditor] save failed", err);
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-500">
        Loading feature flags…
      </div>
    );
  }
  if (error || !settings) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm text-sm text-rose-700">
        {error ?? "Failed to load feature flags."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FlagCard
        icon={PlaySquare}
        translationNamespace="educationLibrary.settings"
        enabled={settings.educationLibraryEnabled !== false}
        updatedAt={settings.updatedAt}
        onToggle={(next) => updateFlag({ educationLibraryEnabled: next })}
      />
      <FlagCard
        icon={Activity}
        translationNamespace="provider.physioFlag"
        enabled={settings.physiotherapyEnabled === true}
        updatedAt={settings.updatedAt}
        onToggle={(next) => updateFlag({ physiotherapyEnabled: next })}
        accent="emerald"
      />
    </div>
  );
}

// ---------- FlagCard sub-component ----------

interface FlagCardProps {
  icon: LucideIcon;
  translationNamespace: string;
  enabled: boolean;
  updatedAt?: string;
  onToggle: (next: boolean) => Promise<void>;
  accent?: "sky" | "emerald";
}

function FlagCard({
  icon: Icon,
  translationNamespace,
  enabled,
  updatedAt,
  onToggle,
  accent = "sky",
}: FlagCardProps) {
  const t = useTranslations(translationNamespace);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic intent: while a save is in flight `pending` reflects
  // the user's tap so the switch updates instantly. Cleared when the
  // parent prop catches up. Avoids a setState-in-effect mirror.
  const [pending, setPending] = useState<boolean | null>(null);
  const displayed = pending ?? enabled;

  async function handleToggle() {
    if (saving) return;
    const next = !displayed;
    setPending(next);
    setSaving(true);
    setError(null);
    try {
      await onToggle(next);
      // Parent updated its prop; clear the local intent so subsequent
      // prop changes (e.g. another admin flipped it) flow through.
      setPending(null);
    } catch (err) {
      setPending(!next);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const iconBg = accent === "emerald" ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600";
  const switchBg = displayed
    ? accent === "emerald"
      ? "bg-emerald-500"
      : "bg-sky-500"
    : "bg-slate-300";

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className="h-6 w-6" />
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
          onClick={handleToggle}
          disabled={saving}
          aria-pressed={displayed}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${switchBg}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              displayed ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
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
          <span className={displayed ? "text-emerald-600" : "text-slate-400"}>
            {displayed ? t("toggleOn") : t("toggleOff")}
          </span>
        )}
      </div>
    </div>
  );
}
