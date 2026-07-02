import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  ShiftHandoverService,
  type ShiftHandoverDatabaseClient
} from "../src/modules/shift-handover/shift-handover.service.js";
import type { ShiftHandoverDraftRecord } from "../src/modules/shift-handover/shift-handover.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";

type TestRole = "admin" | "shift_lead" | "staff" | "viewer" | "owner";

function authHeaders(userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${createTestToken(userId)}`
  };
}

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 60 * 60 }))
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", testJwtSecret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function organizationRoleForUser(
  userId: string
): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("viewer-")) return "viewer";
  return null;
}

function buildDraft(overrides: Partial<ShiftHandoverDraftRecord> = {}): ShiftHandoverDraftRecord {
  return {
    id: "draft-1",
    organizationId: testOrganizationId,
    shiftLeadId: "shift-lead-1",
    workspaceId: null,
    date: new Date("2026-06-08T00:00:00.000Z"),
    startTime: null,
    endTime: null,
    summary: null,
    openItems: [],
    alerts: [],
    notes: null,
    synthesizedHandover: null,
    synthesizedAt: null,
    confirmedAt: null,
    createdAt: new Date("2026-06-08T08:00:00.000Z"),
    updatedAt: new Date("2026-06-08T08:00:00.000Z"),
    ...overrides
  };
}

type Store = {
  drafts: Map<string, ShiftHandoverDraftRecord>;
  inserts: number;
  updates: number;
  openTasks: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string | null;
  }>;
  openSuggestions: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
  }>;
};

function createFakeDb(input: {
  drafts?: ShiftHandoverDraftRecord[];
  openTasks?: Store["openTasks"];
  openSuggestions?: Store["openSuggestions"];
} = {}): {
  db: ShiftHandoverDatabaseClient;
  store: Store;
} {
  const drafts = new Map<string, ShiftHandoverDraftRecord>();
  for (const draft of input.drafts ?? []) {
    drafts.set(draft.id, draft);
  }
  const store: Store = {
    drafts,
    inserts: 0,
    updates: 0,
    openTasks: input.openTasks ?? [],
    openSuggestions: input.openSuggestions ?? []
  };

  const db: ShiftHandoverDatabaseClient = {
    shiftHandoverDraft: {
      async findFirst(args) {
        for (const draft of store.drafts.values()) {
          if (
            draft.organizationId === args.where.organizationId &&
            draft.shiftLeadId === args.where.shiftLeadId &&
            draft.date.getTime() === args.where.date.getTime() &&
            (args.where.workspaceId === null
              ? draft.workspaceId === null
              : draft.workspaceId === args.where.workspaceId)
          ) {
            return draft;
          }
        }
        return null;
      },
      async create(args) {
        store.inserts += 1;
        const id = `draft-new-${store.drafts.size + 1}`;
        const created: ShiftHandoverDraftRecord = {
          id,
          organizationId: args.data.organizationId,
          shiftLeadId: args.data.shiftLeadId,
          workspaceId: args.data.workspaceId,
          date: args.data.date,
          startTime: null,
          endTime: null,
          summary: args.data.summary,
          openItems: args.data.openItems,
          alerts: args.data.alerts,
          notes: args.data.notes,
          synthesizedHandover: null,
          synthesizedAt: null,
          confirmedAt: null,
          createdAt: new Date("2026-06-08T12:00:00.000Z"),
          updatedAt: new Date("2026-06-08T12:00:00.000Z")
        };
        store.drafts.set(id, created);
        return created;
      },
      async update(args) {
        store.updates += 1;
        const existing = store.drafts.get(args.where.id);
        if (!existing) {
          throw new Error(`draft ${args.where.id} not found`);
        }
        const updated: ShiftHandoverDraftRecord = {
          ...existing,
          ...args.data
        };
        store.drafts.set(args.where.id, updated);
        return updated;
      }
    },
    workflowTask: {
      async findMany(args) {
        // E-4 stub: ignores the assignedRole filter (the on-disk WorkflowTask
        // model has assignedRole as a string, not a role-rank). Returns the
        // pre-seeded open tasks in stable order.
        return store.openTasks.slice(0, args.take);
      }
    },
    automationSuggestion: {
      async findMany(args) {
        return store.openSuggestions
          .filter((suggestion) => true)
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, args.take);
      }
    }
  };

  return { db, store };
}

function buildTestApp(
  input: {
    drafts?: ShiftHandoverDraftRecord[];
    openTasks?: Store["openTasks"];
    openSuggestions?: Store["openSuggestions"];
  } = {}
) {
  const { db, store } = createFakeDb({
    drafts: input.drafts,
    openTasks: input.openTasks,
    openSuggestions: input.openSuggestions
  });
  const shiftHandoverService = new ShiftHandoverService({
    db,
    now: () => new Date("2026-06-08T12:00:00.000Z")
  });

  const app = buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    shiftHandover: {
      shiftHandoverService,
      auth: {
        jwtSecret: testJwtSecret,
        db: {
          organizationMember: {
            async findMany(args: { where: { userId: string } }) {
              const role = organizationRoleForUser(args.where.userId);
              if (!role) {
                return [];
              }
              return [
                {
                  organizationId: testOrganizationId,
                  role,
                  createdAt: new Date("2026-01-01T00:00:00.000Z")
                }
              ];
            }
          }
        }
      }
    }
  });

  return { app, store, shiftHandoverService };
}

describe("shift handover draft routes", () => {
  beforeEach(() => {
    // The throttle state is module-level (in-memory LRU) so we reset it per test.
    // Tests construct a fresh ShiftHandoverService per test via buildTestApp, but
    // the throttle map is shared across instances by design (it's a defense-in-depth
    // measure, not a per-instance counter). Reset it explicitly.
    const { shiftHandoverService } = buildTestApp();
    shiftHandoverService.__resetAutosaveThrottleForTest?.();
  });

  it("returns 401 without token on GET", async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/shift-handover/draft" });
    expect(response.statusCode).toBe(401);
  });

  it("returns 403 for staff on GET (role-rank < 2)", async () => {
    const { app } = buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("staff-1")
    });
    expect(response.statusCode).toBe(403);
  });

  it("auto-creates a draft on first GET and returns the same one on the second call (no double-insert)", async () => {
    const { app, store } = buildTestApp();
    const first = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json() as { draft: { id: string; summary: string | null } };
    expect(firstBody.draft.summary).toBeNull();
    expect(store.inserts).toBe(1);

    const second = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json() as { draft: { id: string } };
    expect(secondBody.draft.id).toBe(firstBody.draft.id);
    expect(store.inserts).toBe(1);
  });

  it("patches an open draft for staff+ with a valid body", async () => {
    const { app, store } = buildTestApp({
      drafts: [
        buildDraft({
          id: "draft-1",
          shiftLeadId: "shift-lead-1",
          summary: null,
          openItems: []
        })
      ]
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1"),
      payload: {
        summary: "Bar service normal",
        openItems: [{ type: "refill", itemId: "item-1", description: "vodka" }]
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { draft: { summary: string | null; openItems: unknown } };
    expect(body.draft.summary).toBe("Bar service normal");
    expect(body.draft.openItems).toEqual([{ type: "refill", itemId: "item-1", description: "vodka" }]);
    expect(store.updates).toBe(1);
  });

  it("returns 409 when patching a confirmed draft", async () => {
    const { app } = buildTestApp({
      drafts: [
        buildDraft({
          id: "draft-1",
          shiftLeadId: "shift-lead-1",
          confirmedAt: new Date("2026-06-08T11:00:00.000Z")
        })
      ]
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1"),
      payload: { summary: "late edit" }
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 429 on a 2nd PATCH within 2 seconds (autosave throttle)", async () => {
    const { app } = buildTestApp({
      drafts: [buildDraft({ id: "draft-1", shiftLeadId: "shift-lead-1" })]
    });
    const headers = authHeaders("shift-lead-1");
    const first = await app.inject({
      method: "PATCH",
      url: "/shift-handover/draft",
      headers,
      payload: { summary: "first" }
    });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({
      method: "PATCH",
      url: "/shift-handover/draft",
      headers,
      payload: { summary: "second" }
    });
    expect(second.statusCode).toBe(429);
  });

  it("returns 404 for an unknown id on POST confirm", async () => {
    const { app } = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/shift-handover/draft/unknown/confirm",
      headers: authHeaders("shift-lead-1"),
      payload: {}
    });
    // ADR-0025.4: the service performs a findFirst pre-check on the requested id
    // (scoped to org + actor) and throws ShiftHandoverError(404) for unknown ids,
    // which the route's handleServiceError maps to 404. The in-memory stub throws
    // on update, but the pre-check fires first and never reaches the update call.
    expect(response.statusCode).toBe(404);
    const body = response.json() as { error: string; message: string };
    expect(body.error).toBe("Not Found");
    expect(body.message).toBe("shift handover draft not found");
  });

  // E-4: auto-populate on first-create (ADR-0025 §Phase E E-4 + OQ §4).
  it("auto-populates openItems from open workflowTasks on first-create", async () => {
    const { app } = buildTestApp({
      openTasks: [
        {
          id: "task-1",
          type: "refill",
          severity: "manager",
          title: "Refill vodka",
          description: "Stock below threshold"
        }
      ]
    });
    const response = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      draft: {
        openItems: Array<{ type: string; itemId?: string; description: string }>;
        alerts: Array<{ type: string; id?: string }>;
      };
    };
    expect(body.draft.openItems).toEqual([
      { type: "refill", itemId: "task-1", description: "Stock below threshold" }
    ]);
    expect(body.draft.alerts).toEqual([]);
  });

  it("auto-populates alerts from open automation suggestions on first-create", async () => {
    const { app } = buildTestApp({
      openSuggestions: [
        {
          id: "sug-1",
          type: "refill",
          title: "Refill gin",
          detail: "Stock below threshold for gin"
        }
      ]
    });
    const response = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      draft: {
        openItems: Array<{ type: string; itemId?: string; description: string }>;
        alerts: Array<{ type: string; id?: string }>;
      };
    };
    expect(body.draft.alerts).toEqual([{ type: "refill", id: "sug-1" }]);
    expect(body.draft.openItems).toEqual([]);
  });

  it("does not re-populate on a second GET (idempotent)", async () => {
    const { app, store } = buildTestApp({
      openTasks: [
        {
          id: "task-1",
          type: "refill",
          severity: "manager",
          title: "Refill vodka",
          description: "Stock below threshold"
        }
      ]
    });
    const first = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json() as { draft: { id: string; openItems: unknown } };
    expect(firstBody.draft.openItems).toEqual([
      { type: "refill", itemId: "task-1", description: "Stock below threshold" }
    ]);
    // After the first GET, the populate path runs two updates: one for create,
    // one for the auto-populate update. Capture that baseline.
    const updatesAfterFirst = store.updates;
    const insertsAfterFirst = store.inserts;

    // Add a new open task; if auto-populate re-runs, the second GET would see it.
    store.openTasks.push({
      id: "task-2",
      type: "withdrawal",
      severity: "staff",
      title: "Withdraw rum",
      description: "Manual correction"
    });

    const second = await app.inject({
      method: "GET",
      url: "/shift-handover/draft",
      headers: authHeaders("shift-lead-1")
    });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json() as { draft: { id: string; openItems: unknown } };
    expect(secondBody.draft.id).toBe(firstBody.draft.id);
    // The second GET must hit the existing-draft branch; no extra insert, no extra
    // update from the populate path.
    expect(store.inserts).toBe(insertsAfterFirst);
    expect(store.updates).toBe(updatesAfterFirst);
    expect(secondBody.draft.openItems).toEqual([
      { type: "refill", itemId: "task-1", description: "Stock below threshold" }
    ]);
  });
});
