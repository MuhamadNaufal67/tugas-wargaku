import { Icon } from "@/components/ui/Icon";

const steps = ["Menunggu", "Diproses", "Selesai"] as const;

function getProgress(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "selesai" || normalized === "diterima") return { index: 2, rejected: false };
  if (normalized === "diproses") return { index: 1, rejected: false };
  if (normalized === "ditolak") return { index: 1, rejected: true };
  return { index: 0, rejected: false };
}

/**
 * Pelacak progres pengajuan: Menunggu → Diproses → Selesai.
 * Pengajuan yang ditolak berhenti di langkah kedua dengan tanda merah.
 */
export function StatusTracker({
  status,
  tone = "light",
}: {
  status: string;
  tone?: "light" | "dark";
}) {
  const { index, rejected } = getProgress(status);
  const isDark = tone === "dark";

  return (
    <ol className="flex items-start" aria-label={`Progres: ${rejected ? "Ditolak" : steps[index]}`}>
      {steps.map((step, stepIndex) => {
        const isDone = stepIndex < index || (stepIndex === index && index === 2);
        const isCurrent = stepIndex === index && index !== 2;
        const isRejectedStep = rejected && stepIndex === index;
        const label = isRejectedStep ? "Ditolak" : step;

        const circleClassName = isRejectedStep
          ? "bg-red-500 text-white"
          : isDone
            ? "bg-emerald-500 text-white"
            : isCurrent
              ? isDark
                ? "bg-white text-[var(--color-primary)] ring-4 ring-white/25"
                : "bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/15"
              : isDark
                ? "bg-white/15 text-white/60"
                : "bg-slate-100 text-slate-400";

        const lineDone = stepIndex < index;

        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center">
            {stepIndex > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${
                  lineDone || (stepIndex === index && !rejected)
                    ? isDark
                      ? "bg-white/70"
                      : "bg-emerald-400"
                    : isDark
                      ? "bg-white/20"
                      : "bg-slate-200"
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-bold ${circleClassName}`}
            >
              {isRejectedStep ? (
                <Icon name="x" className="h-3.5 w-3.5" strokeWidth={3} />
              ) : isDone ? (
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                stepIndex + 1
              )}
            </span>
            <span
              className={`mt-1.5 text-[0.7rem] font-semibold ${
                isRejectedStep
                  ? isDark
                    ? "text-red-200"
                    : "text-red-600"
                  : isCurrent || isDone
                    ? isDark
                      ? "text-white"
                      : "text-slate-800"
                    : isDark
                      ? "text-white/55"
                      : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
