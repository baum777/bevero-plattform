"use client";

import { Badge } from "../../components/ui/badge";
import { BusinessUnitCard, BUSINESS_UNIT_LABELS } from "../../components/bestand/BusinessUnitCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { LocationComparisonTable } from "../../components/bestand/LocationComparisonTable";
import { OrganizationKpiStrip, type KpiTile } from "../../components/bestand/OrganizationKpiStrip";
import { PageScaffold } from "../../components/page-scaffold";
import { SignatureAssetMap } from "../../components/bestand/SignatureAssetMap";
import {
  useBusinessUnits,
  useOrganizationOverview
} from "../../../lib/mother-concern-hooks";
import type { BusinessUnitNameValue } from "../../../lib/mother-concern-hooks";

const BU_ORDER: BusinessUnitNameValue[] = [
  "CORPORATE_EVENTS",
  "PRIVATE_EVENTS",
  "RESTAURANTS",
  "BOOK_THE_CONCEPT",
  "LOCATIONS"
];

export default function MotherConcernPage() {
  const { data: overview, loading: loadingOverview, error: overviewError } =
    useOrganizationOverview();
  const { data: businessUnits, loading: loadingBUs, error: busError } = useBusinessUnits();

  if (overviewError) {
    return (
      <PageScaffold
        title="Konzernübersicht"
        description="Konzernweite Sicht auf alle Standorte, BUs, Konzepte und Anfragen."
      >
        <ErrorState
          title="Übersicht konnte nicht geladen werden"
          description={overviewError}
        />
      </PageScaffold>
    );
  }
  if (loadingOverview && !overview) {
    return (
      <PageScaffold
        title="Konzernübersicht"
        description="Konzernweite Sicht auf alle Standorte, BUs, Konzepte und Anfragen."
      >
        <p className="field-help">Lade Übersicht…</p>
      </PageScaffold>
    );
  }
  if (!overview) {
    return (
      <PageScaffold
        title="Konzernübersicht"
        description="Konzernweite Sicht auf alle Standorte, BUs, Konzepte und Anfragen."
      >
        <EmptyState
          title="Keine Organisation"
          description="Es wurde keine aktive Organisation gefunden."
        />
      </PageScaffold>
    );
  }

  const kpiTiles: KpiTile[] = [
    {
      label: "Anfragen gesamt",
      value: overview.inquiryStats.total,
      badge: { text: "Aktiv", variant: "info" },
      href: "/inquiries"
    },
    {
      label: "Anfragen letzte 7 Tage",
      value: overview.inquiryStats.last7Days,
      badge: { text: "Trend", variant: overview.inquiryStats.last7Days > 0 ? "warning" : "ok" }
    },
    {
      label: "Kritische Standorte",
      value: overview.criticalStockLocations.length,
      badge: {
        text: overview.criticalStockLocations.length > 0 ? "Achtung" : "OK",
        variant: overview.criticalStockLocations.length > 0 ? "critical" : "ok"
      }
    },
    {
      label: "Aktive Ausnahmeregeln",
      value: overview.activeExceptionRules.length,
      badge: {
        text: overview.activeExceptionRules.length > 0 ? "Offen" : "OK",
        variant: overview.activeExceptionRules.length > 0 ? "warning" : "ok"
      }
    },
    {
      label: "Kommende Events",
      value: overview.upcomingEvents.length,
      badge: { text: "30 Tage", variant: "info" }
    }
  ];

  const signatureEntries = overview.locationComparison
    .filter((l) => l.signatureAssetCount > 0)
    .map((l) => ({
      locationId: l.locationId,
      locationName: l.locationName,
      brandId: l.brandId,
      assets: ["Beispiel-Asset"] // Signature-Asset-Names werden in ADR-0057+ v2 angereichert
    }));

  return (
    <PageScaffold
      title="Konzernübersicht"
      description={`Konzernweite Übersicht · ${overview.organizationName}`}
    >
      <OrganizationKpiStrip tiles={kpiTiles} />

      <section className="dashboard-section-gap">
        <h2 className="card-ui-title">Business Units</h2>
        {busError ? (
          <ErrorState title="BUs konnten nicht geladen werden" description={busError} />
        ) : null}
        <div className="grid-2 dashboard-grid-3">
          {BU_ORDER.map((bu) => (
            <BusinessUnitCard
              key={bu}
              name={bu}
              inquiryCount={overview.inquiryStats.byBusinessUnit[bu] ?? 0}
              topConcepts={[]}
              topLocations={[]}
            />
          ))}
        </div>
        {loadingBUs ? <p className="field-help">Lade BU-Details…</p> : null}
        {businessUnits && businessUnits.length > 0 ? (
          <p className="field-help">
            {businessUnits.length} BU-Konfigurationen geladen ·{" "}
            {BUSINESS_UNIT_LABELS_RENDERED(businessUnits.map((b) => b.name))}
          </p>
        ) : null}
      </section>

      <section className="dashboard-section-gap">
        <Card>
          <CardHeader
            action={<Badge variant="info">Sortierbar · Filterbar</Badge>}
          >
            <CardTitle>Standort-Vergleich</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationComparisonTable rows={overview.locationComparison} />
          </CardContent>
        </Card>
      </section>

      <section className="dashboard-section-gap">
        <Card>
          <CardHeader
            action={<Badge variant="info">{signatureEntries.length} Standorte</Badge>}
          >
            <CardTitle>Signature-Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureAssetMap entries={signatureEntries} />
          </CardContent>
        </Card>
      </section>

      <section className="dashboard-section-gap">
        <Card>
          <CardHeader
            action={<Badge variant="info">{overview.upcomingEvents.length} Events</Badge>}
          >
            <CardTitle>Kommende Events (30 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.upcomingEvents.length > 0 ? (
              <ul className="list-reset">
                {overview.upcomingEvents.map((ev) => (
                  <li key={ev.id} className="list-row">
                    <strong>{ev.subject}</strong>
                    <p className="field-help">
                      {ev.businessUnitHint ?? "Keine BU"} ·{" "}
                      {ev.preferredDate
                        ? new Date(ev.preferredDate).toLocaleDateString("de-DE")
                        : "kein Datum"}{" "}
                      · {ev.contactNameInitials}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Keine kommenden Events"
                description="Aktuell sind keine Anfragen mit Wunschdatum in den nächsten 30 Tagen erfasst."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="dashboard-section-gap">
        <Card>
          <CardHeader
            action={<Badge variant="warning">{overview.criticalStockLocations.length}</Badge>}
          >
            <CardTitle>Engpassübersicht</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.criticalStockLocations.length > 0 ? (
              <ul className="list-reset">
                {overview.criticalStockLocations.map((loc) => (
                  <li key={loc.locationId} className="list-row">
                    <strong>{loc.locationName}</strong> · {loc.criticalStockAlerts} aktive
                    Ausnahmen
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Keine Engpässe"
                description="Aktuell sind keine kritischen Bestände aggregiert."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="dashboard-section-gap">
        <p className="field-help">
          Letzte Aktualisierung:{" "}
          {new Date(overview.generatedAt).toLocaleString("de-DE")} · Cache 5 min
        </p>
      </section>
    </PageScaffold>
  );
}

function BUSINESS_UNIT_LABELS_RENDERED(names: string[]): string {
  return names.map((n) => BUSINESS_UNIT_LABELS[n as BusinessUnitNameValue] ?? n).join(", ");
}
