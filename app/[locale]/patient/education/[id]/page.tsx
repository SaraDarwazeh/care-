"use client";

import { use, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, PlaySquare, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import EmptyState from "@/components/common/EmptyState";
import LoadingScreen from "@/components/common/LoadingScreen";
import VideoCard from "@/components/educationLibrary/VideoCard";
import SaveVideoButton from "@/components/educationLibrary/SaveVideoButton";
import { useAuth } from "@/hooks/useAuth";
import { useEducationLibraryEnabled, useSiteSettings } from "@/hooks/useSiteSettings";
import {
  getVideoById,
  incrementViewCount,
  listRelatedVideos,
  listSavedVideoIds,
} from "@/services/educationLibraryService";
import type { Locale } from "@/i18n/config";
import { tLocalized } from "@/lib/i18nContent";
import type { EducationVideo } from "@/lib/types";

export default function PatientEducationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("educationLibrary.detail");
  const tCat = useTranslations("educationLibrary.categories");
  const tDisabled = useTranslations("educationLibrary.disabled");
  const enabled = useEducationLibraryEnabled();
  const { loading: settingsLoading } = useSiteSettings();
  const { appUser } = useAuth();
  const [video, setVideo] = useState<EducationVideo | null>(null);
  const [related, setRelated] = useState<EducationVideo[]>([]);
  const [relatedSavedIds, setRelatedSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (settingsLoading) return;
    if (!enabled) router.replace("/patient");
  }, [enabled, settingsLoading, router]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getVideoById(id)
      .then(async (v) => {
        if (!active) return;
        setVideo(v);
        setError(null);
        if (v) {
          void incrementViewCount(v.id);
          try {
            const rel = await listRelatedVideos(v, 6);
            if (active) setRelated(rel);
          } catch (err) {
            console.warn("[education-detail] related load failed", err);
          }
        }
      })
      .catch((err) => {
        console.error("[education-detail] load failed", err);
        if (active) setError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, id, t]);

  // Saved-ids prefetch for related cards.
  useEffect(() => {
    if (!appUser || appUser.role !== "patient" || related.length === 0) return;
    let active = true;
    listSavedVideoIds(appUser.id)
      .then((entries) => {
        if (active) setRelatedSavedIds(new Set(entries.map((e) => e.videoId)));
      })
      .catch((err) => console.warn("[education-detail] saved-ids load failed", err));
    return () => {
      active = false;
    };
  }, [appUser, related]);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("clipboard-unsupported");
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fall back to alert so users still get the URL.
      if (typeof window !== "undefined") {
        window.prompt(t("shareUnsupported"), url);
      }
    }
  }

  if (settingsLoading || loading) return <LoadingScreen />;

  if (!enabled) {
    return (
      <div className="py-12">
        <EmptyState icon={PlaySquare} title={tDisabled("title")} description={tDisabled("body")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <EmptyState icon={PlaySquare} title={t("loadError")} description={error} />
        <div className="mt-6 text-center">
          <Link
            href="/patient/education"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
          >
            {t("back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="py-12">
        <EmptyState
          icon={PlaySquare}
          title={t("notFound.title")}
          description={t("notFound.body")}
          ctaLabel={t("notFound.cta")}
          ctaHref="/patient/education"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <Link
        href="/patient/education"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-sky-700"
      >
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="overflow-hidden rounded-3xl bg-black shadow-lg">
        <video
          key={video.id}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
            {tCat(video.category)}
          </span>
          {video.tags?.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              #{tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {tLocalized(video.title, locale)}
        </h1>

        <p className="whitespace-pre-line text-base leading-relaxed text-slate-600">
          {tLocalized(video.description, locale)}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <SaveVideoButton videoId={video.id} />
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            <Share2 className="h-4 w-4" />
            {linkCopied ? t("linkCopied") : t("share")}
          </button>
        </div>
      </div>

      <section className="space-y-4 pt-4 border-t border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-900">{t("related")}</h2>
        {related.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noRelated")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VideoCard key={v.id} video={v} initiallySaved={relatedSavedIds.has(v.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
