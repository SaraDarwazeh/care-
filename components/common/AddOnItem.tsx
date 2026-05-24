export default function AddOnItem({ id, name, price, checked, onChange }: { id: string; name: string; price: number; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{name} — ${price}</span>
    </label>
  );
}
