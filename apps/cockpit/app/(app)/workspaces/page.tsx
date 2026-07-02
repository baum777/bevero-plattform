import Link from "next/link";
import { PageScaffold } from "../../components/page-scaffold";
import { AccessDenied } from "../../components/access-denied";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { listWorkspaceSummariesForCurrentUser } from "../../../lib/supabase/queries/workspaces";
import { listLocationsForCurrentUser } from "../../../lib/supabase/queries/locations";

function formatDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(parsed));
}

export default async function WorkspacesPage() {
  const result = await listWorkspaceSummariesForCurrentUser();
  const locationsResult = await listLocationsForCurrentUser().catch(() => ({ locations: [] }));

  if (result.access !== "allowed") {
    return (
      <PageScaffold
        title="Arbeitsbereiche"
        description="Übersicht der Arbeitsbereiche mit Status, Typ und Mitgliederzahl."
      >
        <AccessDenied description="Arbeitsbereiche sind für deine Rolle nicht verfügbar." />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Arbeitsbereiche"
      description="Übersicht der Arbeitsbereiche mit Status, Typ und Mitgliederzahl."
    >
      {result.error ? (
        <ErrorState
          description={result.error}
          title="Arbeitsbereiche konnten nicht geladen werden"
        />
      ) : null}

      {!result.error && result.data.length > 0 ? (
        <div className="grid-2">
          {result.data.map((workspace) => (
            <article className="card-ui" key={workspace.workspaceId}>
              <header className="card-ui-header">
                <div>
                  <h2 className="card-ui-title">{workspace.workspaceId}</h2>
                  <p className="card-ui-content">{`${workspace.memberCount} Mitglieder`}</p>
                </div>
                <Badge variant="neutral">{`zuletzt: ${formatDate(workspace.lastJoinedAt)}`}</Badge>
              </header>

              <div className="role-badge-row">
                <Badge variant="info">{`owner ${workspace.roles.owner}`}</Badge>
                <Badge variant="info">{`admin ${workspace.roles.admin}`}</Badge>
                <Badge variant="info">{`manager ${workspace.roles.manager}`}</Badge>
                <Badge variant="info">{`staff ${workspace.roles.staff}`}</Badge>
                <Badge variant="info">{`viewer ${workspace.roles.viewer}`}</Badge>
              </div>

              <div className="table-wrap table-wrap-tight">
                <table className="table-ui">
                  <thead>
                    <tr>
                      <th>Mitglied</th>
                      <th>Rolle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.members.map((member) => (
                      <tr key={`${workspace.workspaceId}-${member.userId}`}>
                        <td>
                          {member.displayName ?? member.email ?? member.userId.slice(0, 8)}
                          <div className="mono table-subline">{member.email ?? member.userId}</div>
                        </td>
                        <td>
                          <Badge variant="neutral">{member.role}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!result.error && result.data.length === 0 ? (
        <EmptyState
          description="Für deine Organisation sind noch keine Workspace-Mitgliedschaften vorhanden."
          title="Keine Arbeitsbereiche"
        />
      ) : null}

      {"locations" in locationsResult && locationsResult.locations.length > 0 ? (
        <section aria-labelledby="locations-heading" style={{ marginTop: "2rem" }}>
          <h2 id="locations-heading">Standorte</h2>
          <div className="grid-2">
            {locationsResult.locations.map((loc: { id: string; name: string; profile: string; signatureAssets: string[]; cinemaAvailable: boolean; weatherSensitive: boolean }) => (
              <article className="card-ui" key={loc.id}>
                <header className="card-ui-header">
                  <div>
                    <h3 className="card-ui-title">
                      <Link href={`/workspaces/${loc.id}`}>{loc.name}</Link>
                    </h3>
                  </div>
                  <Badge variant="info">{loc.profile}</Badge>
                </header>
                {loc.signatureAssets.length > 0 && (
                  <p className="card-ui-content">{loc.signatureAssets.slice(0, 3).join(" · ")}</p>
                )}
                <div className="role-badge-row">
                  {loc.cinemaAvailable && <Badge variant="neutral">Cinema</Badge>}
                  {loc.weatherSensitive && <Badge variant="neutral">Wettersensitiv</Badge>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PageScaffold>
  );
}
