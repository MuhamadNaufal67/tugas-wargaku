import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning";

type ButtonSize = "md" | "sm";

type CommonProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  size?: ButtonSize;
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
  accent:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)]",
  danger:
    "border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50",
  ghost:
    "text-slate-700 hover:bg-slate-100",
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)]",
  secondary:
    "border border-[var(--color-line)] bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
};

const sizeClassNames: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 py-2.5 text-sm",
  sm: "min-h-10 px-3.5 py-2 text-sm",
};

export function getButtonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
  size: ButtonSize = "md",
) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClassNames[size]} ${variantClassNames[variant]} ${
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
  size,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClassName(variant, className, size)}
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
  size,
  variant = "primary",
}: LinkButtonProps) {
  return (
    <Link href={href} className={getButtonClassName(variant, className, size)}>
      <ButtonInner icon={icon}>{children}</ButtonInner>
    </Link>
  );
}
