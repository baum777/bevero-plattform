import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server";
import { apiFetch, readApiJson } from "../../../../../../lib/backend/api-fetch";

type Params = {
  id: string;
  command: string;
};

type OrganizationMemberRow = {
  organizationId: string;
};

function isCommand(value: string) {
  return value === "start-review" || value === "resolve" || value === "dismiss";
}

export async function POST(
  _request: Request,
  context: { params: Promise<Params> }
) {
  const params = await context.params;
  if (!params.id || !isCommand(params.command)) {
    return NextResponse.json({ message: "Ungültige Aktion." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const session = sessionData.session;
  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    return NextResponse.json({ message: "Session ungültig." }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", session.user.id)
    .limit(1)
    .returns<OrganizationMemberRow[]>();
  const organizationId = memberships?.[0]?.organizationId ?? null;

  try {
    const response = await apiFetch(`/admin/review-tasks/${params.id}/${params.command}`, {
      accessToken,
      organizationId,
      requireOrganization: true,
      method: "POST",
      throwOnError: false,
      transportMode: "direct"
    });

    const body = await readApiJson<{ message?: string }>(response);
    if (!response.ok) {
      return NextResponse.json(
        { message: body.message ?? "Backend-Aktion fehlgeschlagen." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Backend nicht erreichbar." }, { status: 502 });
  }
}
