"use client";

import { useEffect, useState } from "react";
import CommunityCard from "@/components/community/CommunityCard";
import PostForm from "@/components/community/PostForm";
import PlatformShell from "@/components/layout/PlatformShell";
import { getDonationPosts } from "@/services/communityService";
import { DonationPost } from "@/lib/types";

const CATEGORIES = ["All", "Wheelchairs", "Walkers", "Beds", "Equipment", "Other"];

export default function CommunityPage() {
  const [posts, setPosts] = useState<DonationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

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

  const filtered = activeCategory === "All"
    ? posts
    : posts.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <PlatformShell>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Community Donations
        </h1>
        <p className="mt-1 text-sm font-medium text-sky-600 sm:hidden">Healthcare Equipment Exchange</p>
        <p className="mt-2 text-base text-slate-600">
          Browse and list donated healthcare equipment. Connect with community members who have items to share.
        </p>
      </div>

      {/* Disclaimer Banner */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <strong>Platform Note:</strong> Care Plus only facilitates visibility. Contact donors directly. We are not responsible for transactions or deliveries.
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Post Form */}
        <div className="lg:col-span-1">
          <PostForm onCreated={() => void load()} />
        </div>

        {/* Listings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                  activeCategory === cat
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-500">
              Loading posts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center">
              <p className="font-semibold text-slate-700">No donations found</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeCategory === "All"
                  ? "Be the first to post a donation!"
                  : `No items in the "${activeCategory}" category yet.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <CommunityCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </PlatformShell>
  );
}
