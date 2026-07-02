"use client";

import { use } from "react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { PageScaffold } from "../../../components/page-scaffold";
import { useInquiry, useInquiryAudit } from "../../../../lib/mother-concern-hooks";

type InquiryDetailPageProps = {
  params: Promise<{ inquiryId: string }>;
};

export default function InquiryDetailPage({ params }: InquiryDetailPageProps) {
  const { inquiryId } = use(params);
  const { data: inquiry, loading, error } = useInquiry(inquiryId);
  const { data: audit } = useInquiryAudit(inquiryId);

  if (error) {
    return (
      <PageScaffold title="Anfrage-Detail" description="PII-sanitized Header und Audit-Verlauf.">
        <ErrorState
          title="Anfrage konnte nicht geladen werden"
          description={error}
        />
      </PageScaffold>
    );
  }
  if (loading || !inquiry) {
    return (
      <PageScaffold title="Anfrage-Detail" description="PII-sanitized Header und Audit-Verlauf.">
        <p className="field-help">Lade…</p>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title={`Anfrage ${inquiry.id}`}
      description="PII-sanitized Header und Klassifizierungs-Audit."
    >
      <Card>
        <CardHeader
          action={<Badge variant="info">{inquiry.status}</Badge>}
        >
          <CardTitle>{inquiry.subject}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="field-group">
            <p>
              <strong>BU-Hinweis:</strong> {inquiry.businessUnitHint ?? "—"}
            </p>
            <p>
              <strong>Quelle:</strong> {inquiry.source}
            </p>
            <p>
              <strong>Gäste:</strong> {inquiry.guestCount ?? "—"}
            </p>
            <p>
              <strong>Wunschdatum:</strong>{" "}
              {inquiry.preferredDate
                ? new Date(inquiry.preferredDate).toLocaleString("de-DE")
                : "—"}
            </p>
            <p>
              <strong>Kontakt (PII-sanitized):</strong> {inquiry.contactNameInitials}
            </p>
            <div className="badge-row">
              {inquiry.hasRawMessage ? <Badge variant="neutral">Nachricht vorhanden</Badge> : null}
              {inquiry.hasContactEmail ? <Badge variant="neutral">E-Mail vorhanden</Badge> : null}
              {inquiry.hasContactPhone ? <Badge variant="neutral">Telefon vorhanden</Badge> : null}
              {inquiry.hasContactAddress ? <Badge variant="neutral">Adresse vorhanden</Badge> : null}
            </div>
            <p className="field-help">
              PII-Vollzugriff erfordert RLS-Gate und separates ADR-0062.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="dashboard-section-gap">
        <Card>
          <CardHeader
            action={<Badge variant="info">{audit?.length ?? 0} Einträge</Badge>}
          >
            <CardTitle>Klassifizierungs-Audit</CardTitle>
          </CardHeader>
          <CardContent>
            {audit && audit.length > 0 ? (
              <ul className="list-reset">
                {audit.map((entry) => (
                  <li key={entry.id} className="list-row">
                    <p>
                      <strong>{entry.businessUnitHint ?? "Kein Match"}</strong> ·{" "}
                      Confidence {entry.confidence}%
                    </p>
                    <p className="field-help">
                      {new Date(entry.createdAt).toLocaleString("de-DE")} · Rule:{" "}
                      {entry.matchedRuleId ?? "—"} · Keywords:{" "}
                      {entry.matchedKeywords.length > 0
                        ? entry.matchedKeywords.join(", ")
                        : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Keine Audit-Einträge"
                description="Es wurden noch keine Klassifizierungen für diese Anfrage durchgeführt."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </PageScaffold>
  );
}
