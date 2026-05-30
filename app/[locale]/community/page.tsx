"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, X } from "lucide-react";
import CommunityCard from "@/components/community/CommunityCard";
import PostForm from "@/components/community/PostForm";
import PlatformShell from "@/components/layout/PlatformShell";
import { getDonationPosts } from "@/services/communityService";
import type { DonationPost } from "@/lib/types";

// Canonical category keys (Rule B in the bilingual plan). Stored as
// lowercase keys; labels resolved via t("community.categories.{key}").
// "all" is a UI-only sentinel — never persisted on a DonationPost.
const CATEGORY_KEYS = ["all", "wheelchairs", "walkers", "beds", "equipment", "other"] as const;

export default function CommunityPage() {
  const t = useTranslations("community");
  const [posts, setPosts] = useState<DonationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [postModalOpen, setPostModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const p = await getDonationPosts();
      setPosts(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await load();
    }
    void run();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!postModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPostModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [postModalOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (activeCategory !== "all" && p.category.toLowerCase() !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const hay = `${p.title} ${p.description} ${p.location ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [posts, activeCategory, search]);

  const activeCategoryLabel = t(`categories.${activeCategory}`);

  return (
    <PlatformShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
              {t("page.title")}
            </h1>
            <p className="mt-2 text-base text-slate-600">{t("page.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setPostModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> {t("page.postCta")}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>{t("page.platformNoteKicker")}</strong> {t("page.platformNote")}
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("page.searchPlaceholder")}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((catKey) => (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                  activeCategory === catKey
                    ? "bg-sky-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                }`}
              >
                {t(`categories.${catKey}`)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-500">
            {t("page.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">{t("page.emptyTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">
              {search.trim()
                ? t("page.emptySearch")
                : activeCategory === "all"
                ? t("page.emptyAll")
                : t("page.emptyCategory", { category: activeCategoryLabel })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <CommunityCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>

      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setPostModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600">{t("page.modal.kicker")}</p>
                <h2 className="text-lg font-bold text-slate-800">{t("page.modal.title")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                aria-label={t("page.modal.closeLabel")}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <PostForm
                onCreated={() => {
                  setPostModalOpen(false);
                  void load();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </PlatformShell>
  );
}
