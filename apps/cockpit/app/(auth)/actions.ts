"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { sanitizeInternalRedirect } from "../../lib/auth/redirect";

function hasPasswordStrength(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeInternalRedirect(String(formData.get("next") ?? ""));

  if (!email || !password) {
    redirect("/sign-in?error=missing_fields");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Supabase sign-in failed", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code
    });
    redirect("/sign-in?error=invalid_credentials");
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!fullName || !email || !password || !passwordConfirm) {
    redirect("/sign-up?error=missing_fields");
  }
  if (!hasPasswordStrength(password)) {
    redirect("/sign-up?error=weak_password");
  }
  if (password !== passwordConfirm) {
    redirect("/sign-up?error=password_mismatch");
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/callback?next=/onboarding`,
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirect("/sign-up?error=sign_up_failed");
  }

  if (!data.session) {
    redirect("/sign-in?message=check_email");
  }

  const { error: profileError } = await supabase.rpc("upsert_current_user_profile", {
    display_name: fullName,
    preferred_storage_location_id: null
  });

  if (profileError) {
    console.error("Supabase profile upsert failed after sign-up", {
      name: profileError.name,
      message: profileError.message,
      code: profileError.code
    });
    redirect("/sign-up?error=profile_failed");
  }

  redirect("/onboarding");
}
