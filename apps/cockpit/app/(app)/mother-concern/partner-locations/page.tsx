"use client";

import { useMemo, useState } from "react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { PageScaffold } from "../../../components/page-scaffold";
import { useExternalCatalogEntries } from "../../../../lib/mother-concern-hooks";

export default function PartnerLocationsPage() {
  const { data: entries, loading, error } = useExternalCatalogEntries();
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const regions = useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.region))).sort(),
    [entries]
  );
  const types = useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.type))).sort(),
    [entries]
  );

  const filtered = (entries ?? []).filter((e) => {
    if (regionFilter !== "all" && e.region !== regionFilter) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    return true;
  });

  return (
    <PageScaffold
      title="Partner-Standorte"
      description="Externe Event-Locations, Konferenzräume und Special Venues."
    >
      {error ? (
        <ErrorState
          title="Partner-Standorte konnten nicht geladen werden"
          description={error}
        />
      ) : null}
      {loading ? <p className="field-help">Lade…</p> : null}

      {entries && entries.length > 0 ? (
        <form className="toolbar-row" data-testid="partner-filter">
          <select
            className="toolbar-input"
            onChange={(e) => setRegionFilter(e.target.value)}
            value={regionFilter}
          >
            <option value="all">Alle Regionen</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="toolbar-input"
            onChange={(e) => setTypeFilter(e.target.value)}
            value={typeFilter}
          >
            <option value="all">Alle Typen</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </form>
      ) : null}

      {entries && entries.length === 0 ? (
        <EmptyState
          title="Keine Partner-Standorte"
          description="Aktuell sind keine externen Locations im Katalog."
        />
      ) : null}

      {entries && entries.length > 0 ? (
        <Card>
          <CardHeader action={<Badge variant="info">{filtered.length} Standorte</Badge>}>
            <CardTitle>Katalog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-wrap table-wrap-tight">
              <table className="table-ui">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stadt</th>
                    <th>Region</th>
                    <th>Typ</th>
                    <th>Kapazität</th>
                    <th>Catering</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.name}</td>
                      <td>{entry.city}</td>
                      <td>{entry.region}</td>
                      <td>{entry.type}</td>
                      <td className="mono">
                        {entry.capacityMin ?? "—"} – {entry.capacityMax ?? "—"}
                      </td>
                      <td>{entry.cateringMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </PageScaffold>
  );
}
