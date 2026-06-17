"use client";

import { useTranslations, useLocale } from "next-intl";
import { Filter, MapPin, Sparkles, Truck, Stethoscope, HeartHandshake, Search } from "lucide-react";
import { CATALOG_SERVICES } from "@/lib/serviceTaxonomy";
import { tLocalized } from "@/lib/i18nContent";
import { findNurseSkill, resolveSkillId } from "@/lib/nurseSkills";
import type { Locale } from "@/i18n/config";

// Map known catalogue EN labels to their bilingual entries so the
// dropdowns can render the active locale's label without touching the
// underlying storage shape. Falls back to the raw nurse-set string for
// custom entries.
const CATALOG_BY_EN_LABEL: Record<string, (typeof CATALOG_SERVICES)[number]> = (() => {
  const out: Record<string, (typeof CATALOG_SERVICES)[number]> = {};
  for (const s of CATALOG_SERVICES) out[s.label.en.toLowerCase()] = s;
  return out;
})();

function displayServiceLabel(raw: string, locale: Locale): string {
  const catalog = CATALOG_BY_EN_LABEL[raw.toLowerCase()];
  return catalog ? tLocalized(catalog.label, locale) : raw;
}

// Filter values split medical/professional offerings (services[]) from
// extras (additionalServices[]) — operationally distinct categories that
// the patient picks for very different reasons. Languages used to be a
// chip filter; it's now informational-only on the nurse detail page.
export interface MarketplaceFilterValues {
  query: string;
  // Provider type discriminator added in Phase 5.3 of the multi-
  // provider rollout. "any" means no filter (default). Only honoured
  // when physiotherapyEnabled is true; the chip group is hidden
  // otherwise so the marketplace looks identical to its pre-physio
  // shape when the flag is off.
  providerKind: "any" | "nurse" | "physio";
  service: string;
  additionalServices: string[];
  shift: string;
  gender: string;
  overnight: string;
  location: string;
  minExperience: number;
  availableToday: boolean;
  transportAvailable: boolean;
  skills: string[];
}

export type SortKey = "rating" | "price_low" | "experience";

export const EMPTY_FILTERS: MarketplaceFilterValues = {
  query: "",
  providerKind: "any",
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
};

export function countActiveFilters(f: MarketplaceFilterValues): number {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.providerKind !== "any") n++;
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
  return n;
}

interface MarketplaceFiltersProps {
  values: MarketplaceFilterValues;
  onChange: (next: MarketplaceFilterValues) => void;
  onClear: () => void;
  availableServices: string[];
  availableAdditionalServices: string[];
  availableSkills: string[];
  sortBy: SortKey;
  onSortChange: (next: SortKey) => void;
  // Show the provider-kind chip group. Driven by the admin
  // physiotherapyEnabled flag; when false the chips don't render and
  // the filter behaves as the pre-physio marketplace.
  showProviderKindFilter?: boolean;
}

