import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  createEnvelope,
  validateEnvelope,
  type SwarmTaskEnvelope,
} from "../../src/agent-team/swarm-task-envelope.js";
import {
  decideAutonomyTier,
  evaluateRolePolicy,
} from "../../src/agent-team/swarm-role-policy.js";
import { route } from "../../src/agent-team/swarm-router.js";
import {
  evaluateReview,
  type ValidationEvidence,
} from "../../src/agent-team/swarm-review-gate.js";
import {
  appendMsprEntry,
  distill,
  listEntries,
  readEntry,
  type MsprEntry,
} from "../../src/agent-team/mspr-memory-adapter.js";

/**
 * Integration test: end-to-end Orchestrator → Builder stub → Reviewer
 * → MSPR-Append → Distill.
 *
 * Stub agents (no LLM), only data structures. Uses a temp dir for the
 * logbook and memory file so the real `docs/` directory is untouched.
 */

function makeEnvelope(overrides: Partial<SwarmTaskEnvelope> = {}): SwarmTaskEnvelope {
  return {
    id: "env-int-1",
    userRequest: "Implement the 5 swarm runtime modules under src/agent-team/.",
    taskType: "implementation",
    scopeLayer: "runtime_core",
    pathsInScope: [
      "src/agent-team/types.ts",
      "src/agent-team/swarm-task-envelope.ts",
      "src/agent-team/swarm-role-policy.ts",
      "src/agent-team/swarm-router.ts",
      "src/agent-team/swarm-review-gate.ts",
      "src/agent-team/mspr-memory-adapter.ts",
      "tests/agent-team/swarm-task-envelope.test.ts",
      "tests/agent-team/swarm-role-policy.test.ts",
      "tests/agent-team/swarm-router.test.ts",
      "tests/agent-team/swarm-review-gate.test.ts",
      "tests/agent-team/mspr-memory-adapter.test.ts",
      "tests/agent-team/integration.test.ts",
    ],
    pathsOutOfScope: ["web/", "prisma/", ".env*"],
    autonomyTier: 3,
    assignedAgents: {
      orchestrator: "orch-stub",
      builder: "builder-stub",
      reviewer: "reviewer-stub",
    },
    requiredValidation: ["typecheck", "unit_tests", "build"],
    approvalRequired: true,
    humanApprovalRequired: false,
    risks: ["runtime_core touchpoint — full review required"],
    expectedOutputs: [
      "src/agent-team/types.ts",
      "src/agent-team/swarm-task-envelope.ts",
      "src/agent-team/swarm-role-policy.ts",
      "src/agent-team/swarm-router.ts",
      "src/agent-team/swarm-review-gate.ts",
      "src/agent-team/mspr-memory-adapter.ts",
    ],
    ...overrides,
  };
}

function makeMsprEntry(
  envelope: SwarmTaskEnvelope,
  overrides: Partial<MsprEntry> = {},
): MsprEntry {
  return {
    id: "mspr-int-1",
    timestamp: "2026-06-08T10:00:00.000Z",
    runId: "run-int-1",
    agentRole: "reviewer",
    taskType: envelope.taskType,
    scope: {
      layer: envelope.scopeLayer,
      pathsInScope: envelope.pathsInScope,
      pathsOutOfScope: envelope.pathsOutOfScope,
      autonomyTier: envelope.autonomyTier,
    },
    memory: {
      newFindings: [],
      reusableRules: [],
      gotchas: [],
    },
    progress: {
      actionsTaken: ["implemented 5 modules under src/agent-team/"],
      filesRead: ["docs/agent-team/runtime-design.md"],
      filesChanged: [
        "src/agent-team/types.ts",
        "src/agent-team/swarm-task-envelope.ts",
        "src/agent-team/swarm-role-policy.ts",
        "src/agent-team/swarm-router.ts",
        "src/agent-team/swarm-review-gate.ts",
        "src/agent-team/mspr-memory-adapter.ts",
        "tests/agent-team/swarm-task-envelope.test.ts",
        "tests/agent-team/swarm-role-policy.test.ts",
        "tests/agent-team/swarm-router.test.ts",
        "tests/agent-team/swarm-review-gate.test.ts",
        "tests/agent-team/mspr-memory-adapter.test.ts",
        "tests/agent-team/integration.test.ts",
      ],
      commandsRun: ["npm run typecheck", "npm test -- --run"],
      validationResults: ["typecheck: ok", "tests: all passed"],
    },
    review: {
      status: "pass",
      risks: [],
      scorecard: {
        outcomeQuality: 5,
        scopeDiscipline: 5,
        safety: 5,
        evidenceQuality: 5,
        sideEffects: 5,
      },
      nextGate: "Builder may finalize",
    },
    ...overrides,
  };
}

