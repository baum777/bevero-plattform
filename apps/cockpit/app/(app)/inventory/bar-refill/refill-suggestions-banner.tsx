import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { listWorkspaceSummariesForCurrentUser } from "../../../../lib/supabase/queries/workspaces";
import { countRefillSuggestions } from "../../../../lib/supabase/queries/automation-suggestions";

type RefillSuggestionsBannerProps = {
  organizationId: string;
};

export async function RefillSuggestionsBanner({ organizationId }: RefillSuggestionsBannerProps) {
  if (!organizationId) {
    return null;
  }

  const result = await countRefillSuggestions(organizationId);

  if (result.error) {
    return null;
  }

  if (result.total === 0) {
    return null;
  }

  return (
    <section
      aria-label="Offene Refill-Vorschläge aus dem Automation Layer"
      className="surface-card"
      data-testid="refill-suggestions-banner"
      role="status"
    >
      <header className="card-row">
        <div>
          <h3 className="surface-card-title">System-Vorschlag: Refill-Aufgaben</h3>
          <p className="state-desc">
            {result.total === 1
              ? "1 offener Refill-Vorschlag aus dem Automation Layer wartet auf Freigabe. Vor der Entnahmebestätigung bitte prüfen, ob die Bestandsschwelle weiterhin gilt."
              : `${result.total} offene Refill-Vorschläge aus dem Automation Layer warten auf Freigabe. Vor der Entnahmebestätigung bitte prüfen, ob die Bestandsschwellen weiterhin gelten.`}
          </p>
        </div>
        <Badge variant="warning">Refill</Badge>
      </header>
      <div className="state-action-row">
        <Link className="state-link" href="/automation/suggestions?type=refill&status=open">
          Vorschläge öffnen
        </Link>
      </div>
    </section>
  );
}

export async function RefillSuggestionsBannerLoader() {
  const workspaces = await listWorkspaceSummariesForCurrentUser();

  if (workspaces.access !== "allowed" || !workspaces.organizationId) {
    return null;
  }

  if (!workspaces.currentRole || !["owner", "admin", "manager", "staff"].includes(workspaces.currentRole)) {
    return null;
  }

  return <RefillSuggestionsBanner organizationId={workspaces.organizationId} />;
}
