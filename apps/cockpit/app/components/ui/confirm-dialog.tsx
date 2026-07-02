"use client";

import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDangerDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="alertdialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "var(--z-modal)",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border-base)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--sp-6)",
          maxWidth: "400px",
          width: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "var(--sp-2)", fontSize: "1rem" }}>{title}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--sp-4)", fontSize: "0.875rem" }}>
          {description}
        </p>
        <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "flex-end" }}>
          <Button onClick={onCancel} variant="outline">
            {cancelLabel}
          </Button>
          <Button loading={loading} onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
