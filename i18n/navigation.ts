import { createNavigation } from "next-intl/navigation";
import { DEFAULT_LOCALE, LOCALES } from "./config";

// Locale-aware navigation primitives. Phase 1 migrates every
//   import Link from "next/link"
// to
//   import { Link } from "@/i18n/navigation"
// so bare-path Links (e.g. /services) auto-prefix with the active locale
// instead of relying on a middleware redirect hop on every click.
export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});
