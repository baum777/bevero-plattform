import { createClient } from "../server";
import { ROLE_RANK, type Role } from "../../auth/rbac";
import { apiFetch, readApiJson } from "../../backend/api-fetch";

export type PendingInvite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type InviteListResult =
  | { access: "allowed"; organizationId: string; currentRole: Role; data: PendingInvite[]; error: string | null }
  | { access: "forbidden" | "unauthenticated"; organizationId: null; currentRole: null; data: []; error: string | null };

export async function listPendingInvitesForOrganization(
  token: string,
  organizationId: string
): Promise<{ data: PendingInvite[]; error: string | null }> {
  try {
    const res = await apiFetch("/admin/team/invites", {
      accessToken: token,
      organizationId,
      requireOrganization: true,
      throwOnError: false,
      transportMode: "direct"
    });
    if (!res.ok) {
      const body = await readApiJson<{ message?: string }>(res);
      return { data: [], error: body.message ?? "Einladungen konnten nicht geladen werden." };
    }
    const body = await readApiJson<{ invites: PendingInvite[] }>(res);
    return { data: body.invites ?? [], error: null };
  } catch {
    return { data: [], error: "Netzwerkfehler beim Laden der Einladungen." };
  }
}

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type OrganizationMemberRow = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
};

type UserProfileRow = {
  authUserId: string;
  displayName: string | null;
  email: string;
  isActive: boolean;
};

export type TeamMemberRow = {
  createdAt: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean | null;
  role: OrganizationRole;
  userId: string;
};

export type TeamMembersResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  currentRole: OrganizationRole | null;
  data: TeamMemberRow[];
  error: string | null;
  organizationId: string | null;
};


export async function listTeamMembersForCurrentOrganization(): Promise<TeamMembersResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  if (userError || !userId) {
    return {
      access: "unauthenticated",
      currentRole: null,
      data: [],
      error: userError?.message ?? "Keine aktive Session gefunden.",
      organizationId: null
    };
  }

  const { data: myMemberships, error: myMembershipError } = await supabase
    .from("OrganizationMember")
    .select("organizationId,userId,role,createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<OrganizationMemberRow[]>();

  if (myMembershipError) {
    return {
      access: "forbidden",
      currentRole: null,
      data: [],
      error: myMembershipError.message,
      organizationId: null
    };
  }

  const membership = myMemberships?.[0];
  if (!membership) {
    return {
      access: "forbidden",
      currentRole: null,
      data: [],
      error: null,
      organizationId: null
    };
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return {
      access: "forbidden",
      currentRole: membership.role,
      data: [],
      error: null,
      organizationId: membership.organizationId
    };
  }

  const { data: members, error: membersError } = await supabase
    .from("OrganizationMember")
    .select("organizationId,userId,role,createdAt")
    .eq("organizationId", membership.organizationId)
    .order("createdAt", { ascending: true })
    .returns<OrganizationMemberRow[]>();

  if (membersError) {
    return {
      access: "allowed",
      currentRole: membership.role,
      data: [],
      error: membersError.message,
      organizationId: membership.organizationId
    };
  }

  const memberRows = members ?? [];
  const userIds = Array.from(new Set(memberRows.map((row) => row.userId)));

  let profiles: UserProfileRow[] = [];
  if (userIds.length) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("UserProfile")
      .select("authUserId,displayName,email,isActive")
      .in("authUserId", userIds)
      .returns<UserProfileRow[]>();

    if (profilesError) {
      return {
        access: "allowed",
        currentRole: membership.role,
        data: [],
        error: profilesError.message,
        organizationId: membership.organizationId
      };
    }
    profiles = profileRows ?? [];
  }

  const profilesByUserId = new Map(profiles.map((profile) => [profile.authUserId, profile]));

  const data = memberRows
    .map((row) => {
      const profile = profilesByUserId.get(row.userId);
      return {
        createdAt: row.createdAt,
        displayName: profile?.displayName ?? null,
        email: profile?.email ?? null,
        isActive: profile?.isActive ?? null,
        role: row.role,
        userId: row.userId
      } as TeamMemberRow;
    })
    .sort((a, b) => {
      const rank = (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0);
      if (rank !== 0) return rank;
      return a.createdAt.localeCompare(b.createdAt);
    });

  return {
    access: "allowed",
    currentRole: membership.role,
    data,
    error: null,
    organizationId: membership.organizationId
  };
}
