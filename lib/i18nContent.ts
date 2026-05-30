import type { Locale } from "@/i18n/config";

// LocalizedString: the storage shape for admin-curated content that
// must be visible to both English and Arabic patients. `en` is the
// canonical baseline (always present); `ar` is optional during the
// rollout. Display consumers resolve via tLocalized() which falls back
// to `en` when `ar` is missing.
//
// Per the plan §5, this shape applies to long-form admin-curated copy
// only. Controlled vocabularies (categories, kinds, slugs) stay as
// flat enum keys. User-generated content (nurse bios, booking notes)
// stays as a single string with a `language?` tag.
export interface LocalizedString {
  en: string;
  ar?: string;
}

// Anything we read back from Firestore for a localized field can be:
// - LocalizedString (post-migration shape — the canonical form)
// - string         (legacy pre-migration data — coerced on read)
// - undefined/null (optional fields)
export type LocalizedInput = LocalizedString | string | undefined | null;

// Resolve a localized value for display. Falls back to en when the
// active locale is missing. Tolerant of legacy plain-string inputs so
// the rollout doesn't depend on the backfill being complete first;
// once the migration runs in production and tolerant branches are
// removed, this still works because every value will be the canonical
// LocalizedString shape.
export function tLocalized(value: LocalizedInput, locale: Locale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? "";
}

// Same idea for an array of LocalizedStrings (highlights[], outcomes[], etc.).
export function tLocalizedArray(
  values: ReadonlyArray<LocalizedInput> | undefined,
  locale: Locale,
): string[] {
  if (!values) return [];
  return values.map((v) => tLocalized(v, locale));
}

// Normalize a tolerant input into the canonical LocalizedString shape.
// Used at read time inside service mappers so the rest of the codebase
// only ever handles the canonical shape. Empty/undefined inputs become
// undefined so downstream optional-field semantics keep working.
export function normalizeLocalized(value: LocalizedInput): LocalizedString | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    return value.length > 0 ? { en: value } : undefined;
  }
  if (typeof value === "object" && typeof value.en === "string") {
    const ar = typeof value.ar === "string" && value.ar.length > 0 ? value.ar : undefined;
    return ar ? { en: value.en, ar } : { en: value.en };
  }
  return undefined;
}

// Required variant — for fields that the schema guarantees are present.
// Throws an empty-string placeholder if the input is missing entirely
// rather than returning undefined; legacy records with empty fields
// get { en: "" } which preserves display behavior.
export function normalizeLocalizedRequired(value: LocalizedInput): LocalizedString {
  return normalizeLocalized(value) ?? { en: "" };
}

// Normalize a tolerant array of inputs. Filters out empty entries so a
// legacy record with stray empty strings doesn't surface ghost items.
export function normalizeLocalizedArray(
  values: ReadonlyArray<LocalizedInput> | undefined,
): LocalizedString[] {
  if (!values) return [];
  return values
    .map((v) => normalizeLocalized(v))
    .filter((v): v is LocalizedString => v !== undefined);
}

// Helper used by writers (admin editors): take a {en, ar} pair and
// strip undefined/empty values so Firestore writes a clean shape.
export function buildLocalized(en: string, ar?: string): LocalizedString | undefined {
  const trimmedEn = en.trim();
  if (!trimmedEn) return undefined;
  const trimmedAr = ar?.trim();
  return trimmedAr ? { en: trimmedEn, ar: trimmedAr } : { en: trimmedEn };
}

// Check whether two LocalizedString-like values are the same shape and
// content. Used for admin-editor change detection.
export function localizedEquals(a: LocalizedInput, b: LocalizedInput): boolean {
  const na = normalizeLocalized(a);
  const nb = normalizeLocalized(b);
  if (na === undefined && nb === undefined) return true;
  if (!na || !nb) return false;
  return na.en === nb.en && (na.ar ?? "") === (nb.ar ?? "");
}