function ChipMultiSelect({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  accent = "sky",
  renderLabel,
}: {
  label: string;
  icon: typeof Filter;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  accent?: "sky" | "violet" | "emerald";
  // Optional translation hook. When supplied, each option string is
  // passed through this function before rendering. Used by the skills
  // chip group to render catalog ids as their localized labels (or
  // raw text for legacy free-text entries that aren't in the catalog).
  renderLabel?: (option: string) => string;
}) {
  if (options.length === 0) return null;

  // All chip-group accents collapse to brand. The pre-brand surface
  // assigned different colours to different filter categories
  // (skills/services/specialties); v2 unifies on a single visual rule
  // so the filter panel reads as one consistent UI surface.
  const accentClasses = {
    sky: "border-brand bg-brand-soft/30 text-brand-deep",
    violet: "border-brand bg-brand-soft/30 text-brand-deep",
    emerald: "border-brand bg-brand-soft/30 text-brand-deep",
  }[accent];

  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {/* Chip row. gap-2 + items-start avoids the awkward overlap
          observed in AR where longer Arabic skill labels wrapped onto
          a second line that clipped the chip below. max-w-full +
          break-words on the chip itself stops a single multi-word
          label from forcing a horizontal scroll. */}
      <div className="flex flex-wrap items-start gap-2">
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`max-w-full whitespace-normal break-words rounded-full border px-3 py-1.5 text-xs font-semibold leading-tight transition ${
                isActive
                  ? accentClasses
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {renderLabel ? renderLabel(opt) : opt}
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
  sortBy,
  onSortChange,
  showProviderKindFilter = false,
}: MarketplaceFiltersProps) {
  const t = useTranslations("patient.nurses.filters");
  const tGender = useTranslations("patient.nurses.gender");
  const tProviderFilter = useTranslations("provider.marketplaceFilter");
  const locale = useLocale() as Locale;

  function patch(p: Partial<MarketplaceFilterValues>) {
    onChange({ ...values, ...p });
  }

  function toggleIn(field: "skills" | "additionalServices", value: string) {
    const list = values[field];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    patch({ [field]: next } as Partial<MarketplaceFilterValues>);
  }

  const activeCount = countActiveFilters(values);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-bold text-slate-800">
        <Filter className="h-5 w-5 text-brand" /> {t("title")}
        {activeCount > 0 && (
          <span className="ms-auto rounded-full bg-brand-soft/50 px-2.5 py-0.5 text-xs font-bold text-brand-deep">
            {t("activeCount", { n: activeCount })}
          </span>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("searchByName")}</label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={t("searchByNamePlaceholder")}
              value={values.query}
              onChange={(e) => patch({ query: e.target.value })}
              dir="auto"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-9 pe-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("location")}</label>
          <div className="relative">
            <MapPin className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("locationPlaceholder")}
              value={values.location}
              onChange={(e) => patch({ location: e.target.value })}
              dir="auto"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-9 pe-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-soft/60"
            />
          </div>
        </div>

        {/* Provider type chip group — only renders when the admin
            physiotherapyEnabled flag is on. When off, the marketplace
            looks identical to its pre-physio shape. */}
        {showProviderKindFilter && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {tProviderFilter("label")}
            </label>
            <div className="flex rounded-xl bg-slate-50 p-1">
              {(["any", "nurse", "physio"] as const).map((opt) => {
                const active = values.providerKind === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch({ providerKind: opt })}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                      active ? "bg-white text-brand-deep shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tProviderFilter(`options.${opt}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableServices.length > 0 && (
          <div className="rounded-2xl border border-brand-mist bg-brand-soft/30/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-deep">
              <Stethoscope className="h-3.5 w-3.5" /> {t("medicalServices")}
            </p>
            <select
              value={values.service}
              onChange={(e) => patch({ service: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">{t("anyMedicalService")}</option>
              {availableServices.map((service) => (
                <option key={service} value={service}>
                  {displayServiceLabel(service, locale)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-slate-500">{t("medicalServicesHelp")}</p>
          </div>
        )}

        {availableAdditionalServices.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <HeartHandshake className="h-3.5 w-3.5" /> {t("extraServices")}
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
                    {displayServiceLabel(opt, locale)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{t("extraServicesHelp")}</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("shift")}</label>
          <select
            value={values.shift || "any"}
            onChange={(e) => patch({ shift: e.target.value === "any" ? "" : e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="any">{t("anyShift")}</option>
            <option value="a">{t("shiftAFull")}</option>
            <option value="b">{t("shiftBFull")}</option>
            <option value="c">{t("shiftCFull")}</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{t("minExperience")}</span>
            <span className="text-xs text-slate-500">
              {values.minExperience === 0 ? t("noMinimum") : t("yearsPlus", { n: values.minExperience })}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={values.minExperience}
            onChange={(e) => patch({ minExperience: Number(e.target.value) })}
            className="w-full accent-brand"
          />
        </div>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-amber-500" /> {t("availableToday")}
            </span>
            <input
              type="checkbox"
              checked={values.availableToday}
              onChange={(e) => patch({ availableToday: e.target.checked })}
              className="h-4 w-4 rounded text-brand focus:ring-brand-soft/50"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Truck className="h-4 w-4 text-emerald-500" /> {t("hasTransport")}
            </span>
            <input
              type="checkbox"
              checked={values.transportAvailable}
              onChange={(e) => patch({ transportAvailable: e.target.checked })}
              className="h-4 w-4 rounded text-brand focus:ring-brand-soft/50"
            />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("overnightCare")}</label>
          <div className="flex rounded-xl bg-slate-50 p-1">
            {[
              { value: "any", labelKey: "any" as const },
              { value: "yes", labelKey: "overnightYes" as const },
              { value: "no", labelKey: "overnightNo" as const },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => patch({ overnight: option.value })}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  values.overnight === option.value
                    ? "bg-white text-brand-deep shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("gender")}</label>
          <select
            value={values.gender || "any"}
            onChange={(e) => patch({ gender: e.target.value === "any" ? "" : e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="any">{t("noPreference")}</option>
            <option value="female">{tGender("female")}</option>
            <option value="male">{tGender("male")}</option>
          </select>
        </div>

        <ChipMultiSelect
          label={t("skills")}
          icon={Sparkles}
          options={availableSkills}
          selected={values.skills}
          onToggle={(v) => toggleIn("skills", v)}
          accent="violet"
          renderLabel={(raw) => {
            // Two-step resolution: most nurses save raw catalog ids
            // ("iv-placement") since the chip picker shipped, but
            // pre-rollout profiles still hold the free-text label
            // ("IV placement") nurses originally typed. resolveSkillId
            // best-matches the free-text against the catalog so AR
            // patients always see Arabic labels for any skill the
            // catalog recognises, even on un-migrated profiles.
            const direct = findNurseSkill(raw);
            const skill = direct ?? findNurseSkill(resolveSkillId(raw) ?? "");
            return skill ? tLocalized(skill.label, locale) : raw;
          }}
        />

        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t("clearFilters")}
        </button>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("sortBy")}</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="rating">{t("sortHighestRated")}</option>
            <option value="price_low">{t("sortLowestPrice")}</option>
            <option value="experience">{t("sortMostExperienced")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
