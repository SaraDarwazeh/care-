// Care+ brand tokens — JS-side mirror of the CSS variables defined in
// globals.css and used by the `<Logo />` component, gradient builders,
// and anywhere Tailwind utilities can't reach (e.g. inline SVG fills,
// JS-driven chart colors).
//
// Asset files live in /public/brand/. The user constraint: do NOT
// redesign, alter, reduce quality, or damage transparency. We render
// them as-is via next/image with `unoptimized` to keep the original
// JPEG bytes intact end-to-end.

export const BRAND_COLORS = {
  // Deep teal — the wordmark colour. Use for primary headings on light
  // surfaces and the deepest fill on sidebars/footers.
  deep: "#1f6a72",
  deepHover: "#185760",
  // Mid teal — the canonical primary CTA tone. Readable on white.
  primary: "#2f8a8e",
  primaryHover: "#257072",
  // Light aqua — for soft accent backgrounds, badge tints, hover
  // surfaces. Pairs with deep teal text.
  soft: "#a7d6d8",
  // Pale slate-aqua — subtle dividers, raised surfaces, alternating
  // rows. Quiet but still recognisably brand.
  mist: "#cdd9d9",
  // Warm sand — secondary accent from the brand palette. Use sparingly
  // for highlights (rewards, featured content, secondary CTAs).
  sand: "#e5c68e",
  sandStrong: "#cba75e",
} as const;

// The five brand asset paths. Files in /public/brand/.
export const BRAND_ASSETS = {
  logoFull: "/brand/logo-full.jpeg",
  wordmark: "/brand/wordmark.jpeg",
  mark: "/brand/mark.jpeg",
} as const;
