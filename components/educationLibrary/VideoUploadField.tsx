"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { uploadFile } from "@/services/storageService";

interface VideoUploadFieldProps {
  value: string;
  onChange: (url: string, durationSeconds?: number) => void;
  helperText?: string;
}

// Reads a File into an <object-url>-backed <video> off-DOM to measure
// `duration`, then revokes the URL. Resolves to undefined if the
// browser refuses to decode metadata (some MOV variants), in which
// case the admin can still set duration manually.
function probeDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(undefined);
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.muted = true;
      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* noop */
        }
      };
      v.onloadedmetadata = () => {
        const seconds = Number.isFinite(v.duration) ? Math.round(v.duration) : undefined;
        cleanup();
        resolve(seconds);
      };
      v.onerror = () => {
        cleanup();
        resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}

export default function VideoUploadField({ value, onChange, helperText }: VideoUploadFieldProps) {
  const t = useTranslations("educationLibrary.admin.form");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const duration = await probeDuration(file);
      const { url } = await uploadFile(file, { scope: "education-video" });
      onChange(url, duration);
    } catch (err) {
      console.error("[VideoUploadField] upload failed", err);
      setError(err instanceof Error && err.message ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            <video
              src={value}
              controls
              preload="metadata"
              className="aspect-video w-full max-w-xl bg-black"
            />
            <button
              type="button"
              onClick={() => onChange("", undefined)}
              className="absolute end-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {t("videoReady")}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("uploadingVideo")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> {value ? t("replaceVideo") : t("videoFile")}
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          {helperText && <p className="mt-2 text-xs text-slate-500">{helperText}</p>}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
      )}
    </div>
  );
}
