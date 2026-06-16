"use client";

import { useMemo, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import {
  MEDICAL_CONDITION_GROUPS,
  findMedicalCondition,
  groupedMedicalConditions,
  type MedicalCondition,
  type MedicalConditionGroup,
} from "@/lib/medicalConditions";
import { tLocalized } from "@/lib/i18nContent";
import type { Locale } from "@/i18n/config";

interface MedicalConditionsFieldProps {
  selectedIds: string[];
  onChangeIds: (next: string[]) => void;
  customValues: string[];
  onChangeCustom: (next: string[]) => void;
}

// Grouped multi-select for canonical medical conditions plus a
// free-text "other condition" escape hatch. Replaces the legacy
// TagInput used for `diseases` in the patient profile editor.
export default function MedicalConditionsField({
  selectedIds,
  onChangeIds,
  customValues,
  onChangeCustom,
}: MedicalConditionsFieldProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("conditions");
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<MedicalConditionGroup>>(new Set());
  const [customDraft, setCustomDraft] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => groupedMedicalConditions(), []);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredGroups = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return grouped;
    const filtered: Record<MedicalConditionGroup, MedicalCondition[]> = {} as Record<
      MedicalConditionGroup,
      MedicalCondition[]
    >;
    for (const group of MEDICAL_CONDITION_GROUPS) {
      const matches = grouped[group].filter((c) => {
        const en = c.label.en.toLowerCase();
        const ar = c.label.ar?.toLowerCase() ?? "";
        return en.includes(needle) || ar.includes(needle) || c.id.includes(needle);
      });
      if (matches.length > 0) filtered[group] = matches;
    }
    return filtered;
  }, [grouped, searchTerm]);

  const hasAnyMatch = (Object.keys(filteredGroups) as MedicalConditionGroup[]).length > 0;

  function toggleId(id: string) {
    if (selectedSet.has(id)) {
      onChangeIds(selectedIds.filter((s) => s !== id));
    } else {
      onChangeIds([...selectedIds, id]);
    }
  }

  function toggleGroup(group: MedicalConditionGroup) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function addCustom() {
    const value = customDraft.trim();
    if (!value) return;
    // De-duplicate (case-insensitive) and reject if it matches a canonical
    // label exactly — the picker above should be used instead.
    const exists = customValues.some((v) => v.toLowerCase() === value.toLowerCase());
    if (exists) {
      setCustomDraft("");
      return;
    }
    onChangeCustom([...customValues, value]);
    setCustomDraft("");
    // Re-focus for rapid entry.
    customInputRef.current?.focus();
  }

  function removeCustom(value: string) {
    onChangeCustom(customValues.filter((v) => v !== value));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">{t("picker.label")}</label>
        <p className="text-xs text-slate-500">{t("picker.subtitle")}</p>
      </div>

      {/* Selected chips */}
      {(selectedIds.length > 0 || customValues.length > 0) && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-700">
            {t("picker.selectedCount", { n: selectedIds.length + customValues.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map((id) => {
              const c = findMedicalCondition(id);
              const label = c ? tLocalized(c.label, locale) : id;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-semibold text-violet-700"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => toggleId(id)}
                    aria-label={t("picker.removeChip")}
                    className="ms-0.5 rounded-full p-0.5 text-violet-500 hover:bg-violet-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {customValues.map((value) => (
              <span
                key={`custom:${value}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700"
                title={t("picker.customLabel")}
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeCustom(value)}
                  aria-label={t("picker.removeChip")}
                  className="ms-0.5 rounded-full p-0.5 text-amber-500 hover:bg-amber-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("picker.search")}
          dir="auto"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-9 pe-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Grouped options */}
      {!hasAnyMatch ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-500">
          {t("picker.noResults")}
        </p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
          {(Object.keys(filteredGroups) as MedicalConditionGroup[]).map((group) => {
            const items = filteredGroups[group];
            const collapsed = collapsedGroups.has(group) && !searchTerm.trim();
            return (
              <div key={group} className="rounded-2xl border border-slate-100 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="flex w-full items-center justify-between text-start"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {t("picker.groupHeader", {
                      group: t(`groups.${group}`),
                      count: items.length,
                    })}
                  </span>
                  {collapsed ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" aria-label={t("picker.expandGroup")} />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-slate-400" aria-label={t("picker.collapseGroup")} />
                  )}
                </button>
                {!collapsed && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((c) => {
                      const active = selectedSet.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleId(c.id)}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? "border-violet-500 bg-violet-100 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                          }`}
                        >
                          {tLocalized(c.label, locale)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom additions */}
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-3">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-700">
          {t("picker.customLabel")}
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={customInputRef}
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={t("picker.customPlaceholder")}
            dir="auto"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customDraft.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{t("picker.customHint")}</p>
      </div>
    </div>
  );
}
