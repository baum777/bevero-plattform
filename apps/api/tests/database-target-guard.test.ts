import { describe, expect, it } from "vitest";

import {
  isRiskyPrismaCommand,
  verifyDatabaseTarget,
  verifyPrismaCommandTarget
} from "../scripts/verify-database-target.js";

const PRODUCTION_REF = "czinchfegtglmrloxlmh";
const DEVELOPMENT_REF = "ienwshemokpsjwkedmyp";
const PRODUCTION_APPROVAL = "I_UNDERSTAND_THIS_TOUCHES_PRODUCTION";
const CROSS_PROJECT_READ_APPROVAL = "I_UNDERSTAND_THIS_IS_A_BEVERO_DEV_DB";

function directUrl(projectRef: string, password = "do-not-print-this-secret"): string {
  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
}

function poolerUrl(projectRef: string, password = "do-not-print-this-secret"): string {
  return `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;
}

describe("verifyDatabaseTarget", () => {
  it("blocks an unknown Supabase project ref without exposing the URL", () => {
    const databaseUrl = directUrl("abcdefghijklmnopqrst");

    expect(() =>
      verifyDatabaseTarget({
        DATABASE_URL: databaseUrl,
        BEVERO_DB_TARGET: "development",
        BEVERO_EXPECTED_SUPABASE_REF: "abcdefghijklmnopqrst"
      })
    ).toThrow(/unknown Supabase project ref/i);

    try {
      verifyDatabaseTarget({
        DATABASE_URL: databaseUrl,
        BEVERO_DB_TARGET: "development",
        BEVERO_EXPECTED_SUPABASE_REF: "abcdefghijklmnopqrst"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("do-not-print-this-secret");
      expect(message).not.toContain("postgresql://");
    }
  });

  it("blocks the foreign rauschenberger-os production project without a cross-project override", () => {
    expect(() =>
      verifyDatabaseTarget({
        DATABASE_URL: poolerUrl(PRODUCTION_REF),
        DIRECT_URL: directUrl(PRODUCTION_REF),
        BEVERO_DB_TARGET: "production",
        BEVERO_EXPECTED_SUPABASE_REF: PRODUCTION_REF,
        BEVERO_ALLOW_PRODUCTION_MIGRATION: PRODUCTION_APPROVAL
      })
    ).toThrow(/cross-project target blocked/i);
  });

  it("still blocks a cross-project target when the override does not match", () => {
    expect(() =>
      verifyDatabaseTarget({
        DATABASE_URL: poolerUrl(PRODUCTION_REF),
        DIRECT_URL: directUrl(PRODUCTION_REF),
        BEVERO_DB_TARGET: "production",
        BEVERO_EXPECTED_SUPABASE_REF: PRODUCTION_REF,
        BEVERO_ALLOW_PRODUCTION_MIGRATION: PRODUCTION_APPROVAL,
        BEVERO_ALLOW_CROSS_PROJECT_READ: "not-the-real-token"
      })
    ).toThrow(/cross-project target blocked/i);
  });

  it("blocks when role declared as production but detected ref is the owned development ref", () => {
    expect(() =>
      verifyDatabaseTarget({
        DIRECT_URL: directUrl(DEVELOPMENT_REF),
        BEVERO_DB_TARGET: "production",
        BEVERO_EXPECTED_SUPABASE_REF: PRODUCTION_REF,
        BEVERO_ALLOW_PRODUCTION_MIGRATION: PRODUCTION_APPROVAL
      })
    ).toThrow(/database target role mismatch/i);
  });

  it("allows the owned Bevero development project with a matching ref", () => {
    expect(
      verifyDatabaseTarget({
        DATABASE_URL: poolerUrl(DEVELOPMENT_REF),
        DIRECT_URL: directUrl(DEVELOPMENT_REF),
        BEVERO_DB_TARGET: "development",
        BEVERO_EXPECTED_SUPABASE_REF: DEVELOPMENT_REF
      })
    ).toEqual({
      projectRef: DEVELOPMENT_REF,
      projectName: "bevero-os",
      role: "development"
    });
  });

  it("blocks when DIRECT_URL and DATABASE_URL resolve to different projects", () => {
    expect(() =>
      verifyDatabaseTarget({
        DATABASE_URL: poolerUrl(DEVELOPMENT_REF),
        DIRECT_URL: directUrl(PRODUCTION_REF),
        BEVERO_DB_TARGET: "development",
        BEVERO_EXPECTED_SUPABASE_REF: DEVELOPMENT_REF
      })
    ).toThrow(/database target mismatch/i);
  });
});

describe("Prisma command guard", () => {
  it.each([
    [["migrate", "deploy"]],
    [["migrate", "dev"]],
    [["migrate", "reset"]],
    [["migrate", "resolve"]],
    [["db", "push"]],
    [["db", "seed"]],
    [["db", "execute"]]
  ])("classifies %j as risky", (argv) => {
    expect(isRiskyPrismaCommand(argv)).toBe(true);
  });

  it("detects a risky command when a global option precedes it", () => {
    expect(
      isRiskyPrismaCommand(["--schema", "prisma/schema.prisma", "migrate", "deploy"])
    ).toBe(true);
  });

  it("detects a risky command when an option separates command group and action", () => {
    expect(
      isRiskyPrismaCommand(["migrate", "--schema", "prisma/schema.prisma", "deploy"])
    ).toBe(true);
  });

  it.each([[["validate"]], [["generate"]], [["migrate", "status"]], [["db", "pull"]]])(
    "does not block read-only/local-only command %j",
    (argv) => {
      expect(isRiskyPrismaCommand(argv)).toBe(false);
      expect(() => verifyPrismaCommandTarget(argv, {})).not.toThrow();
    }
  );

  it("enforces target verification for a direct risky Prisma command", () => {
    expect(() => verifyPrismaCommandTarget(["migrate", "deploy"], {})).toThrow(
      /DATABASE_URL or DIRECT_URL is required/i
    );
  });
});