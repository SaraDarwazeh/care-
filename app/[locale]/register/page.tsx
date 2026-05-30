"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { ShieldCheck, UserCircle, Stethoscope, Mail, Lock, User, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { registerWithEmail } from "@/services/authService";
import { getLocalizedErrorMessage } from "@/services/errorService";
import { getUserProfile } from "@/services/userService";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/consentVersions";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tRoot = useTranslations();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!consentAccepted) {
      setError(t("consentRequired"));
      return;
    }
    setLoading(true);

    try {
      const user = await registerWithEmail({
        name,
        email,
        password,
        role,
        consent: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptedAt: new Date().toISOString(),
        },
      });
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        router.replace("/login");
        return;
      }

      document.cookie = `careplus_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");

      if (profile.role === "nurse" && profile.status !== "approved") {
        router.replace("/nurse/setup");
        return;
      }

      if (profile.role === "patient") {
        router.replace(redirect || "/patient/profile?onboarding=true");
        return;
      }

      router.replace("/login");
    } catch (submitError) {
      console.error("[register] registration failed", submitError);
      setError(getLocalizedErrorMessage(submitError, tRoot));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="relative h-64 w-full md:h-screen md:flex-1 lg:flex-[1.2]">
        <Image
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80"
          alt={t("imageAlt")}
          fill
          unoptimized
          className="object-cover object-top md:object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-16">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-90 transition">
            <ShieldCheck className="h-8 w-8" />
            <span className="text-2xl font-extrabold tracking-tight">Care+</span>
          </Link>

          <div className="max-w-lg mb-4 md:mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-md border border-white/30 mb-6">
              <ShieldCheck className="h-4 w-4" />
              {t("verifiedBadge")}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              {t("heroHeadlineA")} <br className="hidden md:block" /><span className="text-emerald-300">{t("heroHeadlineB")}</span>
            </h1>
            <p className="text-emerald-50 text-lg md:text-xl font-medium">{t("heroSubhead")}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24 bg-white md:rounded-s-3xl shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-10 md:-ms-6 lg:-ms-10">
        <div className="w-full max-w-md">

          {step === 1 ? (
            <div className="animate-in fade-in slide-in-from-right-8 rtl:slide-in-from-left-8 duration-500">
              <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("step1Title")}</h2>
                <p className="mt-2 text-slate-500 font-medium">{t("step1Subtitle")}</p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRole("patient")}
                  className={`w-full flex items-center gap-4 rounded-3xl border-2 p-4 sm:gap-5 sm:p-6 transition-all text-start ${
                    role === "patient" ? "border-sky-500 bg-sky-50 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.3)]" : "border-slate-100 bg-white hover:border-sky-200"
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${role === "patient" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                    <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold sm:text-lg ${role === "patient" ? "text-sky-900" : "text-slate-700"}`}>{t("roles.patient.title")}</h3>
                    <p className={`text-sm ${role === "patient" ? "text-sky-700" : "text-slate-500"}`}>{t("roles.patient.description")}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("nurse")}
                  className={`w-full flex items-center gap-4 rounded-3xl border-2 p-4 sm:gap-5 sm:p-6 transition-all text-start ${
                    role === "nurse" ? "border-emerald-500 bg-emerald-50 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.3)]" : "border-slate-100 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${role === "nurse" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                    <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold sm:text-lg ${role === "nurse" ? "text-emerald-900" : "text-slate-700"}`}>{t("roles.nurse.title")}</h3>
                    <p className={`text-sm ${role === "nurse" ? "text-emerald-700" : "text-slate-500"}`}>{t("roles.nurse.description")}</p>
                  </div>
                </button>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => setStep(2)}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${
                    role === "patient" ? "bg-gradient-to-r from-sky-500 to-sky-600 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)]" : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.6)]"
                  }`}
                >
                  {t("continue")} <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 rtl:slide-in-from-left-8 duration-500">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition mb-8"
              >
                <ArrowLeft className="h-4 w-4" /> {t("backToRoles")}
              </button>

              <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("step2Title")}</h2>
                <p className="mt-2 text-slate-500 font-medium">
                  {role === "patient" ? t("step2SubtitlePatient") : t("step2SubtitleNurse")}
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">{t("nameLabel")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        dir="auto"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full rounded-2xl border border-slate-200 bg-slate-50 ps-11 pe-4 py-3.5 text-sm focus:bg-white focus:ring-2 transition-all outline-none ${
                          role === "patient" ? "focus:border-sky-500 focus:ring-sky-200" : "focus:border-emerald-500 focus:ring-emerald-200"
                        }`}
                        placeholder={t("namePlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">{t("emailLabel")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full rounded-2xl border border-slate-200 bg-slate-50 ps-11 pe-4 py-3.5 text-sm focus:bg-white focus:ring-2 transition-all outline-none ${
                          role === "patient" ? "focus:border-sky-500 focus:ring-sky-200" : "focus:border-emerald-500 focus:ring-emerald-200"
                        }`}
                        placeholder={t("emailPlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">{t("passwordLabel")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full rounded-2xl border border-slate-200 bg-slate-50 ps-11 pe-4 py-3.5 text-sm focus:bg-white focus:ring-2 transition-all outline-none ${
                          role === "patient" ? "focus:border-sky-500 focus:ring-sky-200" : "focus:border-emerald-500 focus:ring-emerald-200"
                        }`}
                        placeholder={t("passwordPlaceholder")}
                      />
                    </div>
                  </div>
                </div>

                {role === "nurse" && (
                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 flex items-start gap-3 mt-4">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">{t("nurseNotice")}</p>
                  </div>
                )}

                {/* Consent block — required before signup completes. Stamped
                    onto the user doc with the exact policy versions accepted. */}
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
                  <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 flex items-start gap-3">
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !consentAccepted}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:cursor-not-allowed mt-8 ${
                    role === "patient" ? "bg-gradient-to-r from-sky-500 to-sky-600 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)]" : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.6)]"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm font-medium text-slate-500 pt-8">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
              {t("logIn")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
