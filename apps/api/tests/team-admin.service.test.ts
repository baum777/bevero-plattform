import { describe, expect, it } from "vitest";

import { TeamAdminService } from "../src/modules/team/team-admin.service.js";
import type { TeamAdminDatabaseClient } from "../src/modules/team/team-admin.service.js";
import type { Actor, OrganizationRole } from "../src/modules/auth/actor.js";

type MemberRow = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
};

function adminActor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: "admin-user",
    role: "admin",
    organizationId: "org-1",
    organizationRole: "admin",
    ...overrides
  };
}

function fakeDb(options: {
  profile?: {
    authUserId: string;
    email: string;
    displayName: string | null;
    isActive: boolean;
  } | null;
  existing?: MemberRow | null;
  createdAt?: Date;
  calls?: Array<{ role: string; organizationId: string; userId: string }>;
} = {}): TeamAdminDatabaseClient {
  const profile =
    options.profile === undefined
      ? {
          authUserId: "staff-user",
          email: "staff@example.com",
          displayName: "Staff User",
          isActive: true
        }
      : options.profile;

  return {
    userProfile: {
      async findUnique() {
        return profile;
      }
    },
    organizationMember: {
      async findUnique() {
        return options.existing ?? null;
      },
      async upsert(args) {
        options.calls?.push({
          role: args.create.role,
          organizationId: args.create.organizationId,
          userId: args.create.userId
        });
        return {
          organizationId: args.create.organizationId,
          userId: args.create.userId,
          role: args.update.role,
          createdAt: options.createdAt ?? new Date("2026-06-05T10:00:00.000Z")
        };
      }
    }
  };
}

describe("TeamAdminService", () => {
  it("confirms a registered profile into the actor organization with the selected role", async () => {
    const calls: Array<{ role: string; organizationId: string; userId: string }> = [];
    const service = new TeamAdminService({ db: fakeDb({ calls }) });

    const member = await service.confirmRegisteredMember({
      actor: adminActor(),
      email: " STAFF@example.com ",
      role: "staff"
    });

    expect(member).toMatchObject({
      organizationId: "org-1",
      userId: "staff-user",
      role: "staff",
      email: "staff@example.com",
      displayName: "Staff User",
      createdAt: "2026-06-05T10:00:00.000Z"
    });
    expect(calls).toEqual([{ role: "staff", organizationId: "org-1", userId: "staff-user" }]);
  });

  it("lets owners assign admin role", async () => {
    const service = new TeamAdminService({ db: fakeDb() });

    const member = await service.confirmRegisteredMember({
      actor: adminActor({ userId: "owner-user", organizationRole: "owner" }),
      email: "staff@example.com",
      role: "admin"
    });

    expect(member.role).toBe("admin");
  });

  it("blocks non-owner admins from assigning admin role", async () => {
    const service = new TeamAdminService({ db: fakeDb() });

    await expect(
      service.confirmRegisteredMember({
        actor: adminActor(),
        email: "staff@example.com",
        role: "admin"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "only owners can assign admin role"
    });
  });

  it("rejects missing or inactive registered profiles", async () => {
    const service = new TeamAdminService({
      db: fakeDb({
        profile: {
          authUserId: "staff-user",
          email: "staff@example.com",
          displayName: null,
          isActive: false
        }
      })
    });

    await expect(
      service.confirmRegisteredMember({
        actor: adminActor(),
        email: "staff@example.com",
        role: "staff"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "registered user profile was not found"
    });
  });

  it("does not mutate owner memberships through the confirmation flow", async () => {
    const service = new TeamAdminService({
      db: fakeDb({
        existing: {
          organizationId: "org-1",
          userId: "staff-user",
          role: "owner",
          createdAt: new Date("2026-06-04T10:00:00.000Z")
        }
      })
    });

    await expect(
      service.confirmRegisteredMember({
        actor: adminActor({ organizationRole: "owner" }),
        email: "staff@example.com",
        role: "viewer"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "owner memberships cannot be changed here"
    });
  });
});
