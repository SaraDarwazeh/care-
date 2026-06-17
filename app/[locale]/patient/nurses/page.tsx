"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Filter, History, SlidersHorizontal, Search } from "lucide-react";
import BackLink from "@/components/common/BackLink";
import { getLastPreferences } from "@/lib/bookingPreferences";
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
import { usePhysiotherapyEnabled } from "@/hooks/useSiteSettings";
import { providerKindFor } from "@/lib/providerKind";

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

// Normalize for diacritic-insensitive search. Strips combining marks so
// "Sára", "sara", and "سارة" with/without tashkīl all match the same key.
function normalizeForSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function shiftLabel(value: string, t: ReturnType<typeof useTranslations>): string {
  if (value === "a" || value === "b" || value === "c") return t(`shiftLabel.${value}`);
  return value;
}

function readFiltersFromParams(params: URLSearchParams): { filters: MarketplaceFilterValues; sortBy: SortKey } {
  const sortRaw = params.get("sort");
  const sortBy: SortKey =
    sortRaw === "price_low" || sortRaw === "experience" ? sortRaw : "rating";

  // providerKind URL param is honoured for /find-care → marketplace
  // hand-offs. Anything other than "nurse" or "physio" → "any".
  const pkRaw = params.get("providerKind");
  const providerKind: "any" | "nurse" | "physio" =
    pkRaw === "nurse" || pkRaw === "physio" ? pkRaw : "any";

  return {
    filters: {
      query: params.get("q") ?? "",
      providerKind,
      service: params.get("service") ?? "",
      additionalServices: (params.get("extras") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      shift: (params.get("shift") ?? "").toLowerCase(),
      gender: params.get("gender") ?? "",
      overnight: params.get("overnight") ?? "any",
      location: params.get("location") ?? "",
      minExperience: Number(params.get("minExp") ?? "0") || 0,
      availableToday: params.get("availableToday") === "1",
      transportAvailable: params.get("transport") === "1",
      skills: (params.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    },
    sortBy,
  };
}

function writeFiltersToParams(values: MarketplaceFilterValues, sortBy: SortKey): URLSearchParams {
  const p = new URLSearchParams();
  if (values.query.trim()) p.set("q", values.query.trim());
  if (values.providerKind !== "any") p.set("providerKind", values.providerKind);
  if (values.service) p.set("service", values.service);
  if (values.additionalServices.length) p.set("extras", values.additionalServices.join(","));
  if (values.shift) p.set("shift", values.shift);
  if (values.gender) p.set("gender", values.gender);
  if (values.overnight !== "any") p.set("overnight", values.overnight);
  if (values.location) p.set("location", values.location);
  if (values.minExperience > 0) p.set("minExp", String(values.minExperience));
  if (values.availableToday) p.set("availableToday", "1");
  if (values.transportAvailable) p.set("transport", "1");
  if (values.skills.length) p.set("skills", values.skills.join(","));
  if (sortBy !== "rating") p.set("sort", sortBy);
  return p;
}

function PatientNursesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("patient.marketplace");
  const physiotherapyEnabled = usePhysiotherapyEnabled();

  const initial = useMemo(() => readFiltersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  // Capture the booking-mode hint once on mount. It's not a filter (it
  // doesn't affect which nurses appear) so it lives outside the filter
  // state; it just rides through to the nurse detail page so the
  // booking form opens at the mode the patient picked upstream.
  const [routingBookingType] = useState<string | null>(() => searchParams.get("bookingType"));

  const [filters, setFilters] = useState<MarketplaceFilterValues>(initial.filters);
  const [sortBy, setSortBy] = useState<SortKey>(initial.sortBy);
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Last preferences from the patient's most recent booking. Surfaced as a
  // one-click "Use last preferences" chip when the current filter state is
  // empty (so we don't override what the patient has already typed).
  const lastPrefs = useMemo(() => getLastPreferences(), []);
  function applyLastPreferences() {
    if (!lastPrefs) return;
    setFilters((prev) => ({
      ...prev,
      service: lastPrefs.service ?? prev.service,
      shift: lastPrefs.shift ? lastPrefs.shift.toLowerCase() : prev.shift,
    }));
  }
  const showLastPrefsChip =
    !!lastPrefs &&
    (lastPrefs.service || lastPrefs.shift) &&
    !filters.service &&
    !filters.shift;

  // Load nurses once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await getApprovedNurseMarketplaceProfiles();
        if (active) setNurses(items);
      } catch (loadError) {
        console.error("[patient/nurses] failed to load nurse profiles", loadError);
        if (active) setError(t("loadError"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

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

  // Extra services come from each nurse's additionalServices[] (cooking,
  // transport, companionship, etc.). Same chip-collection pattern as
  // medical services, but feeds the new Extra services filter section.
  const availableAdditionalServices = useMemo(() => {
    const set = new Set<string>();
    nurses.forEach((n) =>
      (n.additionalServices ?? []).forEach((s) => {
        if (s.name) set.add(s.name);
      }),
    );
    return Array.from(set).sort();
  }, [nurses]);

  const filteredNurses = useMemo(() => {
    const today = todayLocalDay();

    const q = normalizeForSearch(filters.query);

    return nurses.filter((nurse) => {
      // Hide physiotherapists from patients entirely when the admin
      // flag is off. Admin retains the ability to manage these
      // providers (separate admin page is not flag-gated). Existing
      // pre-toggle physios who were briefly visible will not be
      // present here once the flag is flipped on by mistake either —
      // marketplace always honours the current flag state.
      const kind = providerKindFor(nurse);
      if (!physiotherapyEnabled && kind === "physio") return false;
      if (filters.providerKind !== "any" && kind !== filters.providerKind) return false;

      if (q) {
        const name = normalizeForSearch(nurse.fullName ?? "");
        if (!name.includes(q)) return false;
      }

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

      if (filters.additionalServices.length > 0) {
        const extras = (nurse.additionalServices ?? []).map((s) => s.name.toLowerCase());
        const wanted = filters.additionalServices.map((s) => s.toLowerCase());
        if (!wanted.every((w) => extras.includes(w))) return false;
      }

      return true;
    });
  }, [nurses, filters, physiotherapyEnabled]);

  const sortedNurses = useMemo(() => {
    return [...filteredNurses].sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "price_low") {
        const minPrice = (nurse: NurseMarketplaceProfile): number => {
          const shifts = Object.values(nurse.pricePerShift ?? {}).filter(
            (n): n is number => typeof n === "number" && n > 0,
          );
          if (shifts.length > 0) return Math.min(...shifts);
          if (nurse.services.length > 0) return Math.min(...nurse.services.map((s) => s.price));
          return nurse.pricePerHour && nurse.pricePerHour > 0 ? nurse.pricePerHour : Infinity;
        };
        return minPrice(a) - minPrice(b);
      }
      if (sortBy === "experience") return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
      return 0;
    });
  }, [filteredNurses, sortBy]);

  const activeFilterCount = countActiveFilters(filters);

  const activeRouteLabel = filters.service
    ? t("preFilteredService", { service: filters.service })
    : filters.shift
      ? shiftLabel(filters.shift, t)
      : "";

  // detailQuery propagates pre-filter context to the nurse detail page so
  // the booking form opens with the right initial values.
  const detailQuery = new URLSearchParams();
  if (filters.service) detailQuery.set("service", filters.service);
  if (filters.shift) detailQuery.set("shift", filters.shift);
  if (
    routingBookingType === "one-time" ||
    routingBookingType === "shift" ||
    routingBookingType === "package"
  ) {
    detailQuery.set("bookingType", routingBookingType);
  }

  if (loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-3">
        <BackLink href="/" labelKey="patient.marketplace.backToHome" />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">{t("subtitle")}</p>
        {showLastPrefsChip && (
          <button
            type="button"
            onClick={applyLastPreferences}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
          >
            <History className="h-3.5 w-3.5" />
            {t("useLastPreferences")}
            {lastPrefs?.service && <span className="font-semibold">· {lastPrefs.service}</span>}
            {lastPrefs?.shift && (
              <span className="font-semibold">· {shiftLabel(lastPrefs.shift.toLowerCase(), t)}</span>
            )}
          </button>
        )}
      </div>

      {activeRouteLabel ? (
        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          {t("preFilteredFor", { label: activeRouteLabel })}
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
              <SlidersHorizontal className="h-5 w-5 text-sky-600" /> {t("mobileFiltersLabel")}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <span className="text-sm font-normal text-sky-600">{showFilters ? t("hide") : t("show")}</span>
          </button>

          <div className={`mt-4 lg:mt-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            <MarketplaceFilters
              values={filters}
              onChange={setFilters}
              onClear={() => setFilters(EMPTY_FILTERS)}
              availableServices={availableServices}
              availableAdditionalServices={availableAdditionalServices}
              availableSkills={availableSkills}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showProviderKindFilter={physiotherapyEnabled}
            />
          </div>
        </div>

        <div className="flex-1">
          {nurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t("noNursesTitle")}</h3>
              <p className="mt-1 text-sm text-slate-500">{t("noNursesBody")}</p>
            </div>
          ) : sortedNurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Filter className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t("noMatchesTitle")}</h3>
              <p className="mt-1 text-sm text-slate-500">{t("noMatchesBody")}</p>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
              >
                {t("clearAllFilters")}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-slate-500">
                {t("matchCount", { n: sortedNurses.length })}
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
    <Suspense fallback={<LoadingScreen />}>
      <PatientNursesPageInner />
    </Suspense>
  );
}
