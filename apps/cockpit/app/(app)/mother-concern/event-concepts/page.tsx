"use client";

import { useState } from "react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { PageScaffold } from "../../../components/page-scaffold";
import {
  useCompatibleLocations,
  useEventConcepts
} from "../../../../lib/mother-concern-hooks";

export default function EventConceptsPage() {
  const { data: concepts, loading, error } = useEventConcepts();
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const { data: compatible, loading: loadingCompat } = useCompatibleLocations(
    selectedConceptId
  );

  return (
    <PageScaffold
      title="Event-Konzepte"
      description="Konzernweite Event-Formate und ihre kompatiblen Standorte."
    >
      {error ? (
        <ErrorState
          title="Konzepte konnten nicht geladen werden"
          description={error}
        />
      ) : null}
      {loading ? <p className="field-help">Lade Konzepte…</p> : null}
      {concepts && concepts.length === 0 ? (
        <EmptyState
          title="Keine Konzepte"
          description="Aktuell sind keine Event-Konzepte in der Organisation hinterlegt."
        />
      ) : null}

      {concepts && concepts.length > 0 ? (
        <div className="grid-2 dashboard-grid-3">
          {concepts.map((concept) => (
            <Card
              key={concept.id}
              data-testid={`event-concept-${concept.id}`}
            >
              <CardHeader
                action={
                  <Badge variant={selectedConceptId === concept.id ? "info" : "neutral"}>
                    {selectedConceptId === concept.id ? "Ausgewählt" : "Details"}
                  </Badge>
                }
              >
                <CardTitle>{concept.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {concept.description ? (
                  <p>{concept.description}</p>
                ) : null}
                {concept.themeTags.length > 0 ? (
                  <p className="field-help">
                    Tags: {concept.themeTags.join(", ")}
                  </p>
                ) : null}
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    setSelectedConceptId(
                      selectedConceptId === concept.id ? null : concept.id
                    )
                  }
                  type="button"
                >
                  {selectedConceptId === concept.id
                    ? "Auswahl aufheben"
                    : "Kompatible Standorte anzeigen"}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {selectedConceptId ? (
        <section className="dashboard-section-gap">
          <h2 className="card-ui-title">
            Kompatible Standorte für {concepts?.find((c) => c.id === selectedConceptId)?.name}
          </h2>
          {loadingCompat ? <p className="field-help">Lade…</p> : null}
          {compatible && compatible.length === 0 ? (
            <EmptyState
              title="Keine kompatiblen Standorte"
              description="Aktuell sind keine Standorte mit diesem Konzept verknüpft."
            />
          ) : null}
          {compatible && compatible.length > 0 ? (
            <ul className="list-reset">
              {compatible.map((row) => (
                <li key={row.compatibilityId} className="list-row">
                  <strong>{row.location.name}</strong>
                  <p className="field-help">
                    {row.location.isExternal ? "Partner-Location" : "Eigener Standort"}
                    {row.compatibilityScore !== null
                      ? ` · Score ${row.compatibilityScore}`
                      : ""}
                  </p>
                  {row.notes ? <p className="field-help">{row.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </PageScaffold>
  );
}
