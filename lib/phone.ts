// Phone number primitives.
//
// Storage shape on AppUser is a pair: { phone: <E.164>, phoneCountry: "PS" | "IL" }.
// The country code is denormalised onto the user doc so the editor can
// re-render the country picker in its original state without having to
// guess the country from the E.164 prefix (which is non-trivial when
// the +972 / +970 numbers can overlap area patterns).

export type PhoneCountryCode = "PS" | "IL";

export interface PhoneCountry {
  code: PhoneCountryCode;
  dial: string;        // "+970"
  // National-number length range. Local numbers in PS + IL both fit
  // 7-9 digits after the trunk zero is stripped; we accept 7-10 to
  // tolerate input variations. Validation is intentionally permissive
  // — the server can fail closer to the call (e.g. SMS gateway error)
  // if the number is unreachable.
  minLength: number;
  maxLength: number;
  label: { en: string; ar: string };
  flag: string;        // emoji rendered inline in the picker
}

export const PHONE_COUNTRIES: ReadonlyArray<PhoneCountry> = [
  {
    code: "PS",
    dial: "+970",
    minLength: 8,
    maxLength: 10,
    label: { en: "Palestine", ar: "فلسطين" },
    flag: "🇵🇸",
  },
  {
    code: "IL",
    dial: "+972",
    minLength: 8,
    maxLength: 10,
    label: { en: "Israel", ar: "إسرائيل" },
    flag: "🇮🇱",
  },
];

const COUNTRY_BY_CODE: Record<PhoneCountryCode, PhoneCountry> = PHONE_COUNTRIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<PhoneCountryCode, PhoneCountry>,
);

export function findPhoneCountry(code: PhoneCountryCode | string): PhoneCountry | undefined {
  return COUNTRY_BY_CODE[code as PhoneCountryCode];
}

// Strip every non-digit AND drop a leading 0 (the national "trunk"
// zero used in PS + IL local notation). Returns the bare significant
// digits ready for E.164 concatenation.
export function normaliseLocalNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/^0+/, "");
}

export interface PhoneValidationResult {
  valid: boolean;
  e164: string;            // empty when invalid
  reason?: "too_short" | "too_long" | "empty" | "bad_country";
}

export function validatePhone(
  countryCode: PhoneCountryCode | string,
  localNumber: string,
): PhoneValidationResult {
  const country = findPhoneCountry(countryCode);
  if (!country) return { valid: false, e164: "", reason: "bad_country" };
  const cleaned = normaliseLocalNumber(localNumber);
  if (cleaned.length === 0) return { valid: false, e164: "", reason: "empty" };
  if (cleaned.length < country.minLength)
    return { valid: false, e164: "", reason: "too_short" };
  if (cleaned.length > country.maxLength)
    return { valid: false, e164: "", reason: "too_long" };
  return { valid: true, e164: `${country.dial}${cleaned}` };
}

// Reverse: given a stored {phone, phoneCountry} pair, recover the
// local-number form for re-rendering in the editor input.
export function extractLocalNumber(
  e164: string,
  countryCode: PhoneCountryCode | string,
): string {
  const country = findPhoneCountry(countryCode);
  if (!country) return e164;
  if (e164.startsWith(country.dial)) return e164.slice(country.dial.length);
  return e164;
}
