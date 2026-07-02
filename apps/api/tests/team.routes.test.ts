import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { OrganizationRole } from "../src/modules/auth/actor.js";
import type { TeamRouteDependencies } from "../src/routes/team.route.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function authHeaders(userId: string, organizationId = testOrganizationId): Record<string, string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 }))
  );
  const body = `${header}.${payload}`;
  const signature = toBase64Url(createHmac("sha256", testJwtSecret).update(body).digest());
  return {
    authorization: `Bearer ${body}.${signature}`,
    "x-organization-id": organizationId
  };
}

function orgRoleForUser(userId: string): OrganizationRole | null {
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("manager-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  return null;
}

function fakeTeam(overrides: Partial<TeamRouteDependencies["teamAdminService"]> = {}): TeamRouteDependencies {
  const calls: Array<{ email: string; role: string; organizationId: string | undefined }> = [];

  const dependencies: TeamRouteDependencies = {
    teamAdminService: {
      async confirmRegisteredMember(input) {
        calls.push({
          email: input.email,
          role: input.role,
          organizationId: input.actor.organizationId
        });
        return {
          organizationId: input.actor.organizationId ?? testOrganizationId,
          userId: "member-1",
          role: input.role,
          email: input.email,
          displayName: "Member One",
          createdAt: "2026-06-05T10:00:00.000Z"
        };
      },
      ...overrides
    },
    auth: {
      jwtSecret: testJwtSecret,
      db: {
        organizationMember: {
          async findMany(args: { where: { userId: string } }) {
            const role = orgRoleForUser(args.where.userId);
            if (!role) {
              return [];
            }
            return [
              {
                organizationId: testOrganizationId,
                role,
                createdAt: new Date("2026-06-01T10:00:00.000Z")
              }
            ];
          }
        }
      } as NonNullable<TeamRouteDependencies["auth"]>["db"]
    }
  };

  return Object.assign(dependencies, { calls });
}

describe("team admin API routes", () => {
  it("rejects unauthenticated member confirmations", async () => {
    const app = buildApp({
      env: { NODE_ENV: "test", SUPABASE_JWT_SECRET: testJwtSecret },
      team: fakeTeam()
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/admin/team/members/confirm",
        payload: { email: "staff@example.com", role: "staff" }
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("forbids non-admin organization roles", async () => {
    const app = buildApp({
      env: { NODE_ENV: "test", SUPABASE_JWT_SECRET: testJwtSecret },
      team: fakeTeam()
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/admin/team/members/confirm",
        headers: authHeaders("manager-1"),
        payload: { email: "staff@example.com", role: "staff" }
      });

      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("passes the selected organization context and role to the team service", async () => {
    const dependencies = fakeTeam() as TeamRouteDependencies & {
      calls: Array<{ email: string; role: string; organizationId: string | undefined }>;
    };
    const app = buildApp({
      env: { NODE_ENV: "test", SUPABASE_JWT_SECRET: testJwtSecret },
      team: dependencies
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/admin/team/members/confirm",
        headers: authHeaders("admin-1"),
        payload: { email: " Staff@Example.com ", role: "staff" }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().member).toMatchObject({
        organizationId: testOrganizationId,
        email: "staff@example.com",
        role: "staff"
      });
      expect(dependencies.calls).toEqual([
        { email: "staff@example.com", role: "staff", organizationId: testOrganizationId }
      ]);
    } finally {
      await app.close();
    }
  });

  it("rejects owner role assignment at request validation", async () => {
    const app = buildApp({
      env: { NODE_ENV: "test", SUPABASE_JWT_SECRET: testJwtSecret },
      team: fakeTeam()
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/admin/team/members/confirm",
        headers: authHeaders("owner-1"),
        payload: { email: "staff@example.com", role: "owner" }
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
