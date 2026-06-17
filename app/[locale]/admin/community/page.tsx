"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, ExternalLink, HeartHandshake, Trash2 } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import {
  deleteDonationPost,
  getAllDonationPostsForAdmin,
  postStatus,
  setDonationPostStatus,
} from "@/services/communityService";
import type { DonationPost, DonationPostStatus } from "@/lib/types";

const FILTER_OPTIONS: { id: "all" | DonationPostStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "hidden", label: "Hidden" },
  { id: "flagged", label: "Flagged" },
];

export default function AdminCommunityPage() {
  const { appUser, loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const t = useTranslations("admin.community");
  const [posts, setPosts] = useState<DonationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]["id"]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setError(null);
    try {
      const data = await getAllDonationPostsForAdmin();
      setPosts(data);
    } catch (err) {
      console.error("[admin/community] failed to load", err);
      setError(err instanceof Error ? err.message : "Failed to load community posts.");
    }
  }

  // Gated on appUser so Firestore reads don't fire before auth restores.
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    getAllDonationPostsForAdmin()
      .then((data) => {
        if (active) setPosts(data);
      })
      .catch((err) => {
        console.error("[admin/community] failed to load", err);
        if (active) setError(err instanceof Error ? err.message : "Failed to load community posts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appUser]);

  async function changeStatus(post: DonationPost, status: DonationPostStatus) {
    setBusyId(post.id);
    try {
      await setDonationPostStatus(post.id, status);
      await reload();
    } catch (err) {
      console.error("[admin/community] status change failed", err);
      setError(err instanceof Error ? err.message : "Failed to update post.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(post: DonationPost) {
    if (!confirm(`Delete "${post.title}" permanently? This cannot be undone.`)) return;
    setBusyId(post.id);
    try {
      await deleteDonationPost(post.id);
      await reload();
    } catch (err) {
      console.error("[admin/community] delete failed", err);
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => postStatus(p) === filter);
  }, [posts, filter]);

  const counts = useMemo(() => {
    return {
      all: posts.length,
      active: posts.filter((p) => postStatus(p) === "active").length,
      hidden: posts.filter((p) => postStatus(p) === "hidden").length,
      flagged: posts.filter((p) => postStatus(p) === "flagged").length,
    };
  }, [posts]);

  if (authLoading || !appUser || loading) {
    return <LoadingScreen text={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-slate-500">{t("subtitle")}</p>
        </div>
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-deep"
        >
          View public board <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
              filter === opt.id
                ? "border-brand bg-brand-soft/30 text-brand-deep shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-brand-soft"
            }`}
          >
            {opt.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              filter === opt.id ? "bg-brand-soft/50 text-brand-deep" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[opt.id]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16">
          <HeartHandshake className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-lg font-bold text-slate-700">No posts to show</p>
          <p className="text-slate-500 text-sm">Try a different filter, or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((post) => {
            const status = postStatus(post);
            return (
              <div
                key={post.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800">{post.title}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "flagged"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-brand-soft/30 text-brand-deep px-2 py-0.5">
                        {post.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{post.description}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Posted {new Date(post.createdAt).toLocaleDateString()}
                      {post.location && <> · {post.location}</>}
                      {post.contact?.name && <> · by {post.contact.name}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/community/${post.id}`}
                      target="_blank"
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                      View
                    </Link>
                    {status === "active" ? (
                      <button
                        type="button"
                        onClick={() => changeStatus(post, "hidden")}
                        disabled={busyId === post.id}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeStatus(post, "active")}
                        disabled={busyId === post.id}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Restore
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={busyId === post.id}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
