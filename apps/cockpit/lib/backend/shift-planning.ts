// apps/cockpit/lib/backend/shift-planning.ts

import { apiErrorMessage, apiFetch, readApiJson } from "./api-fetch";
import { createClient } from "../supabase/server";
import type {
  StaffTodayResponse,
  ShiftTodayResponse,
  ShiftLeadSummaryResponse,
  MatrixResponse,
  ImportUploadResponse,
  MappingReviewResponse,
  ConfirmResponse,
  TaskPreviewResponse,
  ReleaseResponse,
  IssuesResponse,
  SignoffStatusResponse
} from "../types/shift-planning";

type BackendResult<T> = { data: T; error: null } | { data: null; error: string };
type BackendAuth = { accessToken: string; organizationId: string };

async function getBackendAuth(): Promise<BackendAuth | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? null;
  const userId = data.session?.user.id ?? null;
  if (!accessToken || !userId) return null;

  const { data: memberships } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<Array<{ organizationId: string }>>();

  const organizationId = memberships?.[0]?.organizationId ?? null;
  return organizationId ? { accessToken, organizationId } : null;
}

async function extractErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return body.message ?? `Fehler ${res.status}`;
}

async function requestBackend<T>(
  path: string,
  fallback: string,
  init: Omit<Parameters<typeof apiFetch>[1], "accessToken" | "organizationId" | "requireOrganization"> = {}
): Promise<BackendResult<T>> {
  try {
    const auth = await getBackendAuth();
    if (!auth) return { data: null, error: "Nicht angemeldet." };
    const response = await apiFetch(path, {
      ...init,
      accessToken: auth.accessToken,
      organizationId: auth.organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct"
    });
    if (!response.ok) return { data: null, error: await extractErrorMessage(response) };
    return { data: await readApiJson<T>(response), error: null };
  } catch (error) {
    return { data: null, error: apiErrorMessage(error, fallback) };
  }
}

export async function fetchShiftToday(date: string): Promise<BackendResult<ShiftTodayResponse>> {
  return requestBackend<ShiftTodayResponse>(
    `/shift-planning/shifts/today?date=${encodeURIComponent(date)}`,
    "Schichtplanung nicht erreichbar."
  );
}

export async function fetchStaffToday(date: string): Promise<BackendResult<StaffTodayResponse>> {
  return requestBackend<StaffTodayResponse>(
    `/shift-planning/tasks/me?date=${encodeURIComponent(date)}`,
    "Schichtplanung nicht erreichbar."
  );
}

export async function uploadShiftPlan(
  fileName: string,
  content: string
): Promise<BackendResult<ImportUploadResponse>> {
  return requestBackend<ImportUploadResponse>("/shift-planning/imports", "Upload nicht erreichbar.", {
      method: "POST",
      body: { fileName, content }
    });
}

export async function mapShiftPlanColumns(
  importId: string,
  columnMapping: {
    dateColumn: number;
    nameColumn: number;
    areaColumn: number;
    shiftStartColumn?: number;
    shiftEndColumn?: number;
    headerRow: number;
  }
): Promise<BackendResult<MappingReviewResponse>> {
  return requestBackend<MappingReviewResponse>(
    `/shift-planning/imports/${importId}/map-columns`,
    "Spalten-Mapping nicht erreichbar.",
    {
        method: "POST",
        body: { columnMapping }
      }
  );
}

export async function confirmShiftPlan(importId: string): Promise<BackendResult<ConfirmResponse>> {
  return requestBackend<ConfirmResponse>(
    `/shift-planning/imports/${importId}/confirm`,
    "Bestätigung nicht erreichbar.",
    {
        method: "POST",
        body: {}
      }
  );
}

export async function fetchTaskPreview(importId: string): Promise<BackendResult<TaskPreviewResponse>> {
  return requestBackend<TaskPreviewResponse>(
    `/shift-planning/imports/${importId}/task-preview`,
    "Vorschau nicht erreichbar."
  );
}

export async function releaseShiftPlan(importId: string): Promise<BackendResult<ReleaseResponse>> {
  return requestBackend<ReleaseResponse>(
    `/shift-planning/imports/${importId}/release`,
    "Freigabe nicht erreichbar.",
    {
        method: "POST",
        body: {}
      }
  );
}

export async function fetchShiftLeadSummary(date: string): Promise<BackendResult<ShiftLeadSummaryResponse>> {
  return requestBackend<ShiftLeadSummaryResponse>(
    `/shift-planning/summary?date=${encodeURIComponent(date)}`,
    "Übersicht nicht erreichbar."
  );
}

export async function fetchIssues(date: string): Promise<BackendResult<IssuesResponse>> {
  return requestBackend<IssuesResponse>(
    `/shift-planning/issues?date=${encodeURIComponent(date)}`,
    "Mängel nicht erreichbar."
  );
}

export async function fetchSignoffStatus(
  date: string,
  workspaceGroupId?: string
): Promise<BackendResult<SignoffStatusResponse>> {
  const params = new URLSearchParams({ date });
  if (workspaceGroupId) params.set("workspaceGroupId", workspaceGroupId);
  return requestBackend<SignoffStatusResponse>(
    `/shift-planning/signoff?${params.toString()}`,
    "Schichtabschluss nicht erreichbar."
  );
}

export async function fetchMatrix(): Promise<BackendResult<MatrixResponse>> {
  return requestBackend<MatrixResponse>("/shift-planning/matrix", "Matrix nicht erreichbar.");
}
