import { PageScaffold } from "../../components/page-scaffold";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { getDashboardSnapshot } from "../../../lib/supabase/queries/dashboard";
import { DashboardHistoryCharts } from "./dashboard-history-charts";
import { KitchenDashboardCards } from "./kitchen-dashboard-cards";
import { StockRiskCards } from "./stock-risk-cards";

function alertBadgeVariant(value: number | null): "critical" | "neutral" | "ok" | "warning" {
  if (value === null) return "neutral";
  if (value >= 5) return "critical";
  if (value > 0) return "warning";
  return "ok";
}

export default async function DashboardPage() {
  const { data, error, warnings } = await getDashboardSnapshot();

  if (error || !data) {
    return (
      <PageScaffold
        title="Dashboard"
        description="Operativer Überblick über kritische Bestände, Verbrauch und Alerts."
      >
        <ErrorState
          description={error ?? "Dashboarddaten sind nicht verfügbar."}
          title="Dashboard konnte nicht geladen werden"
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Dashboard"
      description="Operativer Überblick über kritische Bestände, Verbrauch und Alerts."
    >
      <div className="grid-2 dashboard-grid-3">
        <Card>
          <CardHeader action={<Badge variant="critical">Kritisch</Badge>}>
            <CardTitle>Kritische Artikel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.criticalItems}</p>
            <p>{`${data.warningItems} weitere im Warnbereich`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={<Badge variant={data.inactiveItems > 0 ? "warning" : "ok"}>Artikel</Badge>}>
            <CardTitle>Artikelbestand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.itemTotal}</p>
            <p>{`${data.inactiveItems} inaktiv`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={<Badge variant={data.storageActive < data.storageTotal ? "warning" : "ok"}>Lagerorte</Badge>}>
            <CardTitle>Standorte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.storageTotal}</p>
            <p>{`${data.storageActive} aktiv`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={<Badge variant={alertBadgeVariant(data.alertsOpen)}>{data.alertsOpen === null ? "N/A" : "Open"}</Badge>}>
            <CardTitle>Alerts offen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.alertsOpen ?? "—"}</p>
            <p>{data.alertsInReview === null ? "Nicht für Rolle verfügbar" : `${data.alertsInReview} in Review`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            action={
              <Badge
                variant={
                  data.openSuggestions === null
                    ? "neutral"
                    : data.openSuggestions > 0
                      ? "warning"
                      : "ok"
                }
              >
                {data.openSuggestions === null ? "N/A" : "Offen"}
              </Badge>
            }
          >
            <CardTitle>Automation-Vorschläge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.openSuggestions ?? "—"}</p>
            <p>
              <a className="state-link" href="/automation/suggestions">
                {data.openSuggestions === 0
                  ? "Keine offenen Vorschläge — Liste ansehen"
                  : data.openSuggestions === 1
                    ? "1 offener Vorschlag wartet auf Freigabe"
                    : `${data.openSuggestions} offene Vorschläge warten auf Freigabe`}
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            action={
              <Badge
                variant={
                  data.criticalNotes === null
                    ? "neutral"
                    : data.criticalNotes > 0
                      ? "critical"
                      : "ok"
                }
              >
                {data.criticalNotes === null ? "N/A" : "Notizen"}
              </Badge>
            }
          >
            <CardTitle>Kritische Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.criticalNotes ?? "—"}</p>
            <p>
              <a className="state-link" href="/notes?status=open&priority=critical">
                {data.criticalNotes === null
                  ? "Nicht verfügbar"
                  : data.criticalNotes === 0
                    ? "Keine kritischen Notizen offen"
                    : data.criticalNotes === 1
                      ? "1 kritische Notiz offen"
                      : `${data.criticalNotes} kritische Notizen offen`}
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={<Badge variant="ok">Resolved</Badge>}>
            <CardTitle>Alerts gelöst</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{data.alertsResolved ?? "—"}</p>
            <p>{data.workspaceTotal === null ? "Workspace nicht verfügbar" : `${data.workspaceTotal} Arbeitsbereiche`}</p>
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-section-gap">
        <Card>
          <CardHeader action={<Badge variant={data.criticalItems > 0 ? "critical" : "ok"}>Hotspots</Badge>}>
            <CardTitle>Kritische Bestands-Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            {data.hotSpots.length > 0 ? (
              <StockRiskCards items={data.hotSpots} />
            ) : (
              <EmptyState
                description="Aktuell keine kritischen Bestände in den geladenen Snapshots."
                title="Keine kritischen Positionen"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-section-gap">
        {data.history.length > 0 ? (
          <DashboardHistoryCharts points={data.history} />
        ) : (
          <EmptyState
            description="Für die letzten 30 Tage sind noch keine historischen Daten verfügbar."
            title="Keine Historie"
          />
        )}
      </div>

      <KitchenDashboardCards />

      {warnings.length > 0 ? (
        <div className="dashboard-section-gap">
          {warnings.map((warning) => (
            <p className="field-help" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {data.itemTotal === 0 ? (
        <div className="dashboard-section-gap">
          <EmptyState
            description="Noch keine Artikel vorhanden. Starte mit Artikelanlage und Wareneingang."
            title="Noch keine Basisdaten"
          />
        </div>
      ) : null}
    </PageScaffold>
  );
}
