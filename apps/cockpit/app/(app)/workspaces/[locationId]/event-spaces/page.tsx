"use client";

import { use, useEffect, useState } from "react";
import { useLocationContext } from "../../../../../lib/location-context";
import { apiFetch, readApiJson } from "../../../../../lib/backend/api-fetch";
import { createClient } from "../../../../../lib/supabase/client";
import { useAuth } from "../../../../providers/auth-provider";

type EventSpace = {
  id: string;
  name: string;
  slug: string;
  capacitySeated: number | null;
  capacityStanding: number | null;
  capacityIndoor: number | null;
  capacityOutdoor: number | null;
  hasOwnBar: boolean;
  hasRestrooms: boolean;
  supports: string[];
  isActive: boolean;
};

export default function EventSpacesPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = use(params);
  const { loading: ctxLoading } = useLocationContext();
  const { organizationId } = useAuth();
  const [spaces, setSpaces] = useState<EventSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading) return;
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error("Keine aktive Session.");
        return apiFetch(`/admin/location/locations/${locationId}/event-spaces`, {
          accessToken: token,
          organizationId,
          requireOrganization: true
        });
      })
      .then((response) => readApiJson<{ eventSpaces: EventSpace[] }>(response))
      .then(({ eventSpaces }) => setSpaces(eventSpaces ?? []))
      .catch(() => setError("Event-Räume konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [locationId, ctxLoading, organizationId]);

  if (loading) return <p>Lade Event-Räume…</p>;
  if (error) return <p className="error-state">{error}</p>;
  if (spaces.length === 0) return <p>Keine Event-Räume für diesen Standort konfiguriert.</p>;

  return (
    <main>
      <h1>Event-Räume</h1>
      <div className="grid-2">
        {spaces.map((space) => (
          <article className="card-ui" key={space.id}>
            <header className="card-ui-header">
              <h2 className="card-ui-title">{space.name}</h2>
              {space.supports.includes("CINEMA") && <span className="badge badge-info">Cinema</span>}
            </header>
            <table className="table-ui">
              <tbody>
                {space.capacitySeated != null && <tr><td>Sitzend</td><td>{space.capacitySeated}</td></tr>}
                {space.capacityStanding != null && <tr><td>Stehend</td><td>{space.capacityStanding}</td></tr>}
                {space.capacityIndoor != null && <tr><td>Innen</td><td>{space.capacityIndoor}</td></tr>}
                {space.capacityOutdoor != null && <tr><td>Außen</td><td>{space.capacityOutdoor}</td></tr>}
              </tbody>
            </table>
            <div className="role-badge-row">
              {space.supports.map((s) => <span key={s} className="badge badge-neutral">{s}</span>)}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
