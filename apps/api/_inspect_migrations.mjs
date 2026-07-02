import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  "SELECT migration_name, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY migration_name DESC LIMIT 30"
);
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
