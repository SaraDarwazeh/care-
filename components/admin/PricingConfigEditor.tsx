"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sliders,
  Clock,
  Layers,
} from "lucide-react";
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  savePricingConfig,
  type HourlyPriceRange,
  type PricingConfig,
  type ServicePriceRange,
  type ShiftPriceRange,
} from "@/services/pricingConfigService";
import {
  CATALOG_SERVICES,
  type CatalogService,
} from "@/lib/serviceTaxonomy";
import type { ProviderKind } from "@/lib/types";

const PROVIDER_KINDS: ProviderKind[] = ["nurse", "physio"];
const SHIFTS: Array<"A" | "B" | "C"> = ["A", "B", "C"];

const SHIFT_LABEL: Record<"A" | "B" | "C", string> = {
  A: "Morning (A)",
  B: "Afternoon (B)",
  C: "Night (C)",
};

const KIND_LABEL: Record<ProviderKind, string> = {
  nurse: "Nurse",
  physio: "Physiotherapist",
};

interface RangeKey {
  serviceId: string;
  providerKind: ProviderKind;
}

function rangeKey(k: RangeKey): string {
  return `${k.providerKind}::${k.serviceId}`;
}

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

  // Service range lookup keyed by `${kind}::${serviceId}` for cheap reads
  // from the matrix grid. Same source of truth as config.serviceRanges.
  const serviceRangeMap = useMemo(() => {
    const m = new Map<string, ServicePriceRange>();
    (config.serviceRanges ?? []).forEach((r) => m.set(rangeKey(r), r));
    return m;
  }, [config.serviceRanges]);

  const shiftRangeMap = useMemo(() => {
    const m = new Map<string, ShiftPriceRange>();
    (config.shiftRanges ?? []).forEach((r) => m.set(`${r.providerKind}::${r.shift}`, r));
    return m;
  }, [config.shiftRanges]);

  const hourlyRangeMap = useMemo(() => {
    const m = new Map<ProviderKind, HourlyPriceRange>();
    (config.hourlyRanges ?? []).forEach((r) => m.set(r.providerKind, r));
    return m;
  }, [config.hourlyRanges]);

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

  // Set or clear a (serviceId, kind) range. Passing both min and max as
  // empty strings clears the row entirely. Otherwise we upsert.
  function setServiceRange(
    serviceId: string,
    providerKind: ProviderKind,
    field: "min" | "max",
    rawValue: string,
  ) {
    const value = rawValue === "" ? NaN : Number(rawValue);
    const existing = serviceRangeMap.get(rangeKey({ serviceId, providerKind }));
    const next = (config.serviceRanges ?? []).filter(
      (r) => !(r.serviceId === serviceId && r.providerKind === providerKind),
    );
    const min = field === "min" ? value : existing?.min ?? NaN;
    const max = field === "max" ? value : existing?.max ?? NaN;
    if (!Number.isFinite(min) && !Number.isFinite(max)) {
      // Both empty → clear the row
      setConfig({ ...config, serviceRanges: next });
      return;
    }
    next.push({
      serviceId,
      providerKind,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : Number.isFinite(min) ? min : 0,
    });
    setConfig({ ...config, serviceRanges: next });
  }

  function setShiftRange(
    shift: "A" | "B" | "C",
    providerKind: ProviderKind,
    field: "min" | "max",
    rawValue: string,
  ) {
    const value = rawValue === "" ? NaN : Number(rawValue);
    const existing = shiftRangeMap.get(`${providerKind}::${shift}`);
    const next = (config.shiftRanges ?? []).filter(
      (r) => !(r.shift === shift && r.providerKind === providerKind),
    );
    const min = field === "min" ? value : existing?.min ?? NaN;
    const max = field === "max" ? value : existing?.max ?? NaN;
    if (!Number.isFinite(min) && !Number.isFinite(max)) {
      setConfig({ ...config, shiftRanges: next });
      return;
    }
    next.push({
      shift,
      providerKind,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : Number.isFinite(min) ? min : 0,
    });
    setConfig({ ...config, shiftRanges: next });
  }

  function setHourlyRange(
    providerKind: ProviderKind,
    field: "min" | "max",
    rawValue: string,
  ) {
    const value = rawValue === "" ? NaN : Number(rawValue);
    const existing = hourlyRangeMap.get(providerKind);
    const next = (config.hourlyRanges ?? []).filter((r) => r.providerKind !== providerKind);
    const min = field === "min" ? value : existing?.min ?? NaN;
    const max = field === "max" ? value : existing?.max ?? NaN;
    if (!Number.isFinite(min) && !Number.isFinite(max)) {
      setConfig({ ...config, hourlyRanges: next });
      return;
    }
    next.push({
      providerKind,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : Number.isFinite(min) ? min : 0,
    });
    setConfig({ ...config, hourlyRanges: next });
  }

  // Catalog grouped by kind. Within nursing, split between nurse-only and
  // physio-eligible so the admin sees the inputs in a sensible order.
  const groupedServices = useMemo(() => {
    const byKind: Record<"nursing" | "support", CatalogService[]> = {
      nursing: [],
      support: [],
    };
    CATALOG_SERVICES.forEach((s) => byKind[s.kind].push(s));
    return byKind;
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validRanges = (config.serviceRanges ?? []).filter(
        (r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min,
      );
      const validShiftRanges = (config.shiftRanges ?? []).filter(
        (r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min,
      );
      const validHourlyRanges = (config.hourlyRanges ?? []).filter(
        (r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min,
      );
      const cleaned: PricingConfig = {
        ...config,
        addons: config.addons
          .filter((a) => a.id.trim().length > 0 && a.name.trim().length > 0)
          .map((a) => ({ id: a.id.trim(), name: a.name.trim(), price: a.price })),
        serviceRanges: validRanges,
        shiftRanges: validShiftRanges,
        hourlyRanges: validHourlyRanges,
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft/40 text-brand-deep">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pricing Configuration</h2>
            <p className="text-sm text-slate-500">
              Define allowed price ranges per service and per provider type. Providers can only save prices that fall within these bounds.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8 p-6">
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* SERVICE RANGES — the headline feature */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-brand-deep" />
            <p className="text-sm font-bold text-slate-700">Service price ranges</p>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Set the minimum and maximum a provider can charge per service. Leave both empty to allow any price for that service / provider type. <strong>Both fields must be filled</strong> for the range to take effect; the provider profile editor blocks save if the entered price falls outside.
          </p>

          {(["nursing", "support"] as const).map((kind) => (
            <div key={kind} className="mb-6 last:mb-0">
              <div className="mb-2 flex items-center gap-2">
                {kind === "nursing" ? (
                  <Layers className="h-4 w-4 text-slate-500" />
                ) : (
                  <Plus className="h-4 w-4 text-slate-500" />
                )}
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {kind === "nursing" ? "Clinical services" : "Support add-ons"}
                </h3>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Service</th>
                      {PROVIDER_KINDS.map((pk) => (
                        <th key={pk} className="px-3 py-2 text-left font-bold" colSpan={2}>
                          {KIND_LABEL[pk]} (min / max)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedServices[kind].map((service) => {
                      const allowedForKinds = service.providerKinds ?? ["nurse"];
                      return (
                        <tr key={service.id}>
                          <td className="px-3 py-2 align-middle">
                            <div className="font-semibold text-slate-700">{service.label.en}</div>
                            <code className="text-[10px] text-slate-400">{service.id}</code>
                          </td>
                          {PROVIDER_KINDS.map((pk) => {
                            const eligible =
                              kind === "support" || allowedForKinds.includes(pk);
                            const existing = serviceRangeMap.get(
                              rangeKey({ serviceId: service.id, providerKind: pk }),
                            );
                            return (
                              <td key={pk} className="px-3 py-2" colSpan={2}>
                                {eligible ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      placeholder="min"
                                      value={
                                        existing && Number.isFinite(existing.min)
                                          ? existing.min
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setServiceRange(service.id, pk, "min", e.target.value)
                                      }
                                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                                    />
                                    <span className="text-xs text-slate-300">–</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      placeholder="max"
                                      value={
                                        existing && Number.isFinite(existing.max)
                                          ? existing.max
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setServiceRange(service.id, pk, "max", e.target.value)
                                      }
                                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs italic text-slate-400">n/a</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* SHIFT RANGES */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-deep" />
            <p className="text-sm font-bold text-slate-700">Per-shift price ranges</p>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Optional. Set bounds for flat per-shift prices the provider can charge.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Shift</th>
                  {PROVIDER_KINDS.map((pk) => (
                    <th key={pk} className="px-3 py-2 text-left font-bold" colSpan={2}>
                      {KIND_LABEL[pk]} (min / max)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SHIFTS.map((shift) => (
                  <tr key={shift}>
                    <td className="px-3 py-2 align-middle font-semibold text-slate-700">
                      {SHIFT_LABEL[shift]}
                    </td>
                    {PROVIDER_KINDS.map((pk) => {
                      const existing = shiftRangeMap.get(`${pk}::${shift}`);
                      return (
                        <td key={pk} className="px-3 py-2" colSpan={2}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="min"
                              value={existing && Number.isFinite(existing.min) ? existing.min : ""}
                              onChange={(e) => setShiftRange(shift, pk, "min", e.target.value)}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                            />
                            <span className="text-xs text-slate-300">–</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="max"
                              value={existing && Number.isFinite(existing.max) ? existing.max : ""}
                              onChange={(e) => setShiftRange(shift, pk, "max", e.target.value)}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* HOURLY RANGES */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-deep" />
            <p className="text-sm font-bold text-slate-700">Hourly rate ranges</p>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Optional. Bounds for the legacy hourly fallback (used when no per-service price applies).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDER_KINDS.map((pk) => {
              const existing = hourlyRangeMap.get(pk);
              return (
                <div
                  key={pk}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {KIND_LABEL[pk]}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="min"
                      value={existing && Number.isFinite(existing.min) ? existing.min : ""}
                      onChange={(e) => setHourlyRange(pk, "min", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                    />
                    <span className="text-xs text-slate-300">–</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="max"
                      value={existing && Number.isFinite(existing.max) ? existing.max : ""}
                      onChange={(e) => setHourlyRange(pk, "max", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

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
            className="flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-hover disabled:opacity-50"
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
