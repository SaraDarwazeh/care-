import { doc, getDoc, setDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import {
  AddOn,
  AVAILABLE_ADDONS,
  OVERNIGHT_SURCHARGE_ACCEPTED,
  OVERNIGHT_SURCHARGE_REGULAR,
  SHIFT_BILLED_HOURS,
} from "@/lib/pricingConstants";

const CONFIG_COLLECTION = "appConfig";
const CONFIG_DOC = "pricing";

export interface PricingConfig {
  addons: AddOn[];
  overnightSurchargeAccepted: number;
  overnightSurchargeRegular: number;
  shiftBilledHours: number;
}

// Constants from lib/pricingConstants.ts act as the canonical fallback when
// no Firestore override exists. Admin edits on /admin/settings overlay these.
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  addons: [...AVAILABLE_ADDONS],
  overnightSurchargeAccepted: OVERNIGHT_SURCHARGE_ACCEPTED,
  overnightSurchargeRegular: OVERNIGHT_SURCHARGE_REGULAR,
  shiftBilledHours: SHIFT_BILLED_HOURS,
};

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
