"use client";

import { use, useEffect, useState } from "react";
import { useLocationContext } from "../../../../../lib/location-context";
import { apiFetch, readApiJson } from "../../../../../lib/backend/api-fetch";
import { createClient } from "../../../../../lib/supabase/client";
import { useAuth } from "../../../../providers/auth-provider";

type Connector = { id: string; provider: string; externalUrl: string | null; isActive: boolean };
type ExternalLink = { id: string; kind: string; url: string; isActive: boolean };

export default function ConnectorsPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = use(params);
  const { loading: ctxLoading } = useLocationContext();
  const { organizationId } = useAuth();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading) return;
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error("Keine aktive Session.");
        return Promise.all([
          apiFetch(`/admin/location/locations/${locationId}/reservation-connectors`, {
            accessToken: token,
            organizationId,
            requireOrganization: true
          }).then((response) => readApiJson<{ connectors: Connector[] }>(response)),
          apiFetch(`/admin/location/locations/${locationId}/external-system-links`, {
            accessToken: token,
            organizationId,
            requireOrganization: true
          }).then((response) => readApiJson<{ links: ExternalLink[] }>(response))
        ]);
      })
      .then(([c, l]) => { setConnectors(c.connectors ?? []); setLinks(l.links ?? []); })
      .catch(() => setError("Connector-Daten konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [locationId, ctxLoading, organizationId]);

  if (loading) return <p>Lade Connectors…</p>;
  if (error) return <p className="error-state">{error}</p>;

  return (
    <main>
      <h1>Reservation-Connectors & Externe Systeme</h1>

      <section>
        <h2>Reservation-Connectors</h2>
        {connectors.length === 0 ? <p>Keine Connectors konfiguriert.</p> : (
          <ul>
            {connectors.map((rc) => (
              <li key={rc.id}>
                {rc.provider}
                {rc.externalUrl && (
                  <> — <a href={rc.externalUrl} target="_blank" rel="noopener noreferrer">Öffnen ↗</a></>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Externe Systeme</h2>
        {links.length === 0 ? <p>Keine externen Systeme konfiguriert.</p> : (
          <ul>
            {links.map((esl) => (
              <li key={esl.id}>
                {esl.kind} — <a href={esl.url} target="_blank" rel="noopener noreferrer">Öffnen ↗</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
