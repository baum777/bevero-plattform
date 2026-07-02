"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const PROFILE_PATH = "/settings/profile";

function toNullableValue(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  return parsed ? parsed : null;
}

export async function updateProfileAction(formData: FormData) {
  const displayNameRaw = toNullableValue(formData.get("displayName"));
  const preferredStorageLocationId = toNullableValue(formData.get("preferredStorageLocationId"));
  const displayName = displayNameRaw ? displayNameRaw.slice(0, 80) : null;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  if (!userId) {
    redirect(`${PROFILE_PATH}?error=unauthenticated`);
  }

  let { data, error } = await supabase
    .from("UserProfile")
    .update({
      displayName,
      preferredStorageLocationId
    })
    .eq("authUserId", userId)
    .select("authUserId")
    .limit(1);

  if (error) {
    redirect(`${PROFILE_PATH}?error=update_failed`);
  }

  if (!data?.length) {
    let { error: upsertError } = await supabase.rpc("upsert_current_user_profile", {
      display_name: displayName,
      preferred_storage_location_id: preferredStorageLocationId
    });
    if (upsertError) {
      const fallback = await supabase.rpc("upsert_current_user_profile", {
        displayName,
        preferredStorageLocationId
      });
      upsertError = fallback.error;
    }

    if (upsertError) {
      redirect(`${PROFILE_PATH}?error=profile_missing`);
    }

    const retry = await supabase
      .from("UserProfile")
      .update({
        displayName,
        preferredStorageLocationId
      })
      .eq("authUserId", userId)
      .select("authUserId")
      .limit(1);

    data = retry.data;
    error = retry.error;
    if (error || !data?.length) {
      redirect(`${PROFILE_PATH}?error=update_failed`);
    }
  }

  redirect(`${PROFILE_PATH}?success=updated`);
}
