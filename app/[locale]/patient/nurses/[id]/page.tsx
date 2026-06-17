"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
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
import BackLink from "@/components/common/BackLink";
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
import { fmtCurrency, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

function NurseProfilePageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();
  const t = useTranslations("patient.nurses.detail");
  const locale = useLocale() as Locale;
  const [nurse, setNurse] = useState<NurseMarketplaceProfile | null>(null);
  const [reviews, setReviews] = useState<NurseReview[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const initialService = searchParams.get("service") ?? undefined;
  const initialShift = searchParams.get("shift") ?? undefined;
  const initialPackage = searchParams.get("package") ?? undefined;
  const initialDurationDays = Number(searchParams.get("durationDays") ?? "0") || undefined;
  // Explicit booking-mode signal from the referrer. /services/packages
  // and /services/shifts append this so the booking form opens at the
  // mode the patient already picked instead of defaulting to one-time.
  const rawBookingType = searchParams.get("bookingType");
  const initialBookingType: "one-time" | "shift" | "package" | undefined =
    rawBookingType === "one-time" || rawBookingType === "shift" || rawBookingType === "package"
      ? rawBookingType
      : undefined;

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

  if (loading) return <LoadingScreen text={t("loading")} />;

  if (!nurse) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <div className="rounded-3xl border border-brand-mist bg-white p-12 text-slate-500">
          {t("notFound")}
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

  const daysLabel = nurse.availableDays.length
    ? nurse.availableDays.join(", ")
    : t("availabilityFallback");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <BackLink href="/patient/nurses" labelKey="patient.nurses.detail.back" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="space-y-8 lg:col-span-2">

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="h-32 bg-gradient-to-r from-brand-soft/30 to-emerald-50 sm:h-40" />
            <div className="px-6 pb-6 sm:px-8">
              <div className="relative -mt-16 mb-4 flex justify-between sm:-mt-20">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-brand-soft/50 text-4xl font-bold text-brand-deep shadow-md sm:h-40 sm:w-40">
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
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t("approved")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{nurse.fullName}</h1>
                <p className="text-lg font-medium text-brand">{nurse.specialization}</p>
                <p className="mt-2 text-base text-slate-600 leading-relaxed">
                  {nurse.bio || t("fallbackBio")}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100 text-sm font-medium text-slate-600">
                {hasRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    {t("ratingSummary", {
                      rating: fmtNumber(summary.average, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                      n: summary.count,
                    })}
                  </div>
                )}
                {nurse.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-5 w-5 text-slate-400" /> {nurse.location}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-emerald-500" /> {t("yearsExp", { n: nurse.experienceYears })}
                </div>
              </div>
            </div>
          </div>

          {nurse.carePhilosophy && (
            <div className="rounded-3xl border border-brand-mist bg-brand-soft/20 p-6 shadow-sm sm:p-8">
              <div className="mb-3 flex items-center gap-2">
                <Quote className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-slate-800">{t("carePhilosophy")}</h2>
              </div>
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line">
                {nurse.carePhilosophy}
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 text-xl font-bold text-slate-800">{t("services")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {nurse.services.map((service) => (
                <div
                  key={`${nurse.userId}-${service.name}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-brand-soft hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft/50 text-brand">
                      <Pill className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-700">{service.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{fmtCurrency(service.price, locale)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-800">{t("availability")}</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-brand" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("availableDays")}</p>
                    <p className="text-sm text-slate-500">{daysLabel}</p>
                  </div>
                </div>
                {nurse.availableShifts && nurse.availableShifts.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{t("shifts")}</p>
                      <p className="text-sm text-slate-500">{nurse.availableShifts.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-800">{t("skills")}</h2>
              <div className="flex flex-wrap gap-2">
                {nurse.skills.map((skill) => (
                  <span
                    key={`${nurse.userId}-${skill}`}
                    className="rounded-full bg-brand-soft/30 px-3 py-1.5 text-xs font-semibold text-brand-deep"
                  >
                    {skill}
                  </span>
                ))}
                {nurse.acceptsOvernight && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    {t("overnightCare")}
                  </span>
                )}
                {nurse.languages && nurse.languages.length > 0 && (
                  <>
                    <span className="w-full h-px bg-slate-100 my-2" />
                    <p className="w-full text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t("languages")}</p>
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

          {gallery.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-bold text-slate-800">{t("gallery")}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {gallery.map((src, i) => (
                  <div
                    key={`${nurse.userId}-gallery-${i}`}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"
                  >
                    <Image
                      src={src}
                      alt={t("galleryAlt", { n: i + 1 })}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800">{t("reviewsTitle")}</h2>
              </div>
              {appUser?.role === "patient" && eligibility?.eligible && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition"
                >
                  {t("writeReview")}
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
                {t("reviewsAfterVisit")}
              </p>
            )}
            {appUser?.role === "patient" && eligibility?.reason === "already_reviewed" && (
              <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {t("reviewsAlready")}
              </p>
            )}

            <ReviewList reviews={reviews} />
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-800 text-sm">{t("trustTitle")}</h3>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {t("trustBullet1")}
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {t("trustBullet2")}
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {t("trustBullet3")}
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-emerald-700/80">{t("trustFooter")}</p>
          </div>
        </div>

        <div className="lg:sticky lg:top-8" id="booking-form">
          {appUser ? (
            <BookingForm
              patientId={appUser.id}
              nurse={nurse}
              initialService={initialService}
              initialShift={initialShift}
              initialPackage={initialPackage}
              initialDurationDays={initialDurationDays}
              initialBookingType={initialBookingType}
            />
          ) : (
            <div className="rounded-3xl border border-brand-mist bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">{t("bookNow")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("guestPrompt")}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="rounded-2xl bg-brand px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-brand-deep"
                >
                  {t("loginToBook")}
                </Link>
                <Link
                  href="/register"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-brand-soft hover:text-brand-deep"
                >
                  {t("createAccount")}
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
    <Suspense fallback={<LoadingScreen />}>
      <NurseProfilePageInner />
    </Suspense>
  );
}
