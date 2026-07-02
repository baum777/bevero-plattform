"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { InlineError } from "../../components/ui/inline-error";
import { useWorkspace } from "../../providers/workspace-provider";
import type {
  KitchenDashboardKpis,
  KitchenDashboardResult
} from "../../../lib/supabase/types/kitchen-kpis";

function locationVariant(value: number): "ok" | "warning" | "critical" | "neutral" {
  if (value <= 0) return "neutral";
  if (value >= 5) return "critical";
  return "warning";
}

function progressVariant(value: number): "ok" | "warning" | "critical" | "neutral" {
  if (value <= 0) return "neutral";
  if (value >= 5) return "critical";
  return "warning";
}

function walkRouteLabel(progress: { completed: number; total: number } | null): string {
  if (!progress || progress.total === 0) return "Keine Route aktiv";
  return `${progress.completed} / ${progress.total} Stationen`;
}

export function KitchenDashboardCards() {
  const { groups, activeGroupId, activeGroupType } = useWorkspace();
  const [kpis, setKpis] = useState<KitchenDashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ??
    groups.find((group) => group.type === "kitchen_storage") ??
    null;
  const showKitchenBlock = activeGroupType === "kitchen_storage" && activeGroup !== null;

  useEffect(() => {
    if (!showKitchenBlock || !activeGroup) {
      setKpis(null);
      setError(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      const params = new URLSearchParams({ workspaceGroupId: activeGroup.id });
      const response = await fetch(`/api/kitchen/dashboard?${params.toString()}`, {
        credentials: "include"
      });
      if (!mounted) return;
      const result = (await response.json().catch(() => ({
        access: "forbidden",
        data: null,
        error: "Kitchen-KPIs konnten nicht geladen werden."
      }))) as KitchenDashboardResult;
      if (result.access !== "allowed") {
        setKpis(null);
        setError(result.error ?? `Zugriff verweigert (${result.access})`);
        setLoading(false);
        return;
      }
      setKpis(result.data);
      setError(result.error);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [showKitchenBlock, activeGroup]);

  if (!showKitchenBlock || !activeGroup) {
    return null;
  }

  return (
    <div className="dashboard-section-gap" data-testid="kitchen-dashboard-cards">
      <Card>
        <CardHeader
          action={
            <Badge variant="warning">
              Küche · {activeGroup.name}
            </Badge>
          }
        >
          <CardTitle>Kitchen Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <InlineError message={error} /> : null}
          {loading && !kpis ? <p className="field-help">Lade Kitchen-KPIs…</p> : null}
          {kpis ? (
            <div className="grid-2 dashboard-grid-3">
              <article className="surface card">
                <p className="field-help">Zählbare Lagerorte</p>
                <p className="mono metric-value">{kpis.countableLocations}</p>
                <p>
                  <a className="state-link" href="/storage">
                    {kpis.transferPoints > 0
                      ? `${kpis.transferPoints} Umschlagpunkte`
                      : "Lagerort-Details"}
                  </a>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Offene Korrekturen</p>
                <p className="mono metric-value">{kpis.openCorrectionRequests}</p>
                <p>
                  <a className="state-link" href="/freigaben">
                    {kpis.openCorrectionRequests === 0
                      ? "Keine offenen Freigaben"
                      : kpis.openCorrectionRequests === 1
                        ? "1 Walk-Route-Varianz wartet"
                        : `${kpis.openCorrectionRequests} Walk-Route-Varianzen warten`}
                  </a>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Negative Bestände</p>
                <p className="mono metric-value">
                  {kpis.locationsWithNegativeStock}
                </p>
                <p>
                  <Badge variant={locationVariant(kpis.locationsWithNegativeStock)}>
                    {kpis.locationsWithNegativeStock === 0
                      ? "ok"
                      : kpis.locationsWithNegativeStock === 1
                        ? "1 Standort prüfen"
                        : `${kpis.locationsWithNegativeStock} Standorte prüfen`}
                  </Badge>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Walk-Route</p>
                <p className="mono metric-value">
                  {kpis.walkRouteProgress
                    ? `${kpis.walkRouteProgress.completed}/${kpis.walkRouteProgress.total}`
                    : "—"}
                </p>
                <p>
                  <a className="state-link" href="/kitchen/walk-route">
                    {walkRouteLabel(kpis.walkRouteProgress)}
                  </a>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Entnahmen 24h</p>
                <p className="mono metric-value">{kpis.recentWithdrawals24h}</p>
                <p>
                  <a className="state-link" href="/movements?type=item_removed">
                    Bewegungen ansehen
                  </a>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Umlagerungen 24h</p>
                <p className="mono metric-value">{kpis.recentTransfers24h}</p>
                <p>
                  <a className="state-link" href="/movements?type=transfer">
                    Transfer-Historie
                  </a>
                </p>
              </article>

              <article className="surface card">
                <p className="field-help">Kritische Standorte</p>
                <p className="mono metric-value">
                  {kpis.locationsWithCriticalStock}
                </p>
                <p>
                  <Badge variant={progressVariant(kpis.locationsWithCriticalStock)}>
                    {kpis.locationsWithCriticalStock === 0
                      ? "keine Hotspots"
                      : "Hotspot-Karte öffnen"}
                  </Badge>
                </p>
              </article>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
