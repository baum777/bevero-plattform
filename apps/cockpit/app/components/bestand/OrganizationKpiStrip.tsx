"use client";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type KpiTile = {
  label: string;
  value: number | string;
  badge?: {
    text: string;
    variant: "ok" | "warning" | "critical" | "info" | "neutral";
  };
  href?: string;
};

type OrganizationKpiStripProps = {
  tiles: KpiTile[];
};

export function OrganizationKpiStrip({ tiles }: OrganizationKpiStripProps) {
  return (
    <div className="grid-2 dashboard-grid-3" data-testid="org-kpi-strip">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardHeader
            action={
              tile.badge ? (
                <Badge variant={tile.badge.variant}>{tile.badge.text}</Badge>
              ) : undefined
            }
          >
            <CardTitle>{tile.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mono metric-value">{tile.value}</p>
            {tile.href ? (
              <a className="state-link" href={tile.href}>
                Detail ansehen
              </a>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export type { KpiTile };
