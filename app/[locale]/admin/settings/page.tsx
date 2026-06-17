"use client";

import { Settings, Shield, Bell, Palette, Database } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import PricingConfigEditor from "@/components/admin/PricingConfigEditor";
import FeatureFlagsEditor from "@/components/admin/FeatureFlagsEditor";

export default function AdminSettingsPage() {
  const { appUser, loading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.settings");
  const tSections = useTranslations("admin.settings.sections");

  if (loading || !appUser) return <LoadingScreen text={t("loading")} />;

  // All settings tile icons share the brand-tone shell; differentiation
  // comes from the Lucide glyph. badgeColor keeps semantic meaning
  // (emerald = enabled, slate = neutral default, orange = caution).
  const sections = [
    {
      key: "security" as const,
      icon: Shield,
      color: "text-brand-deep",
      bg: "bg-brand-soft/40",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "notifications" as const,
      icon: Bell,
      color: "text-brand-deep",
      bg: "bg-brand-soft/40",
      badgeColor: "bg-slate-100 text-slate-500",
    },
    {
      key: "appearance" as const,
      icon: Palette,
      color: "text-brand-deep",
      bg: "bg-brand-soft/40",
      badgeColor: "bg-slate-100 text-slate-500",
    },
    {
      key: "database" as const,
      icon: Database,
      color: "text-brand-deep",
      bg: "bg-brand-soft/40",
      badgeColor: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-extrabold text-white shadow-lg shadow-brand/20">
            {appUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold">{appUser.name}</p>
            <p className="text-slate-400">{appUser.email}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft/30 px-3 py-1 text-xs font-bold text-brand-deep border border-brand/30">
              <Shield className="h-3 w-3" /> {t("superAdmin")}
            </span>
          </div>
        </div>
      </div>

      <PricingConfigEditor />

      <FeatureFlagsEditor />

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.key} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:border-brand-soft hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${section.bg} ${section.color}`}>
                <section.icon className="h-6 w-6" />
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${section.badgeColor}`}>
                {tSections(`${section.key}.badge`)}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-brand-deep transition-colors">
              {tSections(`${section.key}.title`)}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {tSections(`${section.key}.description`)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-800 mb-1">{t("comingSoon.title")}</p>
            <p className="text-amber-700 text-sm leading-relaxed">{t("comingSoon.body")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
