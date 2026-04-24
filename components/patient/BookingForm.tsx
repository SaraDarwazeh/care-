"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, ChevronLeft, MapPin, Calendar, Clock, Stethoscope } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { Booking, NurseMarketplaceProfile } from "@/lib/types";
import { createBooking } from "@/services/bookingService";
import { getPatientProfile } from "@/services/patientService";

export default function BookingForm({
  patientId,
  nurse,
  onBooked,
}: {
  patientId: string;
  nurse: NurseMarketplaceProfile;
  onBooked?: () => void;
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [service, setService] = useState(nurse.services[0]?.name ?? "General Visit");
  const [shift, setShift] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const serviceOptions = useMemo(() => nurse.services, [nurse.services]);

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      const profile = await getPatientProfile(patientId);
      if (active) {
        if (profile?.defaultLocation) setLocation(profile.defaultLocation);
        setProfileCompleted(!!profile?.profileCompleted);
        setLoadingProfile(false);
      }
    }
    void fetchProfile();
    return () => { active = false; };
  }, [patientId]);

  const selectedPrice = useMemo(() => {
    const selected = nurse.services.find((item) => item.name === service);
    return selected?.price ?? nurse.pricePerHour ?? 0;
  }, [nurse.pricePerHour, nurse.services, service]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setSuccess(false);

    // Map shift to time string roughly
    const timeMapping: Record<string, string> = { "A": "07:00", "B": "14:00", "C": "20:00" };

    const booking: Omit<Booking, "id" | "status" | "createdAt"> = {
      patientId,
      nurseId: nurse.userId,
      service,
      price: selectedPrice,
      date,
      time: timeMapping[shift] || "09:00",
      location,
      notes: `${notes}\nShift: ${shift}`,
    };

    try {
      await createBooking(booking);
      setSuccess(true);
      onBooked?.();
    } catch (e) {
      console.error(e);
      // Handle error visually if needed
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
        <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
        <h3 className="text-2xl font-bold text-slate-800">Booking Confirmed</h3>
        <p className="mt-2 text-slate-600">Your request has been sent to {nurse.fullName}. You will be notified once they review it.</p>
        <button 
          onClick={() => { setSuccess(false); setStep(1); }}
          className="mt-6 rounded-xl bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          Book Another Visit
        </button>
      </div>
    );
  }

  if (loadingProfile) {
    return <div className="p-8 text-center text-slate-500">Verifying patient profile...</div>;
  }

  if (!profileCompleted) {
    return (
      <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center shadow-sm">
        <h3 className="text-xl font-bold text-orange-800 mb-2">Profile Incomplete</h3>
        <p className="text-orange-700 mb-6 text-sm">You must complete your patient profile (including contact and medical information) before booking a nurse.</p>
        <PatientButton href="/patient/profile" className="bg-orange-600 hover:bg-orange-700 text-white border-0">
          Complete Profile Now
        </PatientButton>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Book a Visit</h2>
          <p className="text-sm text-slate-500">Step {step} of {totalSteps}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">Est. Price</p>
          <p className="text-lg font-bold text-sky-700">${selectedPrice}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i + 1 <= step ? "bg-sky-600" : "bg-sky-100"}`} />
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <div className="min-h-[250px]">
          {/* Step 1: Service */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Stethoscope className="h-5 w-5 text-sky-600"/> Select Service</h3>
              <div className="grid gap-3">
                {serviceOptions.map((item) => (
                  <label key={item.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${service === item.name ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 hover:border-sky-300"}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="service" 
                        value={item.name} 
                        checked={service === item.name} 
                        onChange={() => setService(item.name)} 
                        className="h-4 w-4 text-sky-600 focus:ring-sky-600" 
                      />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">${item.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Shift */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Clock className="h-5 w-5 text-sky-600"/> Select Shift</h3>
              <div className="grid gap-3">
                {[
                  { id: "A", name: "Morning Shift (A)", time: "07:00 - 14:00" },
                  { id: "B", name: "Afternoon Shift (B)", time: "14:00 - 20:00" },
                  { id: "C", name: "Night Shift (C)", time: "20:00 - 07:00" },
                ].map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${shift === s.id ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 hover:border-sky-300"}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="shift" 
                        value={s.id} 
                        checked={shift === s.id} 
                        onChange={() => setShift(s.id)} 
                        className="h-4 w-4 text-sky-600 focus:ring-sky-600" 
                      />
                      <span className="font-medium text-slate-700">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-500">{s.time}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Calendar className="h-5 w-5 text-sky-600"/> Select Date</h3>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Date of Visit</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><MapPin className="h-5 w-5 text-sky-600"/> Service Location</h3>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full Address / Location</label>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Street name, building, apartment number..."
                />
                <p className="mt-2 text-xs text-slate-500">We pre-filled this based on your profile default location.</p>
              </div>
            </div>
          )}

          {/* Step 5: Notes & Submit */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="mb-4 font-semibold text-slate-800">Final Details</h3>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 mb-4 space-y-1">
                <p><strong>Service:</strong> {service}</p>
                <p><strong>Date & Shift:</strong> {date} (Shift {shift})</p>
                <p><strong>Location:</strong> {location}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Additional Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Describe your care needs or how to enter the building..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Navigation Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${step === 1 ? "text-transparent cursor-default" : "text-slate-600 hover:text-slate-800"}`}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 2 && !shift} // Require shift selection
              className="flex items-center gap-1 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
            >
              Next Step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !date || !location || !shift}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Confirm Booking"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
