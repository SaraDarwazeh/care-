import { Link } from "@/i18n/navigation";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface PatientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

const variantStyles: Record<NonNullable<PatientButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-emerald-600 text-white hover:bg-emerald-700",
  ghost: "bg-white text-brand-deep ring-1 ring-brand-soft/70 hover:bg-brand-soft/20",
};

const baseClass =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft";

export default function PatientButton({
  children,
  href,
  variant = "primary",
  loading,
  className,
  ...props
}: PatientButtonProps) {
  const classes = `${baseClass} ${variantStyles[variant]} ${className ?? ""}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading ? "Please wait..." : children}
    </button>
  );
}
