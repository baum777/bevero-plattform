"use client";

import { useState } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  useClassifyInquiry,
  useInquiry,
  useInquiryAudit,
  type InquiryListItem
} from "../../../lib/mother-concern-hooks";

type InquiryDetailDrawerProps = {
  inquiry: InquiryListItem | null;
  onClose: () => void;
};

export function InquiryDetailDrawer({ inquiry, onClose }: InquiryDetailDrawerProps) {
  const inquiryId = inquiry?.id ?? null;
  const { data: detail } = useInquiry(inquiryId);
  const { data: audit } = useInquiryAudit(inquiryId);
  const { classify, loading: classifying, error: classifyError } = useClassifyInquiry();
  const [classificationResult, setClassificationResult] = useState<{
    matchedRuleId: string | null;
    businessUnitHint: string | null;
    confidence: number;
    matchedKeywords: string[];
  } | null>(null);

  if (!inquiry) {
    return null;
  }

  const handleClassify = async () => {
    const result = await classify({
      rawMessage: "Reklassifizierung über Cockpit-Drawer",
      inquiryId: inquiry.id,
      commit: false
    });
    if (result) setClassificationResult(result);
  };

  return (
    <aside
      className="drawer"
      data-testid={`inquiry-drawer-${inquiry.id}`}
      aria-label={`Inquiry ${inquiry.id}`}
    >
      <header className="drawer-header">
        <h3 className="drawer-title">{inquiry.subject}</h3>
        <Button variant="ghost" onClick={onClose}>
          Schließen
        </Button>
      </header>
      <section className="drawer-content">
        <div className="field-group">
          <h4 className="card-ui-title">Kontakt</h4>
          <p>{inquiry.contactNameInitials}</p>
          <div className="badge-row">
            {inquiry.hasRawMessage ? <Badge variant="neutral">Nachricht vorhanden</Badge> : null}
            {inquiry.hasContactEmail ? <Badge variant="neutral">E-Mail vorhanden</Badge> : null}
            {inquiry.hasContactPhone ? <Badge variant="neutral">Telefon vorhanden</Badge> : null}
            {inquiry.hasContactAddress ? <Badge variant="neutral">Adresse vorhanden</Badge> : null}
          </div>
          <p className="field-help">
            PII-Felder werden nicht angezeigt. Vollzugriff über separaten Endpoint (ADR-0062).
          </p>
        </div>

        {detail ? (
          <div className="field-group">
            <h4 className="card-ui-title">Buchungs-Header</h4>
            <p>Status: {inquiry.status}</p>
            <p>Quelle: {inquiry.source}</p>
            <p>BU-Hinweis: {detail.businessUnitHint ?? "—"}</p>
            <p>
              Wunschdatum:{" "}
              {detail.preferredDate
                ? new Date(detail.preferredDate).toLocaleString("de-DE")
                : "—"}
            </p>
            <p>
              Gäste: {detail.guestCount ?? "—"} · Routing-Rule:{" "}
              {detail.routingRuleId ?? "—"}
            </p>
          </div>
        ) : null}

        <div className="field-group">
          <h4 className="card-ui-title">Klassifizierung</h4>
          <Button onClick={handleClassify} disabled={classifying} variant="primary">
            {classifying ? "Klassifiziere…" : "Klassifizieren"}
          </Button>
          {classifyError ? (
            <p className="error-text">Fehler: {classifyError}</p>
          ) : null}
          {classificationResult ? (
            <div className="card-ui-content" data-testid="classification-result">
              <p>
                <strong>BU-Vorschlag:</strong>{" "}
                {classificationResult.businessUnitHint ?? "Kein Match"}
              </p>
              <p>
                <strong>Confidence:</strong> {classificationResult.confidence}%
              </p>
              <p>
                <strong>Keywords:</strong>{" "}
                {classificationResult.matchedKeywords.length > 0
                  ? classificationResult.matchedKeywords.join(", ")
                  : "—"}
              </p>
              <p className="field-help">
                Hinweis: Vorschlag ist deterministisch, kein LLM. Manager entscheidet
                manuell (ADR-0021 §3).
              </p>
            </div>
          ) : null}
        </div>

        <div className="field-group">
          <h4 className="card-ui-title">Audit-Verlauf</h4>
          {audit && audit.length > 0 ? (
            <ul className="list-reset">
              {audit.map((entry) => (
                <li key={entry.id} className="list-row">
                  <p>
                    <strong>{entry.businessUnitHint ?? "Kein Match"}</strong> ·{" "}
                    Confidence {entry.confidence}%
                  </p>
                  <p className="field-help">
                    {new Date(entry.createdAt).toLocaleString("de-DE")} · Keywords:{" "}
                    {entry.matchedKeywords.length > 0
                      ? entry.matchedKeywords.join(", ")
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-help">Keine Klassifizierungs-Einträge bisher.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
