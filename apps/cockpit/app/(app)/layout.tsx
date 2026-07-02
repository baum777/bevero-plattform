// All routes in the authenticated (app) group require a live session —
// none can be statically prerendered at build time.
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { AuthProvider } from "../providers/auth-provider";
import { WorkspaceProvider } from "../providers/workspace-provider";
import { createClient } from "../../lib/supabase/server";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", userId)
    .limit(1)
    .maybeSingle();

  if (!membership?.organizationId) {
    redirect("/onboarding");
  }

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppShell>{children}</AppShell>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
