"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useEventInquiries } from "../../../../../../lib/cube-hooks";
import { EventInquiryDrawer } from "../../../../../../components/bestand/EventInquiryDrawer";
import type { EventInquiryHeader } from "../../../../../../lib/cube-hooks";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Neu",
  NEEDS_REVIEW: "Prüfung erforderlich",
  OFFER_DRAFT: "Angebot in Bearbeitung",
  OFFER_SENT: "Angebot versendet",
  CONFIRMED: "Bestätigt",
  CANCELLED: "Storniert"
};

export default function EventOpsInquiriesPage() {
  const params = useParams();
  const locationId = typeof params?.locationId === "string" ? params.locationId : null;

  const { inquiries, loading, error } = useEventInquiries(locationId ?? null);
  const [selected, setSelected] = useState<EventInquiryHeader | null>(null);

  return (
    <main>
      <h1>Event-Anfragen</h1>

      {loading && <p>Lade Anfragen…</p>}
      {error && <p className="text-error">Fehler: {error}</p>}

      {!loading && inquiries.length === 0 && (
        <p className="text-muted">Keine Anfragen vorhanden.</p>
      )}

      {inquiries.length > 0 && (
        <table className="inquiry-table" aria-label="Event-Anfragen">
          <thead>
            <tr>
              <th scope="col">Thema</th>
              <th scope="col">Gäste</th>
              <th scope="col">Wunschdatum</th>
              <th scope="col">Status</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => (
              <tr key={inq.id}>
                <td>{inq.subject}</td>
                <td>{inq.guestCount ?? "—"}</td>
                <td>
                  {inq.preferredDate
                    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(
                        new Date(inq.preferredDate)
                      )
                    : "—"}
                </td>
                <td>
                  <span className="badge badge-default">
                    {STATUS_LABELS[inq.status] ?? inq.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSelected(inq)}
                    aria-label={`Detail für ${inq.subject}`}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EventInquiryDrawer inquiry={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
