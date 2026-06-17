"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Phone, Loader2, LogOut } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import PhoneInput from "@/components/common/PhoneInput";
import { validatePhone } from "@/lib/phone";

// Backfill interstitial for any authenticated user who lacks a phone
// number on their users/{uid} doc — applies to pre-rollout accounts
// + Google sign-ins that landed before the role page collected phone.
// useProtectedRoute redirects every protected route here whenever
// appUser.phone is missing; this page is the only escape (or sign-out).
export default function PhoneRequiredPage() {
  const router = useRouter();
  const t = useTranslations("auth.phoneRequired");
  const { appUser, refreshProfile, loading } = useAuth();
  const [phoneCountry, setPhoneCountry] = useState<"PS" | "IL">("PS");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSave() {
    const check = validatePhone(phoneCountry, phoneLocal);
    if (!check.valid) {
      setError(t("invalid"));
      return;
    }
    if (!appUser) return;
    setSaving(true);
    setError("");
    try {
      const { db } = ensureClientFirebase();
      await updateDoc(doc(db, "users", appUser.id), {
        phone: check.e164,
        phoneCountry,
      });
      await refreshProfile();
      // Land on the role-appropriate home — the protected-route guard
      // would have bounced them through here, so going to root lets
      // their next click route them normally.
      router.replace("/");
    } catch (err) {
      console.error("[phone-required] update failed", err);
      setError(err instanceof Error ? err.message : t("saveFailed"));
      setSaving(false);
    }
  }

  async function onSignOut() {
    await logoutUser();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft/50 text-brand-deep">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              {t("title")}
            </h1>
            {appUser?.email && (
              <p className="text-xs text-slate-500">{appUser.email}</p>
            )}
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-600">{t("body")}</p>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">
            {t("label")}
          </label>
          <PhoneInput
            countryCode={phoneCountry}
            onCountryChange={setPhoneCountry}
            localNumber={phoneLocal}
            onLocalNumberChange={setPhoneLocal}
            required
            id="phone-required"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" /> {t("signOut")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !validatePhone(phoneCountry, phoneLocal).valid}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-deep disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      </div>
    </main>
  );
}
