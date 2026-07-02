// apps/cockpit/app/(app)/schichtplan/maengel/maengel-client.tsx
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
import type { IssueDto, IssuesResponse, IssueResolveStatus } from "../../../../lib/types/shift-planning";

function statusBadge(status: string): { label: string; variant: "ok" | "warning" | "critical" | "neutral" } {
  switch (status) {
    case "open":
      return { label: "Offen", variant: "critical" };
    case "resolved":
      return { label: "Gelöst", variant: "ok" };
    case "accepted":
      return { label: "Akzeptiert", variant: "neutral" };
    default:
      return { label: status, variant: "neutral" };
  }
}

function severityLabel(severity: string): string {
  const map: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };
  return map[severity] ?? severity;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type ResolveDraft = { issue: IssueDto; status: IssueResolveStatus; notes: string };

type MaengelClientProps = {
  date: string;
  initialData: IssuesResponse | null;
  initialError: string | null;
};

export function MaengelClient({ date, initialData, initialError }: MaengelClientProps) {
  const { organizationId } = useAuth();
  const [issues, setIssues] = useState<IssueDto[]>(initialData?.issues ?? []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResolveDraft | null>(null);

  const openCount = issues.filter((i) => i.status === "open").length;

  async function submitResolve(d: ResolveDraft) {
    if (d.notes.trim().length === 0) {
      setActionError("Bitte eine Notiz zur Lösung angeben.");
      return;
    }
    setLoadingId(d.issue.id);
    setActionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Nicht angemeldet.");
      await apiFetch(`/shift-planning/issues/${d.issue.id}`, {
        method: "PATCH",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: { status: d.status, resolutionNotes: d.notes.trim() }
      });
      setIssues((prev) =>
        prev.map((i) =>
          i.id === d.issue.id
            ? { ...i, status: d.status, resolutionNotes: d.notes.trim(), resolvedAt: new Date().toISOString() }
            : i
        )
      );
      setDraft(null);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setLoadingId(null);
    }
  }

  if (initialError) {
    return (
      <PageScaffold title="Mängel" description={date}>
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (issues.length === 0) {
    return (
      <PageScaffold title="Mängel" description={date}>
        <EmptyState title="Keine Mängel" description="Für diesen Tag wurden keine Mängel gemeldet." />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title="Mängel" description={`${date} · ${openCount} offen`}>
      {actionError ? <InlineError message={actionError} /> : null}

      {issues.map((issue) => {
        const badge = statusBadge(issue.status);
        return (
          <Card key={issue.id}>
            <CardHeader action={<Badge variant={badge.variant}>{badge.label}</Badge>}>
              <CardTitle>{issue.taskTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="card-meta">
                {issue.areaLabel} · Schweregrad {severityLabel(issue.severity)}
              </p>
              <p className="card-meta">
                Gemeldet von {issue.reportedByName ?? "—"} · {formatTime(issue.reportedAt)}
              </p>
              {issue.description ? <p className="card-note">{issue.description}</p> : null}
              {issue.resolutionNotes ? (
                <p className="card-note">
                  Lösung: {issue.resolutionNotes}
                  {issue.resolvedByName ? ` (${issue.resolvedByName})` : ""}
                </p>
              ) : null}
              {issue.status === "open" ? (
                <div className="card-actions">
                  <Button
                    loading={loadingId === issue.id}
                    onClick={() => setDraft({ issue, status: "resolved", notes: "" })}
                    size="sm"
                    variant="primary"
                  >
                    Als gelöst markieren
                  </Button>
                  <Button
                    disabled={loadingId === issue.id}
                    onClick={() => setDraft({ issue, status: "accepted", notes: "" })}
                    size="sm"
                    variant="outline"
                  >
                    Akzeptieren
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <Drawer
        open={!!draft}
        title={draft?.status === "accepted" ? "Mangel akzeptieren" : "Mangel als gelöst markieren"}
        onClose={() => setDraft(null)}
      >
        <p className="card-meta">{draft?.issue.taskTitle}</p>
        <textarea
          className="input-textarea"
          onChange={(e) => setDraft((prev) => (prev ? { ...prev, notes: e.target.value } : null))}
          placeholder="Lösung / Begründung (erforderlich)"
          rows={3}
          value={draft?.notes ?? ""}
        />
        <div className="drawer-actions">
          <Button onClick={() => setDraft(null)} variant="ghost">
            Abbrechen
          </Button>
          <Button
            loading={loadingId === draft?.issue.id}
            onClick={() => {
              if (draft) void submitResolve(draft);
            }}
            variant="primary"
          >
            Bestätigen
          </Button>
        </div>
      </Drawer>
    </PageScaffold>
  );
}
