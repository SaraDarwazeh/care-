import {
  CATALOG_SERVICES,
  NURSING_SERVICES,
  findCatalogService,
  type CatalogService,
} from "@/lib/serviceTaxonomy";
import {
  findMedicalCondition,
  matchConditionByLabel,
} from "@/lib/medicalConditions";
import { tLocalized, type LocalizedString } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";
import type {
  CarePackage,
  NurseMarketplaceProfile,
  PatientProfile,
} from "@/lib/types";

// Pure recommendation engine. Deterministic set-intersection scoring;
// no randomness, no AI, no embeddings, no network calls. Inputs are
// already-loaded in-memory data so callers pay no extra Firestore
// round-trips — the dashboard already fetches profile / nurses /
// packages on load.

// ---------- helpers ----------

// Normalise the patient's "what's wrong" knowledge into a canonical
// id set. Falls back to fuzzy-matching legacy free-text `diseases[]`
// entries against the catalog so older profiles aren't penalised.
export function resolveCanonicalConditionIds(profile: PatientProfile | null): Set<string> {
  const ids = new Set<string>();
  if (!profile) return ids;

  for (const c of profile.conditions ?? []) {
    if (findMedicalCondition(c)) ids.add(c);
  }

  // Legacy diseases[] is now reserved for free-text "other"; a few
  // historical profiles still hold canonical-equivalent strings.
  for (const raw of profile.diseases ?? []) {
    const match = matchConditionByLabel(raw);
    if (match) ids.add(match.id);
  }
  return ids;
}

// case-insensitive substring match in either direction, used for legacy
// free-text strings vs catalogue labels.
function fuzzyContains(haystack: string, needle: string): boolean {
  const a = haystack.toLowerCase();
  const b = needle.toLowerCase();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function localeText(value: LocalizedString | undefined, locale: Locale): string {
  if (!value) return "";
  return tLocalized(value, locale);
}

// ---------- services ----------

export interface ScoredService {
  service: CatalogService;
  score: number;
  matchedConditionIds: string[];
}

export function recommendServicesForPatient(
  profile: PatientProfile | null,
  limit = 6,
): ScoredService[] {
  const ids = resolveCanonicalConditionIds(profile);
  if (ids.size === 0) return [];

  const scored: ScoredService[] = [];
  for (const s of NURSING_SERVICES) {
    const indications = s.indicatedConditions ?? [];
    const matched = indications.filter((c) => ids.has(c));
    if (matched.length === 0) continue;
    scored.push({ service: s, score: matched.length, matchedConditionIds: matched });
  }

  // Highest score first; ties broken by stable id sort.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.service.id.localeCompare(b.service.id);
  });
  return scored.slice(0, limit);
}

// ---------- nurses ----------

export interface ScoredNurse {
  nurse: NurseMarketplaceProfile;
  score: number;
  matchedServiceIds: string[];
}

// Match a free-text nurse-offered service name against a catalogue
// entry. Direct equality first (the dropdown writes canonical EN
// labels), then fuzzy fallback for legacy free-form entries.
function nurseOffersCatalogService(
  nurseServiceName: string,
  service: CatalogService,
): boolean {
  const enLabel = service.label.en;
  if (nurseServiceName.toLowerCase() === enLabel.toLowerCase()) return true;
  if (service.label.ar && nurseServiceName === service.label.ar) return true;
  return fuzzyContains(nurseServiceName, enLabel);
}

