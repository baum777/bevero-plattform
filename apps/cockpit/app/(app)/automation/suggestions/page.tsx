import { PageScaffold } from "../../../components/page-scaffold";
import { AccessDenied } from "../../../components/access-denied";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { listWorkspaceSummariesForCurrentUser } from "../../../../lib/supabase/queries/workspaces";
import { listAutomationSuggestions } from "../../../../lib/supabase/queries/automation-suggestions";
import { SuggestionsClient } from "./suggestions-client";

type SuggestionsPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
  }>;
};

const SUGGESTION_STATUSES = ["open", "approved", "rejected", "expired", "superseded"] as const;
const SUGGESTION_TYPES = [
  "refill",
  "receipt_alert",
  "consumption_anomaly",
  "alert_consolidation",
  "custom"
] as const;

function parseStatus(value: string | undefined): (typeof SUGGESTION_STATUSES)[number] | null {
  if (!value) return null;
  return SUGGESTION_STATUSES.find((entry) => entry === value) ?? null;
}

function parseType(value: string | undefined): (typeof SUGGESTION_TYPES)[number] | null {
  if (!value) return null;
  return SUGGESTION_TYPES.find((entry) => entry === value) ?? null;
}

export default async function AutomationSuggestionsPage({ searchParams }: SuggestionsPageProps) {
  const params = (await searchParams) ?? {};
  const workspaces = await listWorkspaceSummariesForCurrentUser();

  if (workspaces.access !== "allowed" || !workspaces.organizationId) {
    return (
      <PageScaffold
        title="Automation-Vorschläge"
        description="Vorschläge aus dem Rules Engine (Phase C) zur Freigabe oder Ablehnung."
      >
        <AccessDenied description="Keine aktive Organisation. Bitte zuerst einer Organisation beitreten oder eine erstellen." />
      </PageScaffold>
    );
  }

  if (!workspaces.currentRole || !["owner", "admin", "manager", "staff"].includes(workspaces.currentRole)) {
    return (
      <PageScaffold
        title="Automation-Vorschläge"
        description="Vorschläge aus dem Rules Engine (Phase C) zur Freigabe oder Ablehnung."
      >
        <AccessDenied description="Nur Staff und höher sehen Vorschläge aus dem Automation Layer. Viewer-Zugriff ist auf Bestands-Anzeige beschränkt." />
      </PageScaffold>
    );
  }

  const status = parseStatus(params.status) ?? "open";
  const type = parseType(params.type) ?? undefined;

  const list = await listAutomationSuggestions({
    organizationId: workspaces.organizationId,
    status,
    type,
    limit: 50
  });

  if (list.error) {
    return (
      <PageScaffold
        title="Automation-Vorschläge"
        description="Vorschläge aus dem Rules Engine (Phase C) zur Freigabe oder Ablehnung."
      >
        <ErrorState
          description={list.error}
          title="Vorschläge konnten nicht geladen werden"
        />
      </PageScaffold>
    );
  }

  if (list.suggestions.length === 0) {
    return (
      <PageScaffold
        title="Automation-Vorschläge"
        description="Vorschläge aus dem Rules Engine (Phase C) zur Freigabe oder Ablehnung."
      >
        <EmptyState
          description={
            status === "open"
              ? "Aktuell liegen keine offenen Vorschläge vor. Sobald der Rules Engine einen niedrigen Bestand, einen offenen Wareneingang oder eine Verbrauchsanomalie erkennt, erscheint hier ein Vorschlag zur Freigabe."
              : `Keine Vorschläge mit dem Status "${status}"${type ? ` und Typ "${type}"` : ""}.`
          }
          title="Keine Vorschläge"
        />
        <SuggestionsClient
          canApprove={["owner", "admin", "manager"].includes(workspaces.currentRole)}
          currentStatus={status}
          currentType={type ?? null}
          organizationId={workspaces.organizationId}
          suggestions={[]}
          total={0}
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Automation-Vorschläge"
      description="Vorschläge aus dem Rules Engine (Phase C) zur Freigabe oder Ablehnung."
    >
      <SuggestionsClient
        canApprove={["owner", "admin", "manager"].includes(workspaces.currentRole)}
        currentStatus={status}
        currentType={type ?? null}
        organizationId={workspaces.organizationId}
        suggestions={list.suggestions}
        total={list.total}
      />
    </PageScaffold>
  );
}
