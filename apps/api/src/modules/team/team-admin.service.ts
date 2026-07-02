import type { Actor, OrganizationRole } from "../auth/actor.js";

export const assignableOrganizationRoles = ["admin", "manager", "staff", "viewer"] as const;

export type AssignableOrganizationRole = (typeof assignableOrganizationRoles)[number];

export type ConfirmRegisteredMemberInput = {
  actor: Actor;
  email: string;
  role: AssignableOrganizationRole;
};

export type ConfirmedOrganizationMember = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  email: string;
  displayName: string | null;
  createdAt: string;
};

type UserProfileRow = {
  authUserId: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
};

type OrganizationMemberRow = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
};

export type TeamAdminDatabaseClient = {
  userProfile: {
    findUnique(args: {
      where: {
        email: string;
      };
      select: {
        authUserId: true;
        email: true;
        displayName: true;
        isActive: true;
      };
    }): Promise<UserProfileRow | null>;
  };
  organizationMember: {
    findUnique(args: {
      where: {
        organizationId_userId: {
          organizationId: string;
          userId: string;
        };
      };
      select: {
        organizationId: true;
        userId: true;
        role: true;
        createdAt: true;
      };
    }): Promise<OrganizationMemberRow | null>;
    upsert(args: {
      where: {
        organizationId_userId: {
          organizationId: string;
          userId: string;
        };
      };
      create: {
        organizationId: string;
        userId: string;
        role: AssignableOrganizationRole;
      };
      update: {
        role: AssignableOrganizationRole;
      };
      select: {
        organizationId: true;
        userId: true;
        role: true;
        createdAt: true;
      };
    }): Promise<OrganizationMemberRow>;
  };
};

export class TeamAdminError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 409) {
    super(message);
    this.name = "TeamAdminError";
    this.statusCode = statusCode;
  }
}

export type TeamAdminServicePort = {
  confirmRegisteredMember(
    input: ConfirmRegisteredMemberInput
  ): Promise<ConfirmedOrganizationMember>;
};

export class TeamAdminService implements TeamAdminServicePort {
  private readonly db: TeamAdminDatabaseClient;

  public constructor(options: { db: TeamAdminDatabaseClient }) {
    this.db = options.db;
  }

  public async confirmRegisteredMember(
    input: ConfirmRegisteredMemberInput
  ): Promise<ConfirmedOrganizationMember> {
    const organizationId = input.actor.organizationId;
    const actorOrganizationRole = input.actor.organizationRole;

    if (!organizationId || !actorOrganizationRole) {
      throw new TeamAdminError("actor has no organization context", 403);
    }
    if (actorOrganizationRole !== "owner" && actorOrganizationRole !== "admin") {
      throw new TeamAdminError("actor role is not permitted", 403);
    }
    if (input.role === "admin" && actorOrganizationRole !== "owner") {
      throw new TeamAdminError("only owners can assign admin role", 403);
    }

    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new TeamAdminError("email is required", 400);
    }

    const profile = await this.db.userProfile.findUnique({
      where: {
        email
      },
      select: {
        authUserId: true,
        email: true,
        displayName: true,
        isActive: true
      }
    });

    if (!profile || !profile.isActive) {
      throw new TeamAdminError("registered user profile was not found", 404);
    }
    if (profile.authUserId === input.actor.userId) {
      throw new TeamAdminError("admins cannot confirm their own account", 400);
    }

    const existing = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: profile.authUserId
        }
      },
      select: {
        organizationId: true,
        userId: true,
        role: true,
        createdAt: true
      }
    });

    if (existing?.role === "owner") {
      throw new TeamAdminError("owner memberships cannot be changed here", 409);
    }

    const member = await this.db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: profile.authUserId
        }
      },
      create: {
        organizationId,
        userId: profile.authUserId,
        role: input.role
      },
      update: {
        role: input.role
      },
      select: {
        organizationId: true,
        userId: true,
        role: true,
        createdAt: true
      }
    });

    return {
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      email: profile.email,
      displayName: profile.displayName,
      createdAt: member.createdAt.toISOString()
    };
  }
}
