import { createHmac, randomUUID } from "node:crypto";
import { inspect } from "node:util";

import { config } from "dotenv";

import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

config();

class RollbackSignal extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RollbackSignal";
  }
}

const smokeEnabled = process.env.SMOKE_TEST_ENABLED === "true";
const smokeRequired = process.env.SMOKE_REQUIRED === "true";
const smokeProfileRequired = process.env.SMOKE_PROFILE_REQUIRED === "true";
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const directUrl = process.env.DIRECT_URL?.trim() ?? "";
const runtimeSecret = process.env.SUPABASE_JWT_SECRET?.trim() ?? "";
const smokeProfileUserId = process.env.SMOKE_SUPABASE_USER_ID?.trim() ?? "";
const smokeProfileUserEmail = process.env.SMOKE_SUPABASE_USER_EMAIL?.trim() ?? "";
const appJwtSecret = runtimeSecret || "test-supabase-jwt-secret";

if (!smokeEnabled) {
  console.log("Skipped: SMOKE_TEST_ENABLED is not true.");
  process.exit(0);
}

if (!databaseUrl || !directUrl) {
  const message = "Skipped: DATABASE_URL and DIRECT_URL are required for the Supabase smoke runner.";
  if (smokeRequired) {
    console.error(message);
    process.exit(1);
  }

  console.log(message);
  process.exit(0);
}

if (isLocalDatabaseUrl(databaseUrl) || isLocalDatabaseUrl(directUrl)) {
  const message =
    "Skipped: Supabase-backed DATABASE_URL and DIRECT_URL are required; local PostgreSQL targets are not accepted for this smoke runner.";
  if (smokeRequired) {
    console.error(message);
    process.exit(1);
  }

  console.log(message);
  process.exit(0);
}

const state = {
  organizationId: `smoke_org_${randomUUID()}`,
  foreignOrganizationId: `smoke_org_${randomUUID()}`,
  userId: `smoke_user_${randomUUID()}`,
  foreignUserId: `smoke_foreign_${randomUUID()}`,
  itemId: `smoke_item_${randomUUID()}`,
  foreignItemId: `smoke_item_${randomUUID()}`,
  sourceLocationId: `smoke_source_${randomUUID()}`,
  targetLocationId: `smoke_target_${randomUUID()}`,
  foreignSourceLocationId: `smoke_source_${randomUUID()}`,
  foreignTargetLocationId: `smoke_target_${randomUUID()}`,
  alertTaskId: `smoke_alert_${randomUUID()}`,
  movementIds: [] as string[]
};

console.log(
  `Supabase smoke runner started against ${redactDatabaseUrl(databaseUrl)} (scoped smoke_* data).`
);

let app: ReturnType<typeof buildApp> | null = null;
let orgOwnershipColumnsAvailable = false;

try {
  orgOwnershipColumnsAvailable = await hasModelBackedOrgOwnershipColumns();
  await runProfileSmoke();
  await runTransferAndAlertSmoke();
  await runDashboardHistorySmoke();
  await runCrossOrgCheck();
  console.log("Supabase smoke runner passed.");
} catch (error) {
  console.error("Supabase smoke runner failed:");
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  if (app) {
    await app.close().catch(() => undefined);
  }

  await cleanupSmokeState();
  await prisma.$disconnect();
}

async function runProfileSmoke(): Promise<void> {
  if (!smokeProfileUserId) {
    const message =
      "Skipped profile RPC smoke: set SMOKE_SUPABASE_USER_ID (pre-seeded auth user UUID) and optional SMOKE_SUPABASE_USER_EMAIL.";
    if (smokeProfileRequired) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      const profileEmail = smokeProfileUserEmail || `${smokeProfileUserId}@smoke.local`;
      await setJwtClaims(tx, smokeProfileUserId, profileEmail);

      const profileRows = (await tx.$queryRawUnsafe(
        `select * from public.upsert_current_user_profile('Smoke User', null)`
      )) as Array<{
        authUserId: string;
        email: string;
        displayName: string | null;
        preferredStorageLocationId: string | null;
        createdAt: string;
        updatedAt: string;
      }>;

      if (profileRows.length !== 1) {
        throw new Error(`profile RPC returned ${profileRows.length} rows instead of 1`);
      }

      const profile = profileRows[0];
      if (profile.authUserId !== smokeProfileUserId) {
        throw new Error("profile RPC did not scope to the current user");
      }

      const storedProfile = await tx.userProfile.findUnique({
        where: {
          authUserId: smokeProfileUserId
        }
      });

      if (!storedProfile) {
        throw new Error("current user profile was not persisted");
      }

      let foreignInsertRejected = false;
      const foreignAuthUserId = randomUUID();
      try {
        await tx.userProfile.create({
          data: {
            id: `profile_${foreignAuthUserId.replace(/-/g, "")}`,
            authUserId: foreignAuthUserId,
            email: `${foreignAuthUserId}@smoke.local`,
            displayName: "Foreign User",
            isActive: true,
            updatedAt: new Date()
          }
        });
      } catch {
        foreignInsertRejected = true;
      }

      if (!foreignInsertRejected) {
        throw new Error("foreign profile insert unexpectedly succeeded");
      }

      throw new RollbackSignal("profile smoke rollback");
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) {
      throw error;
    }
  }

  console.log("Profile RPC smoke passed.");
}

