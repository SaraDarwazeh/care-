import { ReactNode } from "react";

export default function PatientCard({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-2xl border border-brand-mist bg-white p-5 shadow-[0_10px_40px_-28px_rgba(14,116,144,0.45)] ${className || ""}`}>
      {title ? <h3 className="text-base font-semibold text-slate-800">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
    </article>
  );
}
