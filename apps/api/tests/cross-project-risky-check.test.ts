import { describe, expect, it } from "vitest";

import { verifyPrismaCommandTarget } from "../scripts/verify-database-target.js";

describe("Cross-project read-only override does not allow risk-bearing Prisma commands", () => {
  const env = {
    DIRECT_URL: "postgresql://postgres:secret@db.czinchfegtglmrloxlmh.supabase.co:5432/postgres",
    DATABASE_URL: "postgresql://postgres.czinchfegtglmrloxlmh:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    BEVERO_DB_TARGET: "production",
    BEVERO_EXPECTED_SUPABASE_REF: "czinchfegtglmrloxlmh",
    BEVERO_ALLOW_PRODUCTION_MIGRATION: "I_UNDERSTAND_THIS_TOUCHES_PRODUCTION",
    BEVERO_ALLOW_CROSS_PROJECT_READ: "I_UNDERSTAND_THIS_IS_A_BEVERO_DEV_DB"
  };

  it.each([
    [["migrate", "deploy"]],
    [["migrate", "dev"]],
    [["migrate", "reset"]],
    [["db", "push"]],
    [["db", "seed"]]
  ])("blocks %j even with cross-project read-only override", (argv) => {
    expect(() => verifyPrismaCommandTarget(argv, env)).toThrow(/cross-project read-only override/i);
  });
});