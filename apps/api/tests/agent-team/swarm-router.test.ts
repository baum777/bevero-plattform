import { describe, expect, it } from "vitest";

import {
  RoutingInvariantError,
  resolveAutonomyTier,
  route,
  routeEnvelope,
} from "../../src/agent-team/swarm-router.js";
import type { SwarmTaskEnvelope } from "../../src/agent-team/swarm-task-envelope.js";

function makeEnvelope(overrides: Partial<SwarmTaskEnvelope> = {}): SwarmTaskEnvelope {
  return {
    id: "env-route-1",
    userRequest: "routing test",
    taskType: "implementation",
    scopeLayer: "runtime_core",
    pathsInScope: ["src/"],
    pathsOutOfScope: ["web/", "prisma/"],
    autonomyTier: 3,
    assignedAgents: { orchestrator: "orch-1" },
    requiredValidation: ["typecheck"],
    approvalRequired: true,
    humanApprovalRequired: false,
    risks: [],
    expectedOutputs: ["src/x.ts"],
    ...overrides,
  };
}

describe("swarm-router", () => {
  describe("Tier-0 always-block task types", () => {
    it("routes infra_db_change to Tier 0 with humanApprovalRequired", () => {
      const env = makeEnvelope({ taskType: "infra_db_change", scopeLayer: "app_local" });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(0);
      expect(decision.humanApprovalRequired).toBe(true);
      expect(decision.reviewRequired).toBe(true);
      expect(decision.policyRefs).toContain("swarm_task_routing.md#infra_db_change");
    });

    it("routes security_sensitive to Tier 0", () => {
      const env = makeEnvelope({ taskType: "security_sensitive", scopeLayer: "app_local" });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(0);
      expect(decision.humanApprovalRequired).toBe(true);
    });

    it("routes destructive_operation to Tier 0", () => {
      const env = makeEnvelope({ taskType: "destructive_operation", scopeLayer: "app_local" });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(0);
      expect(decision.humanApprovalRequired).toBe(true);
    });
  });

  describe("read_only_audit routing", () => {
    it("routes read_only_audit on docs_only to Tier 1, no review", () => {
      const env = makeEnvelope({
        taskType: "read_only_audit",
        scopeLayer: "docs_only",
        autonomyTier: 1,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(1);
      expect(decision.reviewRequired).toBe(false);
      expect(decision.humanApprovalRequired).toBe(false);
    });

    it("routes read_only_audit on infra_database to Tier 1 (read-only stays Tier 1)", () => {
      const env = makeEnvelope({
        taskType: "read_only_audit",
        scopeLayer: "infra_database",
        autonomyTier: 1,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(1);
    });
  });

  describe("implementation routing", () => {
    it("routes implementation on app_local to Tier 3, review required", () => {
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "app_local",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
      expect(decision.humanApprovalRequired).toBe(false);
    });

    it("routes implementation on runtime_core to Tier 3", () => {
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "runtime_core",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });

    it("routes implementation on production_sensitive to Tier 3 with humanApproval (scope layer is production_sensitive)", () => {
      // The production_sensitive scope layer floor is 0, but the
      // task-class default for implementation is 3, so final tier = 3.
      // humanApprovalRequired is forced because the scope layer is
      // production_sensitive. For Tier 0 the Orchestrator must use
      // an always-block task class (infra_db_change / security_sensitive
      // / destructive_operation).
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "production_sensitive",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.humanApprovalRequired).toBe(true);
    });

    it("routes implementation on infra_database to Tier 3 (max of default 3 and floor 0)", () => {
      // The scope-layer floor for infra_database is 0, but the
      // task-class default for implementation is 3, so final tier = 3.
      // The Tier-0 routing for infra_database is reserved for
      // always-block task classes (e.g. infra_db_change).
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "infra_database",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.humanApprovalRequired).toBe(false);
    });
  });

  describe("docs_spec routing", () => {
    it("routes docs_spec on docs_only to Tier 2, no review", () => {
      const env = makeEnvelope({
        taskType: "docs_spec",
        scopeLayer: "docs_only",
        autonomyTier: 2,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(2);
      expect(decision.reviewRequired).toBe(false);
    });

    it("routes docs_spec on governance_policy to Tier 3 (scope floor pulls up)", () => {
      const env = makeEnvelope({
        taskType: "docs_spec",
        scopeLayer: "governance_policy",
        autonomyTier: 2,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
    });
  });

  describe("ci_build_change routing", () => {
    it("routes ci_build_change on ci_deployment to Tier 3, review required", () => {
      const env = makeEnvelope({
        taskType: "ci_build_change",
        scopeLayer: "ci_deployment",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });
  });

  describe("refactor routing", () => {
    it("routes refactor on cross_package to Tier 3, review required", () => {
      const env = makeEnvelope({
        taskType: "refactor",
        scopeLayer: "cross_package",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });
  });

  describe("governance_change routing", () => {
    it("routes governance_change on governance_policy to Tier 3, review required", () => {
      const env = makeEnvelope({
        taskType: "governance_change",
        scopeLayer: "governance_policy",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });
  });

  describe("test_validation routing", () => {
    it("routes test_validation on app_local to Tier 3 (scope-layer floor wins), no review required (optional)", () => {
      // The scope-layer floor for app_local is 3, so any task on
      // app_local resolves to at least Tier 3. test_validation is not
      // in the always-review-required list, so reviewRequired is false
      // (per the routing table's "Optional" column).
      const env = makeEnvelope({
        taskType: "test_validation",
        scopeLayer: "app_local",
        autonomyTier: 2,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(false);
    });
  });

  describe("bugfix routing", () => {
    it("routes bugfix on runtime_core to Tier 3, review required", () => {
      const env = makeEnvelope({
        taskType: "bugfix",
        scopeLayer: "runtime_core",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });
  });

  describe("humanApprovalRequired flag", () => {
    it("sets humanApprovalRequired on production_sensitive scope", () => {
      const env = makeEnvelope({
        taskType: "read_only_audit",
        scopeLayer: "production_sensitive",
        autonomyTier: 1,
      });
      const decision = route(env);
      expect(decision.humanApprovalRequired).toBe(true);
    });

    it("does not set humanApprovalRequired for normal app_local implementation", () => {
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "app_local",
        autonomyTier: 3,
      });
      const decision = route(env);
      expect(decision.humanApprovalRequired).toBe(false);
    });
  });

  describe("resolveAutonomyTier", () => {
    it("returns the same tier as route().autonomyTier", () => {
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "runtime_core",
        autonomyTier: 3,
      });
      expect(resolveAutonomyTier(env)).toBe(route(env).autonomyTier);
      expect(resolveAutonomyTier(env)).toBe(3);
    });
  });

  describe("routeEnvelope (alias)", () => {
    it("returns the same RoutingDecision as route()", () => {
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "runtime_core",
        autonomyTier: 3,
      });
      const a = route(env);
      const b = routeEnvelope(env);
      expect(b).toEqual(a);
    });
  });

  describe("RoutingInvariantError", () => {
    it("throws a RoutingInvariantError when autonomyTier is not a number", () => {
      // Bypass zod to simulate the internal invariant violation.
      const env: SwarmTaskEnvelope = {
        ...makeEnvelope(),
        autonomyTier: "3" as unknown as 3,
      };
      expect(() => route(env)).toThrow(RoutingInvariantError);
    });
  });

  describe("Routing examples from swarm_task_routing.md", () => {
    it("Example 1: read-only audit of prisma/schema.prisma → Tier 1", () => {
      const env = makeEnvelope({
        taskType: "read_only_audit",
        scopeLayer: "infra_database",
        autonomyTier: 1,
        pathsInScope: ["prisma/schema.prisma", "prisma/migrations/"],
        pathsOutOfScope: ["src/", "apps/", "prisma/seeds/"],
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(1);
    });

    it("Example 2: new InventoryItem field → Tier 3 (implementation + infra_database, no migration in task class)", () => {
      // The example notes "Tier 0 if migration included". The
      // migration flag is carried by the task class — the Orchestrator
      // uses `infra_db_change` for migrations, not `implementation`.
      // For a plain `implementation` on `infra_database`, the router
      // returns Tier 3 (review-required, no human approval).
      const env = makeEnvelope({
        taskType: "implementation",
        scopeLayer: "infra_database",
        autonomyTier: 3,
        pathsInScope: ["prisma/schema.prisma", "prisma/migrations/20260608_inventory_item_field/"],
        pathsOutOfScope: ["src/", "prisma/seeds/"],
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.humanApprovalRequired).toBe(false);
      expect(decision.reviewRequired).toBe(true);
    });

    it("Example 3: doc-only spec under docs/ → Tier 2", () => {
      const env = makeEnvelope({
        taskType: "docs_spec",
        scopeLayer: "docs_only",
        autonomyTier: 2,
        pathsInScope: ["docs/my-new-spec/"],
        pathsOutOfScope: ["docs/DECISIONS.md", "AGENTS.md", "docs/agent-team/"],
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(2);
    });

    it("Example 4: CI workflow fix → Tier 3 with review", () => {
      const env = makeEnvelope({
        taskType: "ci_build_change",
        scopeLayer: "ci_deployment",
        autonomyTier: 3,
        pathsInScope: [".github/workflows/"],
        pathsOutOfScope: ["package.json", "src/"],
      });
      const decision = route(env);
      expect(decision.autonomyTier).toBe(3);
      expect(decision.reviewRequired).toBe(true);
    });
  });
});
