"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/config";
import { useAuth } from "@/hooks/useAuth";
import { updateUserLanguage } from "@/services/userService";

interface Props {
  variant?: "pill" | "menu";
}

// Visible language toggle. Two locales → no dropdown, just a pill that
// swaps to the other language. Writes the cookie so future visits
// remember the choice; also writes to the user profile when signed in
// so the choice follows them across devices.
export default function LocaleSwitcher({ variant = "pill" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations("common.locale");
  const [pending, startTransition] = useTransition();
  const { appUser } = useAuth();

  const other: Locale = locale === "en" ? "ar" : "en";

  function switchLocale() {
    const stripped = stripLocalePrefix(pathname);
    const nextPath = `/${other}${stripped}`;
    // 1-year cookie so the choice persists across browsers / sessions.
    document.cookie = `NEXT_LOCALE=${other}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.replace(nextPath);
    });
    // Best-effort profile write — failure is silent because the cookie
    // already covers the next request on this device.
    if (appUser) {
      updateUserLanguage(appUser.id, other).catch(() => {});
    }
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={switchLocale}
        disabled={pending}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        <span>{t("current")}</span>
        <span className="text-xs font-bold text-sky-600">→ {t("switchTo")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      aria-label={`Switch language to ${other === "ar" ? "Arabic" : "English"}`}
      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
    >
      {t("switchTo")}
    </button>
  );
}

function stripLocalePrefix(pathname: string): string {
  for (const l of LOCALES) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
  }
  return pathname;
}
