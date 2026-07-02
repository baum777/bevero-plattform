import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  OrganizationError,
  type OrganizationServicePort,
} from "../modules/organization/organization.service.js";

export type OrganizationRouteDependencies = {
  organizationService: OrganizationServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const adminRoles = ["admin"] as const satisfies readonly Role[];
const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function organizationRoute(
  app: FastifyInstance,
  dependencies: OrganizationRouteDependencies
): Promise<void> {
  app.get(
    "/admin/organization",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const organization = await dependencies.organizationService.getOrganization(actor);
        if (!organization) {
          return reply.code(404).send({ error: "Not Found", message: "organization not found" });
        }
        return reply.code(200).send({ organization });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get(
    "/admin/organization/business-units",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const businessUnits = await dependencies.organizationService.listBusinessUnits(actor);
        return reply.code(200).send({ businessUnits });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get(
    "/admin/organization/event-concepts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const query = (request.query ?? {}) as { businessUnitId?: string };
        const eventConcepts = await dependencies.organizationService.listEventConcepts(actor, {
          businessUnitId: query.businessUnitId
        });
        return reply.code(200).send({ eventConcepts });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/organization/event-concepts/:id/compatible-locations",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const compatible = await dependencies.organizationService.listCompatibleLocations(
          actor,
          request.params.id
        );
        return reply.code(200).send({ compatibleLocations: compatible });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get(
    "/admin/organization/overview",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, adminRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const overview = await dependencies.organizationService.getOverview(actor);
        if (!overview) {
          return reply.code(404).send({ error: "Not Found", message: "organization not found" });
        }
        return reply.code(200).send({ overview });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get(
    "/admin/organization/external-catalog-entries",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = await authenticate(request, reply, adminRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const entries = await dependencies.organizationService.listExternalCatalogEntries(actor);
        return reply.code(200).send({ externalCatalogEntries: entries });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof OrganizationError) {
    const errorName =
      error.statusCode === 400 ? "Bad Request" :
      error.statusCode === 404 ? "Not Found" : "Forbidden";
    return reply.code(error.statusCode).send({ error: errorName, message: error.message });
  }
  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: OrganizationRouteDependencies["auth"]
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
        error.statusCode === 401 ? "Unauthorized" :
        error.statusCode === 409 ? "Conflict" : "Forbidden";
      reply.code(error.statusCode).send({ error: errorName, message: error.message });
      return undefined;
    }
    throw error;
  }
}
