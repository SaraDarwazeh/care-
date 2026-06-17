"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Logo from "@/components/common/Logo";
import { loginWithEmail, signInWithGoogle } from "@/services/authService";
import { getLocalizedErrorMessage } from "@/services/errorService";
import { getUserProfile } from "@/services/userService";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tRoot = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function routeAfterSignIn(profile: Awaited<ReturnType<typeof getUserProfile>>) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    document.cookie = `careplus_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    if (!profile) {
      router.replace(redirect || "/");
    } else if (profile.role === "admin") {
      router.replace(redirect || "/admin");
    } else if (profile.role === "nurse") {
      // incomplete → finish the profile; pending_review (or legacy
      // pending) → admin-review screen; approved → workspace.
      if (profile.status === "approved") {
        router.replace(redirect || "/nurse");
      } else if (profile.status === "incomplete") {
        router.replace("/nurse/setup");
      } else {
        router.replace("/pending-approval");
      }
    } else {
      router.replace(redirect || "/patient");
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if ("collision" in result && result.collision) {
        // Email already belongs to a password-based account. Don't route
        // the user to the role picker (which would leave the wrong
        // session active) — surface a friendly error so they sign in
        // with their original method.
        setError(tRoot("errors.auth.account-exists-with-different-credential"));
        return;
      }
      if ("needsRole" in result && result.needsRole) {
        router.replace("/auth/google-role");
      } else {
        const { auth } = await import("@/lib/firebase/config").then((m) => m.ensureClientFirebase());
        const profile = auth.currentUser ? await getUserProfile(auth.currentUser.uid) : null;
        routeAfterSignIn(profile);
      }
    } catch (err) {
      console.error("[login] google sign-in failed", err);
      setError(getLocalizedErrorMessage(err, tRoot));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginWithEmail(email, password);
      const profile = await getUserProfile(user.uid);
      routeAfterSignIn(profile);
    } catch (submitError) {
      console.error("[login] login failed", submitError);
      setError(getLocalizedErrorMessage(submitError, tRoot));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="relative h-64 w-full md:h-screen md:flex-1 lg:flex-[1.2]">
        <Image
          src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80"
          alt={t("imageAlt")}
          fill
          unoptimized
          className="object-cover object-top md:object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-brand-deep/95 via-brand-deep/80 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-16">
          <Link href="/" aria-label="Care+" className="inline-flex items-center self-start transition hover:opacity-95">
            <Logo variant="full" size={32} surface="white" />
          </Link>

          <div className="max-w-lg mb-4 md:mb-10">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              {t("heroHeadlineA")} <br className="hidden md:block" /><span className="text-brand-soft">{t("heroHeadlineB")}</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-medium">{t("heroSubhead")}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24 bg-white md:rounded-s-3xl shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-10 md:-ms-6 lg:-ms-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 rtl:slide-in-from-left-8 duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("welcomeBack")}</h2>
            <p className="mt-2 text-slate-500 font-medium">{t("subtitle")}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden>
                <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.57 2.68-3.88 2.68-6.63z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H1.05v2.33A8.99 8.99 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.95 10.71A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H1.05A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.99-2.33z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 8.99 8.99 0 0 0 1.05 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {t("continueWithGoogle")}
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {t("or")}
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-4">
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
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 ps-11 pe-4 py-3.5 text-sm focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-soft/60 transition-all outline-none"
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
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 ps-11 pe-4 py-3.5 text-sm focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-soft/60 transition-all outline-none"
                    placeholder={t("passwordPlaceholder")}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-brand focus:ring-brand-soft/50 w-4 h-4" />
                <span className="text-sm font-medium text-slate-600">{t("rememberMe")}</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-brand hover:text-brand-deep hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>

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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-deep to-brand py-4 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(31,106,114,0.6)] transition-all hover:shadow-[0_12px_25px_-8px_rgba(31,106,114,0.7)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                <>
                  {t("submit")} <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm font-medium text-slate-500 pt-6">
              {t("noAccount")}{" "}
              <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                {t("createAccount")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
