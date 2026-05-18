const statusStyles = {
  diproses: "border-blue-200 bg-blue-100 text-blue-700",
  ditolak: "border-red-200 bg-red-100 text-red-700",
  pending: "border-amber-200 bg-amber-100 text-amber-700",
  selesai: "border-emerald-200 bg-emerald-100 text-emerald-700",
} as const;

function normalizeStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "diterima") {
    return "selesai";
  }

  return normalized;
}

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = normalizeStatus(status) as keyof typeof statusStyles;
  const className =
    statusStyles[normalizedStatus] ??
    "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold capitalize shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${className}`}
    >
      {status}
    </span>
  );
}
