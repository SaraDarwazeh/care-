"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle, MapPin, Phone, Activity, CreditCard, ShieldCheck, CalendarClock, Settings, HelpCircle, Star, ChevronRight, Edit2 } from "lucide-react";
import PatientButton from "@/components/patient/PatientButton";
import { PatientProfile } from "@/lib/types";
import { getPatientProfile, savePatientProfile } from "@/services/patientService";
import { useAuth } from "@/hooks/useAuth";

export default function PatientProfileEditor({ userId }: { userId: string }) {
  const { appUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diseases, setDiseases] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const profile = await getPatientProfile(userId);
        if (active && profile) {
          setPhone(profile.phone ?? "");
          setDefaultLocation(profile.defaultLocation ?? "");
          setMedicalHistory(profile.medicalHistory ?? "");
          setDiseases((profile.diseases ?? []).join(", "));
          setPaymentMethods(profile.paymentMethods ?? []);
        } else if (active) {
          setIsEditing(true); // Force edit if no profile exists
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [userId]);

  function togglePayment(method: string) {
    setPaymentMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const profile: PatientProfile = {
      userId,
      phone,
      defaultLocation,
      medicalHistory,
      diseases: diseases.split(",").map(d => d.trim()).filter(Boolean),
      paymentMethods,
      profileCompleted: true,
    };

    await savePatientProfile(profile);
    setSaving(false);
    setIsEditing(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden flex items-center p-6 gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-100 text-3xl font-extrabold text-sky-700 ring-4 ring-slate-50">
            {appUser?.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">{appUser?.name}</h2>
            <p className="text-slate-500 font-medium">{appUser?.email}</p>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="hidden sm:flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100 transition"
          >
            <Edit2 className="h-4 w-4" /> Edit Profile
          </button>
        </div>

        {/* Profile Navigation List */}
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden divide-y divide-slate-50">
          {[
            { id: "account", label: "Account Information", icon: UserCircle, color: "text-blue-500", bg: "bg-blue-50", onClick: () => setIsEditing(true) },
            { id: "medical", label: "Medical Information", icon: Activity, color: "text-rose-500", bg: "bg-rose-50", onClick: () => setIsEditing(true) },
            { id: "bookings", label: "My Bookings", icon: CalendarClock, color: "text-emerald-500", bg: "bg-emerald-50", href: "/patient/appointments" },
            { id: "payment", label: "Payment Methods", icon: CreditCard, color: "text-violet-500", bg: "bg-violet-50", onClick: () => setIsEditing(true) },
            { id: "reviews", label: "My Reviews", icon: Star, color: "text-amber-500", bg: "bg-amber-50", href: "#" },
            { id: "settings", label: "Settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-100", href: "#" },
            { id: "support", label: "Help & Support", icon: HelpCircle, color: "text-sky-500", bg: "bg-sky-50", href: "#" },
          ].map((item) => {
            const content = (
              <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-slate-800 text-lg group-hover:text-sky-700 transition">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-sky-600 transition group-hover:translate-x-1" />
              </div>
            );

            if (item.href) {
              return <Link key={item.id} href={item.href} className="block">{content}</Link>;
            }

            return (
              <div key={item.id} onClick={item.onClick}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-800">Edit Profile</h2>
        <p className="text-slate-500">Update your information to ensure accurate care delivery.</p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
              placeholder="+1 234 567 890"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Default Location</label>
            <input
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
              placeholder="e.g. 123 Main St, Apt 4"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Existing Conditions / Diseases (comma separated)</label>
          <input
            value={diseases}
            onChange={(e) => setDiseases(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
            placeholder="e.g. Diabetes, Hypertension"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Medical History / Notes</label>
          <textarea
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none"
            placeholder="Provide any additional medical context for your nurses..."
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-slate-700">Preferred Payment Methods</p>
          <div className="flex gap-4">
            <label className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 px-6 py-3 text-sm font-bold transition-all ${paymentMethods.includes("cash") ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"}`}>
              <input type="checkbox" className="sr-only" checked={paymentMethods.includes("cash")} onChange={() => togglePayment("cash")} />
              Cash
            </label>
            <label className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 px-6 py-3 text-sm font-bold transition-all ${paymentMethods.includes("bank") ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"}`}>
              <input type="checkbox" className="sr-only" checked={paymentMethods.includes("bank")} onChange={() => togglePayment("bank")} />
              Bank Transfer
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-8">
          <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <PatientButton type="submit" loading={saving} className="px-8 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-base shadow-[0_8px_20px_-8px_rgba(14,165,233,0.6)]">
            {saving ? "Saving..." : "Save Profile"}
          </PatientButton>
        </div>
      </form>
    </div>
  );
}
