// apps/cockpit/app/(app)/schichtplan/abschluss/abschluss-client.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { InlineError } from "../../../components/ui/inline-error";
import { useWorkspace } from "../../../providers/workspace-provider";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch, readApiJson } from "../../../../lib/backend/api-fetch";
import { useAuth } from "../../../providers/auth-provider";
import type { SignoffStatusResponse } from "../../../../lib/types/shift-planning";

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type AbschlussClientProps = {
  date: string;
};

export function AbschlussClient({ date }: AbschlussClientProps) {
  const { activeGroupId, loading: workspaceLoading } = useWorkspace();
  const { organizationId } = useAuth();
  const [status, setStatus] = useState<SignoffStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Nicht angemeldet.");
      const params = new URLSearchParams({ date });
      if (activeGroupId) params.set("workspaceGroupId", activeGroupId);
      const res = await apiFetch(`/shift-planning/signoff?${params.toString()}`, {
        accessToken: token,
        organizationId,
        requireOrganization: true,
        throwOnError: false
      });
      if (!res.ok) {
        const body = (await readApiJson(res).catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Status nicht erreichbar.");
      }
      setStatus((await readApiJson(res)) as SignoffStatusResponse);
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setLoading(false);
    }
  }, [date, activeGroupId]);

  useEffect(() => {
    if (!workspaceLoading) void loadStatus();
  }, [workspaceLoading, loadStatus]);

  async function handleSignoff() {
    if (!activeGroupId) {
      setActionError("Kein aktiver Arbeitsbereich ausgewählt.");
      return;
    }
    setSubmitting(true);
      setActionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Nicht angemeldet.");
      await apiFetch("/shift-planning/signoff", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: {
          date,
          workspaceGroupId: activeGroupId,
          department: "kitchen",
          summary: summary.trim() || undefined
        }
      });
      await loadStatus();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || workspaceLoading) {
    return <PageScaffold title="Schichtabschluss" description={date}><p className="card-meta">Lädt…</p></PageScaffold>;
  }

  if (loadError) {
    return (
      <PageScaffold title="Schichtabschluss" description={date}>
        <InlineError message={loadError} onRetry={() => void loadStatus()} />
      </PageScaffold>
    );
  }

  if (!status) {
    return <PageScaffold title="Schichtabschluss" description={date}><p className="card-meta">Keine Daten.</p></PageScaffold>;
  }

  const existing = status.existingSignoff;

  return (
    <PageScaffold title="Schichtabschluss" description={`${status.weekday}, ${status.date}`}>
      {actionError ? <InlineError message={actionError} /> : null}

      <Card>
        <CardHeader
          action={
            existing ? (
              <Badge variant="ok">Abgeschlossen</Badge>
            ) : status.canSignOff ? (
              <Badge variant="ok">Bereit</Badge>
            ) : (
              <Badge variant="warning">Offen</Badge>
            )
          }
        >
          <CardTitle>Tagesstatus</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="metric-row">
            <div className="metric-item">
              <dt>Aufgaben</dt>
              <dd>{status.totalTaskCount}</dd>
            </div>
            <div className="metric-item">
              <dt>Erledigt</dt>
              <dd>{status.completedTaskCount}</dd>
            </div>
            <div className="metric-item">
              <dt>Offen</dt>
              <dd>{status.blockingTaskCount}</dd>
            </div>
            <div className={`metric-item${status.openIssueCount > 0 ? " metric-item--critical" : ""}`}>
              <dt>Offene Mängel</dt>
              <dd>{status.openIssueCount}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {existing ? (
        <Card>
          <CardHeader>
            <CardTitle>Abschluss-Nachweis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="card-meta">
              Abgeschlossen von {existing.signedByName ?? "—"} am{" "}
              {new Date(existing.signedAt).toLocaleString("de-DE")}
            </p>
            <p className="card-meta">
              {existing.completedTaskCount}/{existing.totalTaskCount} Aufgaben · {existing.openIssueCount} Mängel
            </p>
            {existing.summary ? <p className="card-note">{existing.summary}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Abschluss</CardTitle>
          </CardHeader>
          <CardContent>
            {!status.canSignOff ? (
              <ul className="blocking-list">
                {status.blockingReasons.map((reason) => (
                  <li key={reason} className="card-note">• {reason}</li>
                ))}
              </ul>
            ) : (
              <p className="card-meta">Alle Aufgaben erledigt und keine offenen Mängel. Bereit für den Abschluss.</p>
            )}
            <textarea
              className="input-textarea"
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Zusammenfassung (optional)"
              rows={2}
              value={summary}
            />
            <p className="heute-trust-copy">Der Abschluss wird mit Name, Zeitpunkt und Kennzahlen protokolliert.</p>
            <Button
              disabled={!status.canSignOff || submitting}
              loading={submitting}
              onClick={() => void handleSignoff()}
              size="lg"
              variant="primary"
            >
              Schicht abschließen
            </Button>
          </CardContent>
        </Card>
      )}
    </PageScaffold>
  );
}
