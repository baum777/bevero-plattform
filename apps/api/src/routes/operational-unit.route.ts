import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  OperationalUnitError,
  type OperationalUnitServicePort
} from "../modules/operational-unit/operational-unit.service.js";

export type OperationalUnitRouteDependencies = {
  operationalUnitService: OperationalUnitServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function operationalUnitRoute(
  app: FastifyInstance,
  dependencies: OperationalUnitRouteDependencies
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    "/admin/operational-units/locations/:id/units",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const locationId = request.params.id?.trim();
      if (!locationId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "location id is required"
        });
      }

      try {
        const units = await dependencies.operationalUnitService.listByLocation(actor, locationId);
        return reply.code(200).send({ units });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/operational-units/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const unitId = request.params.id?.trim();
      if (!unitId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "operational unit id is required"
        });
      }

      try {
        const unit = await dependencies.operationalUnitService.getById(actor, unitId);
        if (!unit) {
          return reply.code(404).send({
            error: "Not Found",
            message: "operational unit not found"
          });
        }
        return reply.code(200).send({ unit });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/operational-units/:id/slots",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const unitId = request.params.id?.trim();
      if (!unitId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "operational unit id is required"
        });
      }

      try {
        const slots = await dependencies.operationalUnitService.listSlots(actor, unitId);
        return reply.code(200).send({ slots });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/operational-units/:id/group-rule",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const unitId = request.params.id?.trim();
      if (!unitId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "operational unit id is required"
        });
      }

      try {
        const groupRule = await dependencies.operationalUnitService.getGroupRule(actor, unitId);
        if (!groupRule) {
          return reply.code(404).send({
            error: "Not Found",
            message: "group rule not found"
          });
        }
        return reply.code(200).send({ groupRule });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof OperationalUnitError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 404
          ? "Not Found"
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
  authDependencies?: OperationalUnitRouteDependencies["auth"]
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
