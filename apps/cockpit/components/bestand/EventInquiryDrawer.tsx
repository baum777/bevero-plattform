"use client";

import type { EventInquiryHeader } from "../../lib/cube-hooks";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Neu",
  NEEDS_REVIEW: "Prüfung erforderlich",
  OFFER_DRAFT: "Angebot in Bearbeitung",
  OFFER_SENT: "Angebot versendet",
  CONFIRMED: "Bestätigt",
  CANCELLED: "Storniert"
};

type EventInquiryDrawerProps = {
  inquiry: EventInquiryHeader | null;
  onClose: () => void;
};

export function EventInquiryDrawer({ inquiry, onClose }: EventInquiryDrawerProps) {
  if (!inquiry) return null;

  return (
    <aside
      className="drawer"
      role="complementary"
      aria-label="Anfragen-Detail"
      aria-modal="true"
    >
      <header className="drawer-header">
        <h2>Anfrage-Detail</h2>
        <button type="button" onClick={onClose} aria-label="Schließen">×</button>
      </header>
      <div className="drawer-body">
        <dl>
          <dt>Thema</dt>
          <dd>{inquiry.subject}</dd>

          {inquiry.guestCount != null && (
            <>
              <dt>Gäste</dt>
              <dd>{inquiry.guestCount}</dd>
            </>
          )}

          {inquiry.preferredDate && (
            <>
              <dt>Wunschdatum</dt>
              <dd>{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(inquiry.preferredDate))}</dd>
            </>
          )}

          <dt>Status</dt>
          <dd>{STATUS_LABELS[inquiry.status] ?? inquiry.status}</dd>
        </dl>
        {/* PII-Sanitization: rawMessage, contactEmail, contactPhone werden NICHT angezeigt. */}
        <p className="text-muted" style={{ fontSize: "0.875rem" }}>
          Kontaktdaten werden aus Datenschutzgründen nicht angezeigt.
        </p>
      </div>
    </aside>
  );
}
