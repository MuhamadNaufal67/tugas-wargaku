const statusStyles = {
  diproses: "bg-blue-50 text-blue-800 ring-blue-200",
  ditolak: "bg-red-50 text-red-700 ring-red-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  selesai: "bg-emerald-50 text-emerald-800 ring-emerald-200",
} as const;

const dotStyles = {
  diproses: "bg-blue-500",
  ditolak: "bg-red-500",
  pending: "bg-amber-500",
  selesai: "bg-emerald-500",
} as const;

const statusLabels: Record<string, string> = {
  diproses: "Diproses",
  ditolak: "Ditolak",
  pending: "Menunggu",
  selesai: "Selesai",
};

function normalizeStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "diterima") {
    return "selesai";
  }

  return normalized;
}

export function getStatusText(status: string) {
  return statusLabels[normalizeStatus(status)] ?? status;
}

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = normalizeStatus(status) as keyof typeof statusStyles;
  const className =
    statusStyles[normalizedStatus] ?? "bg-slate-50 text-slate-700 ring-slate-200";
  const dotClassName = dotStyles[normalizedStatus] ?? "bg-slate-400";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {getStatusText(status)}
    </span>
  );
}
