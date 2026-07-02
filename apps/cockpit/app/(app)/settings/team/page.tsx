import { PageScaffold } from "../../../components/page-scaffold";
import { AccessDenied } from "../../../components/access-denied";
import { Badge } from "../../../components/ui/badge";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { listTeamMembersForCurrentOrganization } from "../../../../lib/supabase/queries/settings";
import { RegisteredMemberApprovalForm } from "./registered-member-approval-form";
import { InviteList } from "./invite-list";

type SettingsTeamPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(timestamp));
}

export default async function SettingsTeamPage({ searchParams }: SettingsTeamPageProps) {
  const params = (await searchParams) ?? {};
  const activeTab = params.tab === "invites" ? "invites" : "members";

  const result = await listTeamMembersForCurrentOrganization();

  if (result.access !== "allowed") {
    return (
      <PageScaffold title="Team" description="Teammitglieder, Rollen und Einladungen.">
        <AccessDenied description="Teamverwaltung ist nur für Owner oder Admin möglich." />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title="Team" description="Teammitglieder, Rollen und Einladungen.">
      <nav className="tab-nav" aria-label="Team-Bereiche">
        <a
          aria-current={activeTab === "members" ? "page" : undefined}
          className={`tab-link${activeTab === "members" ? " active" : ""}`}
          href="?tab=members"
        >
          Aktiv ({result.data.length})
        </a>
        <a
          aria-current={activeTab === "invites" ? "page" : undefined}
          className={`tab-link${activeTab === "invites" ? " active" : ""}`}
          href="?tab=invites"
        >
          Einladungen
        </a>
      </nav>

      {activeTab === "members" ? (
        <>
          {result.error ? (
            <ErrorState
              description={result.error}
              title="Teamdaten konnten nicht geladen werden"
            />
          ) : null}

          {!result.error && result.organizationId && result.currentRole ? (
            <RegisteredMemberApprovalForm
              currentRole={result.currentRole}
              organizationId={result.organizationId}
            />
          ) : null}

          {!result.error && result.data.length > 0 ? (
            <div className="table-wrap">
              <table className="table-ui">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>E-Mail</th>
                    <th>Rolle</th>
                    <th>Status</th>
                    <th>Seit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((member) => (
                    <tr key={member.userId}>
                      <td>{member.displayName ?? "Ohne Namen"}</td>
                      <td className="mono">{member.email ?? "—"}</td>
                      <td>
                        <Badge variant="info">{member.role}</Badge>
                      </td>
                      <td>
                        <Badge variant={member.isActive === false ? "warning" : "ok"}>
                          {member.isActive === false ? "inaktiv" : "aktiv"}
                        </Badge>
                      </td>
                      <td className="mono">{formatDate(member.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!result.error && result.data.length === 0 ? (
            <EmptyState
              description="In dieser Organisation sind aktuell keine Teammitglieder erfasst."
              title="Keine Teamdaten"
            />
          ) : null}
        </>
      ) : null}

      {activeTab === "invites" && result.organizationId && result.currentRole ? (
        <InviteList
          currentRole={result.currentRole}
          organizationId={result.organizationId}
        />
      ) : null}
    </PageScaffold>
  );
}
