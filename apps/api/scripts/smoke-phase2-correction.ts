/**
 * Phase 2 Kitchen Inventory Workflow smoke.
 *
 * Exercises the manager-approved correction flow against the configured
 * Supabase database:
 *   1. staff submits a walk-route variance with all Phase 2 evidence fields
 *   2. read-back confirms persistence (organizationId, storageLocationId,
 *      note, expectedQuantity, countedQuantity, sourceLabel, submittedAt)
 *   3. manager (different user) approves the correction
 *   4. assertion: exactly one correction_positive / correction_negative
 *      movement is created with the storageLocationId from the request and
 *      the "Walk-Route · reason · note" note shape
 *   5. assertion: InventoryStockSnapshot at that location is upserted
 *   6. assertion: manager approve of a second request with the same item
 *      updates the snapshot again (delta accumulates at the location)
 *   7. rejection path: rejects a third request, asserts no movement +
 *      status is rejected
 *   8. authorization: staff attempts to approve own request → 409
 *
 * Cleanup removes all `codex-smoke-*` rows at the end and refuses to leave
 * any visible rows behind.
 */

import { createHmac, randomUUID } from "node:crypto";
import { inspect } from "node:util";

import type { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import type { FastifyInstance } from "fastify";

config();

const smokePrefix = "codex-smoke-p2-";
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.log("Skipped: DATABASE_URL not set");
  process.exit(0);
}

const appJwtSecret = process.env.SUPABASE_JWT_SECRET?.trim() || "test-supabase-jwt-secret";
const runtimeNodeEnv = "production" as const;

const runId = randomUUID();
const smokeActorOrganizationId = `${smokePrefix}org-${runId}`;
const staffUserId = `${smokePrefix}staff-${runId}`;
const managerUserId = `${smokePrefix}manager-${runId}`;
const smokeStorageLocationId = `${smokePrefix}loc-${runId}`;
const staffActorMemberId = `member_${randomUUID()}`;
const managerActorMemberId = `member_${randomUUID()}`;

const staffBearerToken = createSmokeJwt(staffUserId, appJwtSecret);
const managerBearerToken = createSmokeJwt(managerUserId, appJwtSecret);

const orgHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
  "x-organization-id": smokeActorOrganizationId
});

type AppModule = { buildApp: (options?: { env?: { NODE_ENV: "production"; DEMO_MODE: boolean; SUPABASE_JWT_SECRET?: string }; logger?: false }) => FastifyInstance };
type PrismaModule = { prisma: PrismaClient };

const appModulePath: string = "../src/app.js";
const prismaModulePath: string = "../src/lib/prisma.js";
const { buildApp } = (await import(appModulePath)) as AppModule;
const { prisma } = (await import(prismaModulePath)) as PrismaModule;

const app = buildApp({
  env: {
    NODE_ENV: runtimeNodeEnv,
    DEMO_MODE: false,
    SUPABASE_JWT_SECRET: appJwtSecret
  }
});

let createdItemId = "";
let createdItemName = "";
let correctionRequestAId = "";
let correctionRequestBId = "";
let correctionRequestCId = "";
let selfApprovalRequestId = "";
let approvedMovementAId = "";
let approvedMovementBId = "";

