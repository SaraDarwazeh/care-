export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export const AVAILABLE_ADDONS: ReadonlyArray<AddOn> = [
  { id: "cooking", name: "Cooking", price: 15 },
  { id: "transport", name: "Transportation", price: 10 },
  { id: "shopping", name: "Shopping", price: 12 },
  { id: "cleaning", name: "Cleaning", price: 10 },
  { id: "companion", name: "Companion Support", price: 20 },
];

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
