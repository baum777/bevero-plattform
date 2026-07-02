import { PageScaffold } from "../../../components/page-scaffold";
import { AccessDenied } from "../../../components/access-denied";
import { Badge } from "../../../components/ui/badge";
import { listTeamMembersForCurrentOrganization } from "../../../../lib/supabase/queries/settings";
import { ROLES, CAPABILITIES, CAPABILITY_LABELS, ROLE_LABELS } from "../../../../lib/auth/rbac";

export default async function SettingsRolesPage() {
  const result = await listTeamMembersForCurrentOrganization();

  if (result.access !== "allowed") {
    return (
      <PageScaffold title="Rollen & Berechtigungen" description="Berechtigungsmatrix des Cockpit.">
        <AccessDenied description="Rollenverwaltung ist nur für Inhaber oder Admin möglich." />
      </PageScaffold>
    );
  }

  const countsByRole = new Map(
    ROLES.map((role) => [role, result.data.filter((member) => member.role === role).length])
  );

  return (
    <PageScaffold title="Rollen & Berechtigungen" description="Übersicht aller Rollen und ihrer Berechtigungen im Cockpit.">
      <div className="stack-sm stack-gap-after">
        {ROLES.map((role) => (
          <Badge key={role} variant="neutral">
            {ROLE_LABELS[role]}: {countsByRole.get(role) ?? 0}
          </Badge>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table-ui">
          <thead>
            <tr>
              <th>Berechtigung</th>
              {ROLES.map((role) => (
                <th key={role}>{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.entries(CAPABILITIES) as [keyof typeof CAPABILITIES, readonly string[]][]).map(
              ([capability, roles]) => (
                <tr key={capability}>
                  <td>{CAPABILITY_LABELS[capability]}</td>
                  {ROLES.map((role) => (
                    <td className="mono" key={`${capability}-${role}`}>
                      {roles.includes(role) ? (
                        <span aria-label="Erlaubt" style={{ color: "var(--ok)" }}>✓</span>
                      ) : (
                        <span aria-label="Nicht erlaubt" style={{ color: "var(--text-tertiary)" }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}
