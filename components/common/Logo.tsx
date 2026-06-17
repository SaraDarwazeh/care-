import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BRAND_ASSETS } from "@/lib/brand";

interface LogoProps {
  /**
   * Visual variant.
   * - "full": the lockup with the mark + Care+ wordmark (logo-full.jpeg)
   * - "mark": the location-pin + house icon only (mark.jpeg)
   * - "wordmark": the "Care" wordmark only (wordmark.jpeg)
   */
  variant?: "full" | "mark" | "wordmark";
  /** Pixel height. Width is derived from the asset's intrinsic aspect ratio. */
  size?: number;
  /** When true, wraps the image in a Link to the locale-prefixed home. */
  asLink?: boolean;
  /**
   * Surface to render the JPEG on. The supplied assets are JPEGs with
   * baked-in white backgrounds and anti-aliased edges; rendering on
   * anything other than white produces a visible halo. "white" wraps
   * the mark in a white rounded pill so it survives on dark/colored
   * parents. "soft" uses brand-mist for a quieter card-on-card feel.
   * "bare" renders the JPEG without any wrapper surface — only use
   * this when the parent is already a white surface. Defaults to
   * "bare" to preserve existing layouts; new callers should pass
   * "white" when placing on coloured backgrounds.
   */
  surface?: "bare" | "white" | "soft";
  /**
   * When true, the image is rendered with `priority` so next/image
   * skips lazy-loading. Defaults to true because every current Logo
   * placement is in a top bar or hero (above-the-fold). Pass `false`
   * if you add Logo to a footer or modal where lazy-loading is fine.
   */
  priority?: boolean;
  /** Accessible alt text. Defaults to "Care+ home" when asLink, else "Care+". */
  alt?: string;
  /** Extra classes appended to the wrapper. */
  className?: string;
}

// Intrinsic aspect ratios of the supplied JPEGs, measured directly via
// `sips -g pixelWidth -g pixelHeight` on the source files. Layout-level
// scaling that disagrees with these ratios will visibly squish or
// stretch the artwork — a "do not reduce quality" regression. The
// earlier v1 numbers were eyeballed and squeezed the mark by 20%.
//
// Source dimensions (px): logo-full 788×274, mark 171×273, wordmark 463×274.
const ASPECT: Record<"full" | "mark" | "wordmark", number> = {
  full: 788 / 274,
  mark: 171 / 273,
  wordmark: 463 / 274,
};

const SOURCE: Record<"full" | "mark" | "wordmark", string> = {
  full: BRAND_ASSETS.logoFull,
  mark: BRAND_ASSETS.mark,
  wordmark: BRAND_ASSETS.wordmark,
};

// Care+ logo. Renders the supplied brand JPEGs as-is via next/image
// with `unoptimized` so the original bytes (and thus the quality,
// weight, and visual fidelity the brand owner approved) reach the DOM
// untouched. JPEGs have no transparency channel — so every Logo
// placement either lands on a white parent surface ("bare") or
// renders inside a white/soft rounded pill ("white" | "soft").
export default function Logo({
  variant = "full",
  size = 36,
  asLink = false,
  surface = "bare",
  priority = true,
  alt,
  className,
}: LogoProps) {
  const src = SOURCE[variant];
  const ratio = ASPECT[variant];
  const width = Math.round(size * ratio);
  const resolvedAlt = alt ?? (asLink ? "Care+ home" : "Care+");
  const img = (
    <Image
      src={src}
      width={width}
      height={size}
      alt={resolvedAlt}
      unoptimized
      priority={priority}
      className="block h-auto w-auto select-none"
      style={{ height: size, width }}
    />
  );

  // The pill surface gets a small amount of padding so the JPEG edges
  // never touch a coloured parent. Padding scales lightly with logo
  // size to keep proportions consistent.
  const pillPadY = Math.max(4, Math.round(size * 0.12));
  const pillPadX = Math.max(8, Math.round(size * 0.22));
  const pillStyle = { paddingTop: pillPadY, paddingBottom: pillPadY, paddingLeft: pillPadX, paddingRight: pillPadX };

  const surfaceClass =
    surface === "white"
      ? "inline-flex items-center rounded-2xl bg-white shadow-sm shadow-brand-deep/10"
      : surface === "soft"
        ? "inline-flex items-center rounded-2xl bg-brand-mist/60"
        : "inline-flex items-center";

  const content =
    surface === "bare" ? (
      img
    ) : (
      <span className={surfaceClass} style={pillStyle}>
        {img}
      </span>
    );

  if (!asLink) {
    return <span className={className}>{content}</span>;
  }
  return (
    <Link href="/" aria-label={resolvedAlt} className={`inline-flex items-center ${className ?? ""}`}>
      {content}
    </Link>
  );
}
