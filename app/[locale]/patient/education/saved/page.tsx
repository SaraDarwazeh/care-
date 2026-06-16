"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, PlaySquare } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import EmptyState from "@/components/common/EmptyState";
import LoadingScreen from "@/components/common/LoadingScreen";
import VideoCard from "@/components/educationLibrary/VideoCard";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useEducationLibraryEnabled, useSiteSettings } from "@/hooks/useSiteSettings";
import { listSavedVideos } from "@/services/educationLibraryService";
import type { EducationVideo } from "@/lib/types";

export default function PatientEducationSavedPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["patient"] });
  const t = useTranslations("educationLibrary.saved");
  const tDisabled = useTranslations("educationLibrary.disabled");
  const enabled = useEducationLibraryEnabled();
  const { loading: settingsLoading } = useSiteSettings();
  const router = useRouter();

  const [videos, setVideos] = useState<EducationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsLoading) return;
    if (!enabled) router.replace("/patient");
  }, [enabled, settingsLoading, router]);

  useEffect(() => {
    if (!appUser || !enabled) return;
    let active = true;
    listSavedVideos(appUser.id)
      .then((vs) => {
        if (active) setVideos(vs);
      })
      .catch((err) => {
        console.error("[education-saved] load failed", err);
        if (active) setError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser, enabled, t]);

  if (settingsLoading || authLoading || !appUser || loading) {
    return <LoadingScreen />;
  }

  if (!enabled) {
    return (
      <div className="py-12">
        <EmptyState icon={PlaySquare} title={tDisabled("title")} description={tDisabled("body")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
          {t("heading")}
        </h1>
        <p className="mt-1 text-slate-600">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {videos.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={t("empty.title")}
          description={t("empty.body")}
          ctaLabel={t("empty.cta")}
          ctaHref="/patient/education"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} initiallySaved />
          ))}
        </div>
      )}
    </div>
  );
}
