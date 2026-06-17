"use client";

import { useState } from "react";
import { createDonationPost } from "@/services/communityService";
import { DonationPost } from "@/lib/types";
import ImageUploadField from "@/components/common/ImageUploadField";

export default function PostForm({ onCreated }: { onCreated?: (p: DonationPost) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Equipment");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const postInput: Omit<DonationPost, "id" | "createdAt"> = {
        title,
        description,
        category,
        images,
        location,
        contact: { ...contact },
        createdBy: undefined,
      };

      const created = await createDonationPost(postInput);
      setTitle(""); setDescription(""); setCategory("Equipment"); setLocation("");
      setContact({ name: "", email: "", phone: "" });
      setImages([]);
      onCreated?.(created);
    } catch (err) {
      console.error("Failed to create donation post", err);
      setError(err instanceof Error ? err.message : "Failed to post donation");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft/40";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Donate Equipment</h3>
      <p className="text-xs text-slate-500 mb-5">Share healthcare items with your community.</p>

      <div className="grid gap-4">
        <div>
          <label className={labelClass}>Item Title *</label>
          <input required placeholder="e.g. Manual Wheelchair — Good Condition" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Description *</label>
          <textarea required placeholder="Describe the item, its condition, and any pickup details..." value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-[100px] resize-none`} />
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="Wheelchairs">Wheelchairs</option>
            <option value="Walkers">Walkers</option>
            <option value="Beds">Beds</option>
            <option value="Equipment">Equipment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Location</label>
          <input placeholder="e.g. Riyadh, Al Olaya" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Information</p>
          <div>
            <label className={labelClass}>Your Name</label>
            <input placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" placeholder="your@email.com" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" placeholder="+966 5x xxx xxxx" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputClass} />
          </div>
        </div>

        <ImageUploadField
          mode="multi"
          scope="community"
          label="Photos (optional)"
          value={images}
          onChange={setImages}
          helperText="Add up to 4 photos. They appear on the donation card and detail page."
          maxFiles={4}
        />

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
        )}

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-60 transition">
          {loading ? "Posting..." : "Post Donation"}
        </button>
      </div>
    </form>
  );
}
