"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getPointsBalance } from "@/services/pointsService";
import { fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

// Small navbar pill showing the current loyalty balance. Reads the
// authoritative aggregate from Firestore on mount + when the auth user
// changes. We don't pre-render based on appUser.pointsBalance because
// the AuthProvider may not have picked up the latest balance yet
// (earn events from booking/order completions fire elsewhere).
export default function PointsBalancePill() {
  const { appUser } = useAuth();
  const t = useTranslations("rewards");
  const locale = useLocale() as Locale;
  // Keep balance keyed on the active user id so we don't need to reset
  // state inside the effect body when the user signs out / changes.
  const [state, setState] = useState<{ key: string | null; balance: number | null }>({
    key: null,
    balance: null,
  });

  useEffect(() => {
    if (!appUser?.id || appUser.role !== "patient") return;
    const myKey = appUser.id;
    let active = true;
    getPointsBalance(myKey)
      .then((b) => {
        if (active) setState({ key: myKey, balance: b });
      })
      .catch((err) => {
        console.warn("[PointsBalancePill] failed to load balance", err);
        if (active) setState({ key: myKey, balance: 0 });
      });
    return () => {
      active = false;
    };
  }, [appUser?.id, appUser?.role]);

  const balance = state.key === appUser?.id ? state.balance : null;

  if (!appUser || appUser.role !== "patient") return null;

  const value = balance ?? 0;
  return (
    <Link
      href="/patient/profile"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
      title={t("pillTooltip")}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span dir="ltr">{fmtNumber(value, locale)}</span>
      <span className="hidden sm:inline">{t("pts")}</span>
    </Link>
  );
}
