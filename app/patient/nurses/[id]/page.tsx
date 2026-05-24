"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Award,
  Pill,
  ShieldCheck,
  CheckCircle,
  Quote,
  Camera,
  Sparkles,
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import BookingForm from "@/components/patient/BookingForm";
import ReviewForm from "@/components/patient/ReviewForm";
import ReviewList from "@/components/patient/ReviewList";
import { useAuth } from "@/hooks/useAuth";
import type { NurseMarketplaceProfile, NurseReview } from "@/lib/types";
import { getNurseMarketplaceProfileByUserId } from "@/services/nurseService";
import {
  canPatientReview,
  getReviewsForNurse,
  summarize,
} from "@/services/reviewService";

function formatDays(days: string[]) {
  return days.length ? days.join(", ") : "Availability shared after setup";
}

function NurseProfilePageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();
  const [nurse, setNurse] = useState<NurseMarketplaceProfile | null>(null);
  const [reviews, setReviews] = useState<NurseReview[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const initialService = searchParams.get("service") ?? undefined;
  const initialShift = searchParams.get("shift") ?? undefined;
  const initialPackage = searchParams.get("package") ?? undefined;
  const initialDurationDays = Number(searchParams.get("durationDays") ?? "0") || undefined;

  useEffect(() => {
    let active = true;
    (async () => {
      const [profile, reviewList] = await Promise.all([
        getNurseMarketplaceProfileByUserId(params.id),
        getReviewsForNurse(params.id),
      ]);
      if (!active) return;
      setNurse(profile);
      setReviews(reviewList);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  // Eligibility lookup separated so it can re-run if the user logs in later.
  useEffect(() => {
    if (!appUser || appUser.role !== "patient" || !params.id) return;
    let active = true;
    void canPatientReview(params.id, appUser.id).then((result) => {
      if (active) setEligibility(result);
    });
    return () => {
      active = false;
    };
  }, [appUser, params.id]);

  if (loading) return <LoadingScreen text="Loading nurse profile..." />;

  if (!nurse) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <div className="rounded-3xl border border-sky-100 bg-white p-12 text-slate-500">
          Nurse profile not found or unavailable.
        </div>
      </div>
    );
  }

  const summary = summarize(reviews);
  const hasRating = summary.count > 0;
  const gallery = nurse.gallery ?? [];

  function handleReviewAdded(review: NurseReview) {
    setReviews((prev) => [review, ...prev]);
    setShowReviewForm(false);
    setEligibility({ eligible: false, reason: "already_reviewed" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        {/* Main Content (Left Column) */}
        <div className="space-y-8 lg:col-span-2">

          {/* Header Card */}
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="h-32 bg-gradient-to-r from-sky-50 to-emerald-50 sm:h-40" />
            <div className="px-6 pb-6 sm:px-8">
              <div className="relative -mt-16 mb-4 flex justify-between sm:-mt-20">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-sky-100 text-4xl font-bold text-sky-700 shadow-md sm:h-40 sm:w-40">
                  {nurse.profileImage ? (
                    <Image
                      src={nurse.profileImage}
                      alt={nurse.fullName}
                      width={160}
                      height={160}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    nurse.fullName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="mt-20 sm:mt-24">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{nurse.fullName}</h1>
                <p className="text-lg font-medium text-sky-600">{nurse.specialization}</p>
                <p className="mt-2 text-base text-slate-600 leading-relaxed">
                  {nurse.bio || "Healthcare professional ready to help."}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100 text-sm font-medium text-slate-600">
                {hasRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    {summary.average.toFixed(1)} · {summary.count} review{summary.count === 1 ? "" : "s"}
                  </div>
                )}
                {nurse.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-5 w-5 text-slate-400" /> {nurse.location}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-emerald-500" /> {nurse.experienceYears} Years Exp.
                </div>
              </div>
            </div>
          </div>

          {/* Care Philosophy (hidden if absent) */}
          {nurse.carePhilosophy && (
            <div className="rounded-3xl border border-sky-100 bg-sky-50/40 p-6 shadow-sm sm:p-8">
              <div className="mb-3 flex items-center gap-2">
                <Quote className="h-5 w-5 text-sky-600" />
                <h2 className="text-xl font-bold text-slate-800">Care Philosophy</h2>
              </div>
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line">
                {nurse.carePhilosophy}
              </p>
            </div>
          )}

          {/* Services Offered */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 text-xl font-bold text-slate-800">Services Offered</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {nurse.services.map((service) => (
                <div
                  key={`${nurse.userId}-${service.name}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <Pill className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-700">{service.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">${service.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability & Skills */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Availability</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-sky-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Available Days</p>
                    <p className="text-sm text-slate-500">{formatDays(nurse.availableDays)}</p>
                  </div>
                </div>
                {nurse.availableShifts && nurse.availableShifts.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Shifts</p>
                      <p className="text-sm text-slate-500">{nurse.availableShifts.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {nurse.skills.map((skill) => (
                  <span
                    key={`${nurse.userId}-${skill}`}
                    className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                  >
                    {skill}
                  </span>
                ))}
                {nurse.acceptsOvernight && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    Overnight Care
                  </span>
                )}
                {nurse.languages && nurse.languages.length > 0 && (
                  <>
                    <span className="w-full h-px bg-slate-100 my-2" />
                    <p className="w-full text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Languages</p>
                    {nurse.languages.map((lang) => (
                      <span
                        key={`${nurse.userId}-lang-${lang}`}
                        className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        {lang}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gallery (hidden if empty) */}
          {gallery.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-sky-600" />
                <h2 className="text-xl font-bold text-slate-800">Gallery</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {gallery.map((src, i) => (
                  <div
                    key={`${nurse.userId}-gallery-${i}`}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"
                  >
                    <Image
                      src={src}
                      alt={`Gallery ${i + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800">Patient Reviews</h2>
              </div>
              {appUser?.role === "patient" && eligibility?.eligible && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition"
                >
                  Write a review
                </button>
              )}
            </div>

            {showReviewForm && appUser ? (
              <div className="mb-4">
                <ReviewForm
                  nurseId={nurse.userId}
                  patientId={appUser.id}
                  patientName={appUser.name}
                  onSubmitted={handleReviewAdded}
                  onCancel={() => setShowReviewForm(false)}
                />
              </div>
            ) : null}

            {appUser?.role === "patient" && eligibility?.reason === "no_completed_visit" && (
              <p className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Reviews are open after your first completed visit with this nurse.
              </p>
            )}
            {appUser?.role === "patient" && eligibility?.reason === "already_reviewed" && (
              <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Thanks — you&rsquo;ve already reviewed this nurse.
              </p>
            )}

            <ReviewList reviews={reviews} />
          </div>

          {/* Trust & Verification — honest copy matching Phase 1.3 messaging */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-800 text-sm">Verified by Care Plus</h3>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Profile submitted and reviewed by the Care Plus team
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Stated certifications cross-checked against uploaded documents
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Activated only after admin approval
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-emerald-700/80">
              We don&rsquo;t yet perform third-party background checks. We&rsquo;re upfront about what &ldquo;verified&rdquo; means today.
            </p>
          </div>
        </div>

        {/* Booking Sidebar (Right Column) */}
        <div className="lg:sticky lg:top-8" id="booking-form">
          {appUser ? (
            <BookingForm
              patientId={appUser.id}
              nurse={nurse}
              initialService={initialService}
              initialShift={initialShift}
              initialPackage={initialPackage}
              initialDurationDays={initialDurationDays}
            />
          ) : (
            <div className="rounded-3xl border border-sky-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">Start booking</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Log in to book this nurse, save your details, and continue through the secure booking flow.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  Login to book
                </Link>
                <Link
                  href="/register"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NurseProfilePage() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading nurse profile..." />}>
      <NurseProfilePageInner />
    </Suspense>
  );
}
