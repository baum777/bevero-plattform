import { createClient } from "../server";

export type AutomationEvidence = {
  label: string;
  value: string;
  source:
    | "movement_history"
    | "inventory_balance"
    | "bar_refill_run"
    | "goods_receipt"
    | "shift_handover"
    | "operational_note"
    | "review_task";
};

export type AutomationSuggestionRow = {
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  detail: string;
  evidence: AutomationEvidence[] | null;
  explanation: string | null;
  expiresAt: string | null;
  id: string;
  organizationId: string;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  relatedItemIds: string[];
  ruleId: string;
  ruleVersion: number;
  severity: "info" | "warning" | "critical";
  status: "open" | "approved" | "rejected" | "expired" | "superseded";
  title: string;
  type: string;
};

export type AutomationSuggestionListResult = {
  error: string | null;
  suggestions: AutomationSuggestionRow[];
  total: number;
};

export type ListAutomationSuggestionsQuery = {
  limit?: number;
  offset?: number;
  organizationId: string;
  ruleId?: string;
  status?: AutomationSuggestionRow["status"] | AutomationSuggestionRow["status"][];
  type?: string | string[];
};

const SUGGESTION_STATUS_VALUES = ["open", "approved", "rejected", "expired", "superseded"] as const;
const SUGGESTION_TYPE_VALUES = [
  "refill",
  "receipt_alert",
  "consumption_anomaly",
  "alert_consolidation",
  "custom"
] as const;

function buildStatusFilter(
  value: AutomationSuggestionRow["status"] | AutomationSuggestionRow["status"][] | undefined
): { in: string[] } | { eq: string } | null {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return { in: value };
  }
  return { eq: value };
}

function buildTypeFilter(value: string | string[] | undefined): { in: string[] } | { eq: string } | null {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return { in: value };
  }
  return { eq: value };
}

export async function listAutomationSuggestions(
  query: ListAutomationSuggestionsQuery
): Promise<AutomationSuggestionListResult> {
  const supabase = await createClient();
  const limit = Math.max(1, Math.min(100, query.limit ?? 25));
  const offset = Math.max(0, Math.min(10_000, query.offset ?? 0));

  let builder = supabase
    .from("AutomationSuggestion")
    .select(
      "id,organizationId,ruleId,ruleVersion,status,type,severity,title,explanation,detail,evidence,relatedItemIds,createdAt,expiresAt,approvedBy,approvedAt,rejectedBy,rejectedAt,rejectionReason",
      { count: "exact" }
    )
    .eq("organizationId", query.organizationId)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  const statusFilter = buildStatusFilter(query.status);
  if (statusFilter && "in" in statusFilter) {
    builder = builder.in("status", statusFilter.in);
  } else if (statusFilter && "eq" in statusFilter) {
    builder = builder.eq("status", statusFilter.eq);
  }

  const typeFilter = buildTypeFilter(query.type);
  if (typeFilter && "in" in typeFilter) {
    builder = builder.in("type", typeFilter.in);
  } else if (typeFilter && "eq" in typeFilter) {
    builder = builder.eq("type", typeFilter.eq);
  }

  if (query.ruleId) {
    builder = builder.eq("ruleId", query.ruleId);
  }

  const { data, error, count } = await builder.returns<AutomationSuggestionRow[]>();

  if (error) {
    return { error: error.message, suggestions: [], total: 0 };
  }

  return { error: null, suggestions: data ?? [], total: count ?? 0 };
}

export async function getAutomationSuggestion(input: {
  organizationId: string;
  suggestionId: string;
}): Promise<{ error: string | null; suggestion: AutomationSuggestionRow | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AutomationSuggestion")
    .select(
      "id,organizationId,ruleId,ruleVersion,status,type,severity,title,explanation,detail,evidence,relatedItemIds,createdAt,expiresAt,approvedBy,approvedAt,rejectedBy,rejectedAt,rejectionReason"
    )
    .eq("id", input.suggestionId)
    .eq("organizationId", input.organizationId)
    .maybeSingle<AutomationSuggestionRow>();

  if (error) {
    return { error: error.message, suggestion: null };
  }

  return { error: null, suggestion: data ?? null };
}

export async function countOpenAutomationSuggestions(organizationId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("AutomationSuggestion")
    .select("id", { count: "exact", head: true })
    .eq("organizationId", organizationId)
    .eq("status", "open");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function countRefillSuggestions(
  organizationId: string
): Promise<{ error: string | null; total: number }> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("AutomationSuggestion")
    .select("id", { count: "exact", head: true })
    .eq("organizationId", organizationId)
    .eq("status", "open")
    .eq("type", "refill");

  if (error) {
    return { error: error.message, total: 0 };
  }

  return { error: null, total: count ?? 0 };
}

export const AUTOMATION_SUGGESTION_STATUSES = SUGGESTION_STATUS_VALUES;
export const AUTOMATION_SUGGESTION_TYPES = SUGGESTION_TYPE_VALUES;