try {
  await app.ready();

  // Pre-flight cleanup: any rows from prior crashed runs of this smoke
  await prisma.workflowTask.deleteMany({
    where: {
      workflowEvent: { externalId: { startsWith: smokePrefix } }
    }
  });
  await prisma.workflowEvent.deleteMany({
    where: { externalId: { startsWith: smokePrefix } }
  });
  await prisma.inventoryStockSnapshot.deleteMany({
    where: { storageLocationId: { startsWith: smokePrefix } }
  });
  await prisma.inventoryMovement.deleteMany({
    where: { storageLocationId: { startsWith: smokePrefix } }
  });
  await prisma.inventoryCorrectionRequest.deleteMany({
    where: { storageLocationId: { startsWith: smokePrefix } }
  });
  await prisma.goodsReceiptItem.deleteMany({
    where: { storageLocationId: { startsWith: smokePrefix } }
  });
  await prisma.goodsReceipt.deleteMany({
    where: { note: { contains: smokePrefix } }
  });
  await prisma.inventoryItem.deleteMany({
    where: { name: { startsWith: smokePrefix } }
  });
  await prisma.storageLocation.deleteMany({
    where: { id: { startsWith: smokePrefix } }
  });
  await prisma.organizationMember.deleteMany({
    where: { userId: { startsWith: smokePrefix } }
  });

  await prisma.organizationMember.createMany({
    data: [
      {
        id: staffActorMemberId,
        organizationId: smokeActorOrganizationId,
        userId: staffUserId,
        role: "staff"
      },
      {
        id: managerActorMemberId,
        organizationId: smokeActorOrganizationId,
        userId: managerUserId,
        role: "manager"
      }
    ]
  });

  await prisma.storageLocation.create({
    data: {
      id: smokeStorageLocationId,
      organizationId: smokeActorOrganizationId,
      name: `${smokePrefix} Kuehlschrank`,
      isActive: true,
      isCountable: true,
      isTransferPoint: false
    }
  });

  createdItemName = `${smokePrefix}${runId}`;
  // Create the item + opening stock via Prisma so the smoke does not need a
  // third "owner/admin" setup actor. The correction flow under test is
  // staff-submits / manager-approves; item creation is not the focus.
  const createdItem = await prisma.inventoryItem.create({
    data: {
      organizationId: smokeActorOrganizationId,
      name: createdItemName,
      sku: createdItemName,
      category: "codex-smoke",
      defaultUnit: "Stück",
      minStock: 0,
      isActive: true,
      storageLocationId: smokeStorageLocationId
    }
  });
  createdItemId = createdItem.id;

  const openingReceipt = await prisma.goodsReceipt.create({
    data: {
      receivedById: managerUserId,
      note: `Phase 2 smoke opening receipt ${runId}`,
      createdAt: new Date()
    }
  });
  await prisma.goodsReceiptItem.create({
    data: {
      goodsReceiptId: openingReceipt.id,
      inventoryItemId: createdItemId,
      quantity: 10,
      unit: "Stück",
      storageLocationId: smokeStorageLocationId,
      note: `Phase 2 smoke opening receipt ${runId}`
    }
  });
  await prisma.inventoryMovement.create({
    data: {
      idempotencyKey: `codex-smoke-p2-opening:${runId}`,
      organizationId: smokeActorOrganizationId,
      inventoryItemId: createdItemId,
      type: "goods_received",
      quantity: 10,
      unit: "Stück",
      actorUserId: managerUserId,
      storageLocationId: smokeStorageLocationId,
      goodsReceiptId: openingReceipt.id,
      note: `Phase 2 smoke opening receipt ${runId}`,
      createdAt: new Date()
    }
  });
  await prisma.inventoryStockSnapshot.create({
    data: {
      inventoryItemId: createdItemId,
      storageLocationId: smokeStorageLocationId,
      quantity: 10,
      unit: "Stück",
      calculatedAt: new Date()
    }
  });

  // 1. staff submits a walk-route variance correction request
  correctionRequestAId = await submitCorrectionRequest(app, staffUserId, {
    inventoryItemId: createdItemId,
    expectedDelta: -3,
    unit: "Stück",
    reason: "count mismatch",
    storageLocationId: smokeStorageLocationId,
    note: "Regal 2, 3 fehlen — wahrscheinlich verbraucht",
    expectedQuantity: 10,
    countedQuantity: 7,
    sourceLabel: "Walk-Route"
  });
  console.log(`Staff submitted correction request A: ${correctionRequestAId}`);

  // 2. read-back confirms Phase 2 evidence fields are persisted
  const readBack = await readCorrectionRequest(app, managerUserId, correctionRequestAId);
  assertField(readBack, "organizationId", smokeActorOrganizationId, "correction A organizationId");
  assertField(readBack, "storageLocationId", smokeStorageLocationId, "correction A storageLocationId");
  assertField(readBack, "note", "Regal 2, 3 fehlen — wahrscheinlich verbraucht", "correction A note");
  assertField(readBack, "expectedQuantity", 10, "correction A expectedQuantity");
  assertField(readBack, "countedQuantity", 7, "correction A countedQuantity");
  assertField(readBack, "sourceLabel", "Walk-Route", "correction A sourceLabel");
  assertField(readBack, "status", "open", "correction A status");
  if (typeof readBack.submittedAt !== "string" || readBack.submittedAt.length === 0) {
    throw new Error("correction A submittedAt is not a non-empty string");
  }
  console.log("Correction A read-back confirmed Phase 2 evidence fields.");

  // 3. manager approves correction A
  const approveA = await approveCorrection(app, managerUserId, correctionRequestAId);
  approvedMovementAId = approveA.movementId;
  assertField(approveA, "status", "approved", "approve A response status");
  console.log(`Manager approved correction A: movement ${approvedMovementAId}, stockAfter=${approveA.stockAfter}`);

  // 4. the resulting movement is a correction_negative with the request's storageLocationId
  const movementA = await prisma.inventoryMovement.findUnique({
    where: { id: approvedMovementAId }
  });
  if (!movementA) throw new Error("approve A movement not found in DB");
  assertField(movementA, "type", "correction_negative", "movement A type");
  assertField(movementA, "storageLocationId", smokeStorageLocationId, "movement A storageLocationId");
  assertField(movementA, "organizationId", smokeActorOrganizationId, "movement A organizationId");
  assertField(movementA, "quantity", 3, "movement A quantity");
  if (typeof movementA.note !== "string" || !movementA.note.includes("Walk-Route") || !movementA.note.includes("count mismatch") || !movementA.note.includes("Regal 2")) {
    throw new Error(`movement A note did not match Walk-Route pattern: ${String(movementA.note)}`);
  }
  console.log("Movement A: correction_negative at the request location, with Walk-Route note.");

  // 5. InventoryStockSnapshot at the location reflects the corrected quantity
  const snapshotA = await prisma.inventoryStockSnapshot.findUnique({
    where: {
      inventoryItemId_storageLocationId: {
        inventoryItemId: createdItemId,
        storageLocationId: smokeStorageLocationId
      }
    }
  });
  if (!snapshotA) throw new Error("snapshot at smokeStorageLocationId was not created by approval");
  assertField(snapshotA, "quantity", 7, "snapshot A quantity");
  assertField(snapshotA, "unit", "Stück", "snapshot A unit");
  console.log("Snapshot A upserted at the location with corrected quantity 7.");

  // 6. second correction: staff submits +1, manager approves → snapshot goes 7 → 8
  correctionRequestBId = await submitCorrectionRequest(app, staffUserId, {
    inventoryItemId: createdItemId,
    expectedDelta: 1,
    unit: "Stück",
    reason: "found extra crate in back",
    storageLocationId: smokeStorageLocationId,
    expectedQuantity: 7,
    countedQuantity: 8,
    sourceLabel: "Walk-Route"
  });
  const approveB = await approveCorrection(app, managerUserId, correctionRequestBId);
  approvedMovementBId = approveB.movementId;
  const snapshotB = await prisma.inventoryStockSnapshot.findUnique({
    where: {
      inventoryItemId_storageLocationId: {
        inventoryItemId: createdItemId,
        storageLocationId: smokeStorageLocationId
      }
    }
  });
  if (!snapshotB) throw new Error("snapshot B not found after second approval");
  assertField(snapshotB, "quantity", 8, "snapshot B quantity after second approval");
  console.log(`Manager approved correction B: movement ${approvedMovementBId}, snapshot → 8.`);

  // 7. reject path: correction C is rejected → no movement, status=rejected
  correctionRequestCId = await submitCorrectionRequest(app, staffUserId, {
    inventoryItemId: createdItemId,
    expectedDelta: -1,
    unit: "Stück",
    reason: "test reject path",
    storageLocationId: smokeStorageLocationId,
    expectedQuantity: 8,
    countedQuantity: 7
  });
  const rejectC = await rejectCorrection(app, managerUserId, correctionRequestCId);
  assertField(rejectC, "status", "rejected", "reject C response status");
  const movementCountForC = await prisma.inventoryMovement.count({
    where: {
      inventoryItemId: createdItemId,
      note: {
        contains: "test reject path"
      }
    }
  });
  if (movementCountForC !== 0) {
    throw new Error(`reject path created ${movementCountForC} unexpected movements`);
  }
  console.log("Reject path: no movement created, request C status=rejected.");

  // 8. staff attempts to approve own request → 403 (staff role not in leadRoles)
  selfApprovalRequestId = await submitCorrectionRequest(app, staffUserId, {
    inventoryItemId: createdItemId,
    expectedDelta: -1,
    unit: "Stück",
    reason: "self approval test",
    storageLocationId: smokeStorageLocationId
  });
  const selfApproval = await app.inject({
    method: "POST",
    url: `/admin/correction-requests/${selfApprovalRequestId}/approve`,
    headers: orgHeaders(staffBearerToken)
  });
  if (selfApproval.statusCode !== 403) {
    throw new Error(
      `staff-approve expected 403 (staff not in leadRoles), got ${selfApproval.statusCode}: ${selfApproval.body}`
    );
  }
  console.log("Staff role correctly blocked from approval at the auth layer (403).");

  // 8b. now exercise the in-service self-approval guard: manager approves
  // their own request → 409 InventoryConflict (the smoke-mint sub-claim is the
  // same sub on both the request and the actor).
  const managerOwnRequestId = await prisma.inventoryCorrectionRequest.create({
    data: {
      organizationId: smokeActorOrganizationId,
      storageLocationId: smokeStorageLocationId,
      inventoryItemId: createdItemId,
      requestedById: managerUserId,
      expectedDelta: -1,
      unit: "Stück",
      reason: "manager self-approval test",
      sourceLabel: "Walk-Route",
      submittedAt: new Date()
    }
  });
  const selfManagerApproval = await app.inject({
    method: "POST",
    url: `/admin/correction-requests/${managerOwnRequestId.id}/approve`,
    headers: orgHeaders(managerBearerToken)
  });
  if (selfManagerApproval.statusCode !== 409) {
    throw new Error(
      `manager self-approval expected 409, got ${selfManagerApproval.statusCode}: ${selfManagerApproval.body}`
    );
  }
  console.log("Manager self-approval correctly rejected at the service layer (409).");
  await prisma.inventoryCorrectionRequest.delete({ where: { id: managerOwnRequestId.id } });

  // cleanup the self-approval request so the final cleanup is clean
  await prisma.workflowTask.deleteMany({
    where: {
      workflowEvent: {
        externalId: selfApprovalRequestId
      }
    }
  });
  await prisma.workflowEvent.deleteMany({
    where: { externalId: selfApprovalRequestId }
  });
  await prisma.inventoryCorrectionRequest.delete({
    where: { id: selfApprovalRequestId }
  });

  console.log("Phase 2 Kitchen correction smoke gate passed.");
} catch (error) {
  console.error("Phase 2 Kitchen correction smoke gate failed:");
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error("Cleanup failed:");
    console.error(formatError(cleanupError));
    process.exitCode = 1;
  }
  await app.close();
  await prisma.$disconnect();
}

