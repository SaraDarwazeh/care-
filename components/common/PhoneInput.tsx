"use client";

import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import {
  PHONE_COUNTRIES,
  validatePhone,
  type PhoneCountryCode,
} from "@/lib/phone";

interface PhoneInputProps {
  countryCode: PhoneCountryCode;
  onCountryChange: (next: PhoneCountryCode) => void;
  localNumber: string;
  onLocalNumberChange: (next: string) => void;
  // Show an inline error message when the current pair fails validation.
  // Defaults to true — set false on call sites that surface errors
  // elsewhere (e.g. a form-level banner).
  showInlineError?: boolean;
  required?: boolean;
  // ID for the label/input association; falls back to a stable string.
  id?: string;
}

// Shared phone-input primitive. Country dropdown (Palestine +970,
// Israel +972) + local-number input. Stores the country code +
// raw local number separately on the parent state; consumers call
// validatePhone() at submit time to get the E.164 string.
//
// Used at every phone-collection site: registration, Google sign-
// in interstitial, patient profile, nurse profile, /auth/phone-
// required backfill gate.
export default function PhoneInput({
  countryCode,
  onCountryChange,
  localNumber,
  onLocalNumberChange,
  showInlineError = true,
  required = false,
  id = "phone-input",
}: PhoneInputProps) {
  const t = useTranslations("common.phone");
  const locale = useLocale() as Locale;
  const result = validatePhone(countryCode, localNumber);
  const showError =
    showInlineError && localNumber.trim().length > 0 && !result.valid;

  return (
    <div>
      <div className="flex gap-2">
        <select
          aria-label={t("countryLabel")}
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value as PhoneCountryCode)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {locale === "ar" ? c.label.ar : c.label.en} ({c.dial})
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          required={required}
          dir="ltr"
          placeholder={t("localNumberPlaceholder")}
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value)}
          className={`flex-1 rounded-xl border bg-white px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand-soft/50 ${
            showError ? "border-rose-400" : "border-slate-200"
          }`}
        />
      </div>
      {showError && (
        <p className="mt-1 text-xs font-semibold text-rose-600">
          {result.reason === "too_short" && t("errorTooShort")}
          {result.reason === "too_long" && t("errorTooLong")}
          {result.reason === "empty" && t("errorRequired")}
        </p>
      )}
    </div>
  );
}
