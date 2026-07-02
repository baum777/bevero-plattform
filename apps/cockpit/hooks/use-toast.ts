"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "ok" | "error" | "info";

export type ToastState = { kind: ToastKind; message: string };

const DEFAULT_AUTO_HIDE_MS = 4000;

/**
 * Centralised toast state. Replaces the three near-identical ad-hoc
 * implementations that previously lived in movements/items/bar-refill clients.
 *
 * Accepts either a full `{ kind, message }` object or a bare message string
 * (defaulting to the `ok` kind) so it is a drop-in for both prior shapes.
 */
export function useToast(autoHideMs: number = DEFAULT_AUTO_HIDE_MS) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    (next: ToastState | string, kind: ToastKind = "ok") => {
      const state: ToastState = typeof next === "string" ? { kind, message: next } : next;
      setToast(state);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), autoHideMs);
    },
    [autoHideMs]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { toast, showToast, dismiss };
}
