"use client";

import { FormEvent, useEffect, useState } from "react";
import { DollarSign, Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  savePricingConfig,
  type PricingConfig,
} from "@/services/pricingConfigService";

export default function PricingConfigEditor() {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPricingConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((err) => {
        console.error("[PricingConfigEditor] failed to load", err);
        if (active) setError("Failed to load pricing config. Editing applies to defaults.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateAddon(index: number, key: "id" | "name" | "price", value: string) {
    setConfig({
      ...config,
      addons: config.addons.map((addon, i) =>
        i === index ? { ...addon, [key]: key === "price" ? Number(value) || 0 : value } : addon,
      ),
    });
  }

  function addAddon() {
    setConfig({
      ...config,
      addons: [...config.addons, { id: "", name: "", price: 0 }],
    });
  }

  function removeAddon(index: number) {
    setConfig({
      ...config,
      addons: config.addons.filter((_, i) => i !== index),
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleaned: PricingConfig = {
        ...config,
        addons: config.addons
          .filter((a) => a.id.trim().length > 0 && a.name.trim().length > 0)
          .map((a) => ({ id: a.id.trim(), name: a.name.trim(), price: a.price })),
      };
      await savePricingConfig(cleaned);
      setConfig(cleaned);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      console.error("[PricingConfigEditor] save failed", err);
      setError(err instanceof Error ? err.message : "Failed to save pricing config.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading pricing config…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pricing Configuration</h2>
            <p className="text-sm text-slate-500">
              Global add-on catalog. Edits apply to all new bookings. Per-shift prices are set by each nurse on their profile.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 p-6">
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Add-on catalog */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Global add-on catalog</p>
              <p className="text-xs text-slate-500">
                Defaults shown to patients during booking, unless the nurse defines their own.
              </p>
            </div>
            <button
              type="button"
              onClick={addAddon}
              className="flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-deep"
            >
              <Plus className="h-4 w-4" /> Add add-on
            </button>
          </div>
          <div className="space-y-2">
            {config.addons.map((addon, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[140px_1fr_100px_44px]">
                <input
                  value={addon.id}
                  onChange={(e) => updateAddon(idx, "id", e.target.value)}
                  placeholder="id (e.g. cooking)"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                <input
                  value={addon.name}
                  onChange={(e) => updateAddon(idx, "name", e.target.value)}
                  placeholder="Display name"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={addon.price}
                  onChange={(e) => updateAddon(idx, "price", e.target.value)}
                  placeholder="Price $"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeAddon(idx)}
                  className="rounded-lg bg-rose-50 px-3 text-rose-600 hover:bg-rose-100"
                  aria-label="Remove add-on"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {savedFlash ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save pricing"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
