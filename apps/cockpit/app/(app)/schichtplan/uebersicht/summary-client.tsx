"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../../lib/supabase/client";
import type { ShiftLeadSummaryResponse, AreaSummary } from "../../../../lib/types/shift-planning";

function progressPercent(area: AreaSummary): number {
  if (area.totalTasks === 0) return 0;
  return Math.round(((area.doneTasks + area.verifiedTasks) / area.totalTasks) * 100);
}

function areaStatusVariant(area: AreaSummary): "ok" | "warning" | "critical" | "neutral" {
  if (area.openIssues > 0) return "critical";
  if (area.openTasks === 0 && area.totalTasks > 0) return "ok";
  if (progressPercent(area) >= 50) return "warning";
  return "neutral";
}

type SummaryClientProps = {
  date: string;
  initialData: ShiftLeadSummaryResponse | null;
  initialError: string | null;
};

export function SummaryClient({ date, initialData, initialError }: SummaryClientProps) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const areas = initialData?.areas ?? [];
  const weekday = initialData?.weekday ?? "";

  if (initialError) {
    return (
      <PageScaffold title="Schicht-Übersicht" description={date}>
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (areas.length === 0) {
    return (
      <PageScaffold title="Schicht-Übersicht" description={`${weekday}, ${date}`}>
        <EmptyState
          title="Kein Schichtplan"
          description="Für dieses Datum wurde kein Schichtplan importiert und freigegeben."
          action={
            <button
              className="btn btn-primary btn-md"
              onClick={() => router.push("/schichtplan/import")}
              type="button"
            >
              Schichtplan importieren
            </button>
          }
        />
      </PageScaffold>
    );
  }

  async function leadAction(url: string, body: Record<string, string>) {
    setActionError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const res = await fetch(url, { method: url.includes("/sessions/") ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify(body) });
    if (!res.ok) {
      const response = await res.json().catch(() => ({})) as { message?: string };
      setActionError(response.message ?? "Aktion konnte nicht ausgeführt werden.");
      return;
    }
    router.refresh();
  }

  return (
    <PageScaffold title="Schicht-Übersicht" description={`${weekday}, ${date}`}>
      {actionError ? <InlineError message={actionError} /> : null}
      {areas.map((area) => {
        const pct = progressPercent(area);
        const variant = areaStatusVariant(area);
        return (
          <Card key={area.areaId}>
            <CardHeader
              action={<Badge variant={variant}>{pct}%</Badge>}
            >
              <CardTitle>{area.areaLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="metric-row">
                <div className="metric-item">
                  <dt>Gesamt</dt>
                  <dd>{area.totalTasks}</dd>
                </div>
                <div className="metric-item">
                  <dt>Offen</dt>
                  <dd>{area.openTasks}</dd>
                </div>
                <div className="metric-item">
                  <dt>Erledigt</dt>
                  <dd>{area.doneTasks + area.verifiedTasks}</dd>
                </div>
                {area.issueTasks > 0 && (
                  <div className="metric-item metric-item--critical">
                    <dt>Mängel</dt>
                    <dd>{area.issueTasks}</dd>
                  </div>
                )}
              </dl>
              {area.assignedUsers.length > 0 && (
                <p className="card-meta">{area.assignedUsers.join(", ")}</p>
              )}
              {area.assignments.map((assignment) => (
                <div key={assignment.assignmentId} className="card-meta">
                  <p>
                    {assignment.displayName ?? assignment.userId} · geplant {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(assignment.plannedStartAt))}
                    {assignment.session?.actualStartedAt ? ` · gestartet ${new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(assignment.session.actualStartedAt))} (${assignment.session.startDeltaMinutes !== null && assignment.session.startDeltaMinutes > 0 ? "+" : ""}${assignment.session.startDeltaMinutes ?? 0} Min.)` : " · nicht gestartet"}
                  </p>
                  {assignment.session ? <Button size="sm" variant="ghost" onClick={() => {
                    const actualStartedAt = window.prompt("Korrigierter Startzeitpunkt (ISO-8601):", assignment.session?.actualStartedAt ?? "");
                    const reason = window.prompt("Grund für die Korrektur:");
                    if (actualStartedAt && reason) void leadAction(`/api/backend/shift-planning/sessions/${assignment.session?.id ?? ""}/start`, { actualStartedAt, reason });
                  }}>Korrigieren</Button> : <Button size="sm" variant="ghost" onClick={() => {
                    const reason = window.prompt("Grund für nicht gestartete Schicht:");
                    if (reason) void leadAction(`/api/backend/shift-planning/assignments/${assignment.assignmentId}/mark-missed`, { reason });
                  }}>Nicht erschienen</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </PageScaffold>
  );
}
