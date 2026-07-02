import { PageScaffold } from "../../components/page-scaffold";
import { AccessDenied } from "../../components/access-denied";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { listWorkspaceSummariesForCurrentUser } from "../../../lib/supabase/queries/workspaces";
import { listOperationalNotes } from "../../../lib/supabase/queries/operational-notes";
import { NotesClient } from "./notes-client";

const NOTE_STATUSES = ["open", "resolved", "archived"] as const;
const NOTE_PRIORITIES = ["normal", "important", "critical"] as const;

function parseStatus(v?: string): (typeof NOTE_STATUSES)[number] | null {
  return NOTE_STATUSES.find((s) => s === v) ?? null;
}

function parsePriority(v?: string): (typeof NOTE_PRIORITIES)[number] | null {
  return NOTE_PRIORITIES.find((p) => p === v) ?? null;
}

type NotesPageProps = {
  searchParams?: Promise<{ status?: string; priority?: string }>;
};

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const params = (await searchParams) ?? {};
  const workspaces = await listWorkspaceSummariesForCurrentUser();

  if (workspaces.access !== "allowed" || !workspaces.organizationId) {
    return (
      <PageScaffold
        title="Operative Notizen"
        description="Teamrelevante, auditierbare Notizen für Schicht, Bestand und Übergabe."
      >
        <AccessDenied description="Keine aktive Organisation. Bitte zuerst einer Organisation beitreten." />
      </PageScaffold>
    );
  }

  const currentRole = workspaces.currentRole ?? "viewer";
  if (!["owner", "admin", "manager", "staff"].includes(currentRole)) {
    return (
      <PageScaffold
        title="Operative Notizen"
        description="Teamrelevante, auditierbare Notizen für Schicht, Bestand und Übergabe."
      >
        <AccessDenied description="Nur Staff und höher können operative Notizen sehen." />
      </PageScaffold>
    );
  }

  const status = parseStatus(params.status) ?? "open";
  const priority = parsePriority(params.priority) ?? undefined;
  const canManage = ["owner", "admin", "manager"].includes(currentRole);

  const result = await listOperationalNotes({
    organizationId: workspaces.organizationId,
    status,
    priority,
    limit: 50,
  });

  if (result.error) {
    return (
      <PageScaffold
        title="Operative Notizen"
        description="Teamrelevante, auditierbare Notizen für Schicht, Bestand und Übergabe."
      >
        <ErrorState title="Notizen konnten nicht geladen werden" description={result.error} />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Operative Notizen"
      description="Teamrelevante, auditierbare Notizen für Schicht, Bestand und Übergabe."
    >
      <NotesClient
        canManage={canManage}
        currentPriority={priority ?? null}
        currentStatus={status}
        notes={result.notes}
        organizationId={workspaces.organizationId}
        total={result.total}
      />
    </PageScaffold>
  );
}
