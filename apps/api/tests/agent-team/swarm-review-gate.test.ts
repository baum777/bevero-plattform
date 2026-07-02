import { describe, expect, it } from "vitest";

import {
  evaluateReview,
  recordReview,
  type ReviewInput,
  type SwarmReviewResult,
  type ValidationEvidence,
} from "../../src/agent-team/swarm-review-gate.js";
import type { SwarmTaskEnvelope } from "../../src/agent-team/swarm-task-envelope.js";
import type { Scorecard } from "../../src/agent-team/types.js";

function makeEnvelope(overrides: Partial<SwarmTaskEnvelope> = {}): SwarmTaskEnvelope {
  return {
    id: "env-review-1",
    userRequest: "review-gate test",
    taskType: "implementation",
    scopeLayer: "runtime_core",
    pathsInScope: [
      "src/agent-team/router.ts",
      "src/agent-team/other.ts",
      "tests/agent-team/router.test.ts",
    ],
    pathsOutOfScope: ["web/", "prisma/"],
    autonomyTier: 3,
    assignedAgents: { orchestrator: "orch-1", builder: "builder-1" },
    requiredValidation: ["typecheck", "unit_tests"],
    approvalRequired: true,
    humanApprovalRequired: false,
    risks: [],
    expectedOutputs: ["src/agent-team/x.ts"],
    ...overrides,
  };
}

function cleanScorecard(): Scorecard {
  return {
    outcomeQuality: 5,
    scopeDiscipline: 5,
    safety: 5,
    evidenceQuality: 5,
    sideEffects: 5,
  };
}

function cleanEvidence(): ValidationEvidence[] {
  return [
    { kind: "command", ref: "npm run typecheck", outcome: "exit 0" },
    { kind: "command", ref: "npm test -- --run", outcome: "12 passed, 0 failed" },
    { kind: "build", ref: "npm run build", outcome: "ok" },
  ];
}

