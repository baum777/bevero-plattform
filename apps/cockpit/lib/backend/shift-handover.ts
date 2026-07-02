import { apiFetch, readApiJson } from "./api-fetch";
import { createClient } from "../supabase/server";

import type {
  ShiftHandoverConfirmBody,
  ShiftHandoverConfirmResult,
  ShiftHandoverDraftPublicDTO,
  ShiftHandoverErrorBody,
  ShiftHandoverGetResult,
  ShiftHandoverPatchBody,
  ShiftHandoverPatchResult
} from "../types/shift-handover";

type BackendResponse<T> = {
  data: T | null;
  error: { code: string; message: string; status: number } | null;
};

const SHIFT_HANDOVER_BASE = "/shift-handover/draft";

function asErrorBody(payload: unknown): ShiftHandoverErrorBody {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return {
      error: typeof record.error === "string" ? record.error : undefined,
      message: typeof record.message === "string" ? record.message : undefined
    };
  }
  return {};
}

async function authorizedFetch(input: {
  body?: unknown;
  method: "GET" | "PATCH" | "POST";
  pathSuffix?: string;
}): Promise<{
  accessToken: string | null;
  organizationId: string | null;
  reason: "unauthenticated" | "allowed";
}> {
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  const userId = sessionData.session?.user.id ?? null;

  if (sessionError || !accessToken || !userId) {
    return { accessToken: null, organizationId: null, reason: "unauthenticated" };
  }

  const { data: memberships } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<Array<{ organizationId: string }>>();

  return {
    accessToken,
    organizationId: memberships?.[0]?.organizationId ?? null,
    reason: "allowed"
  };
}

export async function getShiftHandoverDraft(input: {
  date?: string;
  workspaceId?: string;
}): Promise<BackendResponse<ShiftHandoverDraftPublicDTO>> {
  const { accessToken, organizationId, reason } = await authorizedFetch({ method: "GET" });
  if (reason === "unauthenticated" || !accessToken || !organizationId) {
    return {
      data: null,
      error: { code: "Unauthorized", message: "Keine aktive Session.", status: 401 }
    };
  }

  const params = new URLSearchParams();
  if (input.date) {
    params.set("date", input.date);
  }
  if (input.workspaceId) {
    params.set("workspaceId", input.workspaceId);
  }
  const queryString = params.toString();
  const path = `${SHIFT_HANDOVER_BASE}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await apiFetch(path, {
      method: "GET",
      accessToken,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct"
    });

    const payload = (await readApiJson(response).catch(() => ({}))) as ShiftHandoverGetResult | ShiftHandoverErrorBody;

    if (!response.ok) {
      const body = asErrorBody(payload);
      return {
        data: null,
        error: {
          code: body.error ?? `HTTP_${response.status}`,
          message: body.message ?? "Schichtübergabe-Entwurf konnte nicht geladen werden.",
          status: response.status
        }
      };
    }

    const result = payload as ShiftHandoverGetResult;
    return { data: result.draft, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        code: "NetworkError",
        message: error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.",
        status: 0
      }
    };
  }
}

export async function patchShiftHandoverDraft(input: {
  body: ShiftHandoverPatchBody;
}): Promise<BackendResponse<ShiftHandoverDraftPublicDTO>> {
  const { accessToken, organizationId, reason } = await authorizedFetch({ method: "PATCH" });
  if (reason === "unauthenticated" || !accessToken || !organizationId) {
    return {
      data: null,
      error: { code: "Unauthorized", message: "Keine aktive Session.", status: 401 }
    };
  }

  try {
    const response = await apiFetch(SHIFT_HANDOVER_BASE, {
      method: "PATCH",
      accessToken,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct",
      body: input.body
    });

    const payload = (await readApiJson(response).catch(() => ({}))) as ShiftHandoverPatchResult | ShiftHandoverErrorBody;

    if (!response.ok) {
      const body = asErrorBody(payload);
      return {
        data: null,
        error: {
          code: body.error ?? `HTTP_${response.status}`,
          message: body.message ?? "Entwurf konnte nicht aktualisiert werden.",
          status: response.status
        }
      };
    }

    const result = payload as ShiftHandoverPatchResult;
    return { data: result.draft, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        code: "NetworkError",
        message: error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.",
        status: 0
      }
    };
  }
}

export async function confirmShiftHandoverDraft(input: {
  body: ShiftHandoverConfirmBody;
}): Promise<BackendResponse<ShiftHandoverConfirmResult>> {
  const { accessToken, organizationId, reason } = await authorizedFetch({ method: "POST" });
  if (reason === "unauthenticated" || !accessToken || !organizationId) {
    return {
      data: null,
      error: { code: "Unauthorized", message: "Keine aktive Session.", status: 401 }
    };
  }

  try {
    const response = await apiFetch(`${SHIFT_HANDOVER_BASE}/confirm`, {
        method: "POST",
      accessToken,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct",
        body: input.body ?? {}
      });

    const payload = (await readApiJson(response).catch(() => ({}))) as
      | ShiftHandoverConfirmResult
      | ShiftHandoverErrorBody;

    if (!response.ok) {
      const body = asErrorBody(payload);
      return {
        data: null,
        error: {
          code: body.error ?? `HTTP_${response.status}`,
          message: body.message ?? "Entwurf konnte nicht bestätigt werden.",
          status: response.status
        }
      };
    }

    return { data: payload as ShiftHandoverConfirmResult, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        code: "NetworkError",
        message: error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.",
        status: 0
      }
    };
  }
}
