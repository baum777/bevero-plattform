import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  WorkspaceGroupError,
  type WorkspaceGroupServicePort
} from "../modules/workspace-group/workspace-group.service.js";

export type WorkspaceGroupRouteDependencies = {
  workspaceGroupService: WorkspaceGroupServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function workspaceGroupRoute(
  app: FastifyInstance,
  dependencies: WorkspaceGroupRouteDependencies
): Promise<void> {
  app.get<{ Querystring: { location_id?: string } }>(
    "/workspace-groups",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const locationId = request.query.location_id?.trim();
      if (!locationId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "location_id query parameter is required"
        });
      }

      try {
        const groups = await dependencies.workspaceGroupService.listForLocation(actor, locationId);
        return reply.code(200).send({ groups });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof WorkspaceGroupError) {
    const errorName =
      error.statusCode === 400 ? "Bad Request" : error.statusCode === 404 ? "Not Found" : "Forbidden";
    return reply.code(error.statusCode).send({ error: errorName, message: error.message });
  }
  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: WorkspaceGroupRouteDependencies["auth"]
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
        error.statusCode === 401 ? "Unauthorized" : error.statusCode === 409 ? "Conflict" : "Forbidden";
      reply.code(error.statusCode).send({ error: errorName, message: error.message });
      return undefined;
    }
    throw error;
  }
}
