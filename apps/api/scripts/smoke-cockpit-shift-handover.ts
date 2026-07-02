/**
 * Cockpit /shift-handover user-path smoke test.
 *
 * Mirrors the shape of `scripts/smoke-inventory-api.ts` and the
 * `scripts/verify-adr-0025-handover-draft-policies.ts` safety model.
 *
 * Strategy: this repo's route tests use Fastify's in-process `app.inject()`
 * against `buildApp()`, and `supertest` is not installed. This smoke test
 * follows that local convention instead of calling an externally running
 * Cockpit server. The script exercises the 3 backend endpoints
 * (`GET /shift-handover/draft`, `PATCH /shift-handover/draft`,
 * `POST /shift-handover/draft/:id/confirm`) and records the 6 expected
 * status codes per `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`
 * §Post-promotion Cockpit user-path smoke block.
 *
 * Safety model for live-DB use:
 *   - Refuses to run against localhost / 127.0.0.1 (same guard as
 *     `scripts/verify-adr-0025-handover-draft-policies.ts`).
 *   - Refuses to run without `DATABASE_URL`.
 *   - Only creates rows whose ids start with `codex-shift-smoke-*` and only
 *     for a dedicated smoke `OrganizationMember` whose `userId` starts with
 *     the same prefix; the membership and the rows are removed before exit.
 *   - Exercises the public Cockpit user-path, not direct table writes.
 *   - Never calls global reset endpoints; never impersonates `app_runtime`
 *     or `service_role`; the actor is a real `authenticated` `OrganizationMember`
 *     mapped through `mapOrganizationRoleToRouteRole` to a route-layer role.
 *
 * Auth model (mirror of `scripts/smoke-inventory-api.ts`):
 *   - `parseActorFromHeaders` in `src/modules/auth/actor.ts` accepts a signed
 *     HS256 JWT whose `sub` maps to an OrganizationMember. The script mints a
 *     JWT for a scoped smoke user with `organizationRole: 'manager'`
 *     (which `mapOrganizationRoleToRouteRole` maps to the route-layer role
 *     `shift_lead`, satisfying both the GET/PATCH route gate and the
 *     confirm-endpoint service-layer `managerRoles` check).
 *   - The script seeds + tears down the OrganizationMember row directly via
 *     `prisma.organizationMember` (the same pattern as
 *     `scripts/smoke-inventory-api.ts` line 173-204).
 *
 * The 6 expected status codes (from the closure MSPR §Post-promotion Cockpit
 * user-path smoke block):
 *   1. 200 GET       — first call auto-creates a draft for the org+shift-lead
 *   2. 200 PATCH     — autosave updates a field on the open draft
 *   3. 429 throttle  — 2nd PATCH within 2s of the 1st (in-memory LRU)
 *   4. 200 confirm   — POST .../confirm sets `confirmedAt = now()`
 *   5. 409 PATCH-after-confirm — service-layer 409 (immutable post-confirm)
 *   6. 404 unknown id — POST .../confirm with an unknown :id
 *
 * Exit code: 0 if all 6 checks pass, 1 if any fail, 2 on config error.
 */

import { createHmac, randomUUID } from "node:crypto";
import { inspect } from "node:util";

import type { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import type { FastifyInstance } from "fastify";

const smokePrefix = "codex-shift-smoke-";
const unknownDraftId = "00000000-0000-0000-0000-000000000000";

type AppModule = {
  buildApp: (options?: {
    logger?: false;
    env?: {
      NODE_ENV: "development" | "test" | "production";
      DEMO_MODE: boolean;
      SUPABASE_JWT_SECRET?: string;
    };
  }) => FastifyInstance;
};

type PrismaModule = {
  prisma: PrismaClient;
};

config();

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl) {
  console.error("Failed: DATABASE_URL not set for Cockpit shift-handover smoke gate.");
  console.error(
    'Export DATABASE_URL pointing to a Supabase project (e.g. "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres").'
  );
  process.exit(2);
}

if (isLocalDatabaseUrl(databaseUrl)) {
  console.error("Failed: Cockpit shift-handover smoke must not target a local database URL.");
  console.error(`Refusing to run against ${redactDatabaseUrl(databaseUrl)}.`);
  process.exit(2);
}

