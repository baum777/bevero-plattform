import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  CUBE_SourceConflictError,
  type CUBE_SourceConflictServicePort
} from "../modules/cube-source-conflict/cube-source-conflict.service.js";

// ADR-0029-B (accepted): CUBE Source-Conflict-Validator — Fastify route
// plugin. 5 read endpoints, path-encoded under /admin/cube/... (no
// `fastify.register(plugin, { prefix: ... })`; binding decision §14). The
// operationalRoles gate is the same as the OperationalUnit route:
// `['admin', 'shift_lead', 'staff']`.
//
// ADR-0029-B.2: mutation endpoints (resolve, reject, enter-source) are
// registered at the bottom of the plugin. All require the manager-only
// `leadRoles` (admin / shift_lead).

export type CUBE_SourceConflictRouteDependencies = {
  cubeSourceConflictService: CUBE_SourceConflictServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];
const managerRoles = ["admin", "shift_lead"] as const satisfies readonly Role[];

const resolveBodySchema = z
  .object({
    winningFieldValue: z.string().trim().min(1).max(500),
    reason: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(1000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

const rejectBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
    notes: z.string().trim().max(1000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

const enterSourceBodySchema = z
  .object({
    source: z.object({
      organizationId: z.string().trim().min(1),
      name: z.string().trim().min(1).max(120),
      displayName: z.string().trim().min(1).max(200),
      version: z.number().int().min(1).max(100).optional(),
      retrievedAt: z.string().datetime().optional(),
      url: z.string().trim().max(500).nullable().optional(),
      payloadHash: z.string().trim().max(128).nullable().optional(),
      isActive: z.boolean().optional(),
      enteredBy: z.string().trim().max(64).nullable().optional()
    }),
    fields: z
      .array(
        z.object({
          organizationId: z.string().trim().min(1),
          fieldKey: z.string().trim().min(1).max(120),
          fieldValue: z.string().trim().min(1).max(500),
          confidence: z
            .enum(["confirmed", "conflict_detected", "requires_manager_confirmation"])
            .optional(),
          discoveredAt: z.string().datetime().optional()
        })
      )
      .min(1)
      .max(20),
    notes: z.string().trim().max(1000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

export async function cubeSourceConflictRoute(
  app: FastifyInstance,
  dependencies: CUBE_SourceConflictRouteDependencies
): Promise<void> {
  app.get("/admin/cube/sources", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const rawActive = readQueryString(request.query, "active");
    let activeOnly: boolean | undefined;
    if (rawActive !== undefined) {
      if (rawActive !== "true" && rawActive !== "false") {
        return reply.code(400).send({
          error: "Bad Request",
          message: "active query parameter must be 'true' or 'false'"
        });
      }
      activeOnly = rawActive === "true";
    }

    try {
      const sources = await dependencies.cubeSourceConflictService.listSources(actor, {
        activeOnly
      });
      return reply.code(200).send({ sources });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/admin/cube/sources/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const id = request.params.id?.trim();
    if (!id) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "source id is required"
      });
    }

    try {
      const source = await dependencies.cubeSourceConflictService.getSource(actor, id);
      if (!source) {
        return reply.code(404).send({
          error: "Not Found",
          message: "CUBE source not found"
        });
      }
      return reply.code(200).send({ source });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/admin/cube/sources/:id/fields",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) {
        return reply;
      }

      const id = request.params.id?.trim();
      if (!id) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "source id is required"
        });
      }

      try {
        const fields = await dependencies.cubeSourceConflictService.listFields(actor, id);
        return reply.code(200).send({ fields });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get("/admin/cube/conflicts", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const rawResolved = readQueryString(request.query, "resolved");
    let resolved: boolean | undefined;
    if (rawResolved !== undefined) {
      if (rawResolved !== "true" && rawResolved !== "false") {
        return reply.code(400).send({
          error: "Bad Request",
          message: "resolved query parameter must be 'true' or 'false'"
        });
      }
      resolved = rawResolved === "true";
    }

    const fieldKey = readQueryString(request.query, "fieldKey")?.trim();
    if (fieldKey !== undefined && fieldKey === "") {
      return reply.code(400).send({
        error: "Bad Request",
        message: "fieldKey query parameter must not be empty"
      });
    }

    try {
      const conflicts = await dependencies.cubeSourceConflictService.detectConflicts(actor, {
        fieldKey: fieldKey || undefined,
        resolved
      });
      return reply.code(200).send({ conflicts });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/admin/cube/conflicts/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const id = request.params.id?.trim();
    if (!id) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "conflict id is required"
      });
    }

    try {
      const conflict = await dependencies.cubeSourceConflictService.getConflict(actor, id);
      if (!conflict) {
        return reply.code(404).send({
          error: "Not Found",
          message: "CUBE conflict not found"
        });
      }
      return reply.code(200).send({ conflict });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // -------------------------------------------------------------------------
  // ADR-0029-B.2: Manager-resolve + manager-reject + manager-entry paths.
  // All 3 POST endpoints require `managerRoles` (admin / shift_lead).
  // -------------------------------------------------------------------------

  app.post<{ Params: { id: string } }>(
    "/admin/cube/conflicts/:id/resolve",
    async (request, reply) => {
      const actor = await authenticate(request, reply, managerRoles, dependencies.auth);
      if (!actor) return reply;

      const id = (request.params as { id?: string }).id?.trim();
      if (!id) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "conflict id is required"
        });
      }

      const parsed = resolveBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(422).send({
          error: "Unprocessable Entity",
          message: "body validation failed",
          issues: parsed.error.issues
        });
      }

      try {
        const result = await dependencies.cubeSourceConflictService.resolveConflict({
          actor,
          conflictId: id,
          winningFieldValue: parsed.data.winningFieldValue,
          reason: parsed.data.reason,
          notes: parsed.data.notes,
          clientRequestId: parsed.data.clientRequestId
        });
        return reply.code(200).send({
          conflict: result.conflict,
          decision: result.decision,
          workflowTask: result.workflowTask
        });
      } catch (error) {
        const handled = handleServiceError(error, reply);
        return handled ?? reply;
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/cube/conflicts/:id/reject",
    async (request, reply) => {
      const actor = await authenticate(request, reply, managerRoles, dependencies.auth);
      if (!actor) return reply;

      const id = (request.params as { id?: string }).id?.trim();
      if (!id) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "conflict id is required"
        });
      }

      const parsed = rejectBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(422).send({
          error: "Unprocessable Entity",
          message: "body validation failed",
          issues: parsed.error.issues
        });
      }

      try {
        const result = await dependencies.cubeSourceConflictService.rejectConflict({
          actor,
          conflictId: id,
          reason: parsed.data.reason,
          notes: parsed.data.notes,
          clientRequestId: parsed.data.clientRequestId
        });
        return reply.code(200).send({
          conflict: result.conflict,
          decision: result.decision
        });
      } catch (error) {
        const handled = handleServiceError(error, reply);
        return handled ?? reply;
      }
    }
  );

  app.post("/admin/cube/sources", async (request, reply) => {
    const actor = await authenticate(request, reply, managerRoles, dependencies.auth);
    if (!actor) return reply;

    const parsed = enterSourceBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(422).send({
        error: "Unprocessable Entity",
        message: "body validation failed",
        issues: parsed.error.issues
      });
    }

    try {
      const result = await dependencies.cubeSourceConflictService.enterSource({
        actor,
        source: {
          organizationId: parsed.data.source.organizationId,
          name: parsed.data.source.name,
          displayName: parsed.data.source.displayName,
          ...(parsed.data.source.version !== undefined ? { version: parsed.data.source.version } : {}),
          ...(parsed.data.source.retrievedAt ? { retrievedAt: new Date(parsed.data.source.retrievedAt) } : {}),
          ...(parsed.data.source.url !== undefined ? { url: parsed.data.source.url } : {}),
          ...(parsed.data.source.payloadHash !== undefined ? { payloadHash: parsed.data.source.payloadHash } : {}),
          ...(parsed.data.source.isActive !== undefined ? { isActive: parsed.data.source.isActive } : {}),
          ...(parsed.data.source.enteredBy !== undefined ? { enteredBy: parsed.data.source.enteredBy } : {})
        },
        fields: parsed.data.fields.map((f) => ({
          organizationId: f.organizationId,
          sourceId: "", // backfilled in the service after source create
          fieldKey: f.fieldKey,
          fieldValue: f.fieldValue,
          ...(f.confidence !== undefined ? { confidence: f.confidence } : {}),
          ...(f.discoveredAt ? { discoveredAt: new Date(f.discoveredAt) } : {})
        })),
        notes: parsed.data.notes,
        clientRequestId: parsed.data.clientRequestId
      });
      return reply.code(200).send({
        source: result.source,
        fields: result.fields,
        decision: result.decision
      });
    } catch (error) {
      const handled = handleServiceError(error, reply);
      return handled ?? reply;
    }
  });
}

function readQueryString(
  query: FastifyRequest["query"],
  key: string
): string | undefined {
  const value = (query as Record<string, unknown> | undefined)?.[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return undefined;
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof CUBE_SourceConflictError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 404
          ? "Not Found"
          : error.statusCode === 409
            ? "Conflict"
            : error.statusCode === 422
              ? "Unprocessable Entity"
              : "Forbidden";
    return reply.code(error.statusCode).send({
      error: errorName,
      message: error.message
    });
  }

  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: CUBE_SourceConflictRouteDependencies["auth"]
) {
  try {
    if (!authDependencies) {
      throw new ActorAuthError("authorization boundary is not configured", 401);
    }
    const actor = await parseActorFromHeaders(request.headers, authDependencies);

    return requireActorRole(actor, allowedRoles);
  } catch (error) {
    if (error instanceof ActorAuthError) {
      const errorName =
        error.statusCode === 401
          ? "Unauthorized"
          : error.statusCode === 409
            ? "Conflict"
            : "Forbidden";
      reply.code(error.statusCode).send({
        error: errorName,
        message: error.message
      });
      return undefined;
    }

    throw error;
  }
}
