"use client";

import { useState } from "react";
import { uploadFile } from "@/services/storageService";
import { createDonationPost } from "@/services/communityService";
import { DonationPost } from "@/lib/types";

export default function PostForm({ onCreated }: { onCreated?: (p: DonationPost) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Equipment");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const images: string[] = [];

      if (imageFile) {
        const { url } = await uploadFile(imageFile, { scope: "community" });
        images.push(url);
      }

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
      setTitle(""); setDescription(""); setCategory("Equipment"); setLocation(""); setContact({ name: "", email: "", phone: "" }); setImageFile(null);
      onCreated?.(created);
    } catch (err) {
      console.error("Failed to create donation post", err);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";
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

        <div>
          <label className={labelClass}>Photo (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-100" />
        </div>

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60 transition">
          {loading ? "Posting..." : "Post Donation"}
        </button>
      </div>
    </form>
  );
}
