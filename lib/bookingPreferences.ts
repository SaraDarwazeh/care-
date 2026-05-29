// Lightweight per-device persistence of the patient's most recent booking
// preferences. No PII, no nurse-specific data — only the kinds of choices
// a returning patient would want pre-filled (visit type, service name,
// shift, duration, add-on selections).
//
// Lives in localStorage rather than the PatientProfile because (a) it's
// convenience state and shouldn't sync across devices, (b) it's small and
// fast enough that a network round-trip isn't justified.

export type StoredBookingType = "one-time" | "shift" | "package";

export interface BookingPreferences {
  bookingType?: StoredBookingType;
  service?: string;
  shift?: string;
  durationDays?: number;
  addOnIds?: string[];
  updatedAt: string;
}

const STORAGE_KEY = "careplus.bookingPreferences.v1";
const MAX_AGE_DAYS = 90;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getLastPreferences(): BookingPreferences | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BookingPreferences>;
    if (!parsed.updatedAt) return null;

    // Drop stale state — preferences from a year ago are noise, not signal.
    const ageMs = Date.now() - new Date(parsed.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      bookingType:
        parsed.bookingType === "one-time" ||
        parsed.bookingType === "shift" ||
        parsed.bookingType === "package"
          ? parsed.bookingType
          : undefined,
      service: typeof parsed.service === "string" ? parsed.service : undefined,
      shift: typeof parsed.shift === "string" ? parsed.shift : undefined,
      durationDays:
        typeof parsed.durationDays === "number" && parsed.durationDays > 0
          ? parsed.durationDays
          : undefined,
      addOnIds: Array.isArray(parsed.addOnIds)
        ? parsed.addOnIds.filter((id): id is string => typeof id === "string")
        : undefined,
      updatedAt: parsed.updatedAt,
    };
  } catch (err) {
    console.warn("[bookingPreferences] failed to read", err);
    return null;
  }
}

export function saveLastPreferences(input: Omit<BookingPreferences, "updatedAt">): void {
  if (!isBrowser()) return;
  try {
    const payload: BookingPreferences = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[bookingPreferences] failed to save", err);
  }
}

export function clearLastPreferences(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — non-fatal.
  }
}
