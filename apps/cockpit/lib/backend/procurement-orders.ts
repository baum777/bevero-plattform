import { apiFetch, readApiJson } from "./api-fetch";
import { createClient } from "../supabase/server";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type OrganizationMemberRow = {
  organizationId: string;
  role: OrganizationRole;
};

type ProcurementOrderListItem = {
  id: string;
  externalOrderNumber: string;
  supplierName: string;
  status: string;
  expectedDeliveryAt?: string;
  itemCount: number;
  unmappedCount: number;
  createdAt: string;
};

type ProcurementOrderListPayload = {
  data?: ProcurementOrderListItem[];
  message?: string;
};

export type ProcurementOrderLine = {
  id: string;
  lineNumber: number;
  productNameRaw: string;
  supplierSku?: string;
  unit: string;
  orderedQty: number;
  inventoryItemId?: string;
  mappingStatus: string;
  comment?: string;
};

export type ProcurementOrderDetail = {
  order: {
    id: string;
    externalOrderNumber: string;
    supplierName: string;
    status: string;
    source: string;
    orderedAt: string;
    expectedDeliveryAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: ProcurementOrderLine[];
};

type ProcurementOrderDetailPayload = ProcurementOrderDetail & {
  message?: string;
};

export type ProcurementOrdersResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  currentRole: OrganizationRole | null;
  data: ProcurementOrderListItem[];
  error: string | null;
};

export type ProcurementOrderDetailResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  currentRole: OrganizationRole | null;
  data: ProcurementOrderDetail | null;
  error: string | null;
};

const allowedRoles: OrganizationRole[] = ["owner", "admin", "manager"];

export async function listFoodNotifyPendingReceiptsForCurrentUser(): Promise<ProcurementOrdersResult> {
  const auth = await resolveBackendAuth();
  if (auth.access !== "allowed") {
    return { ...auth, data: [], error: auth.error };
  }

  const statuses = ["pending_receipt", "needs_mapping", "ready_to_confirm"];
  const results = await Promise.all(
    statuses.map((status) =>
      apiFetch(`/procurement/orders?source=foodnotify_email&status=${status}`, {
        accessToken: auth.accessToken,
        organizationId: auth.organizationId,
        requireOrganization: true,
        throwOnError: false,
        transportMode: "direct"
      })
    )
  );

  const payloads = await Promise.all(
    results.map((response) => readApiJson(response).catch(() => ({})) as Promise<ProcurementOrderListPayload>)
  );
  const failed = results.findIndex((response) => !response.ok);
  if (failed >= 0) {
    return {
      access: "allowed",
      currentRole: auth.currentRole,
      data: [],
      error: payloads[failed]?.message ?? "FoodNotify-Wareneingänge konnten nicht geladen werden."
    };
  }

  return {
    access: "allowed",
    currentRole: auth.currentRole,
    data: payloads.flatMap((payload) => payload.data ?? []),
    error: null
  };
}

export async function getProcurementOrderForCurrentUser(
  id: string
): Promise<ProcurementOrderDetailResult> {
  const auth = await resolveBackendAuth();
  if (auth.access !== "allowed") {
    return { ...auth, data: null, error: auth.error };
  }

  const response = await apiFetch(`/procurement/orders/${encodeURIComponent(id)}`, {
    accessToken: auth.accessToken,
    organizationId: auth.organizationId,
    requireOrganization: true,
    throwOnError: false,
    transportMode: "direct"
  });
  const payload = (await readApiJson(response).catch(() => ({}))) as ProcurementOrderDetailPayload;
  if (!response.ok) {
    return {
      access: "allowed",
      currentRole: auth.currentRole,
      data: null,
      error: payload.message ?? "FoodNotify-Wareneingang konnte nicht geladen werden."
    };
  }

  return {
    access: "allowed",
    currentRole: auth.currentRole,
    data: {
      order: payload.order,
      items: payload.items ?? []
    },
    error: null
  };
}

async function resolveBackendAuth(): Promise<
  | {
      access: "allowed";
      currentRole: OrganizationRole;
      accessToken: string;
      organizationId: string;
      error: null;
    }
  | { access: "forbidden" | "unauthenticated"; currentRole: OrganizationRole | null; error: string | null }
> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  if (userError || !userId) {
    return {
      access: "unauthenticated",
      currentRole: null,
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
    return { access: "forbidden", currentRole: null, error: membershipsError.message };
  }

  const role = memberships?.[0]?.role ?? null;
  const organizationId = memberships?.[0]?.organizationId ?? null;
  if (!role || !allowedRoles.includes(role)) {
    return { access: "forbidden", currentRole: role, error: null };
  }
  if (!organizationId) {
    return { access: "forbidden", currentRole: role, error: "Organisationskontext fehlt." };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    return {
      access: "unauthenticated",
      currentRole: role,
      error: sessionError?.message ?? "Session-Token fehlt."
    };
  }

  return { access: "allowed", currentRole: role, accessToken, organizationId, error: null };
}
