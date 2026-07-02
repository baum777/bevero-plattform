"use client";

import type { ToastState } from "../../hooks/use-toast";

type ToastProps = {
  toast: ToastState | null;
};

/**
 * Shared toast surface. Renders nothing when `toast` is null.
 * Visual treatment is driven by the `.app-toast` styles in globals.css so that
 * every feature surfaces action feedback identically.
 */
export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div className={`app-toast app-toast-${toast.kind}`} role="alert" aria-live="assertive">
      {toast.message}
    </div>
  );
}
