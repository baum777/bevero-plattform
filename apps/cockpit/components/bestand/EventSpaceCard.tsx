"use client";

import type { EventSpaceItem } from "../../lib/motorworld-hooks";

const SUPPORT_LABELS: Record<string, string> = {
  PRIVATE_EVENT: "Private Veranstaltung",
  COMPANY_EVENT: "Firmen-Event",
  WEDDING: "Hochzeit",
  CONFERENCE: "Konferenz",
  PRODUCT_PRESENTATION: "Produktpräsentation",
  CINEMA: "Kino",
  DINNER_THEATER: "Dinner-Theater",
  WORKSHOP: "Workshop",
  SEMINAR: "Seminar",
  PRESENTATION_PITCH: "Pitch",
  TRAINING: "Training",
  EVENT_ADDON: "Event-Zusatz"
};

type EventSpaceCardProps = {
  space: EventSpaceItem;
};

export function EventSpaceCard({ space }: EventSpaceCardProps) {
  return (
    <article className="card-ui event-space-card">
      <header className="card-ui-header">
        <h3 className="card-ui-title">{space.name}</h3>
      </header>
      <dl className="capacity-table">
        {space.maxCapacity != null && (
          <>
            <dt>Max. Kapazität</dt>
            <dd>{space.maxCapacity} Personen</dd>
          </>
        )}
        {space.minCapacity != null && (
          <>
            <dt>Min. Kapazität</dt>
            <dd>{space.minCapacity} Personen</dd>
          </>
        )}
      </dl>
      {space.supports.length > 0 && (
        <div className="support-badges" aria-label="Nutzungsarten">
          {space.supports.map((s) => (
            <span key={s} className="badge badge-default">
              {SUPPORT_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