async function runTransferAndAlertSmoke(): Promise<void> {
  await prisma.organizationMember.create({
    data: {
      id: `member_${randomUUID()}`,
      organizationId: state.organizationId,
      userId: state.userId,
      role: "owner"
    }
  });
  await prisma.organizationMember.create({
    data: {
      id: `member_${randomUUID()}`,
      organizationId: state.foreignOrganizationId,
      userId: state.userId,
      role: "viewer"
    }
  });

  await prisma.storageLocation.createMany({
    data: [
      {
        id: state.sourceLocationId,
        ...(orgOwnershipColumnsAvailable ? { organizationId: state.organizationId } : {}),
        name: `smoke_source_${randomUUID()}`,
        type: "smoke",
        isActive: true
      },
      {
        id: state.targetLocationId,
        ...(orgOwnershipColumnsAvailable ? { organizationId: state.organizationId } : {}),
        name: `smoke_target_${randomUUID()}`,
        type: "smoke",
        isActive: true
      }
    ]
  });

  await prisma.inventoryItem.create({
    data: {
      id: state.itemId,
      ...(orgOwnershipColumnsAvailable ? { organizationId: state.organizationId } : {}),
      name: `smoke_item_${randomUUID()}`,
      defaultUnit: "unit",
      storageLocationId: state.sourceLocationId,
      isActive: true
    }
  });

  const seededMovement = await prisma.inventoryMovement.create({
    data: {
      idempotencyKey: `smoke.seed:${state.itemId}`,
      organizationId: state.organizationId,
      inventoryItemId: state.itemId,
      type: "goods_received",
      quantity: 10,
      unit: "unit",
      actorUserId: state.userId,
      storageLocationId: state.sourceLocationId,
      note: "smoke seed"
    }
  });
  state.movementIds.push(seededMovement.id);

  app = buildApp({
    logger: true,
    env: {
      NODE_ENV: "production",
      DEMO_MODE: false,
      SUPABASE_JWT_SECRET: appJwtSecret
    }
  });
  app.addHook("onError", async (_request, _reply, error) => {
    console.error("Smoke app error:", formatError(error));
  });

  await app.ready();

  const headers = {
    authorization: `Bearer ${createJwt(state.userId, appJwtSecret)}`,
    "x-organization-id": state.organizationId
  };

  const missingOrgHeaderResponse = await app.inject({
    method: "GET",
    url: "/inventory/master-data",
    headers: {
      authorization: headers.authorization
    }
  });
  if (missingOrgHeaderResponse.statusCode !== 409) {
    throw new Error(
      `multi-org header guard expected HTTP 409, got ${missingOrgHeaderResponse.statusCode} ${missingOrgHeaderResponse.body}`
    );
  }

  const transferResponse = await app.inject({
    method: "POST",
    url: "/transfers",
    headers,
    payload: {
      inventoryItemId: state.itemId,
      quantity: 3,
      unit: "unit",
      fromStorageLocationId: state.sourceLocationId,
      toStorageLocationId: state.targetLocationId,
      note: "smoke transfer"
    }
  });

  if (transferResponse.statusCode !== 201) {
    throw new Error(
      `transfer route failed: HTTP ${transferResponse.statusCode} ${transferResponse.body}`
    );
  }

  const transferBody = transferResponse.json() as {
    movementId?: string;
    stockFromAfter?: number;
    stockToAfter?: number;
  };
  if (!transferBody.movementId) {
    throw new Error("transfer response did not include movementId");
  }
  if (transferBody.stockFromAfter !== 7 || transferBody.stockToAfter !== 3) {
    throw new Error(
      `transfer stock mismatch: expected 7/3, got ${String(transferBody.stockFromAfter)}/${String(
        transferBody.stockToAfter
      )}`
    );
  }
  state.movementIds.push(transferBody.movementId);

  const masterDataResponse = await app.inject({
    method: "GET",
    url: "/inventory/master-data",
    headers
  });
  if (masterDataResponse.statusCode !== 200) {
    throw new Error(
      `master-data route failed: HTTP ${masterDataResponse.statusCode} ${masterDataResponse.body}`
    );
  }

  const masterData = masterDataResponse.json() as {
    items?: Array<{ inventoryItemId: string; name: string }>;
    stock?: Array<{ inventoryItemId: string; currentStock: number }>;
  };
  if (!masterData.items?.some((item) => item.inventoryItemId === state.itemId)) {
    throw new Error("master-data route did not return the smoke item");
  }
  if (!masterData.stock?.some((row) => row.inventoryItemId === state.itemId && row.currentStock === 10)) {
    throw new Error("master-data route did not return the smoke stock total");
  }

  const movementsResponse = await app.inject({
    method: "GET",
    url: "/admin/inventory/movements",
    headers
  });
  if (movementsResponse.statusCode !== 200) {
    throw new Error(
      `movement route failed: HTTP ${movementsResponse.statusCode} ${movementsResponse.body}`
    );
  }

  const movementsBody = movementsResponse.json() as {
    movements?: Array<{
      id: string;
      type: string;
      fromStorageLocationId?: string;
      toStorageLocationId?: string;
    }>;
  };
  const transferMovement = movementsBody.movements?.find((movement) => movement.id === transferBody.movementId);
  if (!transferMovement) {
    throw new Error("transfer movement was not returned by the audit route");
  }
  if (transferMovement.type !== "transfer") {
    throw new Error(`transfer movement type mismatch: ${transferMovement.type}`);
  }
  if (
    transferMovement.fromStorageLocationId !== state.sourceLocationId ||
    transferMovement.toStorageLocationId !== state.targetLocationId
  ) {
    throw new Error("transfer movement location columns were not persisted");
  }

  const reviewTask = await prisma.workflowTask.create({
    data: {
      id: state.alertTaskId,
      type: "inventory.correction_request",
      status: "open",
      severity: "warning",
      title: `smoke_alert_${randomUUID()}`,
      description: "smoke alert",
      assignedRole: "admin"
    }
  });

  const reviewTasksResponse = await app.inject({
    method: "GET",
    url: "/admin/review-tasks",
    headers
  });
  if (reviewTasksResponse.statusCode !== 200) {
    throw new Error(
      `review-tasks route failed: HTTP ${reviewTasksResponse.statusCode} ${reviewTasksResponse.body}`
    );
  }

  const reviewTasksBody = reviewTasksResponse.json() as {
    tasks?: Array<{ id: string; status: string }>;
  };
  if (!reviewTasksBody.tasks?.some((task) => task.id === reviewTask.id)) {
    throw new Error("alert smoke task was not returned by the review list route");
  }

  const startReviewResponse = await app.inject({
    method: "POST",
    url: `/admin/review-tasks/${reviewTask.id}/start-review`,
    headers
  });
  if (startReviewResponse.statusCode !== 200) {
    throw new Error(
      `start-review route failed: HTTP ${startReviewResponse.statusCode} ${startReviewResponse.body}`
    );
  }

  const resolveResponse = await app.inject({
    method: "POST",
    url: `/admin/review-tasks/${reviewTask.id}/resolve`,
    headers
  });
  if (resolveResponse.statusCode !== 200) {
    throw new Error(
      `resolve route failed: HTTP ${resolveResponse.statusCode} ${resolveResponse.body}`
    );
  }

  const resolvedTask = await prisma.workflowTask.findUnique({
    where: {
      id: reviewTask.id
    },
    select: {
      status: true,
      resolvedAt: true
    }
  });

  if (!resolvedTask || resolvedTask.status !== "resolved" || !resolvedTask.resolvedAt) {
    throw new Error("review task route did not resolve the smoke task");
  }

  console.log("Transfer, alert, and backend route smoke passed.");
}

