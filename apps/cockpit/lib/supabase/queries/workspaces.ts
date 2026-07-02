import { createClient } from "../server";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";
type WorkspaceRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type OrganizationMemberRow = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
};

type WorkspaceMemberRow = {
  createdAt: string;
  organizationId: string;
  role: WorkspaceRole;
  userId: string;
  workspaceId: string;
};

type UserProfileRow = {
  authUserId: string;
  displayName: string | null;
  email: string;
};

type WorkspaceMemberPreview = {
  displayName: string | null;
  email: string | null;
  role: WorkspaceRole;
  userId: string;
};

export type WorkspaceSummaryRow = {
  lastJoinedAt: string;
  memberCount: number;
  members: WorkspaceMemberPreview[];
  roles: Record<WorkspaceRole, number>;
  workspaceId: string;
};

export type WorkspaceSummariesResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  currentRole: OrganizationRole | null;
  data: WorkspaceSummaryRow[];
  error: string | null;
  organizationId: string | null;
};

export async function listWorkspaceSummariesForCurrentUser(): Promise<WorkspaceSummariesResult> {
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

  const { data: memberships, error: membershipsError } = await supabase
    .from("OrganizationMember")
    .select("organizationId,userId,role,createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .returns<OrganizationMemberRow[]>();

  if (membershipsError) {
    return {
      access: "forbidden",
      currentRole: null,
      data: [],
      error: membershipsError.message,
      organizationId: null
    };
  }

  const membership = memberships?.[0];
  if (!membership) {
    return {
      access: "forbidden",
      currentRole: null,
      data: [],
      error: null,
      organizationId: null
    };
  }

  const { data: workspaceMembers, error: workspaceMembersError } = await supabase
    .from("WorkspaceMember")
    .select("workspaceId,userId,role,organizationId,createdAt")
    .eq("organizationId", membership.organizationId)
    .order("createdAt", { ascending: false })
    .returns<WorkspaceMemberRow[]>();

  if (workspaceMembersError) {
    return {
      access: "allowed",
      currentRole: membership.role,
      data: [],
      error: workspaceMembersError.message,
      organizationId: membership.organizationId
    };
  }

  const rows = workspaceMembers ?? [];
  if (!rows.length) {
    return {
      access: "allowed",
      currentRole: membership.role,
      data: [],
      error: null,
      organizationId: membership.organizationId
    };
  }

  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  let profiles: UserProfileRow[] = [];
  if (userIds.length) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("UserProfile")
      .select("authUserId,displayName,email")
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
  const grouped = new Map<string, WorkspaceMemberRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.workspaceId) ?? [];
    group.push(row);
    grouped.set(row.workspaceId, group);
  }

  const data: WorkspaceSummaryRow[] = Array.from(grouped.entries())
    .map(([workspaceId, members]) => {
      const roles: Record<WorkspaceRole, number> = {
        owner: 0,
        admin: 0,
        manager: 0,
        staff: 0,
        viewer: 0
      };

      for (const member of members) {
        roles[member.role] += 1;
      }

      const previews = members.slice(0, 3).map((member) => {
        const profile = profilesByUserId.get(member.userId);
        return {
          displayName: profile?.displayName ?? null,
          email: profile?.email ?? null,
          role: member.role,
          userId: member.userId
        };
      });

      return {
        lastJoinedAt: members[0]?.createdAt ?? "",
        memberCount: members.length,
        members: previews,
        roles,
        workspaceId
      };
    })
    .sort((a, b) => b.lastJoinedAt.localeCompare(a.lastJoinedAt));

  return {
    access: "allowed",
    currentRole: membership.role,
    data,
    error: null,
    organizationId: membership.organizationId
  };
}
