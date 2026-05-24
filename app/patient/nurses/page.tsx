"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, SlidersHorizontal, Search } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseMarketplaceCard from "@/components/patient/NurseMarketplaceCard";
import MarketplaceFilters, {
  EMPTY_FILTERS,
  countActiveFilters,
  type MarketplaceFilterValues,
  type SortKey,
} from "@/components/patient/MarketplaceFilters";
import type { NurseDay, NurseMarketplaceProfile } from "@/lib/types";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";

const WEEKDAYS: NurseDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayLocalDay(): NurseDay {
  const now = new Date();
  return WEEKDAYS[now.getDay()];
}

function isOnLeaveToday(nurse: NurseMarketplaceProfile): boolean {
  if (!nurse.onLeave) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startStr = nurse.leaveStartDate;
  const endStr = nurse.leaveEndDate;
  const start = startStr ? new Date(startStr).setHours(0, 0, 0, 0) : -Infinity;
  const end = endStr ? new Date(endStr).setHours(23, 59, 59, 999) : Infinity;
  const t = today.getTime();
  return t >= start && t <= end;
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function shiftLabel(value: string) {
  if (value === "a") return "Shift A";
  if (value === "b") return "Shift B";
  if (value === "c") return "Shift C";
  return value;
}

function readFiltersFromParams(params: URLSearchParams): { filters: MarketplaceFilterValues; sortBy: SortKey } {
  const sortRaw = params.get("sort");
  const sortBy: SortKey =
    sortRaw === "price_low" || sortRaw === "experience" ? sortRaw : "rating";

  return {
    filters: {
      service: params.get("service") ?? "",
      shift: (params.get("shift") ?? "").toLowerCase(),
      gender: params.get("gender") ?? "",
      overnight: params.get("overnight") ?? "any",
      location: params.get("location") ?? "",
      minExperience: Number(params.get("minExp") ?? "0") || 0,
      availableToday: params.get("availableToday") === "1",
      transportAvailable: params.get("transport") === "1",
      skills: (params.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      certifications: (params.get("certs") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      languages: (params.get("languages") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    },
    sortBy,
  };
}

function writeFiltersToParams(values: MarketplaceFilterValues, sortBy: SortKey): URLSearchParams {
  const p = new URLSearchParams();
  if (values.service) p.set("service", values.service);
  if (values.shift) p.set("shift", values.shift);
  if (values.gender) p.set("gender", values.gender);
  if (values.overnight !== "any") p.set("overnight", values.overnight);
  if (values.location) p.set("location", values.location);
  if (values.minExperience > 0) p.set("minExp", String(values.minExperience));
  if (values.availableToday) p.set("availableToday", "1");
  if (values.transportAvailable) p.set("transport", "1");
  if (values.skills.length) p.set("skills", values.skills.join(","));
  if (values.certifications.length) p.set("certs", values.certifications.join(","));
  if (values.languages.length) p.set("languages", values.languages.join(","));
  if (sortBy !== "rating") p.set("sort", sortBy);
  return p;
}

function PatientNursesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = useMemo(() => readFiltersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [filters, setFilters] = useState<MarketplaceFilterValues>(initial.filters);
  const [sortBy, setSortBy] = useState<SortKey>(initial.sortBy);
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load nurses once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await getApprovedNurseMarketplaceProfiles();
        if (active) setNurses(items);
      } catch (loadError) {
        console.error("[patient/nurses] failed to load nurse profiles", loadError);
        if (active) setError("Unable to load nurses right now.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist filter state to URL whenever it changes.
  useEffect(() => {
    const params = writeFiltersToParams(filters, sortBy);
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    // Avoid pushing a new history entry on every keystroke — replace instead.
    router.replace(target, { scroll: false });
  }, [filters, sortBy, pathname, router]);

  // Derive filter option lists from loaded nurse data.
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => n.services.forEach((s) => set.add(s.name)));
    return Array.from(set).sort();
  }, [nurses]);

  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => (n.skills ?? []).forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [nurses]);

  const availableCertifications = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => (n.certificates ?? []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [nurses]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) => (n.languages ?? []).forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [nurses]);

  const filteredNurses = useMemo(() => {
    const today = todayLocalDay();

    return nurses.filter((nurse) => {
      if (
        filters.service &&
        !nurse.services.some(
          (service) => normalizeValue(service.name) === normalizeValue(filters.service),
        )
      ) {
        return false;
      }

      if (filters.overnight !== "any") {
        const wantsOvernight = filters.overnight === "yes";
        if (Boolean(nurse.acceptsOvernight) !== wantsOvernight) return false;
      }

      if (filters.location) {
        const hay = (nurse.location ?? "").toLowerCase();
        if (!hay.includes(filters.location.toLowerCase())) return false;
      }

      if (filters.gender && filters.gender !== "any") {
        if (!nurse.gender || nurse.gender !== filters.gender) return false;
      }

      if (filters.shift && filters.shift !== "any") {
        const nurseShifts = (nurse.availableShifts ?? []).map((s) => s.toLowerCase());
        if (!nurseShifts.includes(filters.shift.toLowerCase())) return false;
      }

      if (filters.minExperience > 0 && (nurse.experienceYears ?? 0) < filters.minExperience) {
        return false;
      }

      if (filters.transportAvailable && !nurse.transportAvailable) {
        return false;
      }

      if (filters.availableToday) {
        const days = nurse.availableDays ?? [];
        if (!days.includes(today)) return false;
        if (isOnLeaveToday(nurse)) return false;
      }

      if (filters.skills.length > 0) {
        const nurseSkills = (nurse.skills ?? []).map((s) => s.toLowerCase());
        const wanted = filters.skills.map((s) => s.toLowerCase());
        if (!wanted.every((w) => nurseSkills.includes(w))) return false;
      }

      if (filters.certifications.length > 0) {
        const certs = (nurse.certificates ?? []).map((c) => c.toLowerCase());
        const wanted = filters.certifications.map((c) => c.toLowerCase());
        if (!wanted.every((w) => certs.includes(w))) return false;
      }

      if (filters.languages.length > 0) {
        const langs = (nurse.languages ?? []).map((l) => l.toLowerCase());
        const wanted = filters.languages.map((l) => l.toLowerCase());
        if (!wanted.every((w) => langs.includes(w))) return false;
      }

      return true;
    });
  }, [nurses, filters]);

  const sortedNurses = useMemo(() => {
    return [...filteredNurses].sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "price_low") {
        const aMin = a.services.length > 0 ? Math.min(...a.services.map((s) => s.price)) : Infinity;
        const bMin = b.services.length > 0 ? Math.min(...b.services.map((s) => s.price)) : Infinity;
        return aMin - bMin;
      }
      if (sortBy === "experience") return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
      return 0;
    });
  }, [filteredNurses, sortBy]);

  const activeFilterCount = countActiveFilters(filters);

  const activeRouteLabel = filters.service
    ? `Service: ${filters.service}`
    : filters.shift
      ? shiftLabel(filters.shift)
      : "";

  // detailQuery propagates pre-filter context to the nurse detail page so
  // the booking form opens with the right initial values.
  const detailQuery = new URLSearchParams();
  if (filters.service) detailQuery.set("service", filters.service);
  if (filters.shift) detailQuery.set("shift", filters.shift);

  if (loading) {
    return <LoadingScreen text="Loading available nurses..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">Find Your Nurse</h1>
        <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
          Browse approved healthcare professionals, filter by your needs, and book instantly.
        </p>
      </div>

      {activeRouteLabel ? (
        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          Pre-filtered for {activeRouteLabel}.
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-80 lg:shrink-0">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 font-bold text-slate-800 shadow-sm lg:hidden"
            type="button"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-sky-600" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <span className="text-sm font-normal text-sky-600">{showFilters ? "Hide" : "Show"}</span>
          </button>

          <div className={`mt-4 lg:mt-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            <MarketplaceFilters
              values={filters}
              onChange={setFilters}
              onClear={() => setFilters(EMPTY_FILTERS)}
              availableServices={availableServices}
              availableSkills={availableSkills}
              availableCertifications={availableCertifications}
              availableLanguages={availableLanguages}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </div>

        <div className="flex-1">
          {nurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No nurses available</h3>
              <p className="mt-1 text-sm text-slate-500">Check back later or expand your search criteria.</p>
            </div>
          ) : sortedNurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Filter className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No matches found</h3>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your filters to see more results.</p>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-slate-500">
                {sortedNurses.length} nurse{sortedNurses.length === 1 ? "" : "s"} match your filters
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {sortedNurses.map((nurse) => (
                  <NurseMarketplaceCard
                    key={nurse.userId}
                    nurse={nurse}
                    detailQuery={detailQuery.toString()}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientNursesPage() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading available nurses..." />}>
      <PatientNursesPageInner />
    </Suspense>
  );
}
