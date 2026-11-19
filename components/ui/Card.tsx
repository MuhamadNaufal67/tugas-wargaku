import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-white ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-6 ${className ?? ""}`.trim()}>{children}</div>;
}
