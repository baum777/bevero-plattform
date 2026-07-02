"use client";

import { useParams } from "next/navigation";
import { useLocationContext } from "../../../../../lib/location-context";
import {
  useEventSpaces,
  useReservationConnectors,
  useExternalSystemLinks,
  useExceptionRules
} from "../../../../../lib/motorworld-hooks";
import { EventSpaceCard } from "../../../../../components/bestand/EventSpaceCard";
import { ReservationConnectorList } from "../../../../../components/bestand/ReservationConnectorList";
import { OechsleBanner } from "../../../../../components/bestand/OechsleBanner";

export default function EventOpsPage() {
  const params = useParams();
  const locationId = typeof params?.locationId === "string" ? params.locationId : null;

  const { profile } = useLocationContext();
  const { eventSpaces, loading: spacesLoading } = useEventSpaces(locationId);
  const { connectors, loading: connectorsLoading } = useReservationConnectors(locationId);
  const { links } = useExternalSystemLinks(locationId);
  const { rules: oechsleRules } = useExceptionRules(locationId, { type: "OECHSLE_BUFFET_OVERRIDE" });

  const activeOechsleRules = oechsleRules.filter((r) => r.requiresConfirmation);

  return (
    <main>
      <header>
        <h1>Event-Space Board</h1>
        {profile && <span className="badge badge-info">{profile}</span>}
      </header>

      {activeOechsleRules.map((rule) => (
        <OechsleBanner key={rule.id} rule={rule} />
      ))}

      <section aria-labelledby="event-spaces-heading">
        <h2 id="event-spaces-heading">Event-Spaces</h2>
        {spacesLoading && <p>Lade Event-Spaces…</p>}
        {!spacesLoading && eventSpaces.length === 0 && (
          <p className="text-muted">Keine Event-Spaces konfiguriert.</p>
        )}
        <div className="event-space-grid">
          {eventSpaces.map((space) => (
            <EventSpaceCard key={space.id} space={space} />
          ))}
        </div>
      </section>

      <section aria-labelledby="connectors-heading">
        <h2 id="connectors-heading">Reservation-Connectors</h2>
        {connectorsLoading ? (
          <p>Lade Connectors…</p>
        ) : (
          <ReservationConnectorList connectors={connectors} />
        )}
      </section>

      {links.length > 0 && (
        <section aria-labelledby="links-heading">
          <h2 id="links-heading">Externe Systeme</h2>
          <ul role="list">
            {links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label ?? link.kind} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
