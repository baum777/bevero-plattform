import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  EventInquiryError,
  type EventInquiryServicePort,
} from "../modules/event-inquiry/event-inquiry.service.js";

export type EventInquiryRouteDependencies = {
  eventInquiryService: EventInquiryServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function eventInquiryRoute(
  app: FastifyInstance,
  dependencies: EventInquiryRouteDependencies
): Promise<void> {
  // All routes path-encoded under /admin/cube/... (no fastify.register({ prefix })).
  // Mirror ADR-0029-B §14 binding.

  app.get(
    "/admin/cube/event-inquiries",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const inquiries = await dependencies.eventInquiryService.listInquiries(actor);
        return reply.code(200).send({ inquiries });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/cube/event-inquiries/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const id = request.params.id?.trim();
      if (!id) {
        return reply.code(400).send({ error: "Bad Request", message: "inquiry id is required" });
      }

      try {
        const inquiry = await dependencies.eventInquiryService.getInquiry(actor, id);
        if (!inquiry) {
          return reply.code(404).send({ error: "Not Found", message: "inquiry not found" });
        }
        return reply.code(200).send({ inquiry });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Querystring: { unitId?: string } }>(
    "/admin/cube/event-packages",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const unitId = request.query.unitId?.trim() || undefined;
      try {
        const packages = await dependencies.eventInquiryService.listPackages(actor, unitId);
        return reply.code(200).send({ packages });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/cube/event-packages/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const id = request.params.id?.trim();
      if (!id) {
        return reply.code(400).send({ error: "Bad Request", message: "package id is required" });
      }

      try {
        const pkg = await dependencies.eventInquiryService.getPackage(actor, id);
        if (!pkg) {
          return reply.code(404).send({ error: "Not Found", message: "event package not found" });
        }
        return reply.code(200).send({ package: pkg });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get(
    "/admin/cube/beverage-packages",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const beveragePackages =
          await dependencies.eventInquiryService.listBeveragePackages(actor);
        return reply.code(200).send({ beveragePackages });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof EventInquiryError) {
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

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: EventInquiryRouteDependencies["auth"]
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
      reply.code(error.statusCode).send({ error: errorName, message: error.message });
      return undefined;
    }
    throw error;
  }
}
