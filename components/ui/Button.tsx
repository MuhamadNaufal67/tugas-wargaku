import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning";

type CommonProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
};

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = CommonProps & {
  href: string;
};

const variantClassNames: Record<ButtonVariant, string> = {
  danger:
    "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300",
  ghost:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  primary:
    "bg-[var(--color-primary)] text-white shadow-[0_14px_30px_rgba(45,129,193,0.22)] hover:opacity-95",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
};

function getButtonClassName(variant: ButtonVariant, className?: string) {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${variantClassNames[variant]} ${
    className ?? ""
  }`.trim();
}

function ButtonInner({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </>
  );
}

export function Button({
  children,
  className,
  icon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClassName(variant, className)}
      {...props}
    >
      <ButtonInner icon={icon}>{children}</ButtonInner>
    </button>
  );
}

export function LinkButton({
  children,
  className,
  href,
  icon,
  variant = "primary",
}: LinkButtonProps) {
  return (
    <Link href={href} className={getButtonClassName(variant, className)}>
      <ButtonInner icon={icon}>{children}</ButtonInner>
    </Link>
  );
}
