import { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  iconClassName?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  iconClassName = "text-slate-300",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
        <Icon className={`h-8 w-8 ${iconClassName}`} />
      </div>
      <h3 className="text-lg font-bold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
