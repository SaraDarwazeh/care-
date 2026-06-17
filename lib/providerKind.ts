import type { AppUser, NurseProfile, ProviderKind } from "@/lib/types";

// Shared helpers for the nurse + physiotherapist provider model. The
// codebase still uses "nurse" as the internal name for everything
// provider-side (collection, routes, services, components) — see the
// 2026-06-17 multi-provider design doc — and these helpers are the
// single seam where the codebase translates between the legacy "nurse"
// vocabulary and the new "nurse | physio" model.

export const PROVIDER_KINDS = ["nurse", "physio"] as const;

// Defaults to "nurse" when missing. Every nurse-profile reader in the
// codebase normalises through this function so a legacy doc without
// the field still renders correctly.
export function providerKindFor(profile: Pick<NurseProfile, "providerKind"> | null | undefined): ProviderKind {
  return profile?.providerKind === "physio" ? "physio" : "nurse";
}

export function isPhysio(profile: Pick<NurseProfile, "providerKind"> | null | undefined): boolean {
  return providerKindFor(profile) === "physio";
}

export function isNurse(profile: Pick<NurseProfile, "providerKind"> | null | undefined): boolean {
  return providerKindFor(profile) === "nurse";
}

// Convenience for components that have an AppUser + (optionally) the
// nurse profile. Falls back to "nurse" until the profile loads — the
// safe default since most providers historically have been nurses.
export function providerKindForUser(
  appUser: AppUser | null,
  profile: Pick<NurseProfile, "providerKind"> | null | undefined,
): ProviderKind {
  if (!appUser || appUser.role !== "nurse") return "nurse";
  return providerKindFor(profile);
}

// i18n keys for the per-kind labels. Components resolve these through
// the active translator; we centralise the key strings here so a
// rename only changes one file.
export const PROVIDER_KIND_LABEL_KEYS: Record<ProviderKind, string> = {
  nurse: "provider.kinds.nurse",
  physio: "provider.kinds.physio",
};
export const PROVIDER_KIND_PLURAL_KEYS: Record<ProviderKind, string> = {
  nurse: "provider.kinds.nursesPlural",
  physio: "provider.kinds.physiosPlural",
};
