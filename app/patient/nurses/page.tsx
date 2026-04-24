"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, SlidersHorizontal, Search, MapPin, Moon } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import NurseMarketplaceCard from "@/components/patient/NurseMarketplaceCard";
import { NurseMarketplaceProfile } from "@/lib/types";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";

export default function PatientNursesPage() {
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [filterGender, setFilterGender] = useState(""); // Mocked
  const [filterService, setFilterService] = useState("");
  const [filterShift, setFilterShift] = useState(""); // Mocked
  const [filterOvernight, setFilterOvernight] = useState("any");
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => {
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
    return () => { active = false; };
  }, []);

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    nurses.forEach((nurse) => {
      nurse.services.forEach((s) => services.add(s.name));
    });
    return Array.from(services).sort();
  }, [nurses]);

  const filteredNurses = useMemo(() => {
    return nurses.filter((nurse) => {
      if (filterService && !nurse.services.some((s) => s.name === filterService)) return false;
      if (filterOvernight !== "any") {
        const wantsOvernight = filterOvernight === "yes";
        if (nurse.acceptsOvernight !== wantsOvernight) return false;
      }
      if (filterLocation && nurse.location && !nurse.location.toLowerCase().includes(filterLocation.toLowerCase())) {
        return false;
      }
      // Mocking Gender and Shift filters since they aren't strictly in DB
      if (filterGender && filterGender !== "any") {
        // Just dummy filter for demonstration (alternating based on name length for demo)
        const isMale = nurse.fullName.length % 2 === 0;
        if (filterGender === "male" && !isMale) return false;
        if (filterGender === "female" && isMale) return false;
      }
      if (filterShift && filterShift !== "any") {
        // Dummy filter for shift
        const shiftMock = ["a", "b", "c"][nurse.fullName.length % 3];
        if (filterShift !== shiftMock) return false;
      }
      return true;
    });
  }, [nurses, filterService, filterOvernight, filterLocation, filterGender, filterShift]);

  if (loading) {
    return <LoadingScreen text="Loading available nurses..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Find Your Nurse</h1>
        <p className="mt-2 text-base text-slate-600">Browse approved healthcare professionals, filter by your needs, and book instantly.</p>
      </div>

      {error ? <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Filters Sidebar (Mobile toggleable) */}
        <div className="lg:w-72 lg:shrink-0">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex w-full items-center justify-between rounded-2xl bg-white p-4 font-bold text-slate-800 shadow-sm border border-slate-100 lg:hidden"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-sky-600" /> Filters
            </div>
            <span className="text-sm font-normal text-sky-600">{showFilters ? "Hide" : "Show"}</span>
          </button>

          <div className={`mt-4 lg:mt-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-bold text-slate-800">
                <Filter className="h-5 w-5 text-sky-600" /> Filters
              </div>
              
              <div className="space-y-5">
                {/* Location */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="City or village..."
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Service Needed</label>
                  <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Any Service</option>
                    {Array.isArray(availableServices) && availableServices.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Overnight */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Overnight Care</label>
                  <div className="flex rounded-xl bg-slate-50 p-1">
                    {["any", "yes", "no"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setFilterOvernight(val)}
                        className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${filterOvernight === val ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shift (Mock) */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Shift</label>
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="any">Any Shift</option>
                    <option value="a">Shift A (07:00 - 14:00)</option>
                    <option value="b">Shift B (14:00 - 20:00)</option>
                    <option value="c">Shift C (20:00 - 07:00)</option>
                  </select>
                </div>

                {/* Gender (Mock) */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="any">No Preference</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <button
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
              </div>
            </div>
          </div>
        </div>

        {/* Nurses List */}
        <div className="flex-1">
          {nurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No nurses available</h3>
              <p className="mt-1 text-sm text-slate-500">Check back later or expand your search criteria.</p>
            </div>
          ) : filteredNurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <Filter className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No matches found</h3>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your filters to see more results.</p>
              <button
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
              {Array.isArray(filteredNurses) && filteredNurses.map((nurse) => (
                <NurseMarketplaceCard key={nurse.userId} nurse={nurse} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
