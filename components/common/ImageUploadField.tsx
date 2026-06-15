"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { uploadFile, type UploadScope } from "@/services/storageService";

interface BaseProps {
  scope: UploadScope;
  accept?: string;
  label?: string;
  helperText?: string;
  maxFiles?: number;
}

interface SingleProps extends BaseProps {
  mode?: "single";
  value: string;
  onChange: (next: string) => void;
}

interface MultiProps extends BaseProps {
  mode: "multi";
  value: string[];
  onChange: (next: string[]) => void;
}

export type ImageUploadFieldProps = SingleProps | MultiProps;

// Generic uploader. Hidden file input + drop zone preview. File-only —
// users upload directly; we never accept a manually-pasted URL.
export default function ImageUploadField(props: ImageUploadFieldProps) {
  const {
    scope,
    accept = "image/*",
    label,
    helperText,
    maxFiles,
  } = props;
  const mode = props.mode ?? "single";
  const t = useTranslations("common.actions");
  const tField = useTranslations("common.imageUpload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = mode === "multi" ? (props as MultiProps).value : ([] as string[]);
  const singleValue = mode === "single" ? (props as SingleProps).value : "";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      if (mode === "single") {
        const file = files[0];
        const { url } = await uploadFile(file, { scope });
        (props as SingleProps).onChange(url);
      } else {
        const room =
          typeof maxFiles === "number" ? Math.max(0, maxFiles - values.length) : files.length;
        const toUpload = Array.from(files).slice(0, room);
        const uploaded = await Promise.all(
          toUpload.map((file) => uploadFile(file, { scope }).then((r) => r.url)),
        );
        (props as MultiProps).onChange([...values, ...uploaded]);
      }
    } catch (err) {
      console.error("[ImageUploadField] upload failed", err);
      setError(err instanceof Error && err.message ? err.message : tField("uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    if (mode === "single") {
      (props as SingleProps).onChange("");
    } else {
      (props as MultiProps).onChange(values.filter((_, i) => i !== index));
    }
  }

  const canAddMore =
    typeof maxFiles !== "number" || (mode === "multi" ? values.length < maxFiles : !singleValue);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-slate-700">{label}</label>
      )}

      {/* Previews */}
      {mode === "single" && singleValue ? (
        <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <Image
            src={singleValue}
            alt="Upload preview"
            fill
            unoptimized
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => removeAt(0)}
            className="absolute end-1 top-1 rounded-full bg-white/95 p-1 text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {mode === "multi" && values.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
          {values.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="group relative h-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <Image src={url} alt="Upload preview" fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute end-1 top-1 rounded-full bg-white/95 p-1 text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
                aria-label="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Upload trigger */}
      {canAddMore && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("uploading")}
              </>
            ) : (
              <>
                {mode === "multi" ? <ImagePlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {mode === "multi" ? tField("addImage") : tField("uploadImage")}
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={mode === "multi"}
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {helperText && (
            <p className="mt-2 text-xs text-slate-500">{helperText}</p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
      )}
    </div>
  );
}
