import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  updateBarRefillRunItemSchema,
  createCorrectionRequestSchema,
  createGoodsReceiptSchema,
  createInventoryItemSchema,
  importInventoryCsvSchema,
  createPurchaseOrderSchema,
  createTransferSchema,
  createWithdrawalSchema,
  updateInventoryItemSchema
} from "../modules/inventory/inventory.schemas.js";
import type { CorrectionServicePort } from "../modules/inventory/correction.service.js";
import type { BarRefillServicePort } from "../modules/inventory/bar-refill.service.js";
import type { InventoryCsvServicePort } from "../modules/inventory/inventory-csv.service.js";
import type { GoodsReceiptServicePort } from "../modules/inventory/goods-receipt.service.js";
import type { InventoryItemServicePort } from "../modules/inventory/inventory-item.service.js";
import type { InventoryMasterDataServicePort } from "../modules/inventory/inventory-master-data.service.js";
import type { InventoryReadServicePort } from "../modules/inventory/inventory-read.service.js";
import type { PurchaseOrderServicePort } from "../modules/inventory/purchase-order.service.js";
import type { ReviewTaskServicePort } from "../modules/inventory/review-task.service.js";
import type { TransferServicePort } from "../modules/inventory/transfer.service.js";
import type { WithdrawalServicePort } from "../modules/inventory/withdrawal.service.js";

