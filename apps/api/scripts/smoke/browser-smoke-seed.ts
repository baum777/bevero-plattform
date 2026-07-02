import { createHash } from "node:crypto";

import { config } from "dotenv";

import { prisma } from "../../src/lib/prisma.js";

config();

const smokeEnabled = process.env.SMOKE_TEST_ENABLED === "true";
const smokeRequired = process.env.SMOKE_REQUIRED === "true";
const seedEnabled = process.env.COCKPIT_SMOKE_SEED_ENABLED === "true";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const directUrl = process.env.DIRECT_URL?.trim() ?? "";
const requestedBaseUrl = process.env.COCKPIT_SMOKE_BASE_URL?.trim() ?? "";
const requestedSafeQty = process.env.COCKPIT_SMOKE_SAFE_TRANSFER_QTY?.trim() ?? "";

const requestedUserId =
  process.env.COCKPIT_SMOKE_USER_ID?.trim() ?? process.env.SMOKE_SUPABASE_USER_ID?.trim() ?? "";

const fallbackBaseUrl = "http://localhost:3000";
const baseUrl = requestedBaseUrl || fallbackBaseUrl;
const defaultSafeQty = Number.parseFloat(requestedSafeQty);
const safeTransferQty = Number.isFinite(defaultSafeQty) && defaultSafeQty > 0 ? defaultSafeQty : 1;

type SeedContext = {
  expectedRole: "owner" | "admin" | "manager" | "staff" | "viewer";
  itemId: string;
  organizationId: string;
  sourceStorageId: string;
  targetStorageId: string;
  userEmail: string | null;
  userId: string;
  workspaceId: string;
};

async function main(): Promise<void> {
  if (!smokeEnabled) {
    skip("Skipped: SMOKE_TEST_ENABLED is not true.");
    return;
  }

  if (!databaseUrl || !directUrl) {
    failOrSkip(
      "Skipped: DATABASE_URL and DIRECT_URL are required for browser smoke seeding."
    );
    return;
  }

  if (isLocalDatabaseUrl(databaseUrl) || isLocalDatabaseUrl(directUrl)) {
    failOrSkip(
      "Skipped: Supabase-backed DATABASE_URL and DIRECT_URL are required; local PostgreSQL targets are not accepted."
    );
    return;
  }

  let userId = requestedUserId;
  if (!userId) {
    userId = await findExistingSmokeUserId();
  }

  if (!userId) {
    console.log(
      "No smoke user id found. Set COCKPIT_SMOKE_USER_ID (or SMOKE_SUPABASE_USER_ID) to a pre-seeded auth user UUID."
    );
    printEnvTemplate({
      baseUrl,
      expectedRole: "owner",
      itemId: "__SET_AFTER_SEED__",
      organizationId: "__SET_AFTER_SEED__",
      profileEmailFound: false,
      safeTransferQty,
      sourceStorageId: "__SET_AFTER_SEED__",
      targetStorageId: "__SET_AFTER_SEED__",
      userId: "__SET_TEST_USER_ID__",
      workspaceId: "__SET_AFTER_SEED__"
    });
    return;
  }

  if (!isUuid(userId)) {
    failOrSkip(
      "Skipped: COCKPIT_SMOKE_USER_ID (or discovered smoke user id) must be a valid UUID from auth.users."
    );
    return;
  }

  const existingContext = await findExistingSeedContext(userId);
  const context = existingContext ?? (await createSeedContext(userId));

  printEnvTemplate({
    baseUrl,
    expectedRole: context.expectedRole,
    itemId: context.itemId,
    organizationId: context.organizationId,
    profileEmailFound: Boolean(context.userEmail),
    safeTransferQty,
    sourceStorageId: context.sourceStorageId,
    targetStorageId: context.targetStorageId,
    userId: context.userId,
    workspaceId: context.workspaceId
  });
}

async function findExistingSmokeUserId(): Promise<string | null> {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      organizationId: {
        startsWith: "smoke_org_browser_"
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 25,
    select: {
      userId: true
    }
  });

  for (const membership of memberships) {
    if (isUuid(membership.userId)) {
      return membership.userId;
    }
  }

  return null;
}

