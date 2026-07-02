import { createHmac, generateKeyPairSync, sign, type KeyObject } from "node:crypto";

import { describe, expect, it } from "vitest";

import { parseActorFromHeaders, requireActorRole } from "../src/modules/auth/actor.js";

const jwtSecret = "test-supabase-jwt-secret";

describe("authorization boundary", () => {
  it("fails closed when authorization header is missing", async () => {
    await expect(
      parseActorFromHeaders(
        {},
        {
          jwtSecret,
          db: membershipDb([])
        }
      )
    ).rejects.toThrow("authorization header is required");
  });

  it("maps organization memberships to route roles", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const actor = await parseActorFromHeaders(
      {
        authorization: `Bearer ${token}`
      },
      {
        jwtSecret,
        db: membershipDb([
          {
            organizationId: "org-1",
            role: "manager",
            createdAt: new Date("2026-05-30T10:00:00.000Z")
          }
        ])
      }
    );

    expect(requireActorRole(actor, ["shift_lead"])).toMatchObject({
      userId: "user-1",
      role: "shift_lead",
      organizationId: "org-1",
      organizationRole: "manager"
    });
  });

  it("falls back to the single membership when no organization header is sent", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const actor = await parseActorFromHeaders(
      { authorization: `Bearer ${token}` },
      {
        jwtSecret,
        db: membershipDb([
          { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") }
        ])
      }
    );

    expect(actor).toMatchObject({ organizationId: "org-1", role: "admin" });
  });

  it("rejects expired HS256 tokens", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });

    await expect(
      parseActorFromHeaders(
        { authorization: `Bearer ${token}` },
        {
          jwtSecret,
          db: membershipDb([
            { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") }
          ])
        }
      )
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects tokens without a subject claim", async () => {
    const token = signHs256Token({ exp: Math.floor(Date.now() / 1000) + 60 });

    await expect(
      parseActorFromHeaders(
        { authorization: `Bearer ${token}` },
        {
          jwtSecret,
          db: membershipDb([
            { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") }
          ])
        }
      )
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects actors without organization membership", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });

    await expect(
      parseActorFromHeaders(
        { authorization: `Bearer ${token}` },
        {
          jwtSecret,
          db: membershipDb([])
        }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each([
    ["owner", "admin"],
    ["admin", "admin"],
    ["manager", "shift_lead"],
    ["staff", "staff"],
    ["viewer", "viewer"]
  ] as const)("maps organization role %s to route role %s", async (organizationRole, routeRole) => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const actor = await parseActorFromHeaders(
      { authorization: `Bearer ${token}` },
      {
        jwtSecret,
        db: membershipDb([
          {
            organizationId: "org-1",
            role: organizationRole,
            createdAt: new Date("2026-05-30T10:00:00.000Z")
          }
        ])
      }
    );

    expect(actor.role).toBe(routeRole);
  });

  it("rejects multi-org actors that do not select an organization", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    await expect(
      parseActorFromHeaders(
        { authorization: `Bearer ${token}` },
        {
          jwtSecret,
          db: membershipDb([
            { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") },
            { organizationId: "org-2", role: "manager", createdAt: new Date("2026-05-31T10:00:00.000Z") }
          ])
        }
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("uses the selected organization and derives the role from that membership", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const actor = await parseActorFromHeaders(
      { authorization: `Bearer ${token}`, "x-organization-id": "org-2" },
      {
        jwtSecret,
        db: membershipDb([
          { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") },
          { organizationId: "org-2", role: "staff", createdAt: new Date("2026-05-31T10:00:00.000Z") }
        ])
      }
    );

    expect(actor).toMatchObject({
      organizationId: "org-2",
      organizationRole: "staff",
      role: "staff"
    });
  });

  it("forbids selecting an organization the actor does not belong to", async () => {
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    await expect(
      parseActorFromHeaders(
        { authorization: `Bearer ${token}`, "x-organization-id": "org-foreign" },
        {
          jwtSecret,
          db: membershipDb([
            { organizationId: "org-1", role: "admin", createdAt: new Date("2026-05-30T10:00:00.000Z") }
          ])
        }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("accepts Supabase ES256 tokens verified through project JWKS", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const publicJwk = publicKey.export({ format: "jwk" });
    const previousFetch = global.fetch;
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          keys: [
            {
              ...publicJwk,
              kid: "test-es256-key",
              use: "sig",
              alg: "ES256"
            }
          ]
        }),
        { status: 200 }
      );

    try {
      const token = signEs256Token(
        {
          aud: "authenticated",
          iss: "https://example.supabase.co/auth/v1",
          sub: "user-1",
          exp: Math.floor(Date.now() / 1000) + 60
        },
        privateKey
      );

      const actor = await parseActorFromHeaders(
        {
          authorization: `Bearer ${token}`
        },
        {
          db: membershipDb([
            {
              organizationId: "org-1",
              role: "owner",
              createdAt: new Date("2026-05-30T10:00:00.000Z")
            }
          ]),
          jwtSecret,
          supabaseUrl: "https://example.supabase.co"
        }
      );

      expect(actor).toMatchObject({
        userId: "user-1",
        role: "admin",
        organizationId: "org-1",
        organizationRole: "owner"
      });
    } finally {
      global.fetch = previousFetch;
    }
  });

  it("rejects ES256 tokens from an unexpected Supabase issuer", async () => {
    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256"
    });
    const token = signEs256Token(
      {
        aud: "authenticated",
        iss: "https://evil.supabase.co/auth/v1",
        sub: "user-1",
        exp: Math.floor(Date.now() / 1000) + 60
      },
      privateKey
    );

    await expect(
      parseActorFromHeaders(
        {
          authorization: `Bearer ${token}`
        },
        {
          db: membershipDb([]),
          jwtSecret,
          supabaseUrl: "https://example.supabase.co"
        }
      )
    ).rejects.toThrow("authorization token issuer is not trusted");
  });

  it("sets Supabase JWT claim context as bound parameters before membership lookup", async () => {
    const calls: Array<{ query: string; params: unknown[] }> = [];
    const order: string[] = [];
    const token = signHs256Token({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 60 });
    const memberships = [
      {
        organizationId: "org-1",
        role: "staff" as const,
        createdAt: new Date("2026-05-30T10:00:00.000Z")
      }
    ];
    const tx = {
      async $executeRawUnsafe(query: string, ...params: unknown[]) {
        calls.push({ query, params });
        order.push("exec");
        return 1;
      },
      organizationMember: {
        async findMany() {
          order.push("findMany");
          return memberships;
        }
      }
    };
    const db = {
      async $transaction<T>(callback: (txClient: typeof tx) => Promise<T>): Promise<T> {
        order.push("transaction");
        return callback(tx);
      },
      async $executeRawUnsafe(query: string, ...params: unknown[]) {
        calls.push({ query, params });
        return 1;
      },
      organizationMember: {
        async findMany() {
          order.push("findMany");
          return memberships;
        }
      }
    };

    const actor = await parseActorFromHeaders(
      {
        authorization: `Bearer ${token}`
      },
      {
        jwtSecret,
        db
      }
    );

    expect(actor.organizationId).toBe("org-1");
    expect(order).toEqual(["transaction", "exec", "exec", "findMany"]);

    // The subject must be passed as a bound parameter, never interpolated.
    expect(calls[0].query).toContain("request.jwt.claim.sub");
    expect(calls[0].query).toContain("$1");
    expect(calls[0].query).not.toContain("user-1");
    expect(calls[0].params).toEqual(["user-1"]);

    expect(calls[1].query).toContain("request.jwt.claims");
    expect(calls[1].query).toContain("$1");
    expect(calls[1].params).toEqual(['{"sub":"user-1"}']);
  });

  it("does not interpolate a malicious subject claim into the SQL string", async () => {
    const evilSub = "'; drop table \"OrganizationMember\"; --";
    const token = signHs256Token({ sub: evilSub, exp: Math.floor(Date.now() / 1000) + 60 });
    const captured: Array<{ query: string; params: unknown[] }> = [];
    const tx = {
      async $executeRawUnsafe(query: string, ...params: unknown[]) {
        captured.push({ query, params });
        return 1;
      },
      organizationMember: {
        async findMany() {
          return [
            {
              organizationId: "org-1",
              role: "staff" as const,
              createdAt: new Date("2026-05-30T10:00:00.000Z")
            }
          ];
        }
      }
    };
    const db = {
      async $transaction<T>(callback: (txClient: typeof tx) => Promise<T>): Promise<T> {
        return callback(tx);
      },
      async $executeRawUnsafe() {
        return 1;
      },
      organizationMember: tx.organizationMember
    };

    await parseActorFromHeaders({ authorization: `Bearer ${token}` }, { jwtSecret, db });

    for (const call of captured) {
      expect(call.query).not.toContain("drop table");
    }
    expect(captured[0]?.params).toEqual([evilSub]);
  });
});

function membershipDb(
  memberships: Array<{ organizationId: string; role: "owner" | "admin" | "manager" | "staff" | "viewer"; createdAt: Date }>
) {
  return {
    organizationMember: {
      async findMany() {
        return memberships;
      }
    }
  };
}

function signHs256Token(claims: Record<string, unknown>): string {
  const header = toBase64Url(
    Buffer.from(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT"
      })
    )
  );
  const payload = toBase64Url(Buffer.from(JSON.stringify(claims)));
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", jwtSecret).update(body).digest();

  return `${body}.${toBase64Url(signature)}`;
}

function signEs256Token(claims: Record<string, unknown>, privateKey: KeyObject): string {
  const header = toBase64Url(
    Buffer.from(
      JSON.stringify({
        alg: "ES256",
        kid: "test-es256-key",
        typ: "JWT"
      })
    )
  );
  const payload = toBase64Url(Buffer.from(JSON.stringify(claims)));
  const body = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(body), {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  });

  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
