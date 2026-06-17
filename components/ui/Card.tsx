import { ReactNode } from "react";

export default function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-mist bg-white/90 p-5 shadow-sm">
      {title ? <h3 className="text-base font-semibold text-slate-800">{title}</h3> : null}
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
