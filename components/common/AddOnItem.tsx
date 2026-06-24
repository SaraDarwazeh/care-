import { fmtCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/config";

// `id` is part of the public prop contract (callers pass an addon id) — kept
// for consumer ergonomics even though the renderer doesn't read it directly.
export default function AddOnItem({ name, price, locale, checked, onChange }: { id: string; name: string; price: number; locale: Locale; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{name} — {fmtCurrency(price, locale)}</span>
    </label>
  );
}
