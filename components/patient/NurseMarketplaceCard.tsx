"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Star, MapPin, Clock, ChevronRight, BadgeCheck, Briefcase } from "lucide-react";
import type { NurseMarketplaceProfile } from "@/lib/types";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { providerKindFor } from "@/lib/providerKind";

// "Starting at" picks the cheapest priced shift if the nurse has migrated
// to per-shift pricing; otherwise the cheapest service; otherwise the
// hourly rate. Returns { value, unit } so the card can render "/shift"
// vs "/service" with one source of truth.
function getStartingPrice(nurse: NurseMarketplaceProfile): { value: number; unit: "shift" | "service" | "hour" } {
  const shiftPrices = Object.values(nurse.pricePerShift ?? {}).filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  if (shiftPrices.length > 0) {
    return { value: Math.min(...shiftPrices), unit: "shift" };
  }

  const servicePrices = nurse.services.map((service) => service.price).filter((n) => n > 0);
  if (servicePrices.length > 0) {
    return { value: Math.min(...servicePrices), unit: "service" };
  }

  return { value: nurse.pricePerHour ?? 0, unit: "hour" };
}

export default function NurseMarketplaceCard({
  nurse,
  detailQuery,
}: {
  nurse: NurseMarketplaceProfile;
  detailQuery?: string;
}) {
  const t = useTranslations("patient.nurses.card");
  const tProvider = useTranslations("provider.kinds");
  const locale = useLocale() as Locale;
  const kind = providerKindFor(nurse);
  const startingPrice = getStartingPrice(nurse);
  const unitKey: "perShift" | "perService" | "perHour" =
    startingPrice.unit === "shift" ? "perShift" : startingPrice.unit === "service" ? "perService" : "perHour";
  const hasRealHours = Boolean(nurse.availableHours?.from && nurse.availableHours?.to);
  const hasRating = typeof nurse.rating === "number" && nurse.rating > 0;
  const hasCertifications = (nurse.certificates?.length ?? 0) > 0;
  const firstName = nurse.fullName.split(" ")[0];

  return (
    <Link href={`/patient/nurses/${nurse.userId}${detailQuery ? `?${detailQuery}` : ""}`} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)]">

        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          {nurse.profileImage ? (
            <Image
              src={nurse.profileImage}
              alt={nurse.fullName}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-300">
              {nurse.fullName.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

          <div className="absolute bottom-4 start-4 end-4 flex items-end justify-between text-white">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xl font-bold tracking-tight line-clamp-1">{nurse.fullName}</h3>
                <BadgeCheck className="h-5 w-5 text-brand-soft shrink-0" />
                {/* Provider-kind chip — physio only. Nurses are the
                    historical default and stay unbadged to keep the
                    card visually identical to its pre-physio form. */}
                {kind === "physio" && (
                  <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    {tProvider("physio")}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-200 line-clamp-1">{nurse.specialization}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
              <BadgeCheck className="h-3 w-3" />
              {t("verifiedByCarePlus")}
            </span>
            {hasRating && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-bold">{fmtNumber(nurse.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>
            )}
            {nurse.experienceYears > 0 && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("years", { n: nurse.experienceYears })}</span>
              </div>
            )}
            {nurse.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className="line-clamp-1">{nurse.location}</span>
              </div>
            )}
            {hasRealHours && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span dir="ltr">
                  {nurse.availableHours.from} – {nurse.availableHours.to}
                </span>
              </div>
            )}
          </div>

          {hasCertifications && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {nurse.certificates!.slice(0, 2).map((cert) => (
                <span
                  key={cert.id}
                  className="inline-flex items-center rounded-full bg-brand-soft/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep border border-brand-mist"
                >
                  {cert.name}
                </span>
              ))}
              {nurse.certificates!.length > 2 && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("certificatesMore", { n: nurse.certificates!.length - 2 })}
                </span>
              )}
            </div>
          )}

          <div className="flex-1">
            <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
              {nurse.bio || t("noBio", { name: firstName })}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{t("startingAt")}</p>
              <p className="text-xl font-extrabold text-slate-800">
                {fmtCurrency(startingPrice.value, locale)}
                <span className="text-sm font-medium text-slate-500">{t(unitKey)}</span>
              </p>
            </div>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-soft/30 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
              <ChevronRight className="h-5 w-5 ms-0.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
