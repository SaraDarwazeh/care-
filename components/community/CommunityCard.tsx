"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { DonationPost } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  wheelchairs: "bg-brand-soft/50 text-brand-deep",
  walkers: "bg-emerald-100 text-emerald-700",
  beds: "bg-violet-100 text-violet-700",
  equipment: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};

function categoryBadgeClass(cat: string) {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// Translate the post's stored category if it matches a known key; fall
// back to raw value for legacy posts whose category is free text the
// admin/user entered before the migration.
function categoryLabel(cat: string, t: ReturnType<typeof useTranslations>): string {
  const key = cat.toLowerCase();
  const known = ["wheelchairs", "walkers", "beds", "equipment", "other"];
  if (known.includes(key)) return t(`categories.${key}`);
  return cat;
}

export default function CommunityCard({ post }: { post: DonationPost }) {
  const t = useTranslations("community");
  const img = post.images && post.images.length > 0 ? post.images[0] : null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
      {img ? (
        <div className="relative h-44 w-full bg-slate-100 shrink-0">
          <Image
            src={img}
            alt={post.title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-44 w-full bg-slate-50 flex items-center justify-center shrink-0">
          <span className="text-4xl">🩺</span>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-semibold ${categoryBadgeClass(post.category)}`}>
            {categoryLabel(post.category, t)}
          </span>
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-1 leading-snug">{post.title}</h3>
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {post.location ?? t("card.locationUnknown")}
        </p>
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{post.description}</p>
        <div className="flex items-center gap-2 mt-auto">
          <Link
            href={`/community/${post.id}`}
            className="flex-1 rounded-xl bg-brand py-2 text-center text-sm font-bold text-white hover:bg-brand-deep transition"
          >
            {t("card.viewDetails")}
          </Link>
          {post.contact.email && (
            <a
              href={`mailto:${post.contact.email}`}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              {t("card.contactInfo")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
