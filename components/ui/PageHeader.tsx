import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

export function PageHeader({
  actions,
  icon,
  lead,
  title,
}: {
  actions?: ReactNode;
  icon: IconName;
  lead: ReactNode;
  title: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-[var(--color-primary-soft)] px-5 py-7 sm:px-8 sm:py-9">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-12 hidden h-48 w-48 rounded-full bg-[var(--color-sky)]/35 sm:block"
      />
      <div
        aria-hidden="true"
        className="absolute right-10 top-1/2 hidden h-20 w-20 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm sm:flex"
      >
        <Icon name={icon} className="h-9 w-9" strokeWidth={1.75} />
      </div>
      <div className="relative max-w-2xl sm:pr-32">
        <h1 className="page-title">{title}</h1>
        <div className="page-lead">{lead}</div>
        {actions ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
