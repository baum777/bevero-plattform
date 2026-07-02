import { createClient } from "../server";

export type OperationalNoteRow = {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  storageLocationId: string | null;
  authorUserId: string;
  authorRole: string;
  title: string | null;
  body: string;
  visibility: "private" | "team" | "manager_only";
  noteType:
    | "general"
    | "stock_issue"
    | "delivery_issue"
    | "handover"
    | "maintenance"
    | "incident"
    | "refill_context";
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  priority: "normal" | "important" | "critical";
  status: "open" | "resolved" | "archived";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
};

export type OperationalNoteListResult = {
  error: string | null;
  notes: OperationalNoteRow[];
  total: number;
};

export type ListOperationalNotesQuery = {
  organizationId: string;
  status?: OperationalNoteRow["status"] | OperationalNoteRow["status"][];
  priority?: OperationalNoteRow["priority"];
  noteType?: OperationalNoteRow["noteType"];
  limit?: number;
  offset?: number;
};

const NOTE_FIELDS =
  "id,organizationId,workspaceId,storageLocationId,authorUserId,authorRole,title,body,visibility,noteType,relatedEntityType,relatedEntityId,priority,status,createdAt,updatedAt,resolvedAt,resolvedByUserId";

export async function listOperationalNotes(
  query: ListOperationalNotesQuery
): Promise<OperationalNoteListResult> {
  const supabase = await createClient();
  const limit = Math.max(1, Math.min(100, query.limit ?? 50));
  const offset = Math.max(0, Math.min(10_000, query.offset ?? 0));

  let builder = supabase
    .from("OperationalNote")
    .select(NOTE_FIELDS, { count: "exact" })
    .eq("organizationId", query.organizationId)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.status) {
    if (Array.isArray(query.status)) {
      builder = builder.in("status", query.status);
    } else {
      builder = builder.eq("status", query.status);
    }
  }
  if (query.priority) {
    builder = builder.eq("priority", query.priority);
  }
  if (query.noteType) {
    builder = builder.eq("noteType", query.noteType);
  }

  const { data, error, count } = await builder.returns<OperationalNoteRow[]>();

  if (error) {
    return { error: error.message, notes: [], total: 0 };
  }

  return { error: null, notes: data ?? [], total: count ?? 0 };
}

export async function countCriticalOpenNotes(organizationId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("OperationalNote")
    .select("id", { count: "exact", head: true })
    .eq("organizationId", organizationId)
    .eq("status", "open")
    .eq("priority", "critical");

  if (error) return 0;
  return count ?? 0;
}
