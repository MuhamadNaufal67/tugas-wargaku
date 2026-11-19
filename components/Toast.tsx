"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning";

type ToastProps = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  onDismiss: (id: number) => void;
};

const config = {
  success: {
    badge: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-600",
    progress: "bg-emerald-500",
    ring: "border-l-emerald-500",
    label: "Sukses",
  },
  error: {
    badge: "bg-rose-50 text-rose-700",
    border: "border-rose-100",
    iconBg: "bg-rose-100 text-rose-600",
    progress: "bg-rose-500",
    ring: "border-l-rose-500",
    label: "Gagal",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700",
    border: "border-amber-100",
    iconBg: "bg-amber-100 text-amber-700",
    progress: "bg-amber-500",
    ring: "border-l-amber-500",
    label: "Peringatan",
  },
} as const;

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 13 4 4L19 7" />
      </svg>
    );
  }

  if (type === "error") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M6 6 18 18" />
        <path d="M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
      <path d="M10.3 3.84 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.84a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function ToastItem({
  id,
  type,
  title,
  message,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const currentStyle = config[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(() => onDismiss(id), 250);
  }

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`relative w-full overflow-hidden rounded-lg border border-l-4 bg-white shadow-lg transition-all duration-200 ease-out ${currentStyle.border} ${currentStyle.ring} ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-2 scale-[0.98] opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${currentStyle.iconBg}`}
        >
          <ToastIcon type={type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="pt-1 text-sm font-semibold leading-5 text-slate-900">
              <span className="sr-only">{currentStyle.label}: </span>
              {title}
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
        </div>
      </div>

      <div className="h-0.5 w-full bg-slate-100">
        <div
          className={`h-full ${currentStyle.progress} animate-[shrink_4s_linear_forwards]`}
        />
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; type: ToastType; title: string; message: string }[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 sm:inset-x-auto sm:right-6 sm:top-20 sm:bottom-auto sm:w-full sm:max-w-[24rem]">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
