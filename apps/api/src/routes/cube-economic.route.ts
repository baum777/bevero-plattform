import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type Actor,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  CUBE_EconomicError,
  type CUBE_EconomicServicePort,
  type CUBE_EconomicRowKind,
  type NonFoodCategoryValue,
} from "../modules/cube-economic/cube-economic.types.js";

export type CUBE_EconomicRouteDependencies = {
  cubeEconomicService: CUBE_EconomicServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];
const managerRoles = ["admin", "shift_lead"] as const satisfies readonly Role[];

// Zod schemas for the manager-verification mutation body.
// Per-table whitelists (binding decision ADR-0029-C §13 + Risk ID-001).
// The service layer narrows the union by rowKind; the route layer accepts
// a partial from any of the 4 tables and the service layer rejects unknown
// combinations with 422.

const dateStringOrNullSchema = z
  .union([z.string().datetime(), z.null()])
  .optional();

const verifyBodySchema = z
  .object({
    isActive: z.boolean().optional(),
    requiresManagerConfirmation: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    validFrom: dateStringOrNullSchema,
    validUntil: dateStringOrNullSchema,
    effectiveFrom: dateStringOrNullSchema,
    effectiveUntil: dateStringOrNullSchema,
    reason: z.string().trim().max(2000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

function isNonFoodCategoryValue(s: string): s is NonFoodCategoryValue {
  return (
    s === "included_by_default" ||
    s === "optional_addon" ||
    s === "cost_driver"
  );
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: CUBE_EconomicRouteDependencies["auth"]
): Promise<Actor | undefined> {
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

function handleServiceError(
  reply: FastifyReply,
  error: unknown
): FastifyReply | undefined {
  if (error instanceof CUBE_EconomicError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 404
          ? "Not Found"
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

export async function cubeEconomicRoute(
  app: FastifyInstance,
  dependencies: CUBE_EconomicRouteDependencies
) {
  // All routes are path-encoded under /admin/cube/economic/... (no
  // fastify.register({ prefix }) call; mirrors ADR-0029-B §14 binding).

  app.get(
    "/admin/cube/economic/exclusive-rental",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(
        request,
        reply,
        [...operationalRoles],
        dependencies.auth
      );
      if (!actor) return reply;
      try {
        const policy =
          await dependencies.cubeEconomicService.getActiveExclusiveRentalPolicy(
            actor
          );
        return reply.code(200).send({ policy });
      } catch (error) {
        return handleServiceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/cube/economic/staff-rates",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(
        request,
        reply,
        [...operationalRoles],
        dependencies.auth
      );
      if (!actor) return reply;
      try {
        const rates =
          await dependencies.cubeEconomicService.listAfterMidnightStaffRates(
            actor
          );
        return reply.code(200).send({ rates });
      } catch (error) {
        return handleServiceError(reply, error);
      }
    }
  );

  app.get<{ Querystring: { category?: string } }>(
    "/admin/cube/economic/non-food",
    async (request, reply) => {
      const actor = await authenticate(
        request,
        reply,
        [...operationalRoles],
        dependencies.auth
      );
      if (!actor) return reply;
      try {
        const rawCategory = request.query.category;
        const category =
          rawCategory && isNonFoodCategoryValue(rawCategory)
            ? rawCategory
            : undefined;
        const components =
          await dependencies.cubeEconomicService.listNonFoodComponents(
            actor,
            category ? { category } : undefined
          );
        return reply.code(200).send({ components });
      } catch (error) {
        return handleServiceError(reply, error);
      }
    }
  );

  app.get(
    "/admin/cube/economic/furniture",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(
        request,
        reply,
        [...operationalRoles],
        dependencies.auth
      );
      if (!actor) return reply;
      try {
        const policies =
          await dependencies.cubeEconomicService.listFurniturePolicies(actor);
        return reply.code(200).send({ policies });
      } catch (error) {
        return handleServiceError(reply, error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // ADR-0029-C.2: Manager-verification mutation path (POST endpoints).
  // 4 endpoints, one per CUBE_Economic table. All require `managerRoles`
  // (admin or shift_lead). The Zod body schema is shared across all 4
  // endpoints; the service layer narrows by rowKind and rejects unknown
  // field combinations with 422.
  // -------------------------------------------------------------------------

  app.post<{ Params: { id: string } }>(
    "/admin/cube/economic/exclusive-rental/:id/verify",
    async (request, reply) => {
      return handleVerify(request, reply, "exclusive_rental", dependencies);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/cube/economic/staff-rates/:id/verify",
    async (request, reply) => {
      return handleVerify(request, reply, "staff_rate", dependencies);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/cube/economic/non-food/:id/verify",
    async (request, reply) => {
      return handleVerify(request, reply, "non_food", dependencies);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/cube/economic/furniture/:id/verify",
    async (request, reply) => {
      return handleVerify(request, reply, "furniture", dependencies);
    }
  );
}

async function handleVerify(
  request: FastifyRequest,
  reply: FastifyReply,
  rowKind: CUBE_EconomicRowKind,
  dependencies: CUBE_EconomicRouteDependencies
): Promise<FastifyReply> {
  const actor = await authenticate(
    request,
    reply,
    [...managerRoles],
    dependencies.auth
  );
  if (!actor) return reply;

  const id = (request.params as { id?: string }).id?.trim();
  if (!id) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "row id is required"
    });
  }

  const parsed = verifyBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.code(422).send({
      error: "Unprocessable Entity",
      message: "body validation failed",
      issues: parsed.error.issues
    });
  }

  // Strip the wrapper fields (reason, clientRequestId) and pass only the
  // changes body to the service layer. The `notes` field is BOTH a mutable
  // field on the row AND a candidate for the AutomationDecision.notes.
  // We pass it as a mutable field; the service layer derives the decision
  // `notes` from the same value (sanitized via sanitizePII).
  const { reason, clientRequestId, ...changes } = parsed.data;

  try {
    const result = await dependencies.cubeEconomicService.verifyManagerConfirmation({
      actor,
      rowKind,
      rowId: id,
      changes,
      reason,
      clientRequestId
    });
    return reply.code(200).send({
      row: result.row,
      decision: result.decision
    });
  } catch (error) {
    const result = handleServiceError(reply, error);
    return result ?? reply;
  }
}