export type InventoryRouteDependencies = {
  purchaseOrderService: PurchaseOrderServicePort;
  inventoryItemService: InventoryItemServicePort;
  inventoryMasterDataService: InventoryMasterDataServicePort;
  goodsReceiptService: GoodsReceiptServicePort;
  withdrawalService: WithdrawalServicePort;
  transferService: TransferServicePort;
  correctionService: CorrectionServicePort;
  reviewTaskService: ReviewTaskServicePort;
  barRefillService: BarRefillServicePort;
  inventoryReadService: InventoryReadServicePort;
  inventoryCsvService: InventoryCsvServicePort;
  demoMode?: boolean;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const adminOnlyRoles = ["admin"] as const satisfies readonly Role[];
const leadRoles = ["admin", "shift_lead"] as const satisfies readonly Role[];
const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function inventoryRoute(
  app: FastifyInstance,
  dependencies: InventoryRouteDependencies
): Promise<void> {
  app.get("/inventory/master-data", async (request, reply) => {
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

    return dependencies.inventoryMasterDataService.list(actor.organizationId);
  });

  app.get("/admin/inventory/stock", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    return {
      items: await dependencies.inventoryReadService.listStock()
    };
  });

  app.get("/admin/inventory/movements", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    return {
      movements: await dependencies.inventoryReadService.listMovements()
    };
  });

  app.get("/admin/inventory/csv", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const csv = await dependencies.inventoryCsvService.exportCsv();

    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="warenwirtschaft.csv"')
      .send(csv);
  });

  app.post("/admin/inventory/csv-import", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(importInventoryCsvSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }
    if (!actor.organizationId) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "actor has no organization context"
      });
    }

    return dependencies.inventoryCsvService.importCsv({
      ...input,
      actorUserId: actor.userId,
      actorOrganizationId: actor.organizationId
    });
  });

  app.post("/admin/inventory/reset", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    if (!dependencies.demoMode) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "inventory reset is only available in demo mode"
      });
    }

    return dependencies.inventoryCsvService.reset();
  });

  app.get("/admin/review-tasks", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const query = request.query as { windowDays?: string };
    let windowDays: number | undefined;
    if (query.windowDays !== undefined) {
      const parsed = Number.parseInt(query.windowDays, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
        reply.code(400).send({
          error: "Bad Request",
          message: "windowDays must be an integer between 1 and 365"
        });
        return reply;
      }
      windowDays = parsed;
    }

    return {
      tasks: await dependencies.inventoryReadService.listOpenReviewTasks(
        windowDays === undefined ? undefined : { windowDays }
      )
    };
  });

  app.post("/admin/inventory/items", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createInventoryItemSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.inventoryItemService.create(input);

    return reply.code(201).send(result);
  });

  app.get("/admin/inventory/items", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    return {
      items: await dependencies.inventoryItemService.list()
    };
  });

  app.get("/admin/inventory/items/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.inventoryItemService.get(id);
  });

  app.patch("/admin/inventory/items/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    const input = parseBody(updateInventoryItemSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    return dependencies.inventoryItemService.update(id, input);
  });

  app.post("/admin/inventory/items/:id/deactivate", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.inventoryItemService.deactivate(id);
  });

  app.post("/admin/purchase-orders", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createPurchaseOrderSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.purchaseOrderService.create(input, actor);

    return reply.code(201).send(result);
  });

  app.post("/admin/purchase-orders/:id/mark-ordered", async (request, reply) => {
    const actor = await authenticate(request, reply, ["admin", "shift_lead"], dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.purchaseOrderService.markOrdered(id, actor.userId);
  });

  app.post("/admin/purchase-orders/:id/cancel", async (request, reply) => {
    const actor = await authenticate(request, reply, ["admin", "shift_lead"], dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.purchaseOrderService.cancel(id, actor.userId);
  });

  app.get("/admin/purchase-orders", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    return {
      purchaseOrders: await dependencies.purchaseOrderService.list()
    };
  });

  app.get("/admin/purchase-orders/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.purchaseOrderService.get(id);
  });

  app.post("/goods-receipts", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createGoodsReceiptSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.goodsReceiptService.create(input, actor);

    return reply.code(201).send(result);
  });

  app.get("/goods-receipts", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    return {
      goodsReceipts: await dependencies.goodsReceiptService.list()
    };
  });

  app.get("/goods-receipts/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.goodsReceiptService.get(id);
  });

  app.post("/withdrawals", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createWithdrawalSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.withdrawalService.create(input, actor);

    return reply.code(201).send(result);
  });

  app.post("/transfers", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createTransferSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.transferService.create(input, actor);

    return reply.code(201).send(result);
  });

  app.post("/correction-requests", async (request, reply) => {
    const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const input = parseBody(createCorrectionRequestSchema.safeParse(request.body), reply);

    if (!input) {
      return reply;
    }

    const result = await dependencies.correctionService.createRequest(input, actor);

    return reply.code(201).send(result);
  });

  app.post("/bar-refill/runs", async (request, reply) => {
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

    return dependencies.barRefillService.createOrGetTodayRun(actor);
  });

  // Static route must be registered before the parameterised :id route so
  // Fastify resolves "today" as this handler, not as a run ID.
  app.get("/bar-refill/runs/today", async (request, reply) => {
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

    const run = await dependencies.barRefillService.getTodayRun(actor);
    if (!run) {
      return reply.code(404).send({ error: "Not Found", message: "no active run for today" });
    }
    return run;
  });

  app.get("/bar-refill/runs/:id", async (request, reply) => {
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

    const id = extractIdParam(request, reply);
    if (!id) {
      return reply;
    }

    return dependencies.barRefillService.getRun(id, actor);
  });

  app.patch("/bar-refill/runs/:id/items/:itemId", async (request, reply) => {
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

    const runId = extractIdParam(request, reply);
    if (!runId) {
      return reply;
    }

    const itemId = extractItemIdParam(request, reply);
    if (!itemId) {
      return reply;
    }

    const input = parseBody(updateBarRefillRunItemSchema.safeParse(request.body), reply);
    if (!input) {
      return reply;
    }

    return dependencies.barRefillService.updateRunItem(runId, itemId, input, actor);
  });

  app.post("/bar-refill/runs/:id/items/:itemId/confirm", async (request, reply) => {
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

    const runId = extractIdParam(request, reply);
    if (!runId) {
      return reply;
    }
    const itemId = extractItemIdParam(request, reply);
    if (!itemId) {
      return reply;
    }

    return dependencies.barRefillService.confirmRunItem(runId, itemId, actor);
  });

  app.post("/bar-refill/runs/:id/items/:itemId/cancel", async (request, reply) => {
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

    const runId = extractIdParam(request, reply);
    if (!runId) {
      return reply;
    }
    const itemId = extractItemIdParam(request, reply);
    if (!itemId) {
      return reply;
    }

    return dependencies.barRefillService.cancelRunItem(runId, itemId, actor);
  });

  app.get<{ Querystring: { status?: string; limit?: string } }>(
    "/admin/correction-requests",
    async (request, reply) => {
      const actor = await authenticate(request, reply, leadRoles, dependencies.auth);
      if (!actor) return reply;

      const status = request.query.status?.trim();
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

      const correctionRequests = await dependencies.inventoryReadService.listCorrectionRequests({
        status,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 50
      });
      return reply.code(200).send({ correctionRequests });
    }
  );

  app.get<{ Querystring: { workspace_group_id?: string } }>(
    "/admin/inventory/stock-by-location",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;

      const workspaceGroupId = request.query.workspace_group_id?.trim();
      if (!workspaceGroupId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "workspace_group_id query parameter is required"
        });
      }

      const locations = await dependencies.inventoryReadService.listStockByLocation(workspaceGroupId);
      return reply.code(200).send({ locations });
    }
  );

  app.post("/admin/correction-requests/:id/approve", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.correctionService.approve(id, actor);
  });

  app.post("/admin/correction-requests/:id/reject", async (request, reply) => {
    const actor = await authenticate(request, reply, leadRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.correctionService.reject(id, actor);
  });

  app.post("/admin/review-tasks/:id/start-review", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.reviewTaskService.startReview(id, actor);
  });

  app.post("/admin/review-tasks/:id/resolve", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.reviewTaskService.resolve(id, actor);
  });

  app.post("/admin/review-tasks/:id/dismiss", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    const id = extractIdParam(request, reply);

    if (!id) {
      return reply;
    }

    return dependencies.reviewTaskService.dismiss(id, actor);
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: InventoryRouteDependencies["auth"]
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

function extractIdParam(request: FastifyRequest, reply: FastifyReply): string | undefined {
  const params = request.params as { id?: string };

  if (!params.id) {
    reply.code(400).send({ error: "Bad Request", message: "id is required" });
    return undefined;
  }

  return params.id;
}

function extractItemIdParam(request: FastifyRequest, reply: FastifyReply): string | undefined {
  const params = request.params as { itemId?: string };

  if (!params.itemId) {
    reply.code(400).send({ error: "Bad Request", message: "itemId is required" });
    return undefined;
  }

  return params.itemId;
}

function parseBody<T>(
  result: { success: true; data: T } | { success: false; error: { issues: unknown[] } },
  reply: FastifyReply
): T | undefined {
  if (result.success) {
    return result.data;
  }

  reply.code(400).send({
    error: "Bad Request",
    message: "request body validation failed",
    issues: result.error.issues
  });

  return undefined;
}
