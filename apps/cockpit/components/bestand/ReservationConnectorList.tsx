"use client";

import type { ConnectorItem } from "../../lib/motorworld-hooks";

const PROVIDER_LABELS: Record<string, string> = {
  GASTRONAUT: "Gastronaut",
  GASTRONOVI: "Gastronovi",
  PHONE: "Telefon",
  WALK_IN: "Walk-In",
  EVENT_INQUIRY: "Event-Anfrage",
  EVIIVO: "eviivo",
  OTHER: "Sonstiges"
};

type ReservationConnectorListProps = {
  connectors: ConnectorItem[];
};

export function ReservationConnectorList({ connectors }: ReservationConnectorListProps) {
  if (connectors.length === 0) {
    return <p className="text-muted">Kein Reservation-Connector konfiguriert.</p>;
  }

  return (
    <ul className="connector-list" role="list">
      {connectors.map((connector) => (
        <li key={connector.id} role="listitem" className="connector-item">
          <span className={`badge ${connector.isActive ? "badge-success" : "badge-default"}`}>
            {connector.isActive ? "Aktiv" : "Inaktiv"}
          </span>
          <span className="connector-name">
            {PROVIDER_LABELS[connector.provider] ?? connector.provider}
          </span>
          {connector.externalUrl && (
            <a
              href={connector.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="connector-link"
              aria-label={`${PROVIDER_LABELS[connector.provider] ?? connector.provider} öffnen`}
            >
              Öffnen ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
