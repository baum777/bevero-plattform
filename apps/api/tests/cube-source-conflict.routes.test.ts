import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { CUBE_SourceConflictService } from "../src/modules/cube-source-conflict/cube-source-conflict.service.js";
import type {
  CUBE_ConflictRecord,
  CUBE_SourceConflictDatabaseClient,
  CUBE_SourceFieldRecord,
  CUBE_SourceRecord
} from "../src/modules/cube-source-conflict/cube-source-conflict.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";
const otherOrganizationId = "org-other";

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
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

function buildSource(overrides: Partial<CUBE_SourceRecord> = {}): CUBE_SourceRecord {
  return {
    id: "src-cube-website",
    organizationId: testOrganizationId,
    name: "cube_website",
    displayName: "CUBE Website",
    version: 1,
    retrievedAt: new Date("2026-06-09T10:00:00.000Z"),
    url: "https://cube-restaurant.de",
    payloadHash: null,
    isActive: false,
    enteredBy: "lm-demo-shiftlead-cube",
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildField(
  overrides: Partial<CUBE_SourceFieldRecord> = {}
): CUBE_SourceFieldRecord {
  return {
    id: "sf-cube-website-hours",
    organizationId: testOrganizationId,
    sourceId: "src-cube-website",
    fieldKey: "ot_bar_sunday_thursday_hours",
    fieldValue: "10:00-19:00",
    confidence: "requires_manager_confirmation",
    discoveredAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildConflict(
  overrides: Partial<CUBE_ConflictRecord> = {}
): CUBE_ConflictRecord {
  return {
    id: "cf-cube-ot-bar-hours",
    organizationId: testOrganizationId,
    fieldKey: "ot_bar_sunday_thursday_hours",
    sourceIds: ["src-cube-website", "src-cube-kontaktseite"],
    detectedAt: new Date("2026-06-09T10:00:00.000Z"),
    resolvedAt: null,
    resolvedBySuggestionId: null,
    winningFieldValue: null,
    ...overrides
  };
}

type SourceConflictSink = {
  setLocalCalls: string[];
  sourceUpdates: Array<{ id: string; data: Record<string, unknown> }>;
  sourceFieldUpdates: Array<{ id: string; data: Record<string, unknown> }>;
  conflictUpdates: Array<{ id: string; data: Record<string, unknown> }>;
  sourcesCreated: CUBE_SourceRecord[];
  fieldsCreated: CUBE_SourceFieldRecord[];
  automationRules: Array<{ id: string; organizationId: string; name: string }>;
  automationSuggestions: Array<{ id: string; organizationId: string; ruleId: string; status: string }>;
  automationDecisions: Array<{
    id: string;
    suggestionId: string;
    status: string;
    actor: string;
    reason: string | null;
    notes: string | null;
  }>;
  workflowTasks: Array<{ id: string; type: string }>;
};

function createFakeDb(input: {
  sources?: CUBE_SourceRecord[];
  fields?: CUBE_SourceFieldRecord[];
  conflicts?: CUBE_ConflictRecord[];
  sink?: SourceConflictSink;
}): CUBE_SourceConflictDatabaseClient {
  const sink: SourceConflictSink = input.sink ?? {
    setLocalCalls: [],
    sourceUpdates: [],
    sourceFieldUpdates: [],
    conflictUpdates: [],
    sourcesCreated: [],
    fieldsCreated: [],
    automationRules: [],
    automationSuggestions: [],
    automationDecisions: [],
    workflowTasks: []
  };

  const mutableSources = input.sources ?? [];
  const mutableFields = input.fields ?? [];
  const mutableConflicts = input.conflicts ?? [];

  return {
    cUBE_Source: {
      async findMany(args) {
        return mutableSources
          .filter(
            (source) =>
              source.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || source.isActive === args.where.isActive)
          )
          .sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version);
      },
      async findFirst(args) {
        return (
          mutableSources.find(
            (source) =>
              source.id === args.where.id &&
              source.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableSources.find((s) => s.id === args.where.id);
        if (!target) throw new Error("row not found");
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.sourceUpdates.push({ id: args.where.id, data: args.data });
        return target;
      },
      async create(args) {
        const id = `src-new-${sink.sourcesCreated.length + 1}`;
        const created: CUBE_SourceRecord = {
          id,
          organizationId: args.data.organizationId,
          name: args.data.name,
          displayName: args.data.displayName,
          version: args.data.version ?? 1,
          retrievedAt: args.data.retrievedAt ?? new Date(),
          url: args.data.url ?? null,
          payloadHash: args.data.payloadHash ?? null,
          isActive: args.data.isActive ?? false,
          enteredBy: args.data.enteredBy ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mutableSources.push(created);
        sink.sourcesCreated.push(created);
        return created;
      }
    },
    cUBE_SourceField: {
      async findMany(args) {
        return mutableFields
          .filter(
            (field) =>
              field.organizationId === args.where.organizationId &&
              field.sourceId === args.where.sourceId
          )
          .sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
      },
      async findFirst(args) {
        return (
          mutableFields.find(
            (field) =>
              field.id === args.where.id &&
              field.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableFields.find((f) => f.id === args.where.id);
        if (!target) throw new Error("row not found");
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.sourceFieldUpdates.push({ id: args.where.id, data: args.data });
        return target;
      },
      async create(args) {
        const id = `field-new-${sink.fieldsCreated.length + 1}`;
        const created: CUBE_SourceFieldRecord = {
          id,
          organizationId: args.data.organizationId,
          sourceId: args.data.sourceId,
          fieldKey: args.data.fieldKey,
          fieldValue: args.data.fieldValue,
          confidence: args.data.confidence ?? "requires_manager_confirmation",
          discoveredAt: args.data.discoveredAt ?? new Date(),
          updatedAt: new Date()
        };
        mutableFields.push(created);
        sink.fieldsCreated.push(created);
        return created;
      }
    },
    cUBE_Conflict: {
      async findMany(args) {
        return mutableConflicts
          .filter((conflict) => {
            if (conflict.organizationId !== args.where.organizationId) {
              return false;
            }
            if (args.where.fieldKey !== undefined && conflict.fieldKey !== args.where.fieldKey) {
              return false;
            }
            if (args.where.resolvedAt === null) {
              return conflict.resolvedAt === null;
            }
            if (
              args.where.resolvedAt &&
              typeof args.where.resolvedAt === "object" &&
              "not" in args.where.resolvedAt
            ) {
              return conflict.resolvedAt !== null;
            }
            return true;
          })
          .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
      },
      async findFirst(args) {
        return (
          mutableConflicts.find(
            (conflict) =>
              conflict.id === args.where.id &&
              conflict.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableConflicts.find((c) => c.id === args.where.id);
        if (!target) throw new Error("row not found");
        Object.assign(target, args.data);
        sink.conflictUpdates.push({ id: args.where.id, data: args.data });
        return target;
      }
    },
    automationDecision: {
      async create(args) {
        const id = `ad-${sink.automationDecisions.length + 1}`;
        const record = {
          id,
          suggestionId: args.data.suggestionId,
          status: args.data.status,
          actor: args.data.actor,
          actorRole: args.data.actorRole,
          timestamp: args.data.timestamp,
          reason: args.data.reason ?? null,
          notes: args.data.notes ?? null,
          metadata: args.data.metadata ?? null
        };
        sink.automationDecisions.push({
          id,
          suggestionId: args.data.suggestionId,
          status: args.data.status,
          actor: args.data.actor,
          reason: record.reason,
          notes: record.notes
        });
        return record as never;
      }
    },
    automationRule: {
      async findFirst(args) {
        return (
          (sink.automationRules.find(
            (r) =>
              r.organizationId === args.where.organizationId &&
              r.name === (args.where as { name: string }).name
          ) as never) ?? null
        );
      },
      async create(args) {
        const id = `rule-${sink.automationRules.length + 1}`;
        sink.automationRules.push({
          id,
          organizationId: args.data.organizationId,
          name: args.data.name
        });
        return {
          id,
          organizationId: args.data.organizationId,
          version: args.data.version ?? 1,
          enabled: args.data.enabled ?? true,
          ruleType: args.data.ruleType,
          name: args.data.name,
          description: args.data.description ?? null,
          condition: args.data.condition,
          action: args.data.action,
          evaluateOn: args.data.evaluateOn,
          schedule: args.data.schedule ?? null,
          metadata: args.data.metadata ?? null,
          createdBy: args.data.createdBy ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as never;
      }
    },
    automationSuggestion: {
      async findUnique(args) {
        return (
          (sink.automationSuggestions.find(
            (s) => s.id === (args.where as { id: string }).id
          ) as never) ?? null
        );
      },
      async create(args) {
        const id = args.data.id;
        sink.automationSuggestions.push({
          id,
          organizationId: args.data.organizationId,
          ruleId: args.data.ruleId,
          status: args.data.status
        });
        return {
          id,
          organizationId: args.data.organizationId,
          ruleId: args.data.ruleId,
          ruleVersion: args.data.ruleVersion,
          status: args.data.status,
          type: args.data.type,
          title: args.data.title,
          detail: args.data.detail,
          relatedItemIds: args.data.relatedItemIds,
          createdAt: new Date(),
          expiresAt: null,
          approvedBy: null,
          approvedAt: null,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          automaticActionOnApproval: null
        } as never;
      }
    },
    workflowTask: {
      async create(args) {
        const id = `wt-${sink.workflowTasks.length + 1}`;
        sink.workflowTasks.push({ id, type: args.data.type });
        return { id };
      }
    },
    async $transaction(callback) {
      return callback(this);
    },
    async $executeRawUnsafe(query: string) {
      sink.setLocalCalls.push(query);
      return 1;
    }
  };
}

function buildTestApp(input: {
  sources?: CUBE_SourceRecord[];
  fields?: CUBE_SourceFieldRecord[];
  conflicts?: CUBE_ConflictRecord[];
  sink?: SourceConflictSink;
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    cubeSourceConflict: {
      cubeSourceConflictService: new CUBE_SourceConflictService({
        db: createFakeDb(input)
      }),
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
                  createdAt: new Date("2026-05-30T10:00:00.000Z")
                }
              ];
            }
          }
        } as never
      }
    }
  });
}

describe("CUBE source-conflict API routes", () => {
  describe("GET /admin/cube/sources", () => {
    it("returns the 3 pre-seeded sources in name order, version desc", async () => {
      const app = buildTestApp({
        sources: [
          buildSource({
            id: "src-cube-website",
            name: "cube_website",
            version: 1
          }),
          buildSource({
            id: "src-cube-bankettmappe",
            name: "cube_bankettmappe_pdf",
            version: 1
          }),
          buildSource({
            id: "src-cube-kontaktseite",
            name: "cube_kontaktseite",
            version: 1
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { sources: Array<{ id: string; name: string }> };
        expect(body.sources.map((s) => s.name)).toEqual([
          "cube_bankettmappe_pdf",
          "cube_kontaktseite",
          "cube_website"
        ]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/sources/:id", () => {
    it("returns the source detail for src-cube-website", async () => {
      const app = buildTestApp({
        sources: [
          buildSource({
            id: "src-cube-website",
            name: "cube_website",
            displayName: "CUBE Website"
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources/src-cube-website",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          source: { id: string; name: string; displayName: string; organizationId: string };
        };
        expect(body.source.id).toBe("src-cube-website");
        expect(body.source.name).toBe("cube_website");
        expect(body.source.displayName).toBe("CUBE Website");
        expect(body.source.organizationId).toBe(testOrganizationId);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a cross-org source", async () => {
      const app = buildTestApp({
        sources: [
          buildSource({ id: "src-cube-foreign", organizationId: otherOrganizationId })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources/src-cube-foreign",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/sources/:id/fields", () => {
    it("returns the 3 fields for src-cube-website, with PII sanitized", async () => {
      const app = buildTestApp({
        sources: [buildSource({ id: "src-cube-website" })],
        fields: [
          buildField({
            id: "sf-website-hours",
            fieldKey: "ot_bar_sunday_thursday_hours",
            fieldValue: "10:00-19:00"
          }),
          buildField({
            id: "sf-website-menu",
            fieldKey: "group_dinner_menu_count",
            fieldValue: "two_menus"
          }),
          buildField({
            id: "sf-website-pii",
            fieldKey: "contact_email",
            fieldValue: "kontakt@mustermann.de"
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources/src-cube-website/fields",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          fields: Array<{ id: string; fieldKey: string; fieldValue: string }>;
        };
        expect(body.fields.map((f) => f.id)).toEqual([
          "sf-website-pii",
          "sf-website-menu",
          "sf-website-hours"
        ]);
        const piiField = body.fields.find((f) => f.id === "sf-website-pii");
        expect(piiField?.fieldValue).toBe("<email>");
      } finally {
        await app.close();
      }
    });

    it("returns 200 with empty list for an unknown source", async () => {
      const app = buildTestApp({ sources: [], fields: [] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources/src-missing/fields",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { fields: unknown[] };
        expect(body.fields).toEqual([]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/conflicts", () => {
    it("returns the 3 pre-seeded open conflicts, ordered by detectedAt DESC", async () => {
      const app = buildTestApp({
        conflicts: [
          buildConflict({
            id: "cf-cube-ot-bar-hours",
            fieldKey: "ot_bar_sunday_thursday_hours",
            detectedAt: new Date("2026-06-09T10:00:00.000Z")
          }),
          buildConflict({
            id: "cf-cube-menu-count",
            fieldKey: "group_dinner_menu_count",
            detectedAt: new Date("2026-06-09T11:00:00.000Z")
          }),
          buildConflict({
            id: "cf-cube-furn-thresh",
            fieldKey: "furniture_threshold",
            detectedAt: new Date("2026-06-09T12:00:00.000Z")
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/conflicts",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { conflicts: Array<{ id: string }> };
        expect(body.conflicts.map((c) => c.id)).toEqual([
          "cf-cube-furn-thresh",
          "cf-cube-menu-count",
          "cf-cube-ot-bar-hours"
        ]);
      } finally {
        await app.close();
      }
    });

    it("filters by fieldKey", async () => {
      const app = buildTestApp({
        conflicts: [
          buildConflict({
            id: "cf-cube-ot-bar-hours",
            fieldKey: "ot_bar_sunday_thursday_hours"
          }),
          buildConflict({
            id: "cf-cube-menu-count",
            fieldKey: "group_dinner_menu_count"
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/conflicts?fieldKey=ot_bar_sunday_thursday_hours",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { conflicts: Array<{ id: string }> };
        expect(body.conflicts.map((c) => c.id)).toEqual(["cf-cube-ot-bar-hours"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/conflicts/:id", () => {
    it("returns the conflict detail for cf-cube-ot-bar-hours", async () => {
      const app = buildTestApp({
        conflicts: [
          buildConflict({
            id: "cf-cube-ot-bar-hours",
            fieldKey: "ot_bar_sunday_thursday_hours",
            sourceIds: ["src-cube-website", "src-cube-kontaktseite"]
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/conflicts/cf-cube-ot-bar-hours",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          conflict: { id: string; fieldKey: string; sourceIds: string[]; resolvedAt: null };
        };
        expect(body.conflict.id).toBe("cf-cube-ot-bar-hours");
        expect(body.conflict.fieldKey).toBe("ot_bar_sunday_thursday_hours");
        expect(body.conflict.sourceIds).toEqual([
          "src-cube-website",
          "src-cube-kontaktseite"
        ]);
        expect(body.conflict.resolvedAt).toBeNull();
      } finally {
        await app.close();
      }
    });
  });

  describe("auth + role gates", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources"
        });

        expect(response.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("rejects a viewer with 403", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/cube/sources",
          headers: authHeaders("viewer-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });
  });

  // ==========================================================================
  // ADR-0029-B.2: Mutation surface (manager-resolve + manager-reject +
  // manager-entry paths).
  // 3 POST endpoints, 1 each. All require `managerRoles` (admin / shift_lead).
  // The transaction is: SET LOCAL + UPDATE/CREATE + AutomationDecision.
  // ==========================================================================

  describe("POST /admin/cube/conflicts/:id/resolve", () => {
    it("200: manager resolves an open conflict, decision + workflow task created", async () => {
      const sink: SourceConflictSink = {
        setLocalCalls: [],
        sourceUpdates: [],
        sourceFieldUpdates: [],
        conflictUpdates: [],
        sourcesCreated: [],
        fieldsCreated: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: [],
        workflowTasks: []
      };
      const app = buildTestApp({
        conflicts: [
          buildConflict({
            id: "conf-cube-ot-bar-sunday-thursday",
            fieldKey: "ot_bar_sunday_thursday_hours",
            resolvedAt: null,
            winningFieldValue: null
          })
        ],
        sink
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/cube/conflicts/conf-cube-ot-bar-sunday-thursday/resolve",
          headers: authHeaders("admin-1"),
          payload: {
            winningFieldValue: "18:00–24:00",
            reason: "Bankettmappe 2026-06-09 is the authoritative source"
          }
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.conflict.resolvedAt).not.toBeNull();
        expect(body.conflict.winningFieldValue).toBe("18:00–24:00");
        expect(body.decision.status).toBe("approved");
        expect(body.workflowTask.type).toBe("cube.conflict_resolved");
        // SET LOCAL was called with the right GUC
        expect(sink.setLocalCalls).toContain(
          "SET LOCAL bevero.allow_cube_source_update = 'on'"
        );
        // 1 UPDATE was emitted on the conflict
        expect(sink.conflictUpdates).toHaveLength(1);
        expect(sink.conflictUpdates[0].id).toBe("conf-cube-ot-bar-sunday-thursday");
      } finally {
        await app.close();
      }
    });

    it("409: cannot resolve an already-resolved conflict", async () => {
      const app = buildTestApp({
        conflicts: [
          buildConflict({
            id: "conf-already-resolved",
            resolvedAt: new Date("2026-06-09T10:00:00.000Z")
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/cube/conflicts/conf-already-resolved/resolve",
          headers: authHeaders("admin-1"),
          payload: { winningFieldValue: "18:00–24:00" }
        });
        expect(response.statusCode).toBe(409);
      } finally {
        await app.close();
      }
    });
  });

  describe("POST /admin/cube/conflicts/:id/reject", () => {
    it("200: manager rejects a conflict (no mutation), decision is created with reason", async () => {
      const sink: SourceConflictSink = {
        setLocalCalls: [],
        sourceUpdates: [],
        sourceFieldUpdates: [],
        conflictUpdates: [],
        sourcesCreated: [],
        fieldsCreated: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: [],
        workflowTasks: []
      };
      const app = buildTestApp({
        conflicts: [buildConflict({ id: "conf-reject-1" })],
        sink
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/cube/conflicts/conf-reject-1/reject",
          headers: authHeaders("shift-1"),
          payload: { reason: "Not a real conflict; both sources agree" }
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.conflict.resolvedAt).toBeNull();
        expect(body.decision.status).toBe("rejected");
        expect(body.decision.reason).toBe("Not a real conflict; both sources agree");
        // The reject path does NOT mutate the conflict
        expect(sink.conflictUpdates).toHaveLength(0);
        // But the decision is still appended
        expect(sink.automationDecisions).toHaveLength(1);
      } finally {
        await app.close();
      }
    });
  });

  describe("POST /admin/cube/sources (manager entry)", () => {
    it("200: manager enters a new CUBE_Source + 1 CUBE_SourceField; decision is created", async () => {
      const sink: SourceConflictSink = {
        setLocalCalls: [],
        sourceUpdates: [],
        sourceFieldUpdates: [],
        conflictUpdates: [],
        sourcesCreated: [],
        fieldsCreated: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: [],
        workflowTasks: []
      };
      const app = buildTestApp({ sink });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/cube/sources",
          headers: authHeaders("admin-1"),
          payload: {
            source: {
              organizationId: testOrganizationId,
              name: "cube_manager_note",
              displayName: "Manager Note",
              isActive: false
            },
            fields: [
              {
                organizationId: testOrganizationId,
                fieldKey: "ot_bar_sunday_thursday_hours",
                fieldValue: "18:00–24:00"
              }
            ]
          }
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.source.name).toBe("cube_manager_note");
        expect(body.fields).toHaveLength(1);
        expect(body.decision.status).toBe("approved");
        expect(sink.sourcesCreated).toHaveLength(1);
        expect(sink.fieldsCreated).toHaveLength(1);
      } finally {
        await app.close();
      }
    });

    it("403: staff role cannot enter a source (manager-only)", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/cube/sources",
          headers: authHeaders("staff-1"),
          payload: {
            source: {
              organizationId: testOrganizationId,
              name: "cube_staff_attempt",
              displayName: "Staff Attempt"
            },
            fields: [
              {
                organizationId: testOrganizationId,
                fieldKey: "ot",
                fieldValue: "x"
              }
            ]
          }
        });
        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });
  });
});
