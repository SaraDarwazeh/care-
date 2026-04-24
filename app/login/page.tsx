"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { loginWithEmail } from "@/services/authService";
import { getErrorMessage } from "@/services/errorService";
import { getUserProfile } from "@/services/userService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginWithEmail(email, password);
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        router.replace("/");
      } else if (profile.role === "admin") {
        router.replace("/admin");
      } else if (profile.role === "nurse") {
        if (profile.status === "approved") {
          router.replace("/nurse");
        } else {
          router.replace("/pending-approval");
        }
      } else {
        router.replace("/patient");
      }
    } catch (submitError) {
      console.error("[login] login failed", submitError);
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left Side: Image Panel */}
      <div className="relative h-64 w-full md:h-screen md:flex-1 lg:flex-[1.2]">
        <Image
          src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80"
          alt="Nurse helping a patient"
          fill
          unoptimized
          className="object-cover object-top md:object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-sky-900/90 via-sky-800/80 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-16">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-90 transition">
            <ShieldCheck className="h-8 w-8" />
            <span className="text-2xl font-extrabold tracking-tight">Care Plus</span>
          </Link>
          
          <div className="max-w-lg mb-4 md:mb-10">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Your care <br className="hidden md:block" /><span className="text-sky-300">starts here.</span>
            </h1>
            <p className="text-sky-100 text-lg md:text-xl font-medium">
              Trusted nurses at your doorstep. Experience premium healthcare from the comfort of your home.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24 bg-white md:rounded-l-3xl shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-10 md:-ml-6 lg:-ml-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Welcome Back</h2>
            <p className="mt-2 text-slate-500 font-medium">Access your healthcare dashboard</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3.5 text-sm focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3.5 text-sm focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200 transition-all outline-none"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4" />
                <span className="text-sm font-medium text-slate-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-sky-600 hover:text-sky-700 hover:underline">
                Forgot password?
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 py-4 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)] transition-all hover:shadow-[0_12px_25px_-8px_rgba(14,165,233,0.7)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Login securely <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm font-medium text-slate-500 pt-6">
              Don't have an account yet?{" "}
              <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
