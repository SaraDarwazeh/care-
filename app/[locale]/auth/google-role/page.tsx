"use client";

import { Suspense, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck, UserCircle, Stethoscope, Loader2 } from "lucide-react";
import { ensureClientFirebase } from "@/lib/firebase/config";
import { completeGoogleSignup, logoutUser } from "@/services/authService";
import { getLocalizedErrorMessage } from "@/services/errorService";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/consentVersions";

// Interstitial shown after a first-time Google sign-in. The Google
// credential is already created (auth.currentUser is set), but no
// Firestore users/{uid} doc exists yet — we collect role + consent here
// before writing it. Bailing out (close tab, navigate away) leaves an
// orphaned Firebase Auth user, but the next Google sign-in lands them
// back on this page, so it self-heals.
function GoogleRolePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("auth.googleRole");
  const tRoot = useTranslations();
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Subscribe to the auth state so we pick up the Google credential the
  // moment Firebase finishes restoring it on mount. Linting-friendly:
  // setState only fires inside the subscription callback, never
  // synchronously inside the effect body.
  const [user, setUser] = useState<{ uid: string; email: string; name: string } | null>(null);

  useEffect(() => {
    const { auth } = ensureClientFirebase();
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        router.replace("/login");
        return;
      }
      setUser({
        uid: fbUser.uid,
        email: fbUser.email ?? "",
        name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "",
      });
    });
    return unsubscribe;
  }, [router]);

  async function handleSubmit() {
    if (!user || !consentAccepted) return;
    setSubmitting(true);
    setError("");
    try {
      await completeGoogleSignup({
        uid: user.uid,
        name: user.name,
        email: user.email,
        role,
        consent: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptedAt: new Date().toISOString(),
        },
      });
      document.cookie = `careplus_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      const redirect = params.get("redirect");
      if (role === "nurse") {
        router.replace("/nurse/setup");
      } else {
        router.replace(redirect || "/patient/profile?onboarding=true");
      }
    } catch (err) {
      console.error("[google-role] completeGoogleSignup failed", err);
      setError(getLocalizedErrorMessage(err, tRoot));
      setSubmitting(false);
    }
  }

  async function cancel() {
    await logoutUser();
    router.replace("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t("title")}</h1>
            {user?.email && <p className="text-xs text-slate-500">{user.email}</p>}
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-600">{t("body")}</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setRole("patient")}
            className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-start transition-all ${
              role === "patient" ? "border-sky-500 bg-sky-50" : "border-slate-100 bg-white hover:border-sky-200"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${role === "patient" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}`}>
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{t("patientLabel")}</p>
              <p className="text-xs text-slate-500">{t("patientDescription")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRole("nurse")}
            className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-start transition-all ${
              role === "nurse" ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white hover:border-emerald-200"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${role === "nurse" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{t("nurseLabel")}</p>
              <p className="text-xs text-slate-500">{t("nurseDescription")}</p>
            </div>
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-brand-soft/50"
          />
          <span className="text-xs leading-relaxed text-slate-600">
            {t("consentPrefix")}{" "}
            <Link href="/terms" target="_blank" className="font-bold text-sky-600 hover:underline">
              {t("consentTerms")}
            </Link>{" "}
            {t("consentAnd")}{" "}
            <Link href="/privacy" target="_blank" className="font-bold text-sky-600 hover:underline">
              {t("consentPrivacy")}
            </Link>
            {t("consentTail")}
          </span>
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={cancel}
            className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!consentAccepted || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("finish")}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function GoogleRolePage() {
  return (
    <Suspense fallback={null}>
      <GoogleRolePageInner />
    </Suspense>
  );
}
