import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { can, type Capability, type Role } from "./rbac";

type GuardContext = {
  userId: string;
  organizationId: string;
  role: Role;
};

type GuardResult =
  | { access: "allowed"; ctx: GuardContext }
  | { access: "forbidden"; ctx: GuardContext };

export async function requireCapability(capability: Capability): Promise<GuardResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("OrganizationMember")
    .select("organizationId,role")
    .eq("userId", userId)
    .limit(1)
    .maybeSingle();

  if (!membership?.organizationId) {
    redirect("/onboarding");
  }

  const role = membership.role as Role;
  const ctx: GuardContext = { userId, organizationId: membership.organizationId, role };

  if (!can(role, capability)) {
    return { access: "forbidden", ctx };
  }

  return { access: "allowed", ctx };
}
