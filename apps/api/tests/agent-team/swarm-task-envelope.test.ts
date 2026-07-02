import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  SwarmTaskEnvelopeSchema,
  createEnvelope,
  isEmptyEnvelope,
  parseSwarmTaskEnvelope,
  safeParseSwarmTaskEnvelope,
  validateEnvelope,
  type SwarmTaskEnvelope,
} from "../../src/agent-team/swarm-task-envelope.js";

/**
 * Minimal valid envelope used as a baseline for mutation tests.
 */
function makeValidEnvelope(overrides: Partial<SwarmTaskEnvelope> = {}): SwarmTaskEnvelope {
  return {
    id: "env-2026-06-08-0001",
    userRequest: "Implement runtime surface for the swarm.",
    taskType: "implementation",
    scopeLayer: "runtime_core",
    pathsInScope: ["src/agent-team/", "tests/agent-team/"],
    pathsOutOfScope: ["web/", "prisma/", ".env*"],
    autonomyTier: 3,
    assignedAgents: {
      orchestrator: "agent-orch-01",
      builder: "agent-build-02",
      reviewer: "agent-review-03",
    },
    requiredValidation: ["typecheck", "unit_tests", "build"],
    approvalRequired: true,
    humanApprovalRequired: false,
    risks: ["runtime_core touchpoint — full review required"],
    expectedOutputs: ["src/agent-team/swarm-router.ts"],
    ...overrides,
  };
}