async function runDashboardHistorySmoke(): Promise<void> {
  const sinceDate = new Date();
  sinceDate.setHours(0, 0, 0, 0);
  sinceDate.setDate(sinceDate.getDate() - 29);

  const [movements, tasks] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: {
        createdAt: {
          gte: sinceDate
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 5000,
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true
      }
    }),
    prisma.workflowTask.findMany({
      where: {
        type: {
          startsWith: "inventory."
        },
        createdAt: {
          gte: sinceDate
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 5000,
      select: {
        id: true,
        status: true,
        createdAt: true,
        resolvedAt: true
      }
    })
  ]);

  if (movements.length > 5000 || tasks.length > 5000) {
    throw new Error("dashboard history queries were not bounded");
  }

  const smokeMovement = movements.find((movement) => movement.id === state.movementIds[1]);
  if (!smokeMovement || smokeMovement.type !== "transfer") {
    throw new Error("dashboard history did not include the smoke transfer");
  }

  const smokeTask = tasks.find((task) => task.id === state.alertTaskId);
  if (!smokeTask || smokeTask.status !== "resolved" || !smokeTask.resolvedAt) {
    throw new Error("dashboard history did not include the resolved smoke alert");
  }

  const buckets = new Map<string, { movements: number; alertsCreated: number; alertsResolved: number }>();
  for (let day = 0; day < 30; day += 1) {
    const date = new Date(sinceDate);
    date.setDate(sinceDate.getDate() + day);
    buckets.set(date.toISOString().slice(0, 10), {
      movements: 0,
      alertsCreated: 0,
      alertsResolved: 0
    });
  }

  for (const movement of movements) {
    const key = movement.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.movements += 1;
    }
  }

  for (const task of tasks) {
    const createdKey = task.createdAt.toISOString().slice(0, 10);
    const createdBucket = buckets.get(createdKey);
    if (createdBucket) {
      createdBucket.alertsCreated += 1;
    }

    if (task.resolvedAt) {
      const resolvedKey = task.resolvedAt.toISOString().slice(0, 10);
      const resolvedBucket = buckets.get(resolvedKey);
      if (resolvedBucket) {
        resolvedBucket.alertsResolved += 1;
      }
    }
  }

  if (buckets.size !== 30) {
    throw new Error("dashboard history buckets were not initialized for the full 30-day window");
  }

  console.log("Dashboard history smoke passed.");
}

