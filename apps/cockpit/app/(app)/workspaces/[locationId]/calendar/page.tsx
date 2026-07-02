"use client";

import { use, useEffect, useState } from "react";
import { ExceptionRuleBanner } from "../../../../../components/bestand/ExceptionRuleBanner";
import { useLocationContext } from "../../../../../lib/location-context";
import { apiFetch, readApiJson } from "../../../../../lib/backend/api-fetch";
import { createClient } from "../../../../../lib/supabase/client";
import { useAuth } from "../../../../providers/auth-provider";

type ExceptionRule = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  requiresConfirmation: boolean;
  source: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function ExceptionCalendarPage({
  params,
  searchParams
}: {
  params: Promise<{ locationId: string }>;
  searchParams?: Promise<{ type?: string }>;
}) {
  const { locationId } = use(params);
  const resolvedSearch = searchParams ? use(searchParams) : undefined;
  const { loading: ctxLoading } = useLocationContext();
  const { organizationId } = useAuth();
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading) return;
    const dateFrom = new Date().toISOString().slice(0, 10);
    const dateTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const typeParam = resolvedSearch?.type ? `&type=${resolvedSearch.type}` : "";
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error("Keine aktive Session.");
        return apiFetch(`/admin/location/locations/${locationId}/exception-rules?dateFrom=${dateFrom}&dateTo=${dateTo}${typeParam}`, {
          accessToken: token,
          organizationId,
          requireOrganization: true
        });
      })
      .then((response) => readApiJson<{ exceptionRules: ExceptionRule[] }>(response))
      .then(({ exceptionRules }) => setRules(exceptionRules ?? []))
      .catch(() => setError("Ausnahme-Kalender konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [locationId, ctxLoading, resolvedSearch?.type, organizationId]);

  if (loading) return <p>Lade Ausnahme-Kalender…</p>;
  if (error) return <p className="error-state">{error}</p>;

  const confirmationRequired = rules.filter((r) => r.requiresConfirmation);

  return (
    <main>
      <h1>Ausnahme-Kalender (90 Tage)</h1>

      {confirmationRequired.map((rule) => (
        <ExceptionRuleBanner
          key={rule.id}
          title={rule.title}
          type={rule.type}
          requiresConfirmation={rule.requiresConfirmation}
        />
      ))}

      {rules.length === 0 ? (
        <p>Keine Ausnahme-Regeln im gewählten Zeitraum.</p>
      ) : (
        <div className="table-wrap">
          <table className="table-ui">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Titel</th>
                <th>Von</th>
                <th>Bis</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} data-rule-type={rule.type}>
                  <td>{rule.type}</td>
                  <td>{rule.title}</td>
                  <td>{formatDate(rule.startsAt)}</td>
                  <td>{formatDate(rule.endsAt)}</td>
                  <td>{rule.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