async function findExistingSeedContext(userId: string): Promise<SeedContext | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId: {
        startsWith: "smoke_org_browser_"
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      organizationId: true,
      role: true
    }
  });

  if (!membership) {
    return null;
  }

  const [workspaceMember, item, locations, profile] = await Promise.all([
    prisma.workspaceMember.findFirst({
      where: {
        userId,
        organizationId: membership.organizationId,
        workspaceId: {
          startsWith: "smoke_workspace_browser_"
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        workspaceId: true
      }
    }),
    prisma.inventoryItem.findFirst({
      where: {
        organizationId: membership.organizationId,
        id: {
          startsWith: "smoke_item_browser_"
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    }),
    prisma.storageLocation.findMany({
      where: {
        organizationId: membership.organizationId,
        id: {
          in: [
            `smoke_loc_source_${stableSuffix(userId)}`,
            `smoke_loc_target_${stableSuffix(userId)}`
          ]
        }
      },
      select: {
        id: true
      }
    }),
    prisma.userProfile.findUnique({
      where: {
        authUserId: userId
      },
      select: {
        email: true
      }
    })
  ]);

  if (!workspaceMember || !item || locations.length < 2) {
    return null;
  }

  const sourceStorageId = `smoke_loc_source_${stableSuffix(userId)}`;
  const targetStorageId = `smoke_loc_target_${stableSuffix(userId)}`;
  const locationSet = new Set(locations.map((location) => location.id));
  if (!locationSet.has(sourceStorageId) || !locationSet.has(targetStorageId)) {
    return null;
  }

  return {
    userId,
    userEmail: profile?.email ?? null,
    expectedRole: membership.role,
    organizationId: membership.organizationId,
    workspaceId: workspaceMember.workspaceId,
    itemId: item.id,
    sourceStorageId,
    targetStorageId
  };
}

async function createSeedContext(userId: string): Promise<SeedContext> {
  if (!seedEnabled) {
    throw new Error(
      "No reusable browser smoke seed data found and COCKPIT_SMOKE_SEED_ENABLED is not true."
    );
  }

  const suffix = stableSuffix(userId);
  const organizationId = `smoke_org_browser_${suffix}`;
  const workspaceId = `smoke_workspace_browser_${suffix}`;
  const itemId = `smoke_item_browser_${suffix}`;
  const sourceStorageId = `smoke_loc_source_${suffix}`;
  const targetStorageId = `smoke_loc_target_${suffix}`;

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    },
    create: {
      organizationId,
      userId,
      role: "owner"
    },
    update: {
      role: "owner"
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    },
    create: {
      workspaceId,
      userId,
      role: "owner",
      organizationId
    },
    update: {
      role: "owner",
      organizationId
    }
  });

  await prisma.storageLocation.upsert({
    where: { id: sourceStorageId },
    create: {
      id: sourceStorageId,
      organizationId,
      name: `smoke_source_${suffix}`,
      type: "smoke",
      isActive: true
    },
    update: {
      organizationId,
      name: `smoke_source_${suffix}`,
      type: "smoke",
      isActive: true
    }
  });

  await prisma.storageLocation.upsert({
    where: { id: targetStorageId },
    create: {
      id: targetStorageId,
      organizationId,
      name: `smoke_target_${suffix}`,
      type: "smoke",
      isActive: true
    },
    update: {
      organizationId,
      name: `smoke_target_${suffix}`,
      type: "smoke",
      isActive: true
    }
  });

  await prisma.inventoryItem.upsert({
    where: { id: itemId },
    create: {
      id: itemId,
      organizationId,
      name: `smoke_item_${suffix}`,
      defaultUnit: "unit",
      storageLocationId: sourceStorageId,
      isActive: true
    },
    update: {
      organizationId,
      name: `smoke_item_${suffix}`,
      defaultUnit: "unit",
      storageLocationId: sourceStorageId,
      isActive: true
    }
  });

  const seedKey = `smoke.browser.seed.stock:${itemId}:${sourceStorageId}`;
  const existingSeed = await prisma.inventoryMovement.findFirst({
    where: {
      idempotencyKey: seedKey
    },
    select: {
      id: true
    }
  });

  if (!existingSeed) {
    await prisma.inventoryMovement.create({
      data: {
        idempotencyKey: seedKey,
        organizationId,
        inventoryItemId: itemId,
        type: "goods_received",
        quantity: Math.max(safeTransferQty * 10, 10),
        unit: "unit",
        actorUserId: userId,
        storageLocationId: sourceStorageId,
        note: "browser smoke seed stock"
      }
    });
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      authUserId: userId
    },
    select: {
      email: true
    }
  });

  return {
    userId,
    userEmail: profile?.email ?? null,
    expectedRole: "owner",
    organizationId,
    workspaceId,
    itemId,
    sourceStorageId,
    targetStorageId
  };
}

function stableSuffix(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function printEnvTemplate(input: {
  baseUrl: string;
  expectedRole: string;
  itemId: string;
  organizationId: string;
  profileEmailFound: boolean;
  safeTransferQty: number;
  sourceStorageId: string;
  targetStorageId: string;
  userId: string;
  workspaceId: string;
}): void {
  console.log("Browser smoke seed context:");
  console.log(`COCKPIT_SMOKE_BASE_URL=${input.baseUrl}`);
  console.log(`COCKPIT_SMOKE_USER_ID=${input.userId}`);
  console.log("COCKPIT_SMOKE_USER_EMAIL=**SET_TEST_EMAIL**");
  console.log("COCKPIT_SMOKE_USER_PASSWORD=**SET_TEST_PASSWORD**");
  console.log(`COCKPIT_SMOKE_EXPECTED_ROLE=${input.expectedRole}`);
  console.log(`COCKPIT_SMOKE_TEST_ORG=${input.organizationId}`);
  console.log(`COCKPIT_SMOKE_TEST_WORKSPACE=${input.workspaceId}`);
  console.log(`COCKPIT_SMOKE_TEST_ITEM=${input.itemId}`);
  console.log(`COCKPIT_SMOKE_SOURCE_STORAGE=${input.sourceStorageId}`);
  console.log(`COCKPIT_SMOKE_TARGET_STORAGE=${input.targetStorageId}`);
  console.log(`COCKPIT_SMOKE_SAFE_TRANSFER_QTY=${input.safeTransferQty}`);
  console.log("COCKPIT_SMOKE_ALLOW_MUTATIONS=false");
  if (input.profileEmailFound) {
    console.log("# info: matching profile email exists in DB but is intentionally not printed.");
  }
}

function failOrSkip(message: string): void {
  if (smokeRequired) {
    throw new Error(message);
  }
  skip(message);
}

function skip(message: string): void {
  console.log(message);
}

function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

await main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Browser smoke seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