async function runCrossOrgCheck(): Promise<void> {
  if (!orgOwnershipColumnsAvailable) {
    console.log(
      "Skipped cross-org rejection smoke: InventoryItem/StorageLocation do not expose organizationId columns yet."
    );
    return;
  }

  if (!app) {
    throw new Error("cross-org smoke requires initialized runtime app");
  }

  await prisma.organizationMember.create({
    data: {
      id: `member_${randomUUID()}`,
      organizationId: state.foreignOrganizationId,
      userId: state.foreignUserId,
      role: "owner"
    }
  });

  await prisma.storageLocation.createMany({
    data: [
      {
        id: state.foreignSourceLocationId,
        organizationId: state.foreignOrganizationId,
        name: `smoke_source_${randomUUID()}`,
        type: "smoke",
        isActive: true
      },
      {
        id: state.foreignTargetLocationId,
        organizationId: state.foreignOrganizationId,
        name: `smoke_target_${randomUUID()}`,
        type: "smoke",
        isActive: true
      }
    ]
  });

  await prisma.inventoryItem.create({
    data: {
      id: state.foreignItemId,
      organizationId: state.foreignOrganizationId,
      name: `smoke_item_${randomUUID()}`,
      defaultUnit: "unit",
      storageLocationId: state.foreignSourceLocationId,
      isActive: true
    }
  });

  const headers = {
    authorization: `Bearer ${createJwt(state.userId, appJwtSecret)}`,
    "x-organization-id": state.organizationId
  };

  const baselineOrgAMovements = await prisma.inventoryMovement.count({
    where: {
      inventoryItemId: state.itemId,
      organizationId: state.organizationId
    }
  });
  const baselineOrgBMovements = await prisma.inventoryMovement.count({
    where: {
      inventoryItemId: state.foreignItemId,
      organizationId: state.foreignOrganizationId
    }
  });

  const attempts = [
    {
      caseId: "item-org-mismatch",
      payload: {
        inventoryItemId: state.foreignItemId,
        quantity: 1,
        unit: "unit",
        fromStorageLocationId: state.sourceLocationId,
        toStorageLocationId: state.targetLocationId,
        idempotencyKey: `smoke.cross-org.${randomUUID()}`
      }
    },
    {
      caseId: "source-org-mismatch",
      payload: {
        inventoryItemId: state.itemId,
        quantity: 1,
        unit: "unit",
        fromStorageLocationId: state.foreignSourceLocationId,
        toStorageLocationId: state.targetLocationId,
        idempotencyKey: `smoke.cross-org.${randomUUID()}`
      }
    },
    {
      caseId: "target-org-mismatch",
      payload: {
        inventoryItemId: state.itemId,
        quantity: 1,
        unit: "unit",
        fromStorageLocationId: state.sourceLocationId,
        toStorageLocationId: state.foreignTargetLocationId,
        idempotencyKey: `smoke.cross-org.${randomUUID()}`
      }
    }
  ] as const;

  for (const attempt of attempts) {
    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers,
      payload: attempt.payload
    });

    if (response.statusCode !== 409) {
      throw new Error(
        `${attempt.caseId} expected HTTP 409, got ${response.statusCode} ${response.body}`
      );
    }

    const movementCount = await prisma.inventoryMovement.count({
      where: {
        idempotencyKey: attempt.payload.idempotencyKey
      }
    });
    if (movementCount !== 0) {
      throw new Error(`${attempt.caseId} unexpectedly created a movement row`);
    }
  }

  const orgAMovementsAfter = await prisma.inventoryMovement.count({
    where: {
      inventoryItemId: state.itemId,
      organizationId: state.organizationId
    }
  });
  const orgBMovementsAfter = await prisma.inventoryMovement.count({
    where: {
      inventoryItemId: state.foreignItemId,
      organizationId: state.foreignOrganizationId
    }
  });

  if (orgAMovementsAfter !== baselineOrgAMovements || orgBMovementsAfter !== baselineOrgBMovements) {
    throw new Error("cross-org rejection mutated movement counts");
  }

  console.log("Cross-org rejection smoke passed.");
}

