import { createClient } from "../server";

type UserProfileRow = {
  authUserId: string;
  createdAt: string;
  defaultTeamId: string | null;
  displayName: string | null;
  email: string;
  preferredStorageLocationId: string | null;
  updatedAt: string;
};

type StorageLocationRow = {
  id: string;
  isActive: boolean;
  name: string;
};

type OrganizationMemberRow = {
  role: "owner" | "admin" | "manager" | "staff" | "viewer";
};

export type ProfileView = {
  createdAt: string | null;
  defaultTeamId: string | null;
  displayName: string | null;
  email: string | null;
  organizationRole: OrganizationMemberRow["role"] | null;
  preferredStorageLocationId: string | null;
  storageLocations: StorageLocationRow[];
  updatedAt: string | null;
  userId: string;
};

export type ProfileResult = {
  access: "allowed" | "unauthenticated";
  data: ProfileView | null;
  error: string | null;
};

export async function getCurrentProfile(): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const email = userData.user?.email ?? null;

  if (userError || !userId) {
    return {
      access: "unauthenticated",
      data: null,
      error: userError?.message ?? "Keine aktive Session gefunden."
    };
  }

  let [{ data: profileRows, error: profileError }, { data: storageLocations, error: locationsError }] =
    await Promise.all([
      supabase
        .from("UserProfile")
        .select("authUserId,email,displayName,defaultTeamId,preferredStorageLocationId,createdAt,updatedAt")
        .eq("authUserId", userId)
        .limit(1)
        .returns<UserProfileRow[]>(),
      supabase
        .from("StorageLocation")
        .select("id,name,isActive")
        .eq("isActive", true)
        .order("name", { ascending: true })
        .returns<StorageLocationRow[]>()
    ]);

  if (!profileError && (!profileRows || profileRows.length === 0)) {
    await ensureCurrentProfileRow(supabase);
    const retry = await supabase
      .from("UserProfile")
      .select("authUserId,email,displayName,defaultTeamId,preferredStorageLocationId,createdAt,updatedAt")
      .eq("authUserId", userId)
      .limit(1)
      .returns<UserProfileRow[]>();
    profileRows = retry.data;
    profileError = retry.error;
  }

  if (profileError) {
    return {
      access: "allowed",
      data: null,
      error: profileError.message
    };
  }

  if (locationsError) {
    return {
      access: "allowed",
      data: null,
      error: locationsError.message
    };
  }

  const { data: membershipRows } = await supabase
    .from("OrganizationMember")
    .select("role")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<OrganizationMemberRow[]>();

  const row = profileRows?.[0];
  return {
    access: "allowed",
    data: {
      createdAt: row?.createdAt ?? null,
      defaultTeamId: row?.defaultTeamId ?? null,
      displayName: row?.displayName ?? null,
      email: row?.email ?? email,
      organizationRole: membershipRows?.[0]?.role ?? null,
      preferredStorageLocationId: row?.preferredStorageLocationId ?? null,
      storageLocations: storageLocations ?? [],
      updatedAt: row?.updatedAt ?? null,
      userId
    },
    error: null
  };
}

async function ensureCurrentProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  let { error } = await supabase.rpc("upsert_current_user_profile", {
    display_name: null,
    preferred_storage_location_id: null
  });

  if (error) {
    const fallback = await supabase.rpc("upsert_current_user_profile", {
      displayName: null,
      preferredStorageLocationId: null
    });
    error = fallback.error;
  }

  return { error };
}