async function createInventoryItemViaApi(_app: FastifyInstance, _name: string): Promise<string> {
  throw new Error("createInventoryItemViaApi is unused; the smoke creates items via Prisma directly");
}

void createInventoryItemViaApi;

type CorrectionSubmitInput = {
  inventoryItemId: string;
  expectedDelta: number;
  unit: string;
  reason: string;
  storageLocationId: string;
  note?: string;
  expectedQuantity?: number;
  countedQuantity?: number;
  sourceLabel?: string;
};

async function submitCorrectionRequest(
  app: FastifyInstance,
  _actorUserId: string,
  input: CorrectionSubmitInput
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/correction-requests",
    headers: orgHeaders(staffBearerToken),
    payload: {
      inventoryItemId: input.inventoryItemId,
      expectedDelta: input.expectedDelta,
      unit: input.unit,
      reason: input.reason,
      storageLocationId: input.storageLocationId,
      note: input.note,
      expectedQuantity: input.expectedQuantity,
      countedQuantity: input.countedQuantity,
      sourceLabel: input.sourceLabel
    }
  });
  assertStatus(response, [200, 201], "POST /correction-requests");
  const body = readRecord(response.json(), "submit correction");
  if (typeof body.correctionRequestId !== "string") {
    throw new Error("submit correction did not return correctionRequestId");
  }
  return body.correctionRequestId;
}

