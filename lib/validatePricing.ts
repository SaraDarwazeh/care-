import type { NurseProfile, NurseServiceItem, ProviderKind } from "@/lib/types";
import type {
  HourlyPriceRange,
  PricingConfig,
  ServicePriceRange,
  ShiftPriceRange,
} from "@/services/pricingConfigService";

// One validation error per offending field. The `key` identifies the
// affected row so the form can highlight precisely the input that failed.
//   service:{index} → services[index]
//   additional:{index} → additionalServices[index]
//   shift:A | shift:B | shift:C
//   hourly
export type PricingErrorScope = "service" | "additional" | "shift" | "hourly";

export interface PricingValidationError {
  scope: PricingErrorScope;
  key: string;
  serviceId?: string;
  serviceName?: string;
  shift?: "A" | "B" | "C";
  entered: number;
  min: number;
  max: number;
  reason: "below_min" | "above_max";
}

export interface PricingValidationResult {
  valid: boolean;
  errors: PricingValidationError[];
}

// Profile shape we validate. Accepts the strict NurseProfile (`saveNurseProfile`
// gate path) and the looser draft from the form (no rating / reviewCount yet).
export type ValidatablePricingProfile = Pick<
  NurseProfile,
  | "providerKind"
  | "services"
  | "additionalServices"
  | "pricePerHour"
  | "pricePerShift"
>;

export function findServiceRange(
  ranges: ServicePriceRange[] | undefined,
  serviceId: string,
  providerKind: ProviderKind,
): ServicePriceRange | undefined {
  if (!ranges || !serviceId) return undefined;
  return ranges.find((r) => r.serviceId === serviceId && r.providerKind === providerKind);
}

export function findShiftRange(
  ranges: ShiftPriceRange[] | undefined,
  shift: "A" | "B" | "C",
  providerKind: ProviderKind,
): ShiftPriceRange | undefined {
  if (!ranges) return undefined;
  return ranges.find((r) => r.shift === shift && r.providerKind === providerKind);
}

export function findHourlyRange(
  ranges: HourlyPriceRange[] | undefined,
  providerKind: ProviderKind,
): HourlyPriceRange | undefined {
  if (!ranges) return undefined;
  return ranges.find((r) => r.providerKind === providerKind);
}

function checkRange(
  price: number,
  range: { min: number; max: number },
): "ok" | "below_min" | "above_max" {
  if (price < range.min) return "below_min";
  if (price > range.max) return "above_max";
  return "ok";
}

function validateServiceItems(
  items: NurseServiceItem[],
  scope: "service" | "additional",
  providerKind: ProviderKind,
  serviceRanges: ServicePriceRange[] | undefined,
): PricingValidationError[] {
  const errors: PricingValidationError[] = [];
  items.forEach((item, index) => {
    const name = item.name?.trim() ?? "";
    if (!name) return;
    const price = Number(item.price);
    if (!Number.isFinite(price)) return;
    const serviceId = item.serviceId ?? "";
    // No serviceId → legacy free-text entry. We can't look up a range
    // for it, so it stays unvalidated. The provider form prompts a
    // re-pick from the catalog so future saves carry a serviceId.
    if (!serviceId) return;
    const range = findServiceRange(serviceRanges, serviceId, providerKind);
    if (!range) return;
    const result = checkRange(price, range);
    if (result === "ok") return;
    errors.push({
      scope,
      key: `${scope}:${index}`,
      serviceId,
      serviceName: name,
      entered: price,
      min: range.min,
      max: range.max,
      reason: result,
    });
  });
  return errors;
}

export function validateProfilePricing(
  profile: ValidatablePricingProfile,
  config: PricingConfig,
): PricingValidationResult {
  const providerKind: ProviderKind = profile.providerKind ?? "nurse";
  const errors: PricingValidationError[] = [];

  if (profile.services) {
    errors.push(
      ...validateServiceItems(
        profile.services,
        "service",
        providerKind,
        config.serviceRanges,
      ),
    );
  }

  if (profile.additionalServices) {
    errors.push(
      ...validateServiceItems(
        profile.additionalServices,
        "additional",
        providerKind,
        config.serviceRanges,
      ),
    );
  }

  if (profile.pricePerHour != null && Number.isFinite(profile.pricePerHour)) {
    const range = findHourlyRange(config.hourlyRanges, providerKind);
    if (range) {
      const result = checkRange(profile.pricePerHour, range);
      if (result !== "ok") {
        errors.push({
          scope: "hourly",
          key: "hourly",
          entered: profile.pricePerHour,
          min: range.min,
          max: range.max,
          reason: result,
        });
      }
    }
  }

  if (profile.pricePerShift) {
    (["A", "B", "C"] as const).forEach((shift) => {
      const value = profile.pricePerShift?.[shift];
      if (value == null || !Number.isFinite(value)) return;
      const range = findShiftRange(config.shiftRanges, shift, providerKind);
      if (!range) return;
      const result = checkRange(value, range);
      if (result === "ok") return;
      errors.push({
        scope: "shift",
        key: `shift:${shift}`,
        shift,
        entered: value,
        min: range.min,
        max: range.max,
        reason: result,
      });
    });
  }

  return { valid: errors.length === 0, errors };
}

// Thrown by saveNurseProfile when a write would persist out-of-range values.
// Carries the structured errors so the form can map them back to rows.
export class PricingValidationError_ extends Error {
  errors: PricingValidationError[];
  constructor(errors: PricingValidationError[]) {
    super(`Pricing validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}).`);
    this.name = "PricingValidationError";
    this.errors = errors;
  }
}
// Re-export under the canonical name. The trailing underscore on the
// class itself dodges the type/value collision with PricingValidationError
// (the result-payload interface above).
export { PricingValidationError_ as PricingValidationException };
