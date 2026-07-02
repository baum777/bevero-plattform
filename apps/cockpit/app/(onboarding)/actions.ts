"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export async function onboardingAction(formData: FormData) {
  const organizationName = String(formData.get("organizationName") ?? "").trim();

  if (!organizationName) {
    redirect("/onboarding?error=missing_name");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect("/sign-in?error=invalid_credentials");
  }

  const { error } = await supabase.rpc("create_organization_for_current_user", {
    organization_name: organizationName
  });

  if (error) {
    console.error("Organization onboarding failed", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    redirect("/onboarding?error=create_failed");
  }

  redirect("/dashboard");
}