describe("swarm-task-envelope", () => {
  describe("SwarmTaskEnvelopeSchema (zod)", () => {
    it("accepts a fully-populated envelope", () => {
      const env = makeValidEnvelope();
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it("accepts an envelope with the minimum required fields", () => {
      const env = makeValidEnvelope();
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it("accepts an optional ISO-8601 deadline", () => {
      const env = makeValidEnvelope({
        deadline: "2026-06-15T17:00:00.000Z",
      });
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it("rejects an unknown taskType with invalid_enum_value", () => {
      const env = { ...makeValidEnvelope(), taskType: "custom_task" };
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_enum_value");
      }
    });

    it("rejects an unknown scopeLayer with invalid_enum_value", () => {
      const env = { ...makeValidEnvelope(), scopeLayer: "everywhere" };
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects a wrong-type autonomyTier (string instead of number)", () => {
      const env = { ...makeValidEnvelope(), autonomyTier: "3" as unknown as number };
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects an out-of-range autonomyTier (6)", () => {
      const env = { ...makeValidEnvelope(), autonomyTier: 6 as unknown as 3 };
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects extra properties (strict schema)", () => {
      const env = {
        ...makeValidEnvelope(),
        assignedAgents: {
          orchestrator: "agent-orch-01",
          builder: "agent-build-02",
          reviewer: "agent-review-03",
          god: true,
        },
      };
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects a missing required field (id)", () => {
      const env = { ...makeValidEnvelope() } as Partial<SwarmTaskEnvelope>;
      delete env.id;
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path[0] === "id")).toBe(true);
      }
    });

    it("rejects empty requiredValidation array", () => {
      const env = makeValidEnvelope({ requiredValidation: [] });
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects empty expectedOutputs array", () => {
      const env = makeValidEnvelope({ expectedOutputs: [] });
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("rejects a non-ISO deadline", () => {
      const env = makeValidEnvelope({ deadline: "tomorrow" });
      const result = SwarmTaskEnvelopeSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it("parses against every taskType enum value", () => {
      const allTaskTypes = [
        "read_only_audit",
        "docs_spec",
        "implementation",
        "bugfix",
        "refactor",
        "test_validation",
        "governance_change",
        "ci_build_change",
        "infra_db_change",
        "security_sensitive",
        "destructive_operation",
      ] as const;
      for (const t of allTaskTypes) {
        const env = makeValidEnvelope({ taskType: t });
        const result = SwarmTaskEnvelopeSchema.safeParse(env);
        expect(result.success, `taskType=${t}`).toBe(true);
      }
    });

    it("parses against every scopeLayer enum value", () => {
      const allLayers = [
        "docs_only",
        "package_local",
        "app_local",
        "cross_package",
        "runtime_core",
        "governance_policy",
        "infra_database",
        "ci_deployment",
        "production_sensitive",
      ] as const;
      for (const l of allLayers) {
        const env = makeValidEnvelope({ scopeLayer: l });
        const result = SwarmTaskEnvelopeSchema.safeParse(env);
        expect(result.success, `scopeLayer=${l}`).toBe(true);
      }
    });

    it("parses against every requiredValidation enum value", () => {
      const allValidations = [
        "markdown_sanity",
        "json_schema_parse",
        "typecheck",
        "lint",
        "unit_tests",
        "integration_tests",
        "build",
        "prisma_validate",
        "ci_workflow_run",
        "manual_smoke",
      ] as const;
      for (const v of allValidations) {
        const env = makeValidEnvelope({ requiredValidation: [v] });
        const result = SwarmTaskEnvelopeSchema.safeParse(env);
        expect(result.success, `requiredValidation=${v}`).toBe(true);
      }
    });
  });

  describe("createEnvelope", () => {
    it("returns a typed SwarmTaskEnvelope for a valid input", () => {
      const env = createEnvelope(makeValidEnvelope());
      expect(env.id).toBe("env-2026-06-08-0001");
      expect(env.autonomyTier).toBe(3);
    });

    it("throws a ZodError for an invalid input", () => {
      expect(() => createEnvelope({})).toThrow(z.ZodError);
    });

    it("throws a ZodError for null", () => {
      expect(() => createEnvelope(null)).toThrow(z.ZodError);
    });

    it("throws a ZodError for undefined", () => {
      expect(() => createEnvelope(undefined)).toThrow(z.ZodError);
    });
  });

  describe("validateEnvelope", () => {
    it("returns { ok: true, envelope } for a valid input", () => {
      const result = validateEnvelope(makeValidEnvelope());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.envelope.id).toBe("env-2026-06-08-0001");
      }
    });

    it("returns { ok: false, errors } for an invalid input", () => {
      const result = validateEnvelope({ id: "x" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("returns { ok: false, errors } for null", () => {
      const result = validateEnvelope(null);
      expect(result.ok).toBe(false);
    });

    it("returns { ok: false, errors } for undefined", () => {
      const result = validateEnvelope(undefined);
      expect(result.ok).toBe(false);
    });

    it("errors reference the offending field path", () => {
      const result = validateEnvelope({ ...makeValidEnvelope(), autonomyTier: 99 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.path.includes("autonomyTier"))).toBe(true);
      }
    });
  });

  describe("parseSwarmTaskEnvelope / safeParseSwarmTaskEnvelope", () => {
    it("parseSwarmTaskEnvelope throws on invalid input", () => {
      expect(() => parseSwarmTaskEnvelope({})).toThrow(z.ZodError);
    });

    it("safeParseSwarmTaskEnvelope returns success: false on invalid input", () => {
      const result = safeParseSwarmTaskEnvelope({});
      expect(result.success).toBe(false);
    });

    it("safeParseSwarmTaskEnvelope returns success: true on valid input", () => {
      const result = safeParseSwarmTaskEnvelope(makeValidEnvelope());
      expect(result.success).toBe(true);
    });

    it("round-trips through JSON.stringify + safeParseSwarmTaskEnvelope", () => {
      const env = makeValidEnvelope();
      const json = JSON.stringify(env);
      const reparsed = safeParseSwarmTaskEnvelope(JSON.parse(json));
      expect(reparsed.success).toBe(true);
      if (reparsed.success) {
        expect(reparsed.data.id).toBe(env.id);
        expect(reparsed.data.autonomyTier).toBe(env.autonomyTier);
        expect(reparsed.data.taskType).toBe(env.taskType);
        expect(reparsed.data.requiredValidation).toEqual(env.requiredValidation);
      }
    });
  });

  describe("isEmptyEnvelope", () => {
    it("returns true for null", () => {
      expect(isEmptyEnvelope(null)).toBe(true);
    });

    it("returns true for undefined", () => {
      expect(isEmptyEnvelope(undefined)).toBe(true);
    });

    it("returns true for {}", () => {
      expect(isEmptyEnvelope({})).toBe(true);
    });

    it("returns true for an object with an empty id", () => {
      expect(isEmptyEnvelope({ id: "" })).toBe(true);
    });

    it("returns true for non-object values", () => {
      expect(isEmptyEnvelope(42)).toBe(true);
      expect(isEmptyEnvelope("hello")).toBe(true);
      expect(isEmptyEnvelope(true)).toBe(true);
    });

    it("returns false for a valid envelope", () => {
      expect(isEmptyEnvelope(makeValidEnvelope())).toBe(false);
    });

    it("returns false for an object with a non-empty id (even if other fields are missing)", () => {
      expect(isEmptyEnvelope({ id: "env-1" })).toBe(false);
    });
  });
});
