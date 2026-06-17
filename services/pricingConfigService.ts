import { doc, getDoc, setDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  AddOn,
  AVAILABLE_ADDONS,
  OVERNIGHT_SURCHARGE_ACCEPTED,
  OVERNIGHT_SURCHARGE_REGULAR,
  SHIFT_BILLED_HOURS,
} from "@/lib/pricingConstants";
import type { ProviderKind } from "@/lib/types";

const CONFIG_COLLECTION = "appConfig";
const CONFIG_DOC = "pricing";

// Admin-configured min/max bounds for a single catalog service.
// (serviceId, providerKind) is the lookup key — same service may have
// different allowed ranges per kind (e.g. nurse "post-op care" priced
// differently from physio "post-op rehab").
export interface ServicePriceRange {
  serviceId: string;
  providerKind: ProviderKind;
  min: number;
  max: number;
}

// Per-shift price bounds. Optional knob — only enforced when a row exists
// for the (shift, providerKind) pair.
export interface ShiftPriceRange {
  shift: "A" | "B" | "C";
  providerKind: ProviderKind;
  min: number;
  max: number;
}

// Per-provider-kind hourly rate bounds. Optional — enforced only when set.
export interface HourlyPriceRange {
  providerKind: ProviderKind;
  min: number;
  max: number;
}

export interface PricingConfig {
  addons: AddOn[];
  overnightSurchargeAccepted: number;
  overnightSurchargeRegular: number;
  shiftBilledHours: number;
  // Per-service admin-configured price bounds. When a row exists for
  // (serviceId, providerKind), the provider profile editor blocks save
  // if their entered price is outside [min, max].
  serviceRanges?: ServicePriceRange[];
  shiftRanges?: ShiftPriceRange[];
  hourlyRanges?: HourlyPriceRange[];
}

// Constants from lib/pricingConstants.ts act as the canonical fallback when
// no Firestore override exists. Admin edits on /admin/settings overlay these.
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  addons: [...AVAILABLE_ADDONS],
  overnightSurchargeAccepted: OVERNIGHT_SURCHARGE_ACCEPTED,
  overnightSurchargeRegular: OVERNIGHT_SURCHARGE_REGULAR,
  shiftBilledHours: SHIFT_BILLED_HOURS,
  serviceRanges: [],
  shiftRanges: [],
  hourlyRanges: [],
};

function isProviderKind(value: unknown): value is ProviderKind {
  return value === "nurse" || value === "physio";
}

function parseServiceRanges(raw: unknown): ServicePriceRange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const serviceId = String(r.serviceId ?? "").trim();
      const providerKind = isProviderKind(r.providerKind) ? r.providerKind : null;
      const min = Number(r.min ?? 0);
      const max = Number(r.max ?? 0);
      if (!serviceId || !providerKind) return null;
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      if (max < min) return null;
      return { serviceId, providerKind, min, max } satisfies ServicePriceRange;
    })
    .filter((r): r is ServicePriceRange => r !== null);
}

function parseShiftRanges(raw: unknown): ShiftPriceRange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const shift = r.shift;
      if (shift !== "A" && shift !== "B" && shift !== "C") return null;
      const providerKind = isProviderKind(r.providerKind) ? r.providerKind : null;
      if (!providerKind) return null;
      const min = Number(r.min ?? 0);
      const max = Number(r.max ?? 0);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
      return { shift, providerKind, min, max } satisfies ShiftPriceRange;
    })
    .filter((r): r is ShiftPriceRange => r !== null);
}

function parseHourlyRanges(raw: unknown): HourlyPriceRange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const providerKind = isProviderKind(r.providerKind) ? r.providerKind : null;
      if (!providerKind) return null;
      const min = Number(r.min ?? 0);
      const max = Number(r.max ?? 0);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
      return { providerKind, min, max } satisfies HourlyPriceRange;
    })
    .filter((r): r is HourlyPriceRange => r !== null);
}

function mergeWithDefaults(raw: Record<string, unknown>): PricingConfig {
  const addons = Array.isArray(raw.addons)
    ? (raw.addons as Array<Record<string, unknown>>)
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
          price: Number(item.price ?? 0),
        }))
        .filter((a) => a.id && a.name)
    : DEFAULT_PRICING_CONFIG.addons;
  return {
    addons,
    overnightSurchargeAccepted:
      typeof raw.overnightSurchargeAccepted === "number"
        ? raw.overnightSurchargeAccepted
        : DEFAULT_PRICING_CONFIG.overnightSurchargeAccepted,
    overnightSurchargeRegular:
      typeof raw.overnightSurchargeRegular === "number"
        ? raw.overnightSurchargeRegular
        : DEFAULT_PRICING_CONFIG.overnightSurchargeRegular,
    shiftBilledHours:
      typeof raw.shiftBilledHours === "number"
        ? raw.shiftBilledHours
        : DEFAULT_PRICING_CONFIG.shiftBilledHours,
    serviceRanges: parseServiceRanges(raw.serviceRanges),
    shiftRanges: parseShiftRanges(raw.shiftRanges),
    hourlyRanges: parseHourlyRanges(raw.hourlyRanges),
  };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const { db } = ensureClientFirebase();
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
    if (!snap.exists()) return DEFAULT_PRICING_CONFIG;
    return mergeWithDefaults(snap.data() as Record<string, unknown>);
  } catch (err) {
    // Server contexts without firebase config (build time, tests) fall back to defaults.
    console.warn("[pricingConfigService] using defaults — firestore read failed", err);
    return DEFAULT_PRICING_CONFIG;
  }
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  const { db } = ensureClientFirebase();
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC), config, { merge: true });
}
