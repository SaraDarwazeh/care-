import type { NurseProfile } from "@/lib/types";

// Fields whose change should trigger admin re-review for an already-approved
// nurse. Picked to cover credentials + pricing + public-facing identity, and
// exclude operational-only changes (availability, gender, phone, address).
// Shared between client `saveNurseProfile` (detect a significant edit) and
// the server-side approval endpoint (stamp the snapshot at approve time)
// so the hash they compute matches byte-for-byte.
export const SIGNIFICANT_NURSE_FIELDS: ReadonlyArray<keyof NurseProfile> = [
  "bio",
  "pricePerHour",
  "pricePerShift",
  "services",
  "additionalServices",
  "certificates",
  "specialization",
  "experienceYears",
  "languages",
  "profileImage",
  "gallery",
];

// Stable JSON of just the significant fields. Sorted keys so a re-order on
// save doesn't look like a content change. Output is the hash input — keep
// it deterministic; do not interpolate timestamps or anything stateful.
export function significantProfileSnapshot(profile: Partial<NurseProfile>): string {
  const picked: Record<string, unknown> = {};
  for (const key of SIGNIFICANT_NURSE_FIELDS) {
    const v = (profile as Record<string, unknown>)[key];
    if (v !== undefined) picked[key] = v;
  }
  const sortedKeys = Object.keys(picked).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = picked[k];
  return JSON.stringify(ordered);
}

// Web Crypto subtle.digest works in both Edge and Node 20+. The same call
// returns the same bytes everywhere, so client and server agree on hashes.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
