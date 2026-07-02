export const dynamic = "force-dynamic";

import { apiFetch, readApiJson } from "../../../lib/backend/api-fetch";
import { createClient } from "../../../lib/supabase/server";
import { FreigabenClient } from "./freigaben-client";
import { AccessDenied } from "../../components/access-denied";
import { PageScaffold } from "../../components/page-scaffold";

import type { CorrectionRequestListItem } from "../../../lib/types/correction-requests";

async function fetchCorrectionRequests(
  accessToken: string,
  organizationId: string,
  status = "open"
): Promise<CorrectionRequestListItem[]> {
  try {
    const res = await apiFetch(
      `/admin/correction-requests?status=${encodeURIComponent(status)}&limit=100`,
      {
        accessToken,
        organizationId,
        requireOrganization: true,
        throwOnError: false,
        transportMode: "direct"
      }
    );
    if (!res.ok) return [];
    const payload = (await readApiJson(res)) as { correctionRequests?: CorrectionRequestListItem[] };
    return payload.correctionRequests ?? [];
  } catch {
    return [];
  }
}

export default async function FreigabenPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return (
      <PageScaffold title="Freigaben">
        <AccessDenied description="Bitte melde dich an." />
      </PageScaffold>
    );
  }

  const { data: memberships } = await supabase
    .from("OrganizationMember")
    .select("organizationId,role")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  const role = memberships?.role as string | undefined;
  const organizationId = memberships?.organizationId ?? null;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  if (!allowed || !organizationId) {
    return (
      <PageScaffold title="Freigaben">
        <AccessDenied description="Freigaben sind nur für Manager und Admins zugänglich." />
      </PageScaffold>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;

  const requests = accessToken ? await fetchCorrectionRequests(accessToken, organizationId) : [];

  return <FreigabenClient initialRequests={requests} />;
}