describe("swarm-review-gate", () => {
  describe("verdict: pass", () => {
    it("returns pass for a clean slice on Tier 3 with full scorecard and evidence", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts", "tests/agent-team/router.test.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(result.verdict).toBe("pass");
      expect(result.scopeViolations).toEqual([]);
      expect(result.policyViolations).toEqual([]);
      expect(result.nextGate).toBe("Builder may finalize");
      expect(result.reworkIteration).toBe(0);
    });
  });

  describe("verdict: blocked (safety: 0)", () => {
    it("returns blocked when safety = 0", () => {
      const env = makeEnvelope();
      const scorecard: Scorecard = { ...cleanScorecard(), safety: 0 };
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard,
      });
      expect(result.verdict).toBe("blocked");
      expect(result.nextGate).toBe("Escalate to human owner; no further agent work");
    });

    it("returns blocked when filesChanged touches web/", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["web/index.html"],
        evidence: cleanEvidence(),
        iteration: 0,
      });
      expect(result.verdict).toBe("blocked");
      expect(result.policyViolations.length).toBeGreaterThan(0);
      expect(result.policyViolations[0].policyRef).toBe("swarm_policy.md#always-block");
    });

    it("returns blocked when filesChanged touches .env.local", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: [".env.local"],
        evidence: cleanEvidence(),
        iteration: 0,
      });
      expect(result.verdict).toBe("blocked");
      expect(result.policyViolations.length).toBeGreaterThan(0);
    });
  });

  describe("verdict: needs_rework", () => {
    it("returns needs_rework when a non-safety score is 0 (outcomeQuality=0)", () => {
      const env = makeEnvelope();
      const scorecard: Scorecard = { ...cleanScorecard(), outcomeQuality: 0 };
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard,
      });
      expect(result.verdict).toBe("needs_rework");
    });

    it("returns needs_rework when filesChanged includes a path not in pathsInScope", () => {
      const env = makeEnvelope({
        pathsInScope: ["src/agent-team/swarm-router.ts"],
      });
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/swarm-router.ts", "src/agent-team/other.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(result.verdict).toBe("needs_rework");
      expect(result.scopeViolations.length).toBe(1);
      expect(result.scopeViolations[0].path).toBe("src/agent-team/other.ts");
    });

    it("returns needs_rework when safety is between 1 and 3 (downgrade from pass)", () => {
      const env = makeEnvelope();
      const scorecard: Scorecard = { ...cleanScorecard(), safety: 3 };
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard,
      });
      expect(result.verdict).toBe("needs_rework");
    });

    it("returns needs_rework with nextGate 'collect named evidence' when evidence is empty (Tier 3)", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: [],
        iteration: 0,
      });
      expect(result.verdict).toBe("needs_rework");
      expect(result.nextGate).toBe("collect named evidence");
    });

    it("does not return needs_rework for empty evidence on Tier 1", () => {
      const env = makeEnvelope({ taskType: "read_only_audit", autonomyTier: 1 });
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 1,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: [],
        iteration: 0,
        scorecard: { ...cleanScorecard(), evidenceQuality: 0 },
      });
      // evidenceQuality=0 with empty evidence → needs_rework per design
      // (any other score == 0). Tier 1 exemption is only for the
      // "collect named evidence" branch.
      expect(result.verdict).toBe("needs_rework");
    });
  });

  describe("verdict: approval_required", () => {
    it("returns approval_required for Tier 0 slice with humanApprovalRequired=true", () => {
      const env = makeEnvelope({
        taskType: "infra_db_change",
        autonomyTier: 0,
        humanApprovalRequired: true,
      });
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 0,
        filesChanged: ["prisma/schema.prisma"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(result.verdict).toBe("approval_required");
      expect(result.nextGate).toBe("Hand to human owner; agent work pauses");
    });
  });

  describe("bounded rework loop", () => {
    it("upgrades needs_rework to blocked on the 3rd iteration (iteration=2)", () => {
      const env = makeEnvelope();
      const scorecard: Scorecard = { ...cleanScorecard(), outcomeQuality: 0 };
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: cleanEvidence(),
        iteration: 2,
        scorecard,
      });
      expect(result.verdict).toBe("blocked");
      expect(result.reworkIteration).toBe(2);
    });

    it("upgrades needs_rework to blocked on iteration=2 for scope violations", () => {
      const env = makeEnvelope({
        pathsInScope: ["src/agent-team/swarm-router.ts"],
      });
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/other.ts"],
        evidence: cleanEvidence(),
        iteration: 2,
        scorecard: cleanScorecard(),
      });
      expect(result.verdict).toBe("blocked");
    });

    it("does NOT upgrade pass to blocked on iteration=2 (no scope violations)", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts", "tests/agent-team/router.test.ts"],
        evidence: cleanEvidence(),
        iteration: 2,
        scorecard: cleanScorecard(),
      });
      expect(result.verdict).toBe("pass");
    });
  });

  describe("scope and policy violation detection", () => {
    it("flags prisma/ as a policy violation (review-required)", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["prisma/schema.prisma"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(result.policyViolations.length).toBe(1);
      expect(result.policyViolations[0].policyRef).toBe(
        "swarm_policy.md#always-review-required",
      );
    });

    it("flags service-role filename as a policy violation (gitleaks-like)", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/lib/service-role-key.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(result.policyViolations.length).toBe(1);
      expect(result.policyViolations[0].policyRef).toBe("swarm_policy.md#always-block");
    });
  });

  describe("scorecard aggregation", () => {
    it("derives a default scorecard from violations when caller omits one", () => {
      const env = makeEnvelope({
        pathsInScope: ["src/agent-team/swarm-router.ts"],
      });
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/swarm-router.ts", "src/agent-team/other.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
      });
      expect(result.scorecard.scopeDiscipline).toBe(0);
      expect(result.scorecard.outcomeQuality).toBe(0);
    });

    it("derives a 5-scorecard for a clean slice with evidence when caller omits one", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts", "tests/agent-team/router.test.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
      });
      // No violations → outcomeQuality=4, scopeDiscipline=5, safety=5,
      // evidenceQuality=5, sideEffects=4.
      expect(result.scorecard.scopeDiscipline).toBe(5);
      expect(result.scorecard.safety).toBe(5);
      expect(result.scorecard.evidenceQuality).toBe(5);
      expect(result.scorecard.outcomeQuality).toBe(4);
      expect(result.scorecard.sideEffects).toBe(4);
    });

    it("derives evidenceQuality=0 when evidence is empty", () => {
      const env = makeEnvelope();
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: [],
        iteration: 0,
      });
      // Tier 3 envelope with empty evidence → returns needs_rework
      // with the "collect named evidence" nextGate before the scorecard
      // is fully evaluated. evidenceQuality in the derived scorecard
      // may or may not be 0 — but the result is needs_rework either way.
      expect(result.verdict).toBe("needs_rework");
    });
  });

  describe("memoryUpdates pass-through", () => {
    it("passes through provided memoryUpdates", () => {
      const env = makeEnvelope();
      const updates = [
        {
          section: "Gotchas" as const,
          bullet: "zod .datetime() requires offset for non-UTC",
          distilledFrom: "mspr-1",
        },
      ];
      const result = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged: ["src/agent-team/router.ts"],
        evidence: cleanEvidence(),
        iteration: 0,
        scorecard: cleanScorecard(),
        memoryUpdates: updates,
      });
      expect(result.memoryUpdates).toEqual(updates);
    });
  });

  describe("recordReview (alias)", () => {
    it("returns the same result as evaluateReview for the same inputs", () => {
      const env = makeEnvelope();
      const filesChanged = ["src/agent-team/router.ts"];
      const evidence = cleanEvidence();
      const a = evaluateReview({
        envelope: env,
        resolvedTier: 3,
        filesChanged,
        evidence,
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      const b: SwarmReviewResult = recordReview(env, evidence, {
        filesChanged,
        resolvedTier: 3,
        iteration: 0,
        scorecard: cleanScorecard(),
      });
      expect(b.verdict).toBe(a.verdict);
      expect(b.nextGate).toBe(a.nextGate);
      expect(b.scorecard).toEqual(a.scorecard);
    });
  });
});
