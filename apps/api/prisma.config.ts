import { config } from "dotenv";
import { defineConfig } from "prisma/config";

import { verifyPrismaCommandTarget } from "./scripts/verify-database-target.js";

config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.example", override: false });
}

const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://user:password@localhost:5432/postgres";

verifyPrismaCommandTarget(process.argv.slice(2), process.env);

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl
  }
});
