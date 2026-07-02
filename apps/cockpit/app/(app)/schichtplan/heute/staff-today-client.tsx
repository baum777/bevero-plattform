// apps/cockpit/app/(app)/schichtplan/heute/staff-today-client.tsx
"use client";

import { useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import { Drawer } from "../../../components/ui/drawer";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";
import { useAuth } from "../../../providers/auth-provider";
import type { StaffTodayResponse, TaskInstance, TaskStatus, TodayShift, ShiftSession } from "../../../../lib/types/shift-planning";

function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    open: "Offen",
    done: "Erledigt",
    issue: "Mangel",
    skipped: "Übersprungen",
    verified: "Geprüft"
  };
  return map[status];
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type StaffTodayClientProps = {
  date: string;
  initialData: StaffTodayResponse | null;
  initialError: string | null;
  initialShifts: TodayShift[];
  shiftsError: string | null;
};

function time(iso: string | null): string { return iso ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "–"; }
function delta(value: number | null): string { return value === null ? "–" : `${value > 0 ? "+" : ""}${value} Min.`; }

export function StaffTodayClient({ date, initialData, initialError, initialShifts, shiftsError }: StaffTodayClientProps) {
  const { organizationId } = useAuth();
  const [tasks, setTasks] = useState<TaskInstance[]>(initialData?.tasks ?? []);
  const [shifts, setShifts] = useState<TodayShift[]>(initialShifts);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [issueDrawer, setIssueDrawer] = useState<{ taskId: string; note: string } | null>(null);
  const [startNotes, setStartNotes] = useState<Record<string, string>>({});

  const area = initialData?.assignedAreaLabel ?? null;
  const weekday = initialData?.weekday ?? "";

  async function markDone(taskId: string) {
    setLoadingId(taskId);
    setActionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Nicht angemeldet.");
      await apiFetch(`/shift-planning/tasks/${taskId}`, {
        method: "PATCH",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: { status: "done" }
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "done", completedAt: new Date().toISOString() } : t))
      );
    } catch (err) {
      setActionError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setLoadingId(null);
    }
  }

  async function startShift(assignmentId: string) {
    setLoadingId(assignmentId); setActionError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend/shift-planning/assignments/${assignmentId}/start`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientTimestamp: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin", note: startNotes[assignmentId] || undefined })
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? "Schicht konnte nicht gestartet werden."); }
      const session = await res.json() as ShiftSession;
      setShifts((current) => current.map((shift) => shift.assignmentId === assignmentId ? { ...shift, session } : shift));
    } catch (err) { setActionError(err instanceof Error ? err.message : "Unbekannter Fehler."); } finally { setLoadingId(null); }
  }

  async function endShift(assignmentId: string) {
    setLoadingId(assignmentId); setActionError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend/shift-planning/assignments/${assignmentId}/end`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}" });
      if (!res.ok) { const body = await res.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? "Schicht konnte nicht beendet werden."); }
      const session = await res.json() as ShiftSession;
      setShifts((current) => current.map((shift) => shift.assignmentId === assignmentId ? { ...shift, session } : shift));
    } catch (err) { setActionError(err instanceof Error ? err.message : "Unbekannter Fehler."); } finally { setLoadingId(null); }
  }

  function taskActionsEnabled(task: TaskInstance): boolean {
    if (!task.shiftAssignmentId) return true;
    return shifts.find((shift) => shift.assignmentId === task.shiftAssignmentId)?.session?.sessionStatus === "active";
  }

  async function submitIssue(taskId: string, note: string) {
    setLoadingId(taskId);
    setActionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Nicht angemeldet.");
      await apiFetch(`/shift-planning/tasks/${taskId}`, {
        method: "PATCH",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: { status: "issue", note }
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "issue", issueStatus: "open", issueNote: note } : t))
      );
      setIssueDrawer(null);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setLoadingId(null);
    }
  }

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "verified");
  const issueTasks = tasks.filter((t) => t.status === "issue");

  if (initialError) {
    return (
      <PageScaffold title="Heute" description={date}>
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (tasks.length === 0 && shifts.length === 0) {
    return (
      <PageScaffold title="Heute" description={`${weekday}, ${date}`}>
        <EmptyState
          title="Keine Aufgaben zugewiesen"
          description="Für heute wurde kein Schichtplan importiert oder du bist keinem Bereich zugewiesen."
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Heute"
      description={area ? `${weekday} · ${area}` : `${weekday}, ${date}`}
    >
      {actionError ? <InlineError message={actionError} /> : null}
      {shiftsError ? <InlineError message={shiftsError} /> : null}

      {shifts.map((shift) => {
        const session = shift.session;
        const isActive = session?.sessionStatus === "active";
        return (
          <Card key={shift.assignmentId}>
            <CardHeader action={<Badge variant={isActive ? "ok" : session?.sessionStatus === "missed" ? "critical" : "neutral"}>{isActive ? "Aktiv" : session?.sessionStatus === "completed" ? "Beendet" : "Nicht begonnen"}</Badge>}>
              <CardTitle>{shift.areaLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="card-meta">Geplant: {time(shift.plannedStartAt)}–{time(shift.plannedEndAt)}</p>
              {session?.actualStartedAt ? <p className="card-meta">Begonnen: {time(session.actualStartedAt)} · {delta(session.startDeltaMinutes)}</p> : null}
              {!session ? <textarea className="input-textarea" rows={2} value={startNotes[shift.assignmentId] ?? ""} onChange={(event) => setStartNotes((notes) => ({ ...notes, [shift.assignmentId]: event.target.value }))} placeholder="Grund bei verspätetem Start (ab +11 Min. erforderlich)" /> : null}
              {!session || session.sessionStatus === "scheduled" ? <Button loading={loadingId === shift.assignmentId} onClick={() => { void startShift(shift.assignmentId); }} variant="primary">Schicht beginnen</Button> : null}
              {isActive ? <Button loading={loadingId === shift.assignmentId} onClick={() => { void endShift(shift.assignmentId); }} variant="ghost">Schicht beenden</Button> : null}
            </CardContent>
          </Card>
        );
      })}

      {openTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Offen ({openTasks.length})</h2>
          {openTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader
                action={
                  <div className="card-actions">
                    <Button
                      loading={loadingId === task.id}
                      disabled={!taskActionsEnabled(task)}
                      onClick={() => { void markDone(task.id); }}
                      size="sm"
                      variant="primary"
                    >
                      Erledigt
                    </Button>
                    <Button
                      disabled={loadingId === task.id || !taskActionsEnabled(task)}
                      onClick={() => setIssueDrawer({ taskId: task.id, note: "" })}
                      size="sm"
                      variant="ghost"
                    >
                      Mangel
                    </Button>
                  </div>
                }
              >
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {issueTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Mängel ({issueTasks.length})</h2>
          {issueTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader action={<Badge variant="critical">Mangel</Badge>}>
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
              {task.issueNote ? (
                <CardContent>
                  <p className="card-note">{task.issueNote}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </section>
      )}

      {doneTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Erledigt ({doneTasks.length})</h2>
          {doneTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader action={<Badge variant="ok">{statusLabel(task.status)}</Badge>}>
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      <Drawer
        open={!!issueDrawer}
        title="Mangel melden"
        onClose={() => setIssueDrawer(null)}
      >
        <textarea
          className="input-textarea"
          onChange={(e) => setIssueDrawer((prev) => prev ? { ...prev, note: e.target.value } : null)}
          placeholder="Was ist das Problem? (optional)"
          rows={3}
          value={issueDrawer?.note ?? ""}
        />
        <div className="drawer-actions">
          <Button onClick={() => setIssueDrawer(null)} variant="ghost">
            Abbrechen
          </Button>
          <Button
            loading={loadingId === issueDrawer?.taskId}
            onClick={() => { if (issueDrawer) void submitIssue(issueDrawer.taskId, issueDrawer.note); }}
            variant="danger"
          >
            Mangel senden
          </Button>
        </div>
      </Drawer>
    </PageScaffold>
  );
}
