export interface AddOn {
  id: string;
  name: string;
  price: number;
}

// AVAILABLE_ADDONS used to live as a hand-maintained array here. It now
// derives from the unified service taxonomy so every add-on shipped to
// the booking form has a bilingual label, an icon, and (when relevant)
// indication metadata. The shape is unchanged — every legacy import of
// AVAILABLE_ADDONS keeps working.
//
// serviceTaxonomy.ts uses `import type` for `AddOn` so the cycle is
// type-only and stripped at compile time; the runtime import is one-way.
import { getSupportAddOns } from "@/lib/serviceTaxonomy";

export const AVAILABLE_ADDONS: ReadonlyArray<AddOn> = getSupportAddOns();

export const SHIFT_RANGES: Record<string, { start: string; end: string }> = {
  A: { start: "07:00", end: "14:00" },
  B: { start: "14:00", end: "20:00" },
  C: { start: "20:00", end: "07:00" },
};

export const SHIFT_LABELS: Record<string, string> = {
  A: "Shift A (7:00 AM – 2:00 PM)",
  B: "Shift B (2:00 PM – 8:00 PM)",
  C: "Shift C (8:00 PM – 7:00 AM)",
};

// Approximate hours billed per shift block (used to compute base price).
export const SHIFT_BILLED_HOURS = 8;

// Overnight surcharges applied when shift is "C".
export const OVERNIGHT_SURCHARGE_ACCEPTED = 20;
export const OVERNIGHT_SURCHARGE_REGULAR = 40;

export function findAddOn(id: string): AddOn | undefined {
  return AVAILABLE_ADDONS.find((a) => a.id === id);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
