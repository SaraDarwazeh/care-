"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, UploadCloud, FileText } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import PatientCard from "@/components/patient/PatientCard";
import { NurseAvailabilityHours, NurseDay, NurseProfile } from "@/lib/types";
import { getNurseProfileByUserId, saveNurseProfile } from "@/services/nurseService";

const days: NurseDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const serviceRow = { name: "", price: 0 };

export default function NurseProfileForm({
  userId,
  fullName,
  onSaved,
}: {
  userId: string;
  fullName: string;
  onSaved?: () => void;
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Basic
  const [profileImage, setProfileImage] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");

  // Step 2: Professional
  const [specialization, setSpecialization] = useState("");
  const [services, setServices] = useState([{ ...serviceRow }]);
  const [pricePerHour, setPricePerHour] = useState<number | undefined>(undefined);
  const [experienceYears, setExperienceYears] = useState(0);
  const [skills, setSkills] = useState("");
  const [availableDays, setAvailableDays] = useState<NurseDay[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [acceptsOvernight, setAcceptsOvernight] = useState(false);

  // Step 3: Certificates (Mock upload)
  const [certificates, setCertificates] = useState<string[]>([]);
  const [newCertName, setNewCertName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const profile = await getNurseProfileByUserId(userId);
      if (!active || !profile) {
        setLoading(false);
        return;
      }

      setProfileImage(profile.profileImage ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setGender(profile.gender ?? "");
      
      setSpecialization(profile.specialization ?? "");
      setServices(profile.services?.length ? profile.services : [{ ...serviceRow }]);
      setPricePerHour(profile.pricePerHour);
      setExperienceYears(profile.experienceYears ?? 0);
      setSkills((profile.skills ?? []).join(", "));
      setAvailableDays(profile.availableDays?.length ? profile.availableDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setAvailableShifts(profile.availableShifts ?? []);
      setAcceptsOvernight(Boolean(profile.acceptsOvernight));
      
      setCertificates(profile.certificates ?? []);
      
      setLoading(false);
    }
    void loadProfile();
    return () => { active = false; };
  }, [userId]);

  function updateService(index: number, key: "name" | "price", value: string) {
    setServices((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: key === "price" ? Number(value) : value } : item
      )
    );
  }

  function toggleDay(day: NurseDay) {
    setAvailableDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  function toggleShift(shift: string) {
    setAvailableShifts((current) => current.includes(shift) ? current.filter((item) => item !== shift) : [...current, shift]);
  }

  function addMockCertificate() {
    if (newCertName.trim()) {
      setCertificates([...certificates, newCertName.trim()]);
      setNewCertName("");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setSaving(true);
    setMessage("");

    const payload: NurseProfile = {
      userId,
      fullName,
      profileImage,
      bio,
      location: location.trim() || undefined,
      gender: gender ? (gender as "male" | "female" | "other") : undefined,
      specialization,
      services: services.filter((item) => item.name.trim().length > 0),
      pricePerHour: pricePerHour || undefined,
      experienceYears,
      skills: skills.split(",").map((item) => item.trim()).filter(Boolean),
      availableDays,
      availableShifts,
      availableHours: { from: "00:00", to: "23:59" }, // Deprecated field technically since we use shifts now, but kept for schema compat
      acceptsOvernight,
      certificates,
      rating: 4.8, // Initial mock rating
    };

    await saveNurseProfile(payload);
    setSaving(false);
    onSaved?.();
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your data...</div>;
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
      {/* Progress Bar */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i + 1 <= step ? "bg-emerald-500" : "bg-slate-100"}`} />
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <div className="min-h-[400px]">
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800">Basic Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                  <input value={fullName} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Profile Image URL</label>
                  <input 
                    value={profileImage} 
                    onChange={(e) => setProfileImage(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Location (City/Area)</label>
                  <input 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    required 
                    placeholder="e.g. Downtown, Springfield" 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Gender</label>
                  <select 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value as any)} 
                    required 
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="" disabled>Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Professional Bio</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  required 
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                  placeholder="Tell patients about your background, compassion, and approach to care..." 
                />
              </div>
            </div>
          )}

          {/* STEP 2: Professional Details */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800">Professional Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Specialization</label>
                  <input 
                    value={specialization} 
                    onChange={(e) => setSpecialization(e.target.value)} 
                    required 
                    placeholder="e.g. ICU Nurse, Elderly Care Specialist" 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Years of Experience</label>
                  <input 
                    type="number" 
                    value={experienceYears} 
                    onChange={(e) => setExperienceYears(Number(e.target.value))} 
                    required 
                    min="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Services Offered</span>
                  <button type="button" onClick={() => setServices([...services, { ...serviceRow }])} className="text-sm font-bold text-sky-600 hover:text-sky-700">+ Add</button>
                </div>
                <div className="space-y-2">
                  {services.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input value={item.name} onChange={(e) => updateService(index, "name", e.target.value)} placeholder="Service name" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <input type="number" value={item.price} onChange={(e) => updateService(index, "price", e.target.value)} placeholder="Price $" className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <button type="button" onClick={() => setServices(services.filter((_, i) => i !== index))} className="rounded-lg bg-red-50 px-3 text-red-600 hover:bg-red-100 text-sm font-bold">X</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Skills (comma separated)</label>
                <input 
                  value={skills} 
                  onChange={(e) => setSkills(e.target.value)} 
                  placeholder="e.g. IV placement, wound dressing, CPR" 
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" 
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Shift Availability</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "A", label: "Morning (07-14)" },
                    { id: "B", label: "Afternoon (14-20)" },
                    { id: "C", label: "Night (20-07)" },
                  ].map((s) => (
                    <label key={s.id} className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 text-sm font-semibold transition-all ${availableShifts.includes(s.id) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      <input type="checkbox" checked={availableShifts.includes(s.id)} onChange={() => toggleShift(s.id)} className="sr-only" />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Days Available</label>
                <div className="flex flex-wrap gap-2">
                  {days.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${availableDays.includes(day) ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input type="checkbox" checked={acceptsOvernight} onChange={(e) => setAcceptsOvernight(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
                <span className="font-semibold text-slate-700">I accept overnight care requests</span>
              </label>
            </div>
          )}

          {/* STEP 3: Certificates */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-slate-800">Upload Certificates</h2>
              <p className="text-sm text-slate-600">Provide proof of your qualifications to build trust with patients and speed up your admin approval.</p>
              
              <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-8 text-center">
                <UploadCloud className="mx-auto mb-3 h-10 w-10 text-sky-500" />
                <p className="mb-4 text-sm font-semibold text-sky-800">Mock Certificate Upload</p>
                <div className="mx-auto flex max-w-sm gap-2">
                  <input 
                    value={newCertName} 
                    onChange={(e) => setNewCertName(e.target.value)} 
                    placeholder="e.g. Registered Nurse License.pdf" 
                    className="flex-1 rounded-xl border border-sky-200 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none" 
                  />
                  <button type="button" onClick={addMockCertificate} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">Add</button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Uploaded Documents ({certificates.length})</h3>
                {certificates.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No certificates uploaded yet.</p>
                ) : (
                  certificates.map((cert, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-3 text-slate-700">
                        <FileText className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm font-medium">{cert}</span>
                      </div>
                      <button type="button" onClick={() => setCertificates(certificates.filter((_, idx) => idx !== i))} className="text-sm font-semibold text-red-500 hover:underline">Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || saving}
            className={`flex items-center gap-1 font-semibold transition-colors ${step === 1 ? "text-transparent cursor-default" : "text-slate-600 hover:text-slate-800"}`}
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving..." : step < totalSteps ? "Continue" : "Submit Application"}
            {step < totalSteps && <ChevronRight className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
