"use client";

import Image from "next/image";
import { Package } from "lucide-react";

// Store items historically used a single emoji character as their
// "image" (one-char visual). The admin product editor now also accepts
// uploaded image URLs, so this component handles both:
//   - http(s):// URL → next/image render
//   - everything else (emoji, short text) → centered glyph render
//   - empty → fallback Package icon
export default function StoreItemImage({
  src,
  alt,
  className = "",
  glyphSize = "text-5xl",
}: {
  src: string | undefined;
  alt: string;
  className?: string;
  glyphSize?: string;
}) {
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`}>
        <Package className="h-10 w-10 text-slate-300" aria-hidden />
      </div>
    );
  }
  if (/^https?:\/\//.test(src)) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <Image src={src} alt={alt} fill unoptimized className="object-cover" />
      </div>
    );
  }
  return (
    <span className={`${glyphSize} ${className}`} aria-label={alt}>
      {src}
    </span>
  );
}
