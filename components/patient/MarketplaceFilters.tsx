"use client";

import { Filter, MapPin, Sparkles, Truck, Award, Stethoscope, HeartHandshake } from "lucide-react";

// Filter values split medical/professional offerings (services[]) from
// extras (additionalServices[]) — operationally distinct categories that
// the patient picks for very different reasons. Languages used to be a
// chip filter; it's now informational-only on the nurse detail page.
export interface MarketplaceFilterValues {
  service: string;              // medical/professional service (single select)
  additionalServices: string[]; // extras (cooking, transport, etc.) multi-select
  shift: string;                // "" | "a" | "b" | "c"
  gender: string;               // "" | "any" | "male" | "female"
  overnight: string;            // "any" | "yes" | "no"
  location: string;
  minExperience: number;        // 0 = no filter
  availableToday: boolean;
  transportAvailable: boolean;
  skills: string[];             // selected skill chips
  certifications: string[];     // selected certificate chips
}

export type SortKey = "rating" | "price_low" | "experience";

export const EMPTY_FILTERS: MarketplaceFilterValues = {
  service: "",
  additionalServices: [],
  shift: "",
  gender: "",
  overnight: "any",
  location: "",
  minExperience: 0,
  availableToday: false,
  transportAvailable: false,
  skills: [],
  certifications: [],
};

export function countActiveFilters(f: MarketplaceFilterValues): number {
  let n = 0;
  if (f.service) n++;
  n += f.additionalServices.length;
  if (f.shift && f.shift !== "any") n++;
  if (f.gender && f.gender !== "any") n++;
  if (f.overnight !== "any") n++;
  if (f.location) n++;
  if (f.minExperience > 0) n++;
  if (f.availableToday) n++;
  if (f.transportAvailable) n++;
  n += f.skills.length;
  n += f.certifications.length;
  return n;
}

interface MarketplaceFiltersProps {
  values: MarketplaceFilterValues;
  onChange: (next: MarketplaceFilterValues) => void;
  onClear: () => void;
  availableServices: string[];
  availableAdditionalServices: string[];
  availableSkills: string[];
  availableCertifications: string[];
  sortBy: SortKey;
  onSortChange: (next: SortKey) => void;
}

function ChipMultiSelect({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  accent = "sky",
}: {
  label: string;
  icon: typeof Filter;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  accent?: "sky" | "violet" | "emerald";
}) {
  if (options.length === 0) return null;

  const accentClasses = {
    sky: "border-sky-500 bg-sky-50 text-sky-700",
    violet: "border-violet-500 bg-violet-50 text-violet-700",
    emerald: "border-emerald-500 bg-emerald-50 text-emerald-700",
  }[accent];

  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? accentClasses
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketplaceFilters({
  values,
  onChange,
  onClear,
  availableServices,
  availableAdditionalServices,
  availableSkills,
  availableCertifications,
  sortBy,
  onSortChange,
}: MarketplaceFiltersProps) {
  function patch(p: Partial<MarketplaceFilterValues>) {
    onChange({ ...values, ...p });
  }

  function toggleIn(field: "skills" | "certifications" | "additionalServices", value: string) {
    const list = values[field];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    patch({ [field]: next } as Partial<MarketplaceFilterValues>);
  }

  const activeCount = countActiveFilters(values);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-bold text-slate-800">
        <Filter className="h-5 w-5 text-sky-600" /> Filters
        {activeCount > 0 && (
          <span className="ml-auto rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">
            {activeCount} active
          </span>
        )}
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
              value={values.location}
              onChange={(e) => patch({ location: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Medical & professional services */}
        {availableServices.length > 0 && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              <Stethoscope className="h-3.5 w-3.5" /> Medical &amp; professional services
            </p>
            <select
              value={values.service}
              onChange={(e) => patch({ service: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="">Any medical service</option>
              {availableServices.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-slate-500">
              Wound care, IV therapy, injections, post-op support, etc.
            </p>
          </div>
        )}

        {/* Extra services (cooking, transport, companionship…) */}
        {availableAdditionalServices.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <HeartHandshake className="h-3.5 w-3.5" /> Extra services
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableAdditionalServices.map((opt) => {
                const isActive = values.additionalServices.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleIn("additionalServices", opt)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Cooking, transportation, cleaning, companionship — non-medical extras a nurse can provide.
            </p>
          </div>
        )}

        {/* Shift */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Shift</label>
          <select
            value={values.shift || "any"}
            onChange={(e) => patch({ shift: e.target.value === "any" ? "" : e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="any">Any Shift</option>
            <option value="a">Shift A (07:00 - 14:00)</option>
            <option value="b">Shift B (14:00 - 20:00)</option>
            <option value="c">Shift C (20:00 - 07:00)</option>
          </select>
        </div>

        {/* Min experience */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>Minimum Experience</span>
            <span className="text-xs text-slate-500">
              {values.minExperience === 0 ? "No minimum" : `${values.minExperience}+ yrs`}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={values.minExperience}
            onChange={(e) => patch({ minExperience: Number(e.target.value) })}
            className="w-full accent-sky-600"
          />
        </div>

        {/* Quick toggles */}
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-amber-500" /> Available today
            </span>
            <input
              type="checkbox"
              checked={values.availableToday}
              onChange={(e) => patch({ availableToday: e.target.checked })}
              className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Truck className="h-4 w-4 text-emerald-500" /> Has own transport
            </span>
            <input
              type="checkbox"
              checked={values.transportAvailable}
              onChange={(e) => patch({ transportAvailable: e.target.checked })}
              className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </label>
        </div>

        {/* Overnight */}
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
                onClick={() => patch({ overnight: option.value })}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
                  values.overnight === option.value
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</label>
          <select
            value={values.gender || "any"}
            onChange={(e) => patch({ gender: e.target.value === "any" ? "" : e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="any">No Preference</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>

        <ChipMultiSelect
          label="Skills"
          icon={Sparkles}
          options={availableSkills}
          selected={values.skills}
          onToggle={(v) => toggleIn("skills", v)}
          accent="violet"
        />

        <ChipMultiSelect
          label="Certifications"
          icon={Award}
          options={availableCertifications}
          selected={values.certifications}
          onToggle={(v) => toggleIn("certifications", v)}
          accent="emerald"
        />

        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Clear Filters
        </button>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="rating">Highest Rated</option>
            <option value="price_low">Lowest Price</option>
            <option value="experience">Most Experienced</option>
          </select>
        </div>
      </div>
    </div>
  );
}
