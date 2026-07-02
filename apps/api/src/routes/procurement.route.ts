import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type Actor,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import type { ProcurementIngestService } from "../modules/procurement/procurement-ingest.service.js";
import type { ProcurementReadService } from "../modules/procurement/procurement-read.service.js";
import type { ProcurementWriteService } from "../modules/procurement/procurement-write.service.js";
import {
  listProcurementOrdersQuerySchema,
  patchOrderItemSchema,
  receiveOrderSchema
} from "../modules/procurement/procurement.schemas.js";

export type ProcurementRouteDependencies = {
  readService: ProcurementReadService;
  writeService: ProcurementWriteService;
  ingestService: ProcurementIngestService;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const leadRoles = ["admin", "shift_lead"] as const satisfies readonly Role[];
const adminOnlyRoles = ["admin"] as const satisfies readonly Role[];

export async function procurementRoute(
  app: FastifyInstance,
  dependencies: ProcurementRouteDependencies
): Promise<void> {
  app.get("/procurement/orders", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, leadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const parsed = listProcurementOrdersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "query validation failed",
        issues: parsed.error.issues
      });
    }

    const query = parsed.data;
    return dependencies.readService.listOrders(actor.organizationId, {
      status: query.status,
      source: query.source,
      supplierName: query.supplier_name,
      fromDate: query.from_date ? new Date(query.from_date) : undefined,
      toDate: query.to_date ? new Date(query.to_date) : undefined,
      page: query.page,
      limit: query.limit
    });
  });

  app.get("/procurement/orders/:id", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, leadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);
    if (!id) {
      return reply;
    }

    return dependencies.readService.getOrder(actor.organizationId, id);
  });

  app.patch("/procurement/orders/:id/items/:itemId", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, leadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const params = request.params as { id?: string; itemId?: string };
    if (!params.id || !params.itemId) {
      return reply.code(400).send({ error: "Bad Request", message: "id and itemId are required" });
    }

    const parsed = patchOrderItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "body validation failed",
        issues: parsed.error.issues
      });
    }

    return dependencies.writeService.updateItem(
      actor.organizationId,
      params.id,
      params.itemId,
      parsed.data,
      actor
    );
  });

  app.post("/procurement/orders/:id/receive", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, leadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);
    if (!id) {
      return reply;
    }

    const parsed = receiveOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "body validation failed",
        issues: parsed.error.issues
      });
    }

    return dependencies.writeService.receiveOrder(actor.organizationId, id, parsed.data, actor);
  });

  app.get("/procurement/health/stuck-orders", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.readService.stuckOrders(actor.organizationId);
  });

  app.get("/procurement/health/receive-errors", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.readService.receiveErrors(actor.organizationId);
  });

  app.get("/procurement/health/snapshot-integrity", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.readService.snapshotIntegrity(actor.organizationId);
  });

  app.get("/procurement/health/parse-failures-24h", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.readService.parseFailures24h(actor.organizationId);
  });

  app.get("/procurement/health/mail-status", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.readService.mailStatus(actor.organizationId);
  });

  app.post("/procurement/ingest/mail-check", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.ingestService.ingestPoll();
  });

  app.post("/integrations/foodnotify/email-import/run", async (request, reply) => {
    const actor = await requireOrgActor(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    return dependencies.ingestService.ingestPoll();
  });
}

async function requireOrgActor(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: ProcurementRouteDependencies["auth"]
): Promise<(Actor & { organizationId: string }) | undefined> {
  try {
    if (!authDependencies) {
      throw new ActorAuthError("authorization boundary is not configured", 401);
    }

    const actor = requireActorRole(
      await parseActorFromHeaders(request.headers, authDependencies),
      allowedRoles
    );

    if (!actor.organizationId) {
      reply.code(403).send({
        error: "Forbidden",
        message: "actor has no organization context"
      });
      return undefined;
    }

    return actor as Actor & { organizationId: string };
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

function extractIdParam(request: FastifyRequest, reply: FastifyReply): string | undefined {
  const params = request.params as { id?: string };
  if (!params.id) {
    reply.code(400).send({ error: "Bad Request", message: "id is required" });
    return undefined;
  }
  return params.id;
}
