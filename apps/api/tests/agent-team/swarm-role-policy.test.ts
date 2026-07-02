import { describe, expect, it } from "vitest";

import {
  decideAutonomyTier,
  evaluateRolePolicy,
  rolePolicyTables,
  type SwarmAction,
} from "../../src/agent-team/swarm-role-policy.js";
import type { SwarmTaskEnvelope } from "../../src/agent-team/swarm-task-envelope.js";

function makeEnvelope(overrides: Partial<SwarmTaskEnvelope> = {}): SwarmTaskEnvelope {
  return {
    id: "env-test-1",
    userRequest: "test",
    taskType: "implementation",
    scopeLayer: "runtime_core",
    pathsInScope: ["src/agent-team/"],
    pathsOutOfScope: ["web/", "prisma/"],
    autonomyTier: 3,
    assignedAgents: { orchestrator: "orch-1" },
    requiredValidation: ["typecheck"],
    approvalRequired: true,
    humanApprovalRequired: false,
    risks: [],
    expectedOutputs: ["src/agent-team/x.ts"],
    ...overrides,
  };
}

describe("swarm-role-policy", () => {
  describe("decideAutonomyTier", () => {
    it("returns 0 for any Tier-0 task class regardless of scopeLayer", () => {
      for (const tt of [
        "infra_db_change",
        "security_sensitive",
        "destructive_operation",
      ] as const) {
        for (const sl of [
          "docs_only",
          "package_local",
          "app_local",
          "cross_package",
          "runtime_core",
          "governance_policy",
          "infra_database",
          "ci_deployment",
          "production_sensitive",
        ] as const) {
          expect(decideAutonomyTier(tt, sl), `${tt} + ${sl}`).toBe(0);
        }
      }
    });

    it("returns 1 for read_only_audit on docs_only", () => {
      expect(decideAutonomyTier("read_only_audit", "docs_only")).toBe(1);
    });

    it("returns 2 for docs_spec on package_local (scope layer floor pushes up)", () => {
      // docs_spec default = 2, package_local floor = 2 → 2
      expect(decideAutonomyTier("docs_spec", "package_local")).toBe(2);
    });

    it("returns 3 for implementation on app_local (scope layer floor = 3, default = 3)", () => {
      expect(decideAutonomyTier("implementation", "app_local")).toBe(3);
    });

    it("returns 3 for implementation on runtime_core (scope layer floor = 3)", () => {
      expect(decideAutonomyTier("implementation", "runtime_core")).toBe(3);
    });

    it("returns 3 for implementation on infra_database (max of default 3 and floor 0)", () => {
      // The scope-layer floor for infra_database is 0, but the task-class
      // default for implementation is 3. Final tier = max(3, 0) = 3.
      // For a Tier 0 envelope, the Orchestrator must use the
      // `infra_db_change` task class (which is in the always-block list).
      expect(decideAutonomyTier("implementation", "infra_database")).toBe(3);
    });

    it("returns 3 for ci_build_change on ci_deployment (scope layer floor = 3)", () => {
      expect(decideAutonomyTier("ci_build_change", "ci_deployment")).toBe(3);
    });

    it("returns the task-class default for non-blocked tasks on production_sensitive (floor 0 ≤ default)", () => {
      // production_sensitive floor = 0; task-class defaults for non-blocked
      // task types are all ≥ 1, so the final tier is the task default.
      expect(decideAutonomyTier("read_only_audit", "production_sensitive")).toBe(1);
      expect(decideAutonomyTier("docs_spec", "production_sensitive")).toBe(2);
      expect(decideAutonomyTier("implementation", "production_sensitive")).toBe(3);
    });

    it("returns 1 for read_only_audit on infra_database (override pulls tier down for read-only)", () => {
      // read_only_audit default = 1, infra_database floor = 0 → max = 1
      expect(decideAutonomyTier("read_only_audit", "infra_database")).toBe(1);
    });

    it("returns 3 for governance_change on governance_policy (scope layer floor = 3)", () => {
      expect(decideAutonomyTier("governance_change", "governance_policy")).toBe(3);
    });
  });

  describe("evaluateRolePolicy — always-block list", () => {
    it("blocks view_secrets for orchestrator", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "orchestrator", "view_secrets");
      expect(result.decision).toBe("block");
      expect(result.policyRef).toBe("swarm_policy.md#always-block");
    });

    it("blocks view_secrets for builder", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "builder", "view_secrets");
      expect(result.decision).toBe("block");
    });

    it("blocks view_secrets for reviewer", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "reviewer", "view_secrets");
      expect(result.decision).toBe("block");
    });

    it("blocks destroy_data for orchestrator", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "orchestrator", "destroy_data");
      expect(result.decision).toBe("block");
      expect(result.policyRef).toBe("swarm_policy.md#always-block");
    });

    it("blocks destroy_data for builder", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "builder", "destroy_data");
      expect(result.decision).toBe("block");
    });

    it("blocks destroy_data for reviewer", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "reviewer", "destroy_data");
      expect(result.decision).toBe("block");
    });
  });

  describe("evaluateRolePolicy — Tier 0 envelope", () => {
    it("requires approval for a Builder edit on a Tier 0 envelope without recorded human approval", () => {
      const env = makeEnvelope({ autonomyTier: 0, humanApprovalRequired: false });
      const result = evaluateRolePolicy(env, "builder", "edit");
      expect(result.decision).toBe("require_approval");
      expect(result.policyRef).toBe("swarm_policy.md#tier-0");
    });

    it("allows Builder read on a Tier 0 envelope (reads are non-mutating)", () => {
      const env = makeEnvelope({ autonomyTier: 0, humanApprovalRequired: false });
      const result = evaluateRolePolicy(env, "builder", "read");
      expect(result.decision).toBe("allow");
    });

    it("does not require_approval on Tier 0 when humanApprovalRequired is recorded", () => {
      const env = makeEnvelope({ autonomyTier: 0, humanApprovalRequired: true });
      // Builder edit on a Tier 0 envelope WITH recorded human approval
      // is allowed only by the "edit" branch — but Builder finalize/deploy
      // is still require_approval per hard limit #4.
      const result = evaluateRolePolicy(env, "builder", "edit");
      expect(result.decision).toBe("allow");
    });
  });

  describe("evaluateRolePolicy — Builder finalize / deploy", () => {
    it("requires approval for Builder finalize (in general)", () => {
      const env = makeEnvelope({ autonomyTier: 3, humanApprovalRequired: false });
      const result = evaluateRolePolicy(env, "builder", "finalize");
      expect(result.decision).toBe("require_approval");
      expect(result.policyRef).toBe("swarm_roles.md#agent-2-hard-limits");
    });

    it("requires approval for Builder deploy (in general)", () => {
      const env = makeEnvelope({ autonomyTier: 3, humanApprovalRequired: false });
      const result = evaluateRolePolicy(env, "builder", "deploy");
      expect(result.decision).toBe("require_approval");
    });

    it("requires approval for Builder finalize when humanApprovalRequired is true", () => {
      const env = makeEnvelope({ autonomyTier: 3, humanApprovalRequired: true });
      const result = evaluateRolePolicy(env, "builder", "finalize");
      expect(result.decision).toBe("require_approval");
    });

    it("allows Reviewer finalize (Reviewer is the gate, not a human)", () => {
      const env = makeEnvelope({ autonomyTier: 3, humanApprovalRequired: false });
      const result = evaluateRolePolicy(env, "reviewer", "finalize");
      // The design does not put finalize behind require_approval for the
      // Reviewer — only the Builder. (Orchestrator / Reviewer are
      // non-mutating by hard limit, so this is a logical allow in the
      // policy table.)
      expect(result.decision).toBe("allow");
    });
  });

  describe("evaluateRolePolicy — happy-path allow", () => {
    it("allows Orchestrator read", () => {
      const env = makeEnvelope();
      const result = evaluateRolePolicy(env, "orchestrator", "read");
      expect(result.decision).toBe("allow");
      expect(result.policyRef).toBe("swarm_policy.md#default-allow");
    });

    it("allows Builder edit inside a Tier 3 envelope", () => {
      const env = makeEnvelope({ autonomyTier: 3 });
      const result = evaluateRolePolicy(env, "builder", "edit");
      expect(result.decision).toBe("allow");
    });

    it("allows Builder draft on docs_only", () => {
      const env = makeEnvelope({
        taskType: "docs_spec",
        scopeLayer: "docs_only",
        autonomyTier: 2,
      });
      const result = evaluateRolePolicy(env, "builder", "draft");
      expect(result.decision).toBe("allow");
    });
  });

  describe("evaluateRolePolicy — action matrix", () => {
    const actions: SwarmAction[] = [
      "read",
      "draft",
      "edit",
      "finalize",
      "deploy",
      "view_secrets",
      "destroy_data",
    ];
    const roles: Array<"orchestrator" | "builder" | "reviewer"> = [
      "orchestrator",
      "builder",
      "reviewer",
    ];

    it("returns a decision for every (role, action) combination", () => {
      const env = makeEnvelope();
      for (const role of roles) {
        for (const action of actions) {
          const result = evaluateRolePolicy(env, role, action);
          expect(["allow", "block", "require_approval"]).toContain(result.decision);
          expect(typeof result.reason).toBe("string");
          expect(result.reason.length).toBeGreaterThan(0);
          expect(typeof result.policyRef).toBe("string");
          expect(result.policyRef.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("rolePolicyTables (introspection)", () => {
    it("alwaysBlockActions contains view_secrets and destroy_data", () => {
      expect(rolePolicyTables.alwaysBlockActions.has("view_secrets")).toBe(true);
      expect(rolePolicyTables.alwaysBlockActions.has("destroy_data")).toBe(true);
    });

    it("tierZeroTaskTypes contains the three always-block task types", () => {
      expect(rolePolicyTables.tierZeroTaskTypes.has("infra_db_change")).toBe(true);
      expect(rolePolicyTables.tierZeroTaskTypes.has("security_sensitive")).toBe(true);
      expect(rolePolicyTables.tierZeroTaskTypes.has("destructive_operation")).toBe(true);
    });

    it("alwaysReviewTaskTypes contains the review-required task types", () => {
      expect(rolePolicyTables.alwaysReviewTaskTypes.has("implementation")).toBe(true);
      expect(rolePolicyTables.alwaysReviewTaskTypes.has("bugfix")).toBe(true);
      expect(rolePolicyTables.alwaysReviewTaskTypes.has("refactor")).toBe(true);
    });
  });
});
