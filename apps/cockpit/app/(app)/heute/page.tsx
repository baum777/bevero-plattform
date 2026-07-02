export const dynamic = "force-dynamic";

import { apiFetch, readApiJson } from "../../../lib/backend/api-fetch";
import { getShiftHandoverDraft } from "../../../lib/backend/shift-handover";
import { listReviewTasksForCurrentUser } from "../../../lib/backend/review-tasks";
import { createClient } from "../../../lib/supabase/server";
import { ShiftCommandClient } from "./shift-command-client";

import type { ShiftHandoverDraftPublicDTO } from "../../../lib/types/shift-handover";

type AdminStockRow = {
  inventoryItemId: string;
  name: string;
  status: "ok" | "low" | "negative" | "unknown";
};

async function fetchStockSummary(
  accessToken: string,
  organizationId: string
): Promise<{ lowCount: number; negativeCount: number }> {
  try {
    const res = await apiFetch("/admin/inventory/stock", {
      accessToken,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct"
    });
    if (!res.ok) return { lowCount: 0, negativeCount: 0 };
    const payload = (await readApiJson(res)) as { stock?: AdminStockRow[] };
    const items = payload.stock ?? [];
    return {
      lowCount: items.filter((i) => i.status === "low").length,
      negativeCount: items.filter((i) => i.status === "negative").length
    };
  } catch {
    return { lowCount: 0, negativeCount: 0 };
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

export default async function HeutePage() {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  const userId = sessionData.session?.user.id ?? null;
  const organizationId = userId ? await resolveOrganizationId(userId) : null;

  const [draftResult, tasksResult, stock] = await Promise.all([
    getShiftHandoverDraft({}),
    listReviewTasksForCurrentUser(),
    accessToken && organizationId
      ? fetchStockSummary(accessToken, organizationId)
      : Promise.resolve({ lowCount: 0, negativeCount: 0 })
  ]);

  const draft: ShiftHandoverDraftPublicDTO | null = draftResult.data;
  const openTaskCount = tasksResult.data.filter((t) => t.status === "open").length;
  const fehlbestandCount = stock.lowCount + stock.negativeCount;

  return (
    <ShiftCommandClient
      draft={draft}
      fehlbestandCount={fehlbestandCount}
      openTaskCount={openTaskCount}
    />
  );
}
