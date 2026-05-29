"use client";

import { Settings, Shield, Bell, Palette, Database } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import PricingConfigEditor from "@/components/admin/PricingConfigEditor";

export default function AdminSettingsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["admin"] });

  if (loading || !appUser) return <LoadingScreen text="Loading settings..." />;

  const sections = [
    {
      icon: Shield,
      color: "text-sky-600",
      bg: "bg-sky-100",
      title: "Security & Access",
      description: "Manage admin roles, permissions, and authentication settings.",
      badge: "Configured",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      icon: Bell,
      color: "text-amber-600",
      bg: "bg-amber-100",
      title: "Notifications",
      description: "Configure system email and push notification preferences.",
      badge: "Default",
      badgeColor: "bg-slate-100 text-slate-500",
    },
    {
      icon: Palette,
      color: "text-violet-600",
      bg: "bg-violet-100",
      title: "Appearance",
      description: "Customize the admin panel look and brand colors.",
      badge: "Default",
      badgeColor: "bg-slate-100 text-slate-500",
    },
    {
      icon: Database,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      title: "Database & Backups",
      description: "Manage Firestore rules, backups, and data exports.",
      badge: "Firebase",
      badgeColor: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Platform configuration and system preferences.</p>
      </div>

      {/* Admin Info Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-2xl font-extrabold text-white shadow-lg shadow-sky-500/20">
            {appUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold">{appUser.name}</p>
            <p className="text-slate-400">{appUser.email}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-300 border border-sky-500/30">
              <Shield className="h-3 w-3" /> Super Admin
            </span>
          </div>
        </div>
      </div>

      {/* Pricing config — live editor */}
      <PricingConfigEditor />

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:border-sky-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${section.bg} ${section.color}`}>
                <section.icon className="h-6 w-6" />
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${section.badgeColor}`}>{section.badge}</span>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-sky-700 transition-colors">{section.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{section.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-800 mb-1">Settings Coming Soon</p>
            <p className="text-amber-700 text-sm leading-relaxed">
              Full configuration panels for each setting section are being built. For now, all system settings are managed directly through Firebase Console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
