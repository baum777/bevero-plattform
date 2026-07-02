import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import { LocationError, type LocationServicePort } from "../modules/location/location.service.js";

export type LocationRouteDependencies = {
  locationService: LocationServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function locationRoute(
  app: FastifyInstance,
  dependencies: LocationRouteDependencies
): Promise<void> {
  app.get("/admin/location/organizations", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    try {
      const organizations = await dependencies.locationService.listOrganizations(actor);
      return reply.code(200).send({ organizations });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/admin/location/organizations/:id/brands",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const organizationId = request.params.id?.trim();
      if (!organizationId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "organization id is required"
        });
      }

      try {
        const brands = await dependencies.locationService.listBrands(actor, organizationId);
        return reply.code(200).send({ brands });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get("/admin/location/locations", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    if (!actor.organizationId) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "actor has no organization context"
      });
    }

    try {
      const locations = await dependencies.locationService.listLocations(
        actor,
        actor.organizationId
      );
      return reply.code(200).send({ locations });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/admin/location/locations/:id", async (request, reply) => {
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
      const location = await dependencies.locationService.getLocation(actor, locationId);
      if (!location) {
        return reply.code(404).send({
          error: "Not Found",
          message: "location not found"
        });
      }
      return reply.code(200).send({ location });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/profile",
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
        const profile = await dependencies.locationService.getLocationProfile(actor, locationId);
        if (!profile) {
          return reply.code(404).send({
            error: "Not Found",
            message: "location not found"
          });
        }
        return reply.code(200).send({ profile });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>("/admin/location/locations/:id/areas", async (request, reply) => {
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
      const areas = await dependencies.locationService.listAreas(actor, locationId);
      return reply.code(200).send({ areas });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/storage-locations",
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
        const storageLocations = await dependencies.locationService.listStorageLocations(
          actor,
          locationId
        );
        return reply.code(200).send({ storageLocations });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/inventory-config",
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
        const inventoryConfig = await dependencies.locationService.listInventoryConfig(
          actor,
          locationId
        );
        return reply.code(200).send({ inventoryConfig });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/event-spaces",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      const locationId = request.params.id?.trim();
      if (!locationId) return reply.code(400).send({ error: "Bad Request", message: "location id is required" });
      try {
        const eventSpaces = await dependencies.locationService.listEventSpaces(actor, locationId);
        return reply.code(200).send({ eventSpaces });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string }; Querystring: { dateFrom?: string; dateTo?: string; type?: string } }>(
    "/admin/location/locations/:id/exception-rules",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      const locationId = request.params.id?.trim();
      if (!locationId) return reply.code(400).send({ error: "Bad Request", message: "location id is required" });
      try {
        const exceptionRules = await dependencies.locationService.listExceptionRules(actor, locationId, {
          dateFrom: request.query.dateFrom,
          dateTo: request.query.dateTo,
          type: request.query.type as never
        });
        return reply.code(200).send({ exceptionRules });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/reservation-connectors",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      const locationId = request.params.id?.trim();
      if (!locationId) return reply.code(400).send({ error: "Bad Request", message: "location id is required" });
      try {
        const connectors = await dependencies.locationService.listReservationConnectors(actor, locationId);
        return reply.code(200).send({ connectors });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/location/locations/:id/external-system-links",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      const locationId = request.params.id?.trim();
      if (!locationId) return reply.code(400).send({ error: "Bad Request", message: "location id is required" });
      try {
        const links = await dependencies.locationService.listExternalSystemLinks(actor, locationId);
        return reply.code(200).send({ links });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string }; Querystring: { date?: string } }>(
    "/admin/location/locations/:id/today-overview",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      const locationId = request.params.id?.trim();
      if (!locationId) return reply.code(400).send({ error: "Bad Request", message: "location id is required" });
      const date = request.query.date?.trim() || new Date().toISOString().slice(0, 10);
      try {
        const overview = await dependencies.locationService.getTodayOverview(actor, locationId, date);
        if (!overview) return reply.code(404).send({ error: "Not Found", message: "location not found" });
        return reply.code(200).send({ overview });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof LocationError) {
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
  authDependencies?: LocationRouteDependencies["auth"]
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
