export * from "@/components/ui/Button";
export * from "@/components/ui/Card";
export * from "@/components/ui/EmptyState";
export * from "@/components/ui/StatusBadge";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`.trim()}
    />
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-slate-200/80 ${className}`.trim()} />;
}
