"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { ReviewTaskRow } from "../../../lib/backend/review-tasks";

type AlertsTableClientProps = {
  rows: ReviewTaskRow[];
};

type TaskAction = "dismiss" | "resolve" | "start-review";

function formatDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(parsed));
}

function severityVariant(value: string): "critical" | "neutral" | "warning" {
  if (value.toLowerCase().includes("high") || value.toLowerCase().includes("critical")) {
    return "critical";
  }
  if (value.toLowerCase().includes("medium")) {
    return "warning";
  }
  return "neutral";
}

function statusVariant(value: string): "critical" | "info" | "neutral" | "ok" | "warning" {
  if (value === "open") return "critical";
  if (value === "in_review") return "warning";
  if (value === "resolved") return "ok";
  if (value === "dismissed") return "neutral";
  return "info";
}

function applyStatus(status: string, action: TaskAction) {
  if (action === "start-review") return "in_review";
  if (action === "resolve") return "resolved";
  if (action === "dismiss") return "dismissed";
  return status;
}

export function AlertsTableClient({ rows: initialRows }: AlertsTableClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<TaskAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedTaskId) ?? null,
    [rows, selectedTaskId]
  );

  async function execute(taskId: string, action: TaskAction) {
    setActionLoading(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/alerts/tasks/${taskId}/${action}`, {
        method: "POST"
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Aktion fehlgeschlagen.");
      }

      setRows((current) =>
        current.map((row) =>
          row.id === taskId ? { ...row, status: applyStatus(row.status, action) } : row
        )
      );
      setActionMessage(
        action === "start-review"
          ? "Alert wurde bestätigt."
          : action === "resolve"
            ? "Alert wurde gelöst."
            : "Alert wurde verworfen."
      );
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table-ui">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Titel</th>
              <th>Typ</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Korrektur</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">{formatDate(row.createdAt)}</td>
                <td>
                  {row.title}
                  {row.description ? <div className="table-subline">{row.description}</div> : null}
                </td>
                <td className="mono">{row.type}</td>
                <td>
                  <Badge variant={severityVariant(row.severity)}>{row.severity}</Badge>
                </td>
                <td>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="mono">{row.correctionRequestId ?? "—"}</td>
                <td>
                  <Button onClick={() => setSelectedTaskId(row.id)} size="sm" variant="outline">
                    Öffnen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="drawer-backdrop" onClick={() => setSelectedTaskId(null)} role="presentation">
          <aside className="drawer-panel" onClick={(event) => event.stopPropagation()}>
            <header className="drawer-header">
              <h3 className="card-ui-title">Alert Details</h3>
              <Button onClick={() => setSelectedTaskId(null)} size="sm" variant="ghost">
                Schließen
              </Button>
            </header>
            <div className="stack-sm">
              <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
              <p className="mono">{selected.id}</p>
              <p>{selected.title}</p>
              <p className="card-ui-content">{selected.description ?? "Keine Beschreibung"}</p>
              <p className="card-ui-content">{`Typ: ${selected.type}`}</p>
              <p className="card-ui-content">{`Severity: ${selected.severity}`}</p>
              <p className="card-ui-content">{`Korrektur: ${selected.correctionRequestId ?? "—"}`}</p>
              <p className="card-ui-content">{`Erstellt: ${formatDate(selected.createdAt)}`}</p>
            </div>

            {actionMessage ? <p className="field-help field-help-ok">{actionMessage}</p> : null}
            {actionError ? <p className="field-help field-help-error">{actionError}</p> : null}

            <div className="drawer-actions">
              {selected.status === "open" ? (
                <Button
                  loading={actionLoading === "start-review"}
                  onClick={() => void execute(selected.id, "start-review")}
                  variant="outline"
                >
                  Acknowledge
                </Button>
              ) : null}
              {selected.status === "in_review" ? (
                <Button
                  loading={actionLoading === "resolve"}
                  onClick={() => void execute(selected.id, "resolve")}
                  variant="primary"
                >
                  Resolve
                </Button>
              ) : null}
              {(selected.status === "open" || selected.status === "in_review") ? (
                <Button
                  loading={actionLoading === "dismiss"}
                  onClick={() => void execute(selected.id, "dismiss")}
                  variant="ghost"
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
