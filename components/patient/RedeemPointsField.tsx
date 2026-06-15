"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getPointsBalance } from "@/services/pointsService";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import {
  MIN_REDEEM_POINTS,
  POINTS_PER_REDEEM_ILS,
  maxRedeemForSubtotal,
  pointsToCurrency,
} from "@/lib/pointsConstants";
import type { Locale } from "@/i18n/config";

// Cart-time redemption picker. Talks to the points service for the
// current balance, surfaces the platform's redemption rules, and emits
// the final point value via onChange so the cart can pass it to
// createOrder({ redeemPointsAmount }).
export default function RedeemPointsField({
  subtotal,
  value,
  onChange,
}: {
  subtotal: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const { appUser } = useAuth();
  const t = useTranslations("rewards");
  const locale = useLocale() as Locale;
  const [balance, setBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!appUser?.id || appUser.role !== "patient") return;
    let active = true;
    getPointsBalance(appUser.id).then((b) => {
      if (active) setBalance(b);
    });
    return () => {
      active = false;
    };
  }, [appUser?.id, appUser?.role]);

  if (!appUser || appUser.role !== "patient" || balance === null) {
    return null;
  }

  if (balance < MIN_REDEEM_POINTS) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        {t("notEnoughYet", {
          required: fmtNumber(MIN_REDEEM_POINTS, locale),
          have: fmtNumber(balance, locale),
        })}
      </div>
    );
  }

  const cap = Math.min(balance, maxRedeemForSubtotal(subtotal));
  const usable = Math.max(MIN_REDEEM_POINTS, Math.floor(cap / POINTS_PER_REDEEM_ILS) * POINTS_PER_REDEEM_ILS);
  const discount = pointsToCurrency(value);

  function update(next: number) {
    const clamped = Math.max(0, Math.min(usable, Math.floor(next / POINTS_PER_REDEEM_ILS) * POINTS_PER_REDEEM_ILS));
    onChange(clamped);
  }

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <Sparkles className="h-4 w-4" />
          {t("useRewards")}
        </span>
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => {
            setOpen(e.target.checked);
            if (!e.target.checked) onChange(0);
          }}
          className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
        />
      </label>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-amber-800">
            {t("balanceWithCap", {
              balance: fmtNumber(balance, locale),
              cap: fmtNumber(usable, locale),
            })}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={MIN_REDEEM_POINTS}
              max={usable}
              step={POINTS_PER_REDEEM_ILS}
              value={value || ""}
              onChange={(e) => update(Number(e.target.value) || 0)}
              placeholder={String(MIN_REDEEM_POINTS)}
              className="w-32 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => update(usable)}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-100"
            >
              {t("useMax")}
            </button>
          </div>
          {value > 0 && (
            <p className="text-xs font-bold text-amber-900">
              {t("appliedDiscount", { amount: fmtCurrency(discount, locale) })}
            </p>
          )}
          {value > 0 && value < MIN_REDEEM_POINTS && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {t("minBlocked", { min: fmtNumber(MIN_REDEEM_POINTS, locale) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Use the same icon imports React-side to keep tree-shaking happy.
export const RedeemPointsFieldIcons = { Sparkles, Loader2 };
