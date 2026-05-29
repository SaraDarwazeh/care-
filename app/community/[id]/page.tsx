"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDonationPostById } from "@/services/communityService";
import { DonationPost } from "@/lib/types";
import LoadingScreen from "@/components/common/LoadingScreen";
import PlatformShell from "@/components/layout/PlatformShell";

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<DonationPost | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const p = await getDonationPostById(id);
      if (!active) return;
      if (!p) {
        router.replace('/community');
        return;
      }
      setPost(p);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [id, router]);

  if (loading) return <LoadingScreen text="Loading donation..." />;
  if (!post) return null;

  return (
    <PlatformShell>
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/community"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-sky-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to community
      </Link>
      <div className="space-y-4">
        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <strong>Platform Note:</strong> Care+ only facilitates visibility. Contact donors directly. We are not responsible for transactions or deliveries.
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          {/* Category badge */}
          <div>
            <span className="inline-block rounded-lg bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {post.category}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">{post.title}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {post.location ?? "Location not specified"}
            </p>
          </div>

          {post.images && post.images.length > 0 && (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
              <Image
                src={post.images[0]}
                alt={post.title}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}

          <p className="text-slate-700 leading-relaxed">{post.description}</p>

          {/* Contact card */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contact Donor</h3>
            <div className="space-y-2">
              {post.contact.name && (
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-500">Name: </span>
                  {post.contact.name}
                </p>
              )}
              {post.contact.email && (
                <p className="text-sm">
                  <span className="font-medium text-slate-500">Email: </span>
                  <a href={`mailto:${post.contact.email}`} className="text-sky-600 font-semibold hover:underline">
                    {post.contact.email}
                  </a>
                </p>
              )}
              {post.contact.phone && (
                <p className="text-sm">
                  <span className="font-medium text-slate-500">Phone: </span>
                  <a href={`tel:${post.contact.phone}`} className="text-sky-600 font-semibold hover:underline">
                    {post.contact.phone}
                  </a>
                </p>
              )}
              {!post.contact.email && !post.contact.phone && (
                <p className="text-sm text-slate-400 italic">No contact details provided.</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              {post.contact.email && (
                <a
                  href={`mailto:${post.contact.email}`}
                  className="flex-1 rounded-xl bg-sky-600 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-700 transition"
                >
                  Send Email
                </a>
              )}
              {post.contact.phone && (
                <a
                  href={`tel:${post.contact.phone}`}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PlatformShell>
  );
}
