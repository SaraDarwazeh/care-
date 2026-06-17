"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Loader2, PlaySquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import EmptyState from "@/components/common/EmptyState";
import LoadingScreen from "@/components/common/LoadingScreen";
import VideoCard from "@/components/educationLibrary/VideoCard";
import { useAuth } from "@/hooks/useAuth";
import { useEducationLibraryEnabled, useSiteSettings } from "@/hooks/useSiteSettings";
import {
  EDUCATION_VIDEOS_PAGE_SIZE,
  listPublishedVideos,
  listSavedVideoIds,
} from "@/services/educationLibraryService";
import {
  EDUCATION_VIDEO_CATEGORIES,
  type EducationVideo,
  type EducationVideoCategory,
} from "@/lib/types";

export default function PatientEducationFeedPage() {
  const t = useTranslations("educationLibrary.feed");
  const tCat = useTranslations("educationLibrary.categories");
  const tDisabled = useTranslations("educationLibrary.disabled");
  const router = useRouter();
  const enabled = useEducationLibraryEnabled();
  const { loading: settingsLoading } = useSiteSettings();
  const { appUser } = useAuth();

  const [category, setCategory] = useState<EducationVideoCategory | null>(null);
  // Full published catalogue — fetched once on mount. Sorting / filtering
  // / pagination are all client-side from this list so the underlying
  // Firestore query stays a single-field equality (no composite index
  // required).
  const [allVideos, setAllVideos] = useState<EducationVideo[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(EDUCATION_VIDEOS_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadingMoreRef = useRef(false);

  // Disabled-feature soft redirect. We don't 404 — admins might be
  // mid-launch with content staged. Keep the user on /patient with a
  // friendly notice via the disabled UI below.
  useEffect(() => {
    if (settingsLoading) return;
    if (!enabled) {
      router.replace("/patient");
    }
  }, [enabled, settingsLoading, router]);

  // Saved-ids prefetch so card icons hydrate without N round trips.
  useEffect(() => {
    if (!appUser || appUser.role !== "patient") return;
    let active = true;
    listSavedVideoIds(appUser.id)
      .then((entries) => {
        if (active) setSavedIds(new Set(entries.map((e) => e.videoId)));
      })
      .catch((err) => console.warn("[education-feed] saved-ids load failed", err));
    return () => {
      active = false;
    };
  }, [appUser]);

  // Fetch the full published catalogue once. Single-field equality query
  // — Firestore auto-indexes published, no composite index required.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listPublishedVideos()
      .then((result) => {
        if (!active) return;
        setAllVideos(result);
        setError(null);
      })
      .catch((err) => {
        console.error("[education-feed] load failed", err);
        if (active) setError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, t]);

  // Pagination resets when category changes — see the chip handlers,
  // which call setCategory + setVisibleCount together so we don't
  // need a setState-in-effect to sync them.
  function selectCategory(next: EducationVideoCategory | null) {
    setCategory(next);
    setVisibleCount(EDUCATION_VIDEOS_PAGE_SIZE);
  }

  const filtered = useMemo(() => {
    if (!category) return allVideos;
    return allVideos.filter((v) => v.category === category);
  }, [allVideos, category]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const done = visible.length >= filtered.length;

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || done) return;
    loadingMoreRef.current = true;
    setVisibleCount((c) => c + EDUCATION_VIDEOS_PAGE_SIZE);
    loadingMoreRef.current = false;
  }, [done]);

  // Intersection-observer infinite scroll on a sentinel near the bottom
  // of the grid. Cheap because the data is already in memory.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const showDisabled = !settingsLoading && !enabled;

  // Cross-category counts for the chip badges, computed from the full
  // catalogue rather than the filtered view so each chip's count
  // reflects total availability, not the current selection.
  const categoryCounts = useMemo(() => {
    const counts = new Map<EducationVideoCategory, number>();
    allVideos.forEach((v) => counts.set(v.category, (counts.get(v.category) ?? 0) + 1));
    return counts;
  }, [allVideos]);

  if (settingsLoading) {
    return <LoadingScreen />;
  }

  if (showDisabled) {
    return (
      <div className="py-12">
        <EmptyState icon={PlaySquare} title={tDisabled("title")} description={tDisabled("body")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
            {t("heading")}
          </h1>
          <p className="mt-1 text-slate-600">{t("subtitle")}</p>
        </div>
        {appUser?.role === "patient" && (
          <Link
            href="/patient/education/saved"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-brand-soft hover:text-brand-deep"
          >
            <Bookmark className="h-4 w-4" /> {t("savedCta")}
          </Link>
        )}
      </div>

      {/* Category chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        <button
          type="button"
          onClick={() => selectCategory(null)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
            category === null
              ? "border-brand bg-brand text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-brand-soft"
          }`}
        >
          {t("filters.all")}
        </button>
        {EDUCATION_VIDEO_CATEGORIES.map((c) => {
          const active = category === c;
          const count = categoryCounts.get(c) ?? 0;
          return (
            <button
              key={c}
              type="button"
              onClick={() => selectCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-soft"
              }`}
            >
              {tCat(c)}
              {count > 0 && (
                <span
                  className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-3xl bg-slate-100 sm:aspect-video"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PlaySquare}
          title={category ? t("emptyCategory.title") : t("empty.title")}
          description={category ? t("emptyCategory.body") : t("empty.body")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((v) => (
              <VideoCard key={v.id} video={v} initiallySaved={savedIds.has(v.id)} />
            ))}
          </div>

          <div ref={sentinelRef} className="h-1" />

          {!done && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingMore")}
            </div>
          )}
          {done && (
            <div className="py-6 text-center text-xs font-medium text-slate-400">
              {t("endOfList")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
