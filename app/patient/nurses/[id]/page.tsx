"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Star, MapPin, Clock, Calendar, CheckCircle2, Award, Pill } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import BookingForm from "@/components/patient/BookingForm";
import { useAuth } from "@/hooks/useAuth";
import { NurseMarketplaceProfile } from "@/lib/types";
import { getNurseMarketplaceProfileByUserId } from "@/services/nurseService";

function formatDays(days: string[]) {
  return days.length ? days.join(", ") : "Availability shared after setup";
}

export default function NurseProfilePage() {
  const params = useParams<{ id: string }>();
  const { appUser } = useAuth();
  const [nurse, setNurse] = useState<NurseMarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadNurse() {
      const profile = await getNurseMarketplaceProfileByUserId(params.id);
      if (active) {
        setNurse(profile);
        setLoading(false);
      }
    }
    void loadNurse();
    return () => { active = false; };
  }, [params.id]);

  if (!appUser || loading) {
    return <LoadingScreen text="Loading nurse profile..." />;
  }

  if (!nurse) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <div className="rounded-3xl border border-sky-100 bg-white p-12 text-slate-500">
          Nurse profile not found or unavailable.
        </div>
      </div>
    );
  }

  const lowestServicePrice = nurse.services.length
    ? Math.min(...nurse.services.map((service) => service.price))
    : nurse.pricePerHour ?? 0;

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
                <p className="mt-2 text-base text-slate-600 leading-relaxed">{nurse.bio || "Passionate healthcare professional ready to help."}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-1.5"><Star className="h-5 w-5 text-amber-400 fill-amber-400" /> {nurse.rating.toFixed(1)} Rating</div>
                {nurse.location && <div className="flex items-center gap-1.5"><MapPin className="h-5 w-5 text-slate-400" /> {nurse.location}</div>}
                <div className="flex items-center gap-1.5"><Award className="h-5 w-5 text-emerald-500" /> {nurse.experienceYears} Years Exp.</div>
              </div>
            </div>
          </div>

          {/* Services Offered */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 text-xl font-bold text-slate-800">Services Offered</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.isArray(nurse.services) && nurse.services.map((service) => (
                <div key={`${nurse.userId}-${service.name}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-sky-200 hover:bg-white">
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
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Hours</p>
                    <p className="text-sm text-slate-500">{nurse.availableHours.from} - {nurse.availableHours.to}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(nurse.skills) && nurse.skills.map((skill) => (
                  <span key={`${nurse.userId}-${skill}`} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    {skill}
                  </span>
                ))}
                {nurse.acceptsOvernight && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    Overnight Care
                  </span>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Booking Sidebar (Right Column) */}
        <div className="lg:sticky lg:top-8" id="booking-form">
          <BookingForm patientId={appUser.id} nurse={nurse} />
        </div>
        
      </div>
    </div>
  );
}
