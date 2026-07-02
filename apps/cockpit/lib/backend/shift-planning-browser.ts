"use client";

// Browser-side subset of shift-planning API calls.
// Uses the browser Supabase client (no next/headers) so this module is safe
// to import from "use client" components.

import { createClient } from "../supabase/client";
import { getBackendApiBase } from "./api-base";
import type {
  ImportUploadResponse,
  MappingReviewResponse,
  ConfirmResponse,
  TaskPreviewResponse,
  ReleaseResponse,
} from "../types/shift-planning";

type BackendResult<T> = { data: T; error: null } | { data: null; error: string };

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function extractErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return body.message ?? `Fehler ${res.status}`;
}

export async function uploadShiftPlan(
  fileName: string,
  content: string
): Promise<BackendResult<ImportUploadResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(`${getBackendApiBase()}/shift-planning/imports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName, content }),
      cache: "no-store",
    });
    if (!res.ok) return { data: null, error: await extractErrorMessage(res) };
    return { data: (await res.json()) as ImportUploadResponse, error: null };
  } catch {
    return { data: null, error: "Upload nicht erreichbar." };
  }
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
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/imports/${importId}/map-columns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ columnMapping }),
        cache: "no-store",
      }
    );
    if (!res.ok) return { data: null, error: await extractErrorMessage(res) };
    return { data: (await res.json()) as MappingReviewResponse, error: null };
  } catch {
    return { data: null, error: "Spalten-Mapping nicht erreichbar." };
  }
}

export async function confirmShiftPlan(
  importId: string
): Promise<BackendResult<ConfirmResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/imports/${importId}/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );
    if (!res.ok) return { data: null, error: await extractErrorMessage(res) };
    return { data: (await res.json()) as ConfirmResponse, error: null };
  } catch {
    return { data: null, error: "Bestätigung nicht erreichbar." };
  }
}

export async function fetchTaskPreview(
  importId: string
): Promise<BackendResult<TaskPreviewResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/imports/${importId}/task-preview`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return { data: null, error: await extractErrorMessage(res) };
    return { data: (await res.json()) as TaskPreviewResponse, error: null };
  } catch {
    return { data: null, error: "Vorschau nicht erreichbar." };
  }
}

export async function releaseShiftPlan(
  importId: string
): Promise<BackendResult<ReleaseResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/imports/${importId}/release`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );
    if (!res.ok) return { data: null, error: await extractErrorMessage(res) };
    return { data: (await res.json()) as ReleaseResponse, error: null };
  } catch {
    return { data: null, error: "Freigabe nicht erreichbar." };
  }
}