function cleanEvidence(): ValidationEvidence[] {
  return [
    { kind: "typecheck", ref: "npm run typecheck", outcome: "exit 0" },
    { kind: "test", ref: "npm test -- --run", outcome: "all passed" },
    { kind: "build", ref: "npm run build", outcome: "ok" },
  ];
}

describe("agent-team integration: orchestrator → builder stub → reviewer → MSPR", () => {
  let tempRepo: string;

  beforeEach(async () => {
    tempRepo = await fs.mkdtemp(path.join(os.tmpdir(), "agent-team-int-"));
    await fs.mkdir(path.join(tempRepo, "docs", "agent-team"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRepo, { recursive: true, force: true });
  });

  it("completes a happy-path runtime + implementation slice", async () => {
    // ── 1. Orchestrator: build the envelope from a raw input.
    const rawInput = makeEnvelope();
    const envelope = createEnvelope(rawInput);
    expect(envelope.id).toBe("env-int-1");

    // Round-trip through validateEnvelope.
    const validated = validateEnvelope(rawInput);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.envelope.id).toBe(envelope.id);
    }

    // ── 2. Orchestrator: apply role policy.
    const policyDecision = evaluateRolePolicy(
      envelope,
      "builder",
      "edit",
    );
    expect(policyDecision.decision).toBe("allow");

    // ── 3. Orchestrator: route the envelope.
    const routing = route(envelope);
    expect(routing.autonomyTier).toBe(3);
    expect(routing.reviewRequired).toBe(true);
    expect(routing.humanApprovalRequired).toBe(false);
    expect(routing.policyRefs.length).toBeGreaterThan(0);

    // Cross-check with role-policy tier classification.
    expect(decideAutonomyTier(envelope.taskType, envelope.scopeLayer)).toBe(
      routing.autonomyTier,
    );

    // ── 4. Builder (stub): produce filesChanged + evidence.
    const filesChanged = [
      "src/agent-team/types.ts",
      "src/agent-team/swarm-task-envelope.ts",
      "src/agent-team/swarm-role-policy.ts",
      "src/agent-team/swarm-router.ts",
      "src/agent-team/swarm-review-gate.ts",
      "src/agent-team/mspr-memory-adapter.ts",
      "tests/agent-team/swarm-task-envelope.test.ts",
      "tests/agent-team/swarm-role-policy.test.ts",
      "tests/agent-team/swarm-router.test.ts",
      "tests/agent-team/swarm-review-gate.test.ts",
      "tests/agent-team/mspr-memory-adapter.test.ts",
      "tests/agent-team/integration.test.ts",
    ];
    const evidence = cleanEvidence();

    // ── 5. Reviewer: evaluate the slice.
    const review = evaluateReview({
      envelope,
      resolvedTier: routing.autonomyTier,
      filesChanged,
      evidence,
      iteration: 0,
    });
    expect(review.verdict).toBe("pass");
    expect(review.scopeViolations).toEqual([]);
    expect(review.policyViolations).toEqual([]);
    expect(review.nextGate).toBe("Builder may finalize");
    expect(review.reworkIteration).toBe(0);

    // ── 6. MSPR adapter: append the entry.
    // The Reviewer's scorecard (derived from the no-violation case)
    // has outcomeQuality=4, sideEffects=4, and 5s elsewhere. We
    // round-trip the actual review scorecard into the MSPR entry.
    const msprEntry = makeMsprEntry(envelope, {
      review: {
        ...makeMsprEntry(envelope).review,
        status: review.verdict,
        scorecard: review.scorecard,
        nextGate: review.nextGate,
      },
    });
    const appended = await appendMsprEntry(msprEntry, {
      repoRoot: tempRepo,
    });
    expect(appended.entry.id).toBe("mspr-int-1");
    expect(appended.path).toContain("2026-06-08-mspr-int-1.md");

    // The file should exist and contain the frontmatter.
    const fileContent = await fs.readFile(appended.path, "utf8");
    expect(fileContent).toContain("id: mspr-int-1");
    expect(fileContent).toContain("verdict: pass");
    expect(fileContent).toContain("outcomeQuality: 4");
    expect(fileContent).toContain("scopeDiscipline: 5");
    expect(fileContent).toContain("safety: 5");

    // No temp file leaks.
    const logbookDir = path.join(tempRepo, "docs", "agent-team", "mspr_logbook");
    const allFiles = await fs.readdir(logbookDir);
    expect(allFiles.filter((f) => f.includes(".tmp-"))).toEqual([]);

    // ── 7. MSPR adapter: list and read back the entry.
    const listed = await listEntries({ repoRoot: tempRepo });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("mspr-int-1");

    const read = await readEntry("mspr-int-1", { repoRoot: tempRepo });
    expect(read).not.toBeNull();
    expect(read?.id).toBe("mspr-int-1");
    expect(read?.review.status).toBe("pass");

    // ── 8. MSPR adapter: distill memory updates.
    const memoryPath = path.join(
      tempRepo,
      "docs",
      "agent-team",
      "agent_memory.md",
    );
    // Seed an empty memory file with the standard sections.
    await fs.writeFile(
      memoryPath,
      [
        "### Gotchas",
        "",
        "- _none yet_",
        "",
      ].join("\n"),
      "utf8",
    );

    const distResult = await distill({
      entry: msprEntry,
      review: {
        ...review,
        memoryUpdates: [
          {
            section: "Gotchas",
            bullet:
              "zod 3.x .datetime() requires the offset option for non-UTC strings.",
            distilledFrom: "mspr-int-1",
          },
        ],
      },
      repoRoot: tempRepo,
      memoryPath,
    });
    expect(distResult.bulletsAppended).toBe(1);
    expect(distResult.sectionsUpdated).toContain("Gotchas");

    const memoryContent = await fs.readFile(memoryPath, "utf8");
    expect(memoryContent).toContain("zod 3.x .datetime()");
    expect(memoryContent).toContain("distilledFrom: mspr-int-1");
  });

  it("blocks a slice that touches web/ (out-of-policy path)", async () => {
    // Orchestrator builds a slice whose envelope allows web/ (a real
    // envelope would not, but we use this to exercise the policy
    // violation path in the integration).
    const envelope = createEnvelope(
      makeEnvelope({
        pathsInScope: [
          "src/agent-team/types.ts",
          "src/agent-team/swarm-router.ts",
          "web/index.html",
        ],
        pathsOutOfScope: ["prisma/", ".env*"],
      }),
    );

    const routing = route(envelope);
    expect(routing.autonomyTier).toBe(3);

    // Builder stub: changes include web/ (forbidden by FROZEN.md).
    const filesChanged = ["src/agent-team/types.ts", "web/index.html"];
    const evidence = cleanEvidence();

    const review = evaluateReview({
      envelope,
      resolvedTier: routing.autonomyTier,
      filesChanged,
      evidence,
      iteration: 0,
    });
    expect(review.verdict).toBe("blocked");
    expect(review.policyViolations.length).toBeGreaterThan(0);
    expect(review.policyViolations[0].policyRef).toBe(
      "swarm_policy.md#always-block",
    );
  });

  it("upgrades a rework slice to blocked on iteration=2", async () => {
    const envelope = createEnvelope(makeEnvelope());
    const routing = route(envelope);
    expect(routing.autonomyTier).toBe(3);

    // Iteration 0: needs_rework (scope violation).
    const filesChanged = [
      "src/agent-team/swarm-router.ts",
      "src/agent-team/extra.ts", // not in pathsInScope for the reviewer test
    ];
    // Restrict pathsInScope to exercise the violation.
    const restrictedEnvelope = {
      ...envelope,
      pathsInScope: ["src/agent-team/swarm-router.ts"],
    };
    const review0 = evaluateReview({
      envelope: restrictedEnvelope,
      resolvedTier: routing.autonomyTier,
      filesChanged,
      evidence: cleanEvidence(),
      iteration: 0,
    });
    expect(review0.verdict).toBe("needs_rework");
    expect(review0.scopeViolations.length).toBe(1);

    // Iteration 2: should be upgraded to blocked.
    const review2 = evaluateReview({
      envelope: restrictedEnvelope,
      resolvedTier: routing.autonomyTier,
      filesChanged,
      evidence: cleanEvidence(),
      iteration: 2,
    });
    expect(review2.verdict).toBe("blocked");
    expect(review2.reworkIteration).toBe(2);
  });

  it("produces approval_required for a Tier 0 / human-approval-required slice (no always-block file touched)", async () => {
    // The envelope's pathsInScope targets a path under prisma/ that is
    // NOT itself a gitleaks-like file, so the Reviewer should not
    // surface an always-block policy violation. Combined with
    // resolvedTier=0 and humanApprovalRequired=true, the verdict is
    // `approval_required`.
    const envelope = createEnvelope(
      makeEnvelope({
        taskType: "infra_db_change",
        scopeLayer: "infra_database",
        autonomyTier: 0,
        humanApprovalRequired: true,
        pathsInScope: ["prisma/schema.prisma"],
        pathsOutOfScope: ["src/", "prisma/seeds/"],
      }),
    );
    const routing = route(envelope);
    expect(routing.autonomyTier).toBe(0);
    expect(routing.humanApprovalRequired).toBe(true);

    const review = evaluateReview({
      envelope,
      resolvedTier: routing.autonomyTier,
      filesChanged: ["prisma/schema.prisma"],
      evidence: cleanEvidence(),
      iteration: 0,
    });
    expect(review.verdict).toBe("approval_required");
    expect(review.nextGate).toBe("Hand to human owner; agent work pauses");
  });
});
