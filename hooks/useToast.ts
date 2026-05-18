"use client";

import { useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "warning";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    nextToastIdRef.current += 1;
    const id = nextToastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismiss };
}
