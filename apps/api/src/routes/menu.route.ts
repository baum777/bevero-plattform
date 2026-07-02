import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  MenuError,
  type MenuServicePort,
} from "../modules/menu/menu.service.js";

export type MenuRouteDependencies = {
  menuService: MenuServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function menuRoute(
  app: FastifyInstance,
  dependencies: MenuRouteDependencies
): Promise<void> {
  // All routes path-encoded under /admin/menu/... (no fastify.register({ prefix })).
  // Mirror ADR-0029-B §14 binding.

  app.get<{ Params: { unitId: string }; Querystring: { slotKind?: string } }>(
    "/admin/menu/operational-units/:unitId/menus",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const unitId = request.params.unitId?.trim();
      if (!unitId) {
        return reply.code(400).send({ error: "Bad Request", message: "unit id is required" });
      }

      const slotKind = request.query.slotKind?.trim() || undefined;
      try {
        const menus = await dependencies.menuService.listByUnitAndSlot(
          actor,
          unitId,
          { slotKind, activeOnly: true }
        );
        return reply.code(200).send({ menus });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/menu/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const menuId = request.params.id?.trim();
      if (!menuId) {
        return reply.code(400).send({ error: "Bad Request", message: "menu id is required" });
      }

      try {
        const menu = await dependencies.menuService.getById(actor, menuId);
        if (!menu) {
          return reply.code(404).send({ error: "Not Found", message: "menu not found" });
        }
        return reply.code(200).send({ menu });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/menu/items/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const itemId = request.params.id?.trim();
      if (!itemId) {
        return reply.code(400).send({ error: "Bad Request", message: "item id is required" });
      }

      try {
        const item = await dependencies.menuService.getItemWithDetails(actor, itemId);
        if (!item) {
          return reply.code(404).send({ error: "Not Found", message: "menu item not found" });
        }
        return reply.code(200).send({ item });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof MenuError) {
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
  authDependencies?: MenuRouteDependencies["auth"]
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
