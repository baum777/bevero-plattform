import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  ShiftHandoverError,
  type ShiftHandoverServicePort
} from "../modules/shift-handover/shift-handover.service.js";

export type ShiftHandoverRouteDependencies = {
  shiftHandoverService: ShiftHandoverServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const draftReadRoles = ["shift_lead", "admin"] as const satisfies readonly Role[];

export async function shiftHandoverRoute(
  app: FastifyInstance,
  dependencies: ShiftHandoverRouteDependencies
): Promise<void> {
  app.get("/shift-handover/draft", async (request, reply) => {
    const actor = await authenticate(request, reply, draftReadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    try {
      const draft = await dependencies.shiftHandoverService.getOrCreateDraft({
        actor,
        rawQuery: request.query ?? {}
      });
      return reply.code(200).send({ draft });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.patch("/shift-handover/draft", async (request, reply) => {
    const actor = await authenticate(request, reply, draftReadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    try {
      const draft = await dependencies.shiftHandoverService.patchDraft({
        actor,
        rawBody: request.body ?? {}
      });
      return reply.code(200).send({ draft });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.post("/shift-handover/draft/confirm", async (request, reply) => {
    const actor = await authenticate(request, reply, draftReadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    try {
      const result = await dependencies.shiftHandoverService.confirmDraft({
        actor,
        rawBody: request.body ?? {},
        id: ""
      });
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof ShiftHandoverError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 403
          ? "Forbidden"
          : error.statusCode === 404
            ? "Not Found"
            : error.statusCode === 409
              ? "Conflict"
              : error.statusCode === 422
                ? "Unprocessable Entity"
                : "Too Many Requests";
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
  authDependencies?: ShiftHandoverRouteDependencies["auth"]
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
