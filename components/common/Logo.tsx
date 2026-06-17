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
  /** Accessible alt text. Defaults to "Care+ home" when asLink, else "Care+". */
  alt?: string;
  /** Extra classes appended to the wrapper. */
  className?: string;
}

// Intrinsic aspect ratios of the supplied JPEGs. We render each asset
// at its natural ratio so we never stretch or squish the brand mark —
// the constraint "Do NOT reduce quality" extends to layout-level
// scaling. Sizes derived from the source files; updating an asset
// requires updating the ratio here.
const ASPECT: Record<"full" | "mark" | "wordmark", number> = {
  // logo-full.jpeg is ~810×290 → 2.79
  full: 2.79,
  // mark.jpeg is ~280×360 → 0.78
  mark: 0.78,
  // wordmark.jpeg is ~430×220 → 1.95
  wordmark: 1.95,
};

const SOURCE: Record<"full" | "mark" | "wordmark", string> = {
  full: BRAND_ASSETS.logoFull,
  mark: BRAND_ASSETS.mark,
  wordmark: BRAND_ASSETS.wordmark,
};

// Care+ logo lockup. Renders the supplied brand JPEGs as-is via
// next/image with `unoptimized` so the original bytes (and thus the
// quality, weight, and visual fidelity the brand owner approved)
// reach the DOM untouched. JPEGs have no transparency channel — so
// every Logo placement uses a neutral light surface (white pill,
// near-white card, or the page background).
export default function Logo({
  variant = "full",
  size = 36,
  asLink = false,
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
      priority
      className="block h-auto w-auto select-none"
      style={{ height: size, width }}
    />
  );

  if (!asLink) {
    return <span className={className}>{img}</span>;
  }
  return (
    <Link href="/" aria-label={resolvedAlt} className={`inline-flex items-center ${className ?? ""}`}>
      {img}
    </Link>
  );
}
