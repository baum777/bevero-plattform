export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("OrganizationMember")
    .select("role")
    .eq("userId", userId)
    .limit(1)
    .maybeSingle<{ role: string }>();

  const role = membership?.role;
  if (role === "owner" || role === "admin" || role === "manager") {
    redirect("/dashboard");
  }

  redirect("/inventory/bar-refill");
}
