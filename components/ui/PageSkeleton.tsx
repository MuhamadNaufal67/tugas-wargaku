type PageSkeletonProps = {
  /** Number of content blocks below the page title. */
  blocks?: number;
  /** Grid columns on large screens. */
  columns?: 1 | 2 | 3;
};

const columnClassNames = {
  1: "",
  2: "lg:grid-cols-2",
  3: "md:grid-cols-3",
} as const;

export function PageSkeleton({ blocks = 2, columns = 2 }: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Memuat halaman" className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-56 max-w-full rounded-md bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200/80" />
      </div>
      <div className={`grid gap-4 ${columnClassNames[columns]}`}>
        {Array.from({ length: blocks }).map((_, index) => (
          <div
            key={index}
            className="h-48 rounded-xl border border-[var(--color-line)] bg-white"
          />
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