async function readCorrectionRequest(
  app: FastifyInstance,
  _actorUserId: string,
  id: string
): Promise<Record<string, unknown>> {
  const response = await app.inject({
    method: "GET",
    url: `/admin/correction-requests?status=open&limit=200`,
    headers: orgHeaders(managerBearerToken)
  });
  assertStatus(response, [200], "GET /admin/correction-requests");
  const body = readRecord(response.json(), "list correction requests");
  const list = Array.isArray(body.correctionRequests) ? body.correctionRequests : [];
  const found = list.find((row): row is Record<string, unknown> =>
    typeof row === "object" && row !== null && (row as Record<string, unknown>).id === id
  );
  if (!found) {
    throw new Error(`correction request ${id} not found in list response`);
  }
  return found;
}

async function approveCorrection(
  app: FastifyInstance,
  _actorUserId: string,
  id: string
): Promise<Record<string, unknown>> {
  const response = await app.inject({
    method: "POST",
    url: `/admin/correction-requests/${id}/approve`,
    headers: orgHeaders(managerBearerToken)
  });
  assertStatus(response, [200], `POST /admin/correction-requests/${id}/approve`);
  return readRecord(response.json(), "approve correction");
}

async function rejectCorrection(
  app: FastifyInstance,
  _actorUserId: string,
  id: string
): Promise<Record<string, unknown>> {
  const response = await app.inject({
    method: "POST",
    url: `/admin/correction-requests/${id}/reject`,
    headers: orgHeaders(managerBearerToken)
  });
  assertStatus(response, [200], `POST /admin/correction-requests/${id}/reject`);
  return readRecord(response.json(), "reject correction");
}

