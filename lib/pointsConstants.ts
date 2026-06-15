// Pure-points loyalty MVP. Currency-pegged so the user math is "1 ILS
// spent earns 1 point, 100 points buys 1 ILS back". Tweak here, not in
// the service or UI — every consumer reads from this module.

import { CURRENCY } from "@/lib/config";

// Earn rate.
export const POINTS_PER_ILS = 1;
// Flat bonus granted when a patient submits the FIRST review for a
// completed booking. Subsequent reviews on the same booking earn 0.
export const POINTS_REVIEW_BONUS = 25;

// Redemption rate (100 points → 1 ILS).
export const POINTS_PER_REDEEM_ILS = 100;
// Smallest redemption we accept. Keeps the burn psychologically
// meaningful and prevents zero-discount transactions cluttering the
// ledger.
export const MIN_REDEEM_POINTS = 500;
// Hard cap on how much of a single cart's subtotal points can cover.
// Stops free-cart abuse and keeps unit economics sane during MVP.
export const MAX_REDEEM_FRACTION = 0.5;

// Helper: how many ILS a given point count is worth at redemption.
export function pointsToCurrency(points: number): number {
  return points / POINTS_PER_REDEEM_ILS;
}

// Helper: maximum points the policy allows against a given subtotal,
// after rounding down to the nearest 100 (no fractional ILS discounts).
export function maxRedeemForSubtotal(subtotal: number): number {
  const ceiling = Math.floor((subtotal * MAX_REDEEM_FRACTION) * POINTS_PER_REDEEM_ILS);
  return Math.max(0, Math.floor(ceiling / POINTS_PER_REDEEM_ILS) * POINTS_PER_REDEEM_ILS);
}

// Re-export so consumers don't reach into config — keeps the points
// module self-contained.
export const POINTS_CURRENCY_CODE = CURRENCY;
