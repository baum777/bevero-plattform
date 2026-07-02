"use client";

type SyncStatus = "live" | "offline" | "error";

type SyncIndicatorProps = {
  status: SyncStatus;
  lastSyncedAt?: Date;
};

function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `vor ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes}m`;
  return `vor ${Math.round(minutes / 60)}h`;
}

export function SyncIndicator({ status, lastSyncedAt }: SyncIndicatorProps) {
  return (
    <span className={`sync-indicator sync-indicator--${status}`} aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      {status === "live" && lastSyncedAt ? `Live · ${timeAgo(lastSyncedAt)}` : null}
      {status === "offline" ? "Offline" : null}
      {status === "error" ? "Fehler" : null}
    </span>
  );
}
