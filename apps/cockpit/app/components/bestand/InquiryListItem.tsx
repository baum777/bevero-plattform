"use client";

import { Badge } from "../ui/badge";
import type { InquiryListItem } from "../../../lib/mother-concern-hooks";

type InquiryListItemCardProps = {
  inquiry: InquiryListItem;
  onSelect?: (id: string) => void;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Neu",
  NEEDS_CLASSIFICATION: "Zu klassifizieren",
  NEEDS_HUMAN_REVIEW: "Manuelle Prüfung",
  OFFER_DRAFT: "Angebot in Vorbereitung",
  APPROVED: "Freigegeben",
  SENT: "Versendet",
  CONFIRMED: "Bestätigt",
  LOST: "Verloren",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert"
};

const BU_LABELS: Record<string, string> = {
  CORPORATE_EVENTS: "Corporate",
  PRIVATE_EVENTS: "Private",
  RESTAURANTS: "Restaurant",
  BOOK_THE_CONCEPT: "Konzept",
  LOCATIONS: "Standort"
};

const SOURCE_LABELS: Record<string, string> = {
  RAUSCHENBERGER_WEBSITE: "Group Website",
  CUBE_WEBSITE: "Premium Site Website",
  MOTORWORLD_INN_WEBSITE: "Site Website",
  MANUAL_ENTRY: "Manuell",
  EMAIL_IMPORT: "E-Mail"
};

function statusVariant(status: string): "warning" | "info" | "ok" | "critical" | "neutral" {
  switch (status) {
    case "NEW":
    case "NEEDS_CLASSIFICATION":
    case "NEEDS_HUMAN_REVIEW":
      return "warning";
    case "OFFER_DRAFT":
    case "APPROVED":
      return "info";
    case "SENT":
    case "CONFIRMED":
      return "ok";
    case "LOST":
    case "REJECTED":
    case "ARCHIVED":
      return "neutral";
    default:
      return "critical";
  }
}

export function InquiryListItemCard({ inquiry, onSelect }: InquiryListItemCardProps) {
  return (
    <button
      type="button"
      className="card-ui list-row-button"
      data-testid={`inquiry-row-${inquiry.id}`}
      onClick={onSelect ? () => onSelect(inquiry.id) : undefined}
    >
      <div className="card-ui-header">
        <div>
          <strong>{inquiry.subject}</strong>
          <p className="field-help">
            {inquiry.contactNameInitials} ·{" "}
            {inquiry.preferredDate
              ? new Date(inquiry.preferredDate).toLocaleDateString("de-DE")
              : "kein Datum"}
            {inquiry.guestCount ? ` · ${inquiry.guestCount} Gäste` : ""}
          </p>
        </div>
        <div>
          <Badge variant={statusVariant(inquiry.status)}>
            {STATUS_LABELS[inquiry.status] ?? inquiry.status}
          </Badge>
        </div>
      </div>
      <div className="card-ui-content">
        <p className="field-help">
          {BU_LABELS[inquiry.businessUnitHint ?? ""] ?? "Keine BU"} ·{" "}
          {SOURCE_LABELS[inquiry.source] ?? inquiry.source}
        </p>
        <div className="badge-row">
          {inquiry.hasRawMessage ? <Badge variant="neutral">Nachricht vorhanden</Badge> : null}
          {inquiry.hasContactEmail ? <Badge variant="neutral">E-Mail vorhanden</Badge> : null}
          {inquiry.hasContactPhone ? <Badge variant="neutral">Telefon vorhanden</Badge> : null}
          {inquiry.hasContactAddress ? <Badge variant="neutral">Adresse vorhanden</Badge> : null}
          {!inquiry.hasRawMessage &&
          !inquiry.hasContactEmail &&
          !inquiry.hasContactPhone &&
          !inquiry.hasContactAddress ? (
            <Badge variant="neutral">Keine PII-Felder</Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
