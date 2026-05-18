import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[1.7rem] border border-white/80 bg-white/95 shadow-[var(--shadow-card)] ${className ?? ""}`.trim()}
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
  return <div className={`p-5 sm:p-6 ${className ?? ""}`.trim()}>{children}</div>;
}
