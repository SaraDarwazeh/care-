import { doc, getDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { Booking, CarePackage } from "@/lib/types";
import {
  AVAILABLE_ADDONS,
  AddOn,
  OVERNIGHT_SURCHARGE_ACCEPTED,
  OVERNIGHT_SURCHARGE_REGULAR,
  SHIFT_BILLED_HOURS,
  TAX_RATE,
  findAddOn,
  round2,
} from "@/lib/pricingConstants";

export interface PricingResult {
  base: number;
  addons: AddOn[];
  transport: number;
  overnight: number;
  subtotal: number;
  tax: number;
  total: number;
}

type PricingInput = Partial<Omit<Booking, "id" | "status" | "createdAt">>;

async function loadPackage(db: ReturnType<typeof ensureClientFirebase>["db"], packageId: string): Promise<CarePackage | null> {
  const snap = await getDoc(doc(db, "packages", packageId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<CarePackage, "id">) };
}

export async function computePricing(input: PricingInput): Promise<PricingResult> {
  const { db } = ensureClientFirebase();

  let nurse: Record<string, unknown> | null = null;
  if (input.nurseId) {
    const nurseSnap = await getDoc(doc(db, "nurseProfiles", String(input.nurseId)));
    nurse = nurseSnap.exists() ? (nurseSnap.data() as Record<string, unknown>) : null;
  }

  // Resolve the service price: prefer the matched named service, fall back to pricePerHour.
  let servicePrice = 0;
  if (nurse?.services && Array.isArray(nurse.services)) {
    const found = (nurse.services as Array<Record<string, unknown>>).find(
      (s) => String(s.name ?? "") === String(input.service ?? ""),
    );
    if (found) servicePrice = Number(found.price ?? 0);
  }
  if (!servicePrice) servicePrice = Number(nurse?.pricePerHour ?? 0);

  let base = 0;
  if (input.bookingType === "shift") {
    base = servicePrice * SHIFT_BILLED_HOURS;
  } else if (input.bookingType === "package") {
    const days = Math.max(1, Number(input.durationDays ?? 1));
    let perDay = servicePrice * SHIFT_BILLED_HOURS;
    let modifier = 1;

    if (input.packageId) {
      const pkg = await loadPackage(db, String(input.packageId));
      if (pkg) {
        if (pkg.basePricePerDay && pkg.basePricePerDay > 0) {
          perDay = pkg.basePricePerDay;
        }
        const match = pkg.durationOptions?.find((opt) => opt.days === days);
        if (match?.priceModifier && match.priceModifier > 0) {
          modifier = match.priceModifier;
        }
      }
    }

    base = round2(perDay * days * modifier);
  } else {
    base = servicePrice;
  }

  // Normalize addons against the canonical catalog. Unknown ids fall back to the
  // values supplied by the caller so we never silently lose money — but we never
  // add a separate transport line on top of the addon's own price.
  const requestedAddons = input.pricing?.addons ?? [];
  const addons: AddOn[] = requestedAddons.map((a) => {
    const aid = String(a.id ?? "");
    const known = findAddOn(aid);
    if (known) return known;
    return {
      id: aid,
      name: String(a.name ?? aid),
      price: Number(a.price ?? 0),
    };
  });

  // Transport is intentionally surfaced as 0 in the breakdown because the
  // transport addon (when selected) already accounts for its own price in
  // `addons`. Kept on the result for compatibility with existing consumers.
  const transport = 0;

  let overnight = 0;
  if (input.shift === "C") {
    overnight = nurse?.acceptsOvernight
      ? OVERNIGHT_SURCHARGE_ACCEPTED
      : OVERNIGHT_SURCHARGE_REGULAR;
  }

  const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
  const subtotal = round2(base + addonsTotal + transport + overnight);
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + tax);

  return { base, addons, transport, overnight, subtotal, tax, total };
}

export { AVAILABLE_ADDONS };

const pricingService = { computePricing };
export default pricingService;