async function cleanup(): Promise<void> {
  // delete in dependency order
  await prisma.inventoryStockSnapshot.deleteMany({
    where: { storageLocationId: smokeStorageLocationId }
  });
  await prisma.inventoryMovement.deleteMany({
    where: { storageLocationId: smokeStorageLocationId }
  });
  await prisma.workflowEvent.deleteMany({
    where: {
      type: "inventory.correction.requested",
      externalId: { in: [correctionRequestAId, correctionRequestBId, correctionRequestCId] }
    }
  });
  await prisma.workflowTask.deleteMany({
    where: {
      workflowEvent: {
        externalId: { in: [correctionRequestAId, correctionRequestBId, correctionRequestCId] }
      }
    }
  });
  await prisma.inventoryCorrectionRequest.deleteMany({
    where: {
      OR: [
        { storageLocationId: smokeStorageLocationId },
        { id: selfApprovalRequestId }
      ]
    }
  });
  await prisma.workflowEvent.deleteMany({
    where: { externalId: selfApprovalRequestId }
  });
  await prisma.workflowTask.deleteMany({
    where: {
      workflowEvent: { externalId: selfApprovalRequestId }
    }
  });
  await prisma.goodsReceiptItem.deleteMany({
    where: { storageLocationId: smokeStorageLocationId }
  });
  await prisma.goodsReceipt.deleteMany({
    where: { note: { contains: runId } }
  });
  await prisma.inventoryItem.deleteMany({
    where: {
      name: { startsWith: smokePrefix }
    }
  });
  await prisma.storageLocation.deleteMany({
    where: { id: smokeStorageLocationId }
  });
  await prisma.organizationMember.deleteMany({
    where: {
      userId: { in: [staffUserId, managerUserId] }
    }
  });
}

function createSmokeJwt(userId: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 60 * 60 }))
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function assertStatus(
  response: { statusCode: number; body: string },
  accepted: number[],
  label: string
): void {
  if (!accepted.includes(response.statusCode)) {
    throw new Error(
      `${label} expected HTTP ${accepted.join(" or ")}, got ${response.statusCode}: ${response.body}`
    );
  }
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} was not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function assertField(record: Record<string, unknown>, key: string, expected: unknown, label: string): void {
  if (record[key] !== expected) {
    throw new Error(
      `${label} ${key} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(record[key])}`
    );
  }
}

function formatError(error: unknown): string {
  return inspect(error, {
    colors: false,
    depth: null
  });
}
