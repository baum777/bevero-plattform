import { PageScaffold } from "../../components/page-scaffold";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { listStorageLocations } from "../../../lib/supabase/queries/storage";

type StoragePageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: "active" | "all" | "inactive";
    type?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(parsed));
}

export default async function StoragePage({ searchParams }: StoragePageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";
  const type = params.type?.trim() ?? "";
  const { data: rows, error } = await listStorageLocations({ q, status, type });

  const statusFilters = [
    { label: "Alle", value: "all" },
    { label: "Aktiv", value: "active" },
    { label: "Inaktiv", value: "inactive" }
  ] as const;

  const availableTypes = Array.from(new Set(rows.map((row) => row.type).filter(Boolean))).sort();

  return (
    <PageScaffold title="Lagerorte" description="Lagerortstruktur nach Typ, Status und Workspace.">
      <form className="toolbar-row storage-toolbar" method="GET">
        <input
          className="toolbar-input"
          defaultValue={q}
          name="q"
          placeholder="Suche nach Name oder Typ"
          type="search"
        />
        <select className="toolbar-input" defaultValue={status} name="status">
          {statusFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select className="toolbar-input" defaultValue={type} name="type">
          <option value="">Alle Typen</option>
          {availableTypes.map((value) => (
            <option key={value} value={value ?? ""}>
              {value}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtern
        </Button>
      </form>

      {error ? (
        <ErrorState
          action={<Button variant="outline">Erneut versuchen</Button>}
          description={error.message}
          title="Lagerorte konnten nicht geladen werden"
        />
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="table-wrap">
          <table className="table-ui">
            <thead>
              <tr>
                <th>Name</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Artikel</th>
                <th>Aktive Artikel</th>
                <th>Snapshots</th>
                <th>Bestand Summe</th>
                <th>Letztes Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.type ?? "—"}</td>
                  <td>
                    <Badge variant={row.isActive ? "ok" : "neutral"}>
                      {row.isActive ? "aktiv" : "inaktiv"}
                    </Badge>
                  </td>
                  <td className="mono">{row.itemCount}</td>
                  <td className="mono">{row.activeItemCount}</td>
                  <td className="mono">{row.snapshotCount}</td>
                  <td className="mono">{row.totalQuantity}</td>
                  <td className="mono">{formatDate(row.lastSnapshotAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!error && rows.length === 0 ? (
        <EmptyState
          description="Noch keine Lagerorte vorhanden oder Filter liefern kein Ergebnis."
          title="Keine Lagerorte gefunden"
        />
      ) : null}
    </PageScaffold>
  );
}
