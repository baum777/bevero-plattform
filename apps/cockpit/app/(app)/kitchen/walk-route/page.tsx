export const dynamic = "force-dynamic";

import { apiFetch, readApiJson } from "../../../../lib/backend/api-fetch";
import { createClient } from "../../../../lib/supabase/server";
import { WalkRouteClient } from "./walk-route-client";

import type { StockByLocationEntry } from "../../../../lib/types/walk-route";

async function fetchStockByLocation(
  accessToken: string,
  organizationId: string,
  workspaceGroupId: string
): Promise<StockByLocationEntry[]> {
  try {
    const res = await apiFetch(
      `/admin/inventory/stock-by-location?workspace_group_id=${encodeURIComponent(workspaceGroupId)}`,
      {
        accessToken,
        organizationId,
        requireOrganization: true,
        throwOnError: false,
        transportMode: "direct"
      }
    );
    if (!res.ok) return [];
    const payload = (await readApiJson(res)) as { locations?: StockByLocationEntry[] };
    return payload.locations ?? [];
  } catch {
    return [];
  }
}

async function resolveOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.organizationId ?? null;
}

type WalkRoutePageProps = {
  searchParams?: Promise<{ workspace_group_id?: string }>;
};

export default async function WalkRoutePage({ searchParams }: WalkRoutePageProps) {
  const params = (await searchParams) ?? {};
  const workspaceGroupId = params.workspace_group_id ?? "wg-mwbb-kitchen";

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  const userId = sessionData.session?.user.id ?? null;
  const organizationId = userId ? await resolveOrganizationId(userId) : null;

  const locations = accessToken && organizationId
    ? await fetchStockByLocation(accessToken, organizationId, workspaceGroupId)
    : [];

  return <WalkRouteClient locations={locations} workspaceGroupId={workspaceGroupId} />;
}
