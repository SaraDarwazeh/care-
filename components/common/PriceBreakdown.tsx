"use client";

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
  if (!pricing) return <div className="text-sm text-slate-500">No pricing available</div>;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex justify-between text-sm text-slate-600"><span>Base</span><span>${pricing.base}</span></div>
      {pricing.addons && pricing.addons.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold text-slate-500">Add-ons</div>
          {pricing.addons.map((a) => (
            <div key={a.id} className="flex justify-between text-sm text-slate-600"><span>{a.name}</span><span>${a.price}</span></div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-sm font-bold text-slate-800"><span>Subtotal</span><span>${pricing.subtotal ?? ""}</span></div>
      <div className="flex justify-between text-xs text-slate-500"><span>Tax</span><span>${pricing.tax ?? ""}</span></div>
      <div className="mt-2 flex justify-between text-sm font-extrabold text-sky-700"><span>Total</span><span>${pricing.total ?? ""}</span></div>
    </div>
  );
}
