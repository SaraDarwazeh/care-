import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Clock, ChevronRight, BadgeCheck, Briefcase } from "lucide-react";
import { NurseMarketplaceProfile } from "@/lib/types";

function getStartingPrice(nurse: NurseMarketplaceProfile) {
  const servicePrices = nurse.services.map((service) => service.price);
  const lowestServicePrice = servicePrices.length ? Math.min(...servicePrices) : undefined;

  if (lowestServicePrice) {
    return lowestServicePrice;
  }

  return nurse.pricePerHour ?? 0;
}

export default function NurseMarketplaceCard({
  nurse,
  detailQuery,
}: {
  nurse: NurseMarketplaceProfile;
  detailQuery?: string;
}) {
  const startingPrice = getStartingPrice(nurse);
  const hasRealHours = Boolean(nurse.availableHours?.from && nurse.availableHours?.to);
  const hasRating = typeof nurse.rating === "number" && nurse.rating > 0;
  const hasCertifications = (nurse.certificates?.length ?? 0) > 0;

  return (
    <Link href={`/patient/nurses/${nurse.userId}${detailQuery ? `?${detailQuery}` : ""}`} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)]">

        {/* Header Image Area */}
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
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-bold tracking-tight line-clamp-1">{nurse.fullName}</h3>
                <BadgeCheck className="h-5 w-5 text-sky-400 shrink-0" />
              </div>
              <p className="text-sm font-medium text-slate-200 line-clamp-1">{nurse.specialization}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col flex-1 p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
              <BadgeCheck className="h-3 w-3" />
              Verified by Care+
            </span>
            {hasRating && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-bold">{nurse.rating.toFixed(1)}</span>
              </div>
            )}
            {nurse.experienceYears > 0 && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                <span>{nurse.experienceYears} yr{nurse.experienceYears === 1 ? "" : "s"} experience</span>
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
                <span>
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
                  className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 border border-sky-100"
                >
                  {cert.name}
                </span>
              ))}
              {nurse.certificates!.length > 2 && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  +{nurse.certificates!.length - 2} more
                </span>
              )}
            </div>
          )}

          <div className="flex-1">
            <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
              {nurse.bio || `${nurse.fullName.split(" ")[0]} hasn't added a bio yet.`}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Starting at</p>
              <p className="text-xl font-extrabold text-slate-800">${startingPrice}<span className="text-sm font-medium text-slate-500">/hr</span></p>
            </div>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white">
              <ChevronRight className="h-5 w-5 ml-0.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
