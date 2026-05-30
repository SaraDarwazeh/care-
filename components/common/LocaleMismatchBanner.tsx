"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/config";

const DISMISS_COOKIE = "NEXT_LOCALE_BANNER_DISMISSED";

// Mismatch detection: shown once when the browser's preferred language
// is the other supported locale and the user hasn't already dismissed.
// Renders nothing on the server so we never ship the banner SSR (would
// require reading headers in the layout and complicates caching).
export default function LocaleMismatchBanner() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common.locale");
  const [shouldShow, setShouldShow] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readCookie(DISMISS_COOKIE)) return;

    const preferred = detectPreferred();
    if (preferred && preferred !== locale) {
      // Browser-only mount check (navigator + cookie); one-time flip is
      // intentional and can't be derived during render without hydration drift.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldShow(true);
    }
  }, [locale]);

  if (!shouldShow) return null;

  const other: Locale = locale === "en" ? "ar" : "en";

  function dismiss() {
    document.cookie = `${DISMISS_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setShouldShow(false);
  }

  function accept() {
    document.cookie = `NEXT_LOCALE=${other}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.cookie = `${DISMISS_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const stripped = stripLocalePrefix(pathname);
    startTransition(() => {
      router.replace(`/${other}${stripped}`);
    });
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-sky-50 px-4 py-2 text-sm text-sky-800">
      <span>{t("mismatchBanner")}</span>
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {t("mismatchAction")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-xs font-medium text-sky-700/80 hover:text-sky-900"
      >
        {t("mismatchDismiss")}
      </button>
    </div>
  );
}

function detectPreferred(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const raw of candidates) {
    const tag = raw.toLowerCase();
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function stripLocalePrefix(pathname: string): string {
  for (const l of LOCALES) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
  }
  return pathname;
}
