import { NextResponse } from "next/server";
import { getKitchenDashboardKpis } from "../../../../lib/supabase/queries/kitchen-dashboard";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceGroupId = url.searchParams.get("workspaceGroupId");

  if (!workspaceGroupId) {
    return NextResponse.json(
      { access: "forbidden", data: null, error: "workspaceGroupId fehlt." },
      { status: 400 }
    );
  }

  const result = await getKitchenDashboardKpis(workspaceGroupId);
  const status = result.access === "unauthenticated" ? 401 : 200;

  return NextResponse.json(result, { status });
}
