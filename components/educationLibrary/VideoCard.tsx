"use client";

import { useTranslations, useLocale } from "next-intl";
import { PlaySquare, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { tLocalized } from "@/lib/i18nContent";
import { type Locale } from "@/i18n/config";
import type { EducationVideo } from "@/lib/types";
import SaveVideoButton from "./SaveVideoButton";

interface VideoCardProps {
  video: EducationVideo;
  showSave?: boolean;
  initiallySaved?: boolean;
}

function fmtDuration(seconds: number | undefined): string | null {
  if (!seconds || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCard({ video, showSave = true, initiallySaved }: VideoCardProps) {
  const locale = useLocale() as Locale;
  const tCat = useTranslations("educationLibrary.categories");

  const duration = fmtDuration(video.durationSeconds);

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/patient/education/${video.id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-brand-soft/50 focus:ring-offset-2"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 sm:aspect-video">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-600">
              <PlaySquare className="h-12 w-12" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />

          {duration && (
            <span className="absolute end-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {duration}
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sky-600 shadow">
              <Play className="h-4 w-4 fill-current" />
            </div>
            {showSave && (
              <div onClick={(e) => e.preventDefault()} role="presentation">
                <SaveVideoButton videoId={video.id} variant="icon" initiallySaved={initiallySaved} />
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
          {tCat(video.category)}
        </span>
        <Link
          href={`/patient/education/${video.id}`}
          className="mt-2 block font-bold text-slate-800 hover:text-sky-700 line-clamp-2"
        >
          {tLocalized(video.title, locale)}
        </Link>
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
          {tLocalized(video.description, locale)}
        </p>
      </div>
    </article>
  );
}
