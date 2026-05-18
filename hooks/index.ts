"use client";

import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/relativeTime";

export function useOutsideClick<T extends HTMLElement>(
  callback: () => void,
  enabled = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [callback, enabled]);

  return ref;
}

export function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        callback();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [callback, enabled]);
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

export function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > threshold);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return scrolled;
}

export function useRelativeTime(dateString: string | null, refreshMs = 60000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, refreshMs);

    return () => window.clearInterval(interval);
  }, [refreshMs]);

  return formatRelativeTime(dateString, now);
}
