import { PageScaffold } from "../../components/page-scaffold";
import { AccessDenied } from "../../components/access-denied";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { listReviewTasksForCurrentUser } from "../../../lib/backend/review-tasks";
import { AlertsTableClient } from "./alerts-table-client";

type AlertsPageProps = {
  searchParams?: Promise<{
    q?: string;
    severity?: string;
    status?: string;
  }>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim().toLowerCase() ?? "";
  const severity = params.severity?.trim().toLowerCase() ?? "all";
  const status = params.status?.trim().toLowerCase() ?? "all";
  const result = await listReviewTasksForCurrentUser();

  if (result.access !== "allowed") {
    return (
      <PageScaffold
        title="Alerts"
        description="Offene, bestätigte und gelöste Alerts mit Severity- und Workspace-Filtern."
      >
        <AccessDenied description="Nur Admins können Alerts und Review-Aufgaben verwalten." />
      </PageScaffold>
    );
  }

  const rows = result.data.filter((row) => {
    if (severity !== "all" && row.severity.toLowerCase() !== severity) return false;
    if (status !== "all" && row.status.toLowerCase() !== status) return false;
    if (!q) return true;

    const text = `${row.title} ${row.description ?? ""} ${row.type} ${row.id}`.toLowerCase();
    return text.includes(q);
  });

  const severities = Array.from(new Set(result.data.map((row) => row.severity))).sort();
  const statuses = Array.from(new Set(result.data.map((row) => row.status))).sort();

  return (
    <PageScaffold
      title="Alerts"
      description="Offene, bestätigte und gelöste Alerts mit Severity- und Workspace-Filtern."
    >
      <form className="toolbar-row alerts-toolbar" method="GET">
        <input
          className="toolbar-input"
          defaultValue={params.q ?? ""}
          name="q"
          placeholder="Suche nach Titel, Typ oder ID"
          type="search"
        />
        <select className="toolbar-input" defaultValue={severity} name="severity">
          <option value="all">Alle Severities</option>
          {severities.map((value) => (
            <option key={value} value={value.toLowerCase()}>
              {value}
            </option>
          ))}
        </select>
        <select className="toolbar-input" defaultValue={status} name="status">
          <option value="all">Alle Status</option>
          {statuses.map((value) => (
            <option key={value} value={value.toLowerCase()}>
              {value}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtern
        </Button>
      </form>

      {result.error ? (
        <ErrorState
          action={<Button variant="outline">Erneut versuchen</Button>}
          description={result.error}
          title="Alerts konnten nicht geladen werden"
        />
      ) : null}

      {!result.error && rows.length > 0 ? <AlertsTableClient rows={rows} /> : null}

      {!result.error && rows.length === 0 ? (
        <EmptyState
          description="Aktuell keine Alerts für die gewählten Filter."
          title="Keine Alerts gefunden"
        />
      ) : null}
    </PageScaffold>
  );
}