const appJwtSecret = process.env.SUPABASE_JWT_SECRET?.trim() || "test-supabase-jwt-secret";
if (!process.env.SUPABASE_JWT_SECRET?.trim()) {
  console.warn("⚠ SUPABASE_JWT_SECRET not set; using the development fallback secret. The smoke will fail if the live DB's app_runtime JWT secret differs.");
}
const smokeActorUserId = `${smokePrefix}manager-${randomUUID()}`;
const smokeActorMemberId = `member_${randomUUID()}`;
const smokeActorOrganizationId = `${smokePrefix}org-${randomUUID()}`;
const smokeBearerToken = createSmokeJwt(smokeActorUserId, appJwtSecret);
const adminHeaders = {
  authorization: `Bearer ${smokeBearerToken}`,
  "x-organization-id": smokeActorOrganizationId
};

console.warn(
  `⚠ COCKPIT SHIFT-HANDOVER SMOKE – schreibt scoped ${smokePrefix}* Daten gegen die konfigurierte Datenbank: ${redactDatabaseUrl(databaseUrl)}`
);

const appModulePath: string = "../src/app.js";
const prismaModulePath: string = "../src/lib/prisma.js";
const { buildApp } = (await import(appModulePath)) as AppModule;
const { prisma } = (await import(prismaModulePath)) as PrismaModule;

const app = buildApp({
  env: {
    NODE_ENV: "development",
    DEMO_MODE: false,
    SUPABASE_JWT_SECRET: appJwtSecret
  }
});

type CheckResult = {
  id: number;
  description: string;
  expected: number;
  actual: number;
  passed: boolean;
};

const results: CheckResult[] = [];

function recordResult(id: number, description: string, expected: number, actual: number): void {
  results.push({ id, description, expected, actual, passed: actual === expected });
}

