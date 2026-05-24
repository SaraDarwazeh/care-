"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Filter, SlidersHorizontal, Search, MapPin } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseMarketplaceCard from "@/components/patient/NurseMarketplaceCard";
import { NurseMarketplaceProfile } from "@/lib/types";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function shiftLabel(value: string) {
  if (value === "a") return "Shift A";
  if (value === "b") return "Shift B";
  if (value === "c") return "Shift C";
  return value;
}

export default function PatientNursesPage() {
  const [serviceParam, setServiceParam] = useState("");
  const [shiftParam, setShiftParam] = useState("");
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFilters, setShowFilters] = useState(Boolean(serviceParam || shiftParam));
  const [filterGender, setFilterGender] = useState("");
  const [filterService, setFilterService] = useState(serviceParam);
  const [filterShift, setFilterShift] = useState(shiftParam.toLowerCase());
  const [filterOvernight, setFilterOvernight] = useState("any");
  const [filterLocation, setFilterLocation] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const svc = sp.get("service") ?? "";
      const sh = sp.get("shift") ?? "";
      // Defer state updates to avoid synchronous setState inside effect
      setTimeout(() => {
        setServiceParam(svc);
        setShiftParam(sh);
        setShowFilters(Boolean(svc || sh));
      }, 0);
    }
    let active = true;

    async function loadNurses() {
      try {
        const items = await getApprovedNurseMarketplaceProfiles();
        if (active) setNurses(items);
      } catch (loadError) {
        console.error("[patient/nurses] failed to load nurse profiles", loadError);
        if (active) setError("Unable to load nurses right now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNurses();
    return () => {
      active = false;
    };
  }, []);

  const availableServices = useMemo(() => {
    const services = new Set<string>();

    nurses.forEach((nurse) => {
      nurse.services.forEach((service) => services.add(service.name));
    });

    return Array.from(services).sort();
  }, [nurses]);

  const filteredNurses = useMemo(() => {
    return nurses.filter((nurse) => {
      if (
        filterService &&
        !nurse.services.some((service) => normalizeValue(service.name) === normalizeValue(filterService))
      ) {
        return false;
      }

      if (filterOvernight !== "any") {
        const wantsOvernight = filterOvernight === "yes";
        if (nurse.acceptsOvernight !== wantsOvernight) return false;
      }

      if (filterLocation && nurse.location && !nurse.location.toLowerCase().includes(filterLocation.toLowerCase())) {
        return false;
      }

      // Gender filter — use nurse.gender field (already in NurseProfile type)
      if (filterGender && filterGender !== "any") {
        if (!nurse.gender || nurse.gender !== filterGender) return false;
      }

      // Shift filter — use nurse.availableShifts field (already in NurseProfile type)
      if (filterShift && filterShift !== "any") {
        const nurseShifts = (nurse.availableShifts || []).map(s => s.toLowerCase());
        if (!nurseShifts.includes(filterShift.toLowerCase())) return false;
      }

      return true;
    });
  }, [nurses, filterService, filterOvernight, filterLocation, filterGender, filterShift]);

  const sortedNurses = useMemo(() => {
    return [...filteredNurses].sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "price_low") {
        const aMin = a.services.length > 0 ? Math.min(...a.services.map(s => s.price)) : Infinity;
        const bMin = b.services.length > 0 ? Math.min(...b.services.map(s => s.price)) : Infinity;
        return aMin - bMin;
      }
      if (sortBy === "experience") {
        return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
      }
      return 0;
    });
  }, [filteredNurses, sortBy]);

  const activeFilterCount = [
    filterService,
    filterGender && filterGender !== "any" ? filterGender : "",
    filterShift && filterShift !== "any" ? filterShift : "",
    filterOvernight !== "any" ? filterOvernight : "",
    filterLocation,
  ].filter(Boolean).length;

  const activeRouteLabel = serviceParam
    ? `Service: ${serviceParam}`
    : shiftParam
      ? shiftLabel(shiftParam ?? "")
      : "";
  const detailQuery = new URLSearchParams();

  if (serviceParam) {
    detailQuery.set("service", serviceParam);
  }

  if (shiftParam) {
    detailQuery.set("shift", shiftParam);
  }

  if (loading) {
    return <LoadingScreen text="Loading available nurses..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">Find Your Nurse</h1>
        <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">Browse approved healthcare professionals, filter by your needs, and book instantly.</p>
      </div>

      {activeRouteLabel ? (
        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          Pre-filtered for {activeRouteLabel}.
        </div>
      ) : null}

      {error ? <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">Unable to load nurses right now.</div> : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-72 lg:shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
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
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-bold text-slate-800">
                <Filter className="h-5 w-5 text-sky-600" /> Filters
                {activeFilterCount > 0 && (
                  <span className="ml-auto rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                    {activeFilterCount} active
                  </span>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="City or village..."
                      value={filterLocation}
                      onChange={(event) => setFilterLocation(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Service Needed</label>
                  <select
                    value={filterService}
                    onChange={(event) => setFilterService(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Any Service</option>
                    {availableServices.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Overnight Care</label>
                  <div className="flex rounded-xl bg-slate-50 p-1">
                    {[
                      { value: "any", label: "Any" },
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFilterOvernight(option.value)}
                        className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${filterOvernight === option.value ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Shift</label>
                  <select
                    value={filterShift}
                    onChange={(event) => setFilterShift(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="any">Any Shift</option>
                    <option value="a">Shift A (07:00 - 14:00)</option>
                    <option value="b">Shift B (14:00 - 20:00)</option>
                    <option value="c">Shift C (20:00 - 07:00)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</label>
                  <select
                    value={filterGender}
                    onChange={(event) => setFilterGender(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="any">No Preference</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilterService("");
                    setFilterOvernight("any");
                    setFilterLocation("");
                    setFilterGender("");
                    setFilterShift("");
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear Filters
                </button>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="price_low">Lowest Price</option>
                    <option value="experience">Most Experienced</option>
                  </select>
                </div>
              </div>
            </div>
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
                onClick={() => {
                  setFilterService("");
                  setFilterOvernight("any");
                  setFilterLocation("");
                  setFilterGender("");
                  setFilterShift("");
                }}
                className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {sortedNurses.map((nurse) => (
                <NurseMarketplaceCard key={nurse.userId} nurse={nurse} detailQuery={detailQuery.toString()} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
