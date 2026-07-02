"use client";

import { EmptyState } from "../ui/empty-state";

export type LocationComparisonRow = {
  locationId: string;
  locationName: string;
  isExternal: boolean;
  brandId: string | null;
  city: string | null;
  criticalStockAlerts: number;
  activeExceptionRules: number;
  openInquiries: number;
  signatureAssetCount: number;
};

type LocationComparisonTableProps = {
  rows: LocationComparisonRow[];
};

export function LocationComparisonTable({ rows }: LocationComparisonTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Keine Standorte"
        description="Aktuell sind keine Standorte in der Organisation hinterlegt."
      />
    );
  }
  return (
    <div className="table-wrap table-wrap-tight" data-testid="location-comparison">
      <table className="table-ui">
        <thead>
          <tr>
            <th>Standort</th>
            <th>Stadt</th>
            <th>Typ</th>
            <th>Signaturen</th>
            <th>Aktive Regeln</th>
            <th>Offene Anfragen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.locationId}>
              <td>{row.locationName}</td>
              <td>{row.city ?? "—"}</td>
              <td>{row.isExternal ? "Partner" : "Eigen"}</td>
              <td className="mono">{row.signatureAssetCount}</td>
              <td className="mono">{row.activeExceptionRules}</td>
              <td className="mono">{row.openInquiries}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