try {
  await app.ready();
  await seedSmokeActorMembership();
  await cleanupSmokeDrafts();

  // Step 1: 200 GET — auto-create on first call.
  const getResponse = await app.inject({
    method: "GET",
    url: "/shift-handover/draft",
    headers: adminHeaders
  });
  recordResult(
    1,
    "GET /shift-handover/draft (first call, auto-create)",
    200,
    getResponse.statusCode
  );

  let draftId: string | null = null;
  if (getResponse.statusCode === 200) {
    const body = readJson(getResponse.body, "GET /shift-handover/draft body");
    const draft = readRecord(body.draft, "GET /shift-handover/draft body.draft");
    const id = draft.id;
    if (typeof id === "string" && id.length > 0) {
      draftId = id;
    }
  }

  // Step 2: 200 PATCH — autosave updates a field.
  const patchBody = { summary: "Smoke summary " + randomUUID().slice(0, 8) };
  const patchResponse = await app.inject({
    method: "PATCH",
    url: "/shift-handover/draft",
    headers: adminHeaders,
    payload: patchBody
  });
  recordResult(
    2,
    "PATCH /shift-handover/draft (autosave, 1st of 2 within 2s)",
    200,
    patchResponse.statusCode
  );

  // Step 3: 429 throttle — 2nd PATCH within 2s of the 1st.
  const throttledResponse = await app.inject({
    method: "PATCH",
    url: "/shift-handover/draft",
    headers: adminHeaders,
    payload: { notes: "Smoke notes " + randomUUID().slice(0, 8) }
  });
  recordResult(
    3,
    "PATCH /shift-handover/draft (2nd within 2s, throttle expected 429)",
    429,
    throttledResponse.statusCode
  );

  // Step 4: 200 confirm — POST /:id/confirm.
  let confirmResponseStatus = 0;
  if (draftId) {
    const confirmResponse = await app.inject({
      method: "POST",
      url: `/shift-handover/draft/${draftId}/confirm`,
      headers: adminHeaders,
      payload: {}
    });
    confirmResponseStatus = confirmResponse.statusCode;
  } else {
    console.warn("Skipped confirm call: draftId not captured from the GET response.");
  }
  recordResult(
    4,
    "POST /shift-handover/draft/:id/confirm (manager+, sets confirmedAt)",
    200,
    confirmResponseStatus
  );

  // Step 5: 409 PATCH-after-confirm — immutable post-confirm.
  const postConfirmPatchResponse = await app.inject({
    method: "PATCH",
    url: "/shift-handover/draft",
    headers: adminHeaders,
    payload: { summary: "post-confirm write attempt" }
  });
  recordResult(
    5,
    "PATCH /shift-handover/draft (after confirm, immutable, 409 expected)",
    409,
    postConfirmPatchResponse.statusCode
  );

  // Step 6: 404 unknown id — POST /:id/confirm with an unknown id.
  const unknownConfirmResponse = await app.inject({
    method: "POST",
    url: `/shift-handover/draft/${unknownDraftId}/confirm`,
    headers: adminHeaders,
    payload: {}
  });
  recordResult(
    6,
    "POST /shift-handover/draft/:id/confirm (unknown id, 404 expected)",
    404,
    unknownConfirmResponse.statusCode
  );

  await cleanupSmokeDrafts();

  console.log("");
  console.log("ID  Description                                                            Expected  Actual   Pass");
  console.log("--  --------------------------------------------------------------------- --------  -------- -----");
  for (const r of results) {
    const idStr = String(r.id).padStart(2, " ");
    const desc = r.description.padEnd(69, " ").slice(0, 69);
    const expected = String(r.expected).padStart(8, " ");
    const actual = String(r.actual).padStart(8, " ");
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`${idStr}  ${desc} ${expected}  ${actual}  ${status}`);
  }
  console.log("");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`Summary: ${passed}/6 passed, ${failed}/6 failed.`);

  if (failed > 0) {
    console.log("VERDICT: FAIL. One or more expected status codes did not match the live-DB behavior.");
    console.log("See the Cockpit user-path smoke block in the closure MSPR for the expected codes.");
    const failedIds = results.filter((r) => !r.passed).map((r) => r.id).join(",");
    console.log(`Failing check IDs: ${failedIds}`);
    process.exitCode = 1;
  } else {
    console.log(
      "VERDICT: PASS. The 6 expected status codes were observed against the live Supabase project."
    );
  }
} catch (error) {
  try {
    await cleanupSmokeDrafts();
  } catch (cleanupError) {
    console.error("Cleanup failed after smoke-test error:");
    console.error(formatError(cleanupError));
  }
  console.error("Cockpit shift-handover smoke failed:");
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  await teardownSmokeActorMembership();
  await app.close();
  await prisma.$disconnect();
}

async function seedSmokeActorMembership(): Promise<void> {
  await prisma.organizationMember.create({
    data: {
      id: smokeActorMemberId,
      organizationId: smokeActorOrganizationId,
      userId: smokeActorUserId,
      role: "manager"
    }
  });
  console.log(`Seeded smoke manager membership: ${smokeActorUserId} (orgRole=manager → routeRole=shift_lead).`);
}

async function teardownSmokeActorMembership(): Promise<void> {
  try {
    await prisma.organizationMember.deleteMany({
      where: {
        userId: smokeActorUserId
      }
    });
  } catch (error) {
    console.error("Failed to remove smoke manager membership:");
    console.error(formatError(error));
  }
}

async function cleanupSmokeDrafts(): Promise<void> {
  const deleted = await prisma.shiftHandoverDraft.deleteMany({
    where: {
      shiftLeadId: smokeActorUserId
    }
  });
  if (deleted.count > 0) {
    console.log(`Cleaned up ${deleted.count} smoke shift-handover draft row(s).`);
  }
}

function createSmokeJwt(userId: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 60 * 60 }))
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readJson(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} did not parse as JSON: ${raw}`);
  }
  return assertRecord(parsed, label);
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  return assertRecord(value, label);
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} was not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function redactDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "*****";
    }
    for (const [key] of url.searchParams) {
      if (/password|token|secret|key/i.test(key)) {
        url.searchParams.set(key, "*****");
      }
    }
    return url.toString();
  } catch {
    return "[redacted non-url DATABASE_URL]";
  }
}

function formatError(error: unknown): string {
  return inspect(error, {
    colors: false,
    depth: null
  });
}
