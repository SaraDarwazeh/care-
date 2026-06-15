"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getPointsBalance, getPointsLedger } from "@/services/pointsService";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { pointsToCurrency } from "@/lib/pointsConstants";
import type { PointsLedgerEntry } from "@/lib/types";
import type { Locale } from "@/i18n/config";

// Rewards card for the patient profile page. Shows the live balance,
// what it's worth in real currency at the redemption rate, and a short
// ledger of recent earn/redeem activity.
export default function RewardsSection() {
  const { appUser } = useAuth();
  const t = useTranslations("rewards");
  const locale = useLocale() as Locale;
  // Keep load state keyed on the current user id so React resets when the
  // user changes without us touching state inside the effect body.
  const [state, setState] = useState<{
    key: string | null;
    balance: number | null;
    ledger: PointsLedgerEntry[];
    loading: boolean;
  }>({ key: null, balance: null, ledger: [], loading: true });

  useEffect(() => {
    if (!appUser?.id) return;
    const myKey = appUser.id;
    let active = true;
    Promise.all([getPointsBalance(myKey), getPointsLedger(myKey, 20)])
      .then(([b, l]) => {
        if (!active) return;
        setState({ key: myKey, balance: b, ledger: l, loading: false });
      })
      .catch((err) => {
        console.warn("[RewardsSection] load failed", err);
        if (active) setState({ key: myKey, balance: 0, ledger: [], loading: false });
      });
    return () => {
      active = false;
    };
  }, [appUser?.id]);

  const balance = state.key === appUser?.id ? state.balance : null;
  const ledger = state.key === appUser?.id ? state.ledger : [];
  const loading = state.key === appUser?.id ? state.loading : true;

  if (!appUser || appUser.role !== "patient") return null;

  const value = balance ?? 0;
  const worth = pointsToCurrency(value);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{t("sectionTitle")}</h3>
          <p className="text-xs text-slate-500">{t("sectionSubtitle")}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t("balanceLabel")}</p>
        <p className="mt-1 text-3xl font-extrabold text-amber-900" dir="ltr">{fmtNumber(value, locale)}</p>
        <p className="mt-1 text-xs text-amber-700">{t("worth", { amount: fmtCurrency(worth, locale) })}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t("recentActivity")}</p>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : ledger.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">{t("noActivity")}</p>
        ) : (
          <ul className="space-y-2">
            {ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">{t(`sources.${entry.source}`)}</p>
                  <p className="text-xs text-slate-500" dir="ltr">{fmtDate(entry.createdAt, locale)}</p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    entry.type === "earn" ? "text-emerald-700" : "text-rose-700"
                  }`}
                  dir="ltr"
                >
                  {entry.type === "earn" ? "+" : "−"}
                  {fmtNumber(entry.amount, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
