import { apiFetch, readApiJson } from "./api-fetch";
import { createClient } from "../supabase/server";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type OrganizationMemberRow = {
  organizationId: string;
  role: OrganizationRole;
};

type ReviewTaskApiRow = {
  correctionRequestId?: string;
  createdAt: string;
  description?: string;
  id: string;
  resolvedAt?: string | null;
  severity: string;
  status: string;
  title: string;
  type: string;
};

type ReviewTasksPayload = {
  message?: string;
  tasks?: ReviewTaskApiRow[];
};

export type ReviewTaskRow = {
  correctionRequestId?: string;
  createdAt: string;
  description?: string;
  id: string;
  resolvedAt: string | null;
  severity: string;
  status: string;
  title: string;
  type: string;
};

export type ReviewTasksResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  currentRole: OrganizationRole | null;
  data: ReviewTaskRow[];
  error: string | null;
};

export async function listReviewTasksForCurrentUser(options?: {
  windowDays?: number;
}): Promise<ReviewTasksResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  if (userError || !userId) {
    return {
      access: "unauthenticated",
      currentRole: null,
      data: [],
      error: userError?.message ?? "Keine aktive Session gefunden."
    };
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("OrganizationMember")
    .select("organizationId,role")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<OrganizationMemberRow[]>();

  if (membershipsError) {
    return {
      access: "forbidden",
      currentRole: null,
      data: [],
      error: membershipsError.message
    };
  }

  const role = memberships?.[0]?.role ?? null;
  const organizationId = memberships?.[0]?.organizationId ?? null;
  if (role !== "owner" && role !== "admin") {
    return {
      access: "forbidden",
      currentRole: role,
      data: [],
      error: null
    };
  }
  if (!organizationId) {
    return {
      access: "forbidden",
      currentRole: role,
      data: [],
      error: "Organisationskontext fehlt."
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    return {
      access: "allowed",
      currentRole: role,
      data: [],
      error: sessionError?.message ?? "Session-Token fehlt."
    };
  }

  try {
    const reviewTasksPath =
      options?.windowDays === undefined
        ? "/admin/review-tasks"
        : `/admin/review-tasks?windowDays=${options.windowDays}`;
    const response = await apiFetch(reviewTasksPath, {
      accessToken,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct"
    });

    const payload = (await readApiJson(response).catch(() => ({}))) as ReviewTasksPayload;
    if (!response.ok) {
      return {
        access: "allowed",
        currentRole: role,
        data: [],
        error: payload.message ?? "Review-Tasks konnten nicht geladen werden."
      };
    }

    return {
      access: "allowed",
      currentRole: role,
      data: (payload.tasks ?? []).map((task) => ({
        correctionRequestId: task.correctionRequestId,
        createdAt: task.createdAt,
        description: task.description,
        id: task.id,
        resolvedAt: task.resolvedAt ?? null,
        severity: task.severity,
        status: task.status,
        title: task.title,
        type: task.type
      })),
      error: null
    };
  } catch (error) {
    return {
      access: "allowed",
      currentRole: role,
      data: [],
      error: error instanceof Error ? error.message : "Unbekannter Fehler."
    };
  }
}
