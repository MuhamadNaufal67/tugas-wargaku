import type { ReactNode } from "react";

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-5 py-10 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm">
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15V6a2 2 0 0 0-2-2H8l-5 5v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
            <path d="M3 9h5V4" />
          </svg>
        )}
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
