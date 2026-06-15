"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldAlert } from "lucide-react";
import { fetchSignedReadUrl } from "@/services/storageService";

// Image renderer for objects under private S3 prefixes. Fetches a
// signed read URL on mount, then renders it like a regular image.
// Refetches when the key changes. The URL itself isn't long-lived
// (5 min default) so the image will eventually 403 if the user keeps
// the page open — refresh re-fetches.
export default function SignedReadImage({
  s3Key,
  alt,
  className,
}: {
  s3Key: string;
  alt: string;
  className?: string;
}) {
  // Keying state on s3Key lets React reset url/error implicitly when the
  // prop changes, instead of calling setState inside the effect body.
  const [state, setState] = useState<{ url: string | null; error: string | null; key: string }>({
    url: null,
    error: null,
    key: s3Key,
  });

  useEffect(() => {
    let active = true;
    fetchSignedReadUrl(s3Key)
      .then((signed) => {
        if (active) setState({ url: signed, error: null, key: s3Key });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            url: null,
            error: err instanceof Error ? err.message : "Failed to load document",
            key: s3Key,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [s3Key]);

  const url = state.key === s3Key ? state.url : null;
  const error = state.key === s3Key ? state.error : null;

  if (error) {
    return (
      <div className={`flex h-full w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-medium text-rose-700 ${className ?? ""}`}>
        <ShieldAlert className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-2xl bg-slate-50 p-4 ${className ?? ""}`}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl ${className ?? ""}`}>
      <Image src={url} alt={alt} fill unoptimized className="object-contain" />
    </div>
  );
}
