"use client";

import type { ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="drawer-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <strong>{title}</strong>
          <button
            aria-label="Schließen"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