export function recommendNursesForPatient(
  profile: PatientProfile | null,
  nurses: ReadonlyArray<NurseMarketplaceProfile>,
  limit = 4,
): ScoredNurse[] {
  const recommended = recommendServicesForPatient(profile, 8);
  if (recommended.length === 0 || nurses.length === 0) return [];

  // Patient-side location signal — best-effort substring match against
  // either the nurse's primary location or their willingToServeLocations.
  const locationHint = (profile?.defaultLocation ?? "").trim().toLowerCase();
  function nurseLocationMatch(n: NurseMarketplaceProfile): boolean {
    if (!locationHint) return false;
    if (n.location && n.location.toLowerCase().includes(locationHint)) return true;
    return (n.willingToServeLocations ?? []).some((loc) =>
      loc.toLowerCase().includes(locationHint),
    );
  }

  const scored: ScoredNurse[] = [];
  for (const nurse of nurses) {
    const offeredNames = (nurse.services ?? []).map((s) => s.name);
    const matchedServiceIds: string[] = [];
    for (const rec of recommended) {
      if (offeredNames.some((name) => nurseOffersCatalogService(name, rec.service))) {
        matchedServiceIds.push(rec.service.id);
      }
    }
    if (matchedServiceIds.length === 0) continue;

    let score = matchedServiceIds.length * 2;
    if (typeof nurse.rating === "number" && nurse.rating >= 4.5) score += 1;
    if (nurseLocationMatch(nurse)) score += 1;

    scored.push({ nurse, score, matchedServiceIds });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.nurse.rating ?? 0) !== (a.nurse.rating ?? 0)) {
      return (b.nurse.rating ?? 0) - (a.nurse.rating ?? 0);
    }
    return a.nurse.fullName.localeCompare(b.nurse.fullName);
  });
  return scored.slice(0, limit);
}

// ---------- packages ----------

export interface ScoredPackage {
  pkg: CarePackage;
  score: number;
}

export function recommendPackagesForPatient(
  profile: PatientProfile | null,
  packages: ReadonlyArray<CarePackage>,
  locale: Locale = "en",
  limit = 3,
): ScoredPackage[] {
  const ids = resolveCanonicalConditionIds(profile);
  if (ids.size === 0 || packages.length === 0) return [];

  // Build the patient's condition-label corpus (active locale + EN) so
  // we can match against package strings written in either language.
  const conditionLabels: string[] = [];
  for (const id of ids) {
    const c = findMedicalCondition(id);
    if (!c) continue;
    conditionLabels.push(c.label.en);
    if (c.label.ar) conditionLabels.push(c.label.ar);
  }
  const recommendedServiceLabels = recommendServicesForPatient(profile, 8).flatMap((r) => {
    const out = [r.service.label.en];
    if (r.service.label.ar) out.push(r.service.label.ar);
    return out;
  });

  const scored: ScoredPackage[] = [];
  for (const pkg of packages) {
    if (pkg.active === false) continue;

    const recommendedFor = (pkg.recommendedFor ?? []).map((s) => localeText(s, locale));
    const included = (pkg.includedServices ?? []).map((s) => localeText(s, locale));
    const targetAudience = pkg.targetAudience ? localeText(pkg.targetAudience, locale) : "";

    let score = 0;
    for (const label of conditionLabels) {
      if (recommendedFor.some((r) => fuzzyContains(r, label))) score += 2;
      if (targetAudience && fuzzyContains(targetAudience, label)) score += 1;
    }
    for (const svc of recommendedServiceLabels) {
      if (included.some((i) => fuzzyContains(i, svc))) score += 1;
    }
    if (pkg.featured) score += 0.5; // very light featured bias as a tie-breaker

    if (score <= 0) continue;
    scored.push({ pkg, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pkg.slug.localeCompare(b.pkg.slug);
  });
  return scored.slice(0, limit);
}

// ---------- convenience for the dashboard ----------

export interface DashboardRecommendations {
  services: ScoredService[];
  nurses: ScoredNurse[];
  packages: ScoredPackage[];
  hasAnyConditions: boolean;
}

export function buildDashboardRecommendations(input: {
  profile: PatientProfile | null;
  nurses: ReadonlyArray<NurseMarketplaceProfile>;
  packages: ReadonlyArray<CarePackage>;
  locale: Locale;
}): DashboardRecommendations {
  const hasAnyConditions = resolveCanonicalConditionIds(input.profile).size > 0;
  return {
    services: recommendServicesForPatient(input.profile),
    nurses: recommendNursesForPatient(input.profile, input.nurses),
    packages: recommendPackagesForPatient(input.profile, input.packages, input.locale),
    hasAnyConditions,
  };
}

// Re-export the full catalogue so a single import on the dashboard
// covers both recommendations and supplementary lookups.
export { CATALOG_SERVICES, findCatalogService };