async function cleanupSmokeState(): Promise<void> {
  try {
    if (app) {
      await app.close();
      app = null;
    }
  } catch {
    // ignore cleanup errors while closing the app
  }

  await prisma.inventoryMovement.deleteMany({
    where: {
      inventoryItemId: state.itemId
    }
  });

  await prisma.inventoryStockSnapshot.deleteMany({
    where: {
      inventoryItemId: state.itemId
    }
  });

  await prisma.inventoryItem.deleteMany({
    where: {
      id: {
        in: [state.itemId, state.foreignItemId]
      }
    }
  });

  await prisma.storageLocation.deleteMany({
    where: {
      id: {
        in: [
          state.sourceLocationId,
          state.targetLocationId,
          state.foreignSourceLocationId,
          state.foreignTargetLocationId
        ]
      }
    }
  });

  await prisma.workflowTask.deleteMany({
    where: {
      id: state.alertTaskId
    }
  });

  await prisma.organizationMember.deleteMany({
    where: {
      OR: [
        {
          organizationId: state.organizationId,
          userId: state.userId
        },
        {
          organizationId: state.foreignOrganizationId,
          userId: state.userId
        },
        {
          organizationId: state.foreignOrganizationId,
          userId: state.foreignUserId
        }
      ]
    }
  });
}

async function setJwtClaims(tx: any, userId: string, email: string): Promise<void> {
  await tx.$executeRawUnsafe(
    `select set_config('request.jwt.claim.sub', '${escapeSqlLiteral(userId)}', true)`
  );
  await tx.$executeRawUnsafe(
    `select set_config('request.jwt.claims', '${escapeSqlLiteral(
      JSON.stringify({
        sub: userId,
        email
      })
    )}', true)`
  );
  await tx.$executeRawUnsafe("set local role authenticated");
}

function createJwt(userId: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: now,
        exp: now + 60 * 60
      })
    )
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function redactDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "*****";
    }
    for (const [key] of url.searchParams) {
      if (/password|token|secret|key/i.test(key)) {
        url.searchParams.set(key, "*****");
      }
    }
    return url.toString();
  } catch {
    return "[redacted non-url DATABASE_URL]";
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function hasModelBackedOrgOwnershipColumns(): Promise<boolean> {
  const columns = (await prisma.$queryRawUnsafe(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('InventoryItem', 'StorageLocation')
        and column_name in ('organizationId', 'organization_id')
    `
  )) as Array<{ table_name: string; column_name: string }>;

  const hasItemOrgColumn = columns.some((column) => column.table_name === "InventoryItem");
  const hasLocationOrgColumn = columns.some((column) => column.table_name === "StorageLocation");

  return hasItemOrgColumn && hasLocationOrgColumn;
}

function formatError(error: unknown): string {
  return inspect(error, {
    colors: false,
    depth: null
  });
}
