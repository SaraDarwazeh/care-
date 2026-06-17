"use client";

import { useLocale } from "next-intl";
import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";

// Booking docs persist the pricing breakdown as a structural-typed object
// (Booking.pricing in lib/types.ts). It overlaps with pricingService.PricingResult
// but isn't always sourced from there, so the prop type is a tolerant superset.
interface BreakdownShape {
  base: number;
  addons?: { id: string; name: string; price: number }[];
  transport?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
}

export default function PriceBreakdown({ pricing }: { pricing?: BreakdownShape | null }) {
  const locale = useLocale() as Locale;
  if (!pricing) return <div className="text-sm text-slate-500">No pricing available</div>;

  const money = (n: number | undefined) => (typeof n === "number" ? fmtCurrency(n, locale) : "");

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex justify-between text-sm text-slate-600"><span>Base</span><span>{money(pricing.base)}</span></div>
      {pricing.addons && pricing.addons.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold text-slate-500">Add-ons</div>
          {pricing.addons.map((a) => (
            <div key={a.id} className="flex justify-between text-sm text-slate-600"><span>{a.name}</span><span>{money(a.price)}</span></div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-sm font-bold text-slate-800"><span>Subtotal</span><span>{money(pricing.subtotal)}</span></div>
      {typeof pricing.tax === "number" && pricing.tax > 0 && (
        <div className="flex justify-between text-xs text-slate-500"><span>Tax</span><span>{money(pricing.tax)}</span></div>
      )}
      <div className="mt-2 flex justify-between text-sm font-extrabold text-brand-deep"><span>Total</span><span>{money(pricing.total)}</span></div>
    </div>
  );
}
