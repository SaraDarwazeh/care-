import { doc, getDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import type { Booking, CarePackage } from "@/lib/types";
import { AddOn, round2 } from "@/lib/pricingConstants";
import { getPricingConfig } from "@/services/pricingConfigService";

export interface PricingResult {
  base: number;
  addons: AddOn[];
  transport: number;
  overnight: number;
  subtotal: number;
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
  const config = await getPricingConfig();
  const findGlobalAddOn = (id: string) => config.addons.find((a) => a.id === id);

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
    // Per-shift model: read the flat price the nurse set for this shift.
    // Legacy fallback (× SHIFT_BILLED_HOURS) only when a nurse hasn't yet
    // migrated. The fallback fires a console warning so we can spot
    // un-migrated nurses during the rollout.
    const shiftKey = String(input.shift ?? "").toUpperCase() as "A" | "B" | "C";
    const perShift =
      nurse && typeof nurse.pricePerShift === "object" && nurse.pricePerShift
        ? (nurse.pricePerShift as Record<string, unknown>)[shiftKey]
        : undefined;
    if (typeof perShift === "number" && perShift > 0) {
      base = perShift;
    } else {
      base = servicePrice * config.shiftBilledHours;
      console.warn(
        `[pricing] using fallback hourly×${config.shiftBilledHours} for nurse ${input.nurseId} shift ${shiftKey} — set pricePerShift to migrate`,
      );
    }
  } else if (input.bookingType === "package") {
    let perDay = servicePrice * config.shiftBilledHours;
    let modifier = 1;
    // For dynamic packages we honor the patient's duration choice. For
    // fixed packages we lock to the package's predefined durationDays so
    // the server total can't be inflated by a tampered client payload.
    let days = Math.max(1, Number(input.durationDays ?? 1));

    if (input.packageId) {
      const pkg = await loadPackage(db, String(input.packageId));
      if (pkg) {
        const mode = pkg.pricingMode ?? "dynamic";
        if (mode === "fixed") {
          days = Math.max(1, pkg.durationDays);
          if (pkg.basePricePerDay && pkg.basePricePerDay > 0) {
            perDay = pkg.basePricePerDay;
          }
          // priceModifier is meaningless in fixed mode — duration is locked.
        } else {
          if (pkg.basePricePerDay && pkg.basePricePerDay > 0) {
            perDay = pkg.basePricePerDay;
          }
          const match = pkg.durationOptions?.find((opt) => opt.days === days);
          if (match?.priceModifier && match.priceModifier > 0) {
            modifier = match.priceModifier;
          }
        }
      }
    }

    base = round2(perDay * days * modifier);
  } else {
    base = servicePrice;
  }

  // Build a lookup of the nurse's custom add-ons so we can trust THEIR price
  // for nurse-prefixed ids rather than the caller's. Mirrors the slug rule used
  // in BookingForm.tsx so ids round-trip cleanly.
  function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  const nurseAddons: AddOn[] = Array.isArray(nurse?.additionalServices)
    ? (nurse!.additionalServices as Array<Record<string, unknown>>)
        .map((item, idx) => {
          const name = String(item.name ?? "");
          if (!name) return null;
          return {
            id: `nurse-${slugify(name) || `addon-${idx}`}`,
            name,
            price: Number(item.price ?? 0),
          };
        })
        .filter((a): a is AddOn => a !== null)
    : [];
  const nurseAddonById = new Map(nurseAddons.map((a) => [a.id, a] as const));

  // Normalize addons against the canonical catalogs. Order:
  //   1. Global AVAILABLE_ADDONS — server-trusted prices.
  //   2. Nurse-specific additionalServices — server-trusted from nurseProfile.
  //   3. Fallback to caller-supplied values for ids we don't recognize so we
  //      don't silently lose money on legitimate one-off cases.
  const requestedAddons = input.pricing?.addons ?? [];
  const addons: AddOn[] = requestedAddons.map((a) => {
    const aid = String(a.id ?? "");
    const knownGlobal = findGlobalAddOn(aid);
    if (knownGlobal) return knownGlobal;
    const knownNurse = nurseAddonById.get(aid);
    if (knownNurse) return knownNurse;
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

  // Per-shift pricing fully encodes the overnight premium on shift C, so
  // there's no separate surcharge anymore. Field kept on the result for
  // backwards compatibility with old breakdown consumers.
  const overnight = 0;

  const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
  const subtotal = round2(base + addonsTotal + transport + overnight);
  const total = subtotal;

  return { base, addons, transport, overnight, subtotal, total };
}

const pricingService = { computePricing };
export default pricingService;
