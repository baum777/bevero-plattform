/**
 * swarm-review-gate.ts
 *
 * Implements the Reviewer scorecard from `swarm_review_gate.md` and
 * produces a `SwarmReviewResult` (verdict, scope/policy violations,
 * evidence, memory updates, next gate, bounded rework iteration).
 *
 * Pure functions: no filesystem, no network. The function `evaluateReview`
 * is the single source of truth for verdict computation; `recordReview`
 * is a thin wrapper for ergonomic call sites.
 *
 * Cross-references:
 *   - docs/agent-team/swarm_review_gate.md → "Verdict vocabulary",
 *     "Scorecard", "Bounded rework loop", "Reviewer hard limits"
 */

import type { SwarmTaskEnvelope } from "./swarm-task-envelope.js";
import type {
  AutonomyTier,
  Scorecard,
  Verdict,
} from "./types.js";

/** A concrete scope violation the Reviewer observed. */
export interface ScopeViolation {
  /** Path the Builder touched that is not in `pathsInScope`. */
  path: string;
  /** Short explanation, e.g. "outside envelope", "matched .gitleaks pattern". */
  reason: string;
}

/** A concrete policy violation the Reviewer observed. */
export interface PolicyViolation {
  /** Reference to the policy hook, e.g. "swarm_policy.md#always-block". */
  policyRef: string;
  /** Severity: "block" forces a blocked verdict, "review" only flags the slice for review. */
  severity: "block" | "review";
  /** Short explanation, e.g. "read of .env.local without approved test fixture". */
  reason: string;
}

/** A piece of named evidence the Reviewer used to score the slice. */
export interface ValidationEvidence {
  /** Type of evidence: a command, a file path, a test id, etc. */
  kind: "command" | "file" | "test" | "build" | "lint" | "typecheck" | "manual";
  /** The evidence itself, e.g. "npm run typecheck", "src/lib/foo.ts". */
  ref: string;
  /** Free-form outcome, e.g. "exit 0", "3 passed, 0 failed". */
  outcome: string;
}

/** A memory item the Reviewer wants to promote to `agent_memory.md`. */
export interface MemoryUpdate {
  /** Target section in `agent_memory.md`. */
  section:
    | "Repo conventions worth remembering"
    | "Operations"
    | "Gotchas"
    | "Reusable rules (cross-task)"
    | "Superseded";
  /** One-line bullet, phrased as a durable rule or finding. */
  bullet: string;
  /** Source MSPR entry id this update is distilled from. */
  distilledFrom: string;
}

/**
 * The full Reviewer result. Mirrors the required fields of an MSPR
 * `review` block plus the in-memory evidence the Reviewer used.
 */
export interface SwarmReviewResult {
  /** Final verdict per swarm_review_gate.md → "Verdict vocabulary". */
  verdict: Verdict;
  /** Paths the Builder touched that are not in `pathsInScope`. */
  scopeViolations: ScopeViolation[];
  /** Policy hooks the slice violated. */
  policyViolations: PolicyViolation[];
  /** Named evidence per dimension (commands, files, tests, build, lint, …). */
  validationEvidence: ValidationEvidence[];
  /** The five-dimension scorecard, 0..5 per dimension. */
  scorecard: Scorecard;
  /** Memory items to append to `agent_memory.md` via the adapter. */
  memoryUpdates: MemoryUpdate[];
  /** The next gate, phrased as a short imperative. */
  nextGate: string;
  /** Iteration counter for the bounded rework loop (max 2; 3rd → `blocked`). */
  reworkIteration: 0 | 1 | 2;
}

/** Input to `evaluateReview`. */
export interface ReviewInput {
  envelope: SwarmTaskEnvelope;
  /** Resolved tier from `swarm-router.ts` for cross-checks. */
  resolvedTier: AutonomyTier;
  /** Paths the Builder actually changed (repo-relative). */
  filesChanged: string[];
  /** Evidence collected by the Builder (commands run, tests, etc.). */
  evidence: ValidationEvidence[];
  /** 0-indexed rework iteration; first review is 0. */
  iteration: 0 | 1 | 2;
  /**
   * Optional pre-built scorecard. If omitted, the Reviewer derives a
   * default scorecard from the evidence / violations.
   */
  scorecard?: Scorecard;
  /**
   * Optional pre-built memory updates. If omitted, the Reviewer returns
   * an empty `memoryUpdates` array.
   */
  memoryUpdates?: MemoryUpdate[];
  /**
   * Optional custom next-gate. If omitted, the Reviewer derives one
   * from the verdict.
   */
  nextGate?: string;
}

/**
 * Repo paths that are always-block per `swarm_policy.md` →
 * "Policy hooks (repo-specific)".
 */
const ALWAYS_BLOCK_PATH_PREFIXES: readonly string[] = [
  "web/",
  ".env",
  ".env.",
];

/**
 * Repo paths that are always-review-required per `swarm_policy.md` →
 * "Policy hooks (repo-specific)". Touching these in itself is a
 * policy violation, not an automatic `blocked`, unless the slice
 * is in `runtime_core` or already at Tier 0.
 */
const ALWAYS_REVIEW_PATH_PREFIXES: readonly string[] = ["prisma/"];

/**
 * Pattern matching `.gitleaks.toml` rough scope. We keep this small and
 * conservative; the actual gitleaks tool is the source of truth and
 * runs in pre-commit per `AGENTS.md`.
 */
const GITLEAKS_LIKE_PATTERNS: readonly RegExp[] = [
  /\.env(\.|$)/i,
  /service[-_]?role/i,
  /oauth[-_]?token/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
];

/**
 * Check whether a path is matched by `.gitleaks.toml`-style patterns.
 * Conservative heuristic: only flags a small set of filename
 * patterns, never a free-form text scan.
 */
function matchesGitleaksPattern(p: string): boolean {
  return GITLEAKS_LIKE_PATTERNS.some((re) => re.test(p));
}

function isUnderPrefix(p: string, prefix: string): boolean {
  return p === prefix || p.startsWith(prefix);
}

/**
 * Compute scope violations: a `filesChanged` path is a scope violation
 * when it is not in `pathsInScope`. Empty `pathsInScope` means "no
 * restriction" (only valid for read-only audits).
 */
function computeScopeViolations(
  pathsInScope: readonly string[],
  filesChanged: readonly string[],
): ScopeViolation[] {
  if (pathsInScope.length === 0) return [];
  const violations: ScopeViolation[] = [];
  for (const f of filesChanged) {
    if (!pathsInScope.includes(f)) {
      violations.push({ path: f, reason: "outside envelope" });
    }
  }
  return violations;
}

/**
 * Compute policy violations for hard-block / review-required paths.
 */
function computePolicyViolations(
  filesChanged: readonly string[],
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  for (const f of filesChanged) {
    if (
      ALWAYS_BLOCK_PATH_PREFIXES.some((prefix) => isUnderPrefix(f, prefix)) ||
      matchesGitleaksPattern(f)
    ) {
      violations.push({
        policyRef: "swarm_policy.md#always-block",
        severity: "block",
        reason: `Touched protected path '${f}' (always block per swarm_policy.md).`,
      });
    } else if (
      ALWAYS_REVIEW_PATH_PREFIXES.some((prefix) => isUnderPrefix(f, prefix))
    ) {
      violations.push({
        policyRef: "swarm_policy.md#always-review-required",
        severity: "review",
        reason: `Touched review-required path '${f}' (always review per swarm_policy.md).`,
      });
    }
  }
  return violations;
}

/**
 * Derive a default scorecard from the violations and evidence. A clean
 * slice with named evidence gets 5s; a slice with scope / hard-block
 * policy violations gets 0s on the relevant dimension; a slice with
 * only "review" severity policy violations does NOT get `safety: 0`
 * (it keeps a high `safety` score, and the Reviewer verdict decision
 * is made by the `policyViolations` propagation, not by `safety: 0`).
 */
function deriveDefaultScorecard(
  scopeViolations: readonly ScopeViolation[],
  policyViolations: readonly PolicyViolation[],
  evidence: readonly ValidationEvidence[],
): Scorecard {
  const hasScopeViolations = scopeViolations.length > 0;
  const hasBlockPolicyViolations = policyViolations.some(
    (v) => v.severity === "block",
  );
  const hasAnyPolicyViolations = policyViolations.length > 0;
  const hasEvidence = evidence.length > 0;

  return {
    outcomeQuality: hasScopeViolations || hasBlockPolicyViolations ? 0 : 4,
    scopeDiscipline: hasScopeViolations ? 0 : 5,
    // `safety: 0` is reserved for hard-block policy violations
    // (web/, .env*, gitleaks-like). `prisma/` and other review-required
    // paths get `severity: "review"` and do NOT zero out `safety`.
    safety: hasBlockPolicyViolations ? 0 : 5,
    evidenceQuality: hasEvidence ? 5 : 0,
    sideEffects: hasScopeViolations || hasBlockPolicyViolations ? 0 : 4,
  };
  // `hasAnyPolicyViolations` is reserved for downstream use; the
  // Reviewer may also flag review-required paths even when `safety`
  // is high.
  void hasAnyPolicyViolations;
}

function nextGateForVerdict(verdict: Verdict, iteration: 0 | 1 | 2): string {
  switch (verdict) {
    case "pass":
      return "Builder may finalize";
    case "needs_rework":
      return iteration === 0
        ? "Builder must address rework notes and re-submit"
        : "Builder must address rework notes; final rework loop";
    case "blocked":
      return "Escalate to human owner; no further agent work";
    case "approval_required":
      return "Hand to human owner; agent work pauses";
  }
}

/**
 * Evaluate the Reviewer scorecard per `swarm_review_gate.md`.
 *
 * Hard rules (applied in this order):
 *   - Scope/policy violations are computed first (deterministic).
 *   - Any scope violation forces the verdict to at least `needs_rework`
 *     (per `swarm_review_gate.md` → error modes: "verdict is at least
 *     `needs_rework`" for out-of-scope edits).
 *   - `safety: 0` → `blocked` (automatic).
 *   - Any other score == 0 → `needs_rework` (automatic).
 *   - `safety < 4` → `pass` is downgraded to `needs_rework`.
 *   - `iteration === 2` and verdict would be `needs_rework` → `blocked`.
 *   - Empty evidence and not Tier 1 → `needs_rework`.
 *   - Tier 0 / production-sensitive envelope without recorded
 *     human approval → `approval_required`.
 *   - Otherwise: `pass` if no 0-scores, `needs_rework` otherwise.
 */
export function evaluateReview(input: ReviewInput): SwarmReviewResult {
  const {
    envelope,
    resolvedTier,
    filesChanged,
    evidence,
    iteration,
  } = input;

  // 1. Compute violations deterministically.
  const scopeViolations = computeScopeViolations(
    envelope.pathsInScope,
    filesChanged,
  );
  const policyViolations = computePolicyViolations(filesChanged);

  // 2. Scorecard (caller-supplied or derived).
  const scorecard: Scorecard =
    input.scorecard ?? deriveDefaultScorecard(
      scopeViolations,
      policyViolations,
      evidence,
    );

  // 3. Evidence gate (per runtime-design.md → error modes).
  if (evidence.length === 0 && resolvedTier !== 1) {
    return {
      verdict: "needs_rework",
      scopeViolations,
      policyViolations,
      validationEvidence: evidence,
      scorecard,
      memoryUpdates: input.memoryUpdates ?? [],
      nextGate: "collect named evidence",
      reworkIteration: iteration,
    };
  }

  // 4. Hard verdict rules.
  let verdict: Verdict;
  if (scorecard.safety === 0) {
    verdict = "blocked";
  } else if (
    scorecard.outcomeQuality === 0 ||
    scorecard.scopeDiscipline === 0 ||
    scorecard.evidenceQuality === 0 ||
    scorecard.sideEffects === 0
  ) {
    verdict = "needs_rework";
  } else if (scorecard.safety < 4) {
    // safety >= 1 and < 4 — never `pass`.
    verdict = "needs_rework";
  } else if (resolvedTier === 0 || envelope.humanApprovalRequired) {
    verdict = "approval_required";
  } else {
    verdict = "pass";
  }

  // 5. Scope-violation override: any scope violation forces the verdict
  //    to at least `needs_rework` (per design's error modes table).
  if (scopeViolations.length > 0 && verdict === "pass") {
    verdict = "needs_rework";
  }

  // 6. Bounded rework loop: 3rd iteration with needs_rework → blocked.
  if (iteration === 2 && verdict === "needs_rework") {
    verdict = "blocked";
  }

  // 6. Scope-violation escalation: 2nd review of the same out-of-scope
  // edit escalates to `blocked` per `agent_memory.md` →
  // "Reusable rules (cross-task)".
  if (
    iteration === 2 &&
    scopeViolations.length > 0 &&
    verdict === "needs_rework"
  ) {
    verdict = "blocked";
  }

  return {
    verdict,
    scopeViolations,
    policyViolations,
    validationEvidence: evidence,
    scorecard,
    memoryUpdates: input.memoryUpdates ?? [],
    nextGate: input.nextGate ?? nextGateForVerdict(verdict, iteration),
    reworkIteration: iteration,
  };
}

/**
 * Convenience wrapper: build a `ReviewInput` from a slice `entry` and
 * the `evidence` collected by the Builder, then evaluate. Returns the
 * same `SwarmReviewResult` as `evaluateReview`.
 *
 * `entry` is the parsed `SwarmTaskEnvelope` (the slice the Builder was
 * working on), `filesChanged` is the Builder's actual diff.
 */
export function recordReview(
  entry: SwarmTaskEnvelope,
  evidence: ValidationEvidence[],
  options: {
    filesChanged: string[];
    resolvedTier: AutonomyTier;
    iteration: 0 | 1 | 2;
    scorecard?: Scorecard;
    memoryUpdates?: MemoryUpdate[];
  },
): SwarmReviewResult {
  return evaluateReview({
    envelope: entry,
    resolvedTier: options.resolvedTier,
    filesChanged: options.filesChanged,
    evidence,
    iteration: options.iteration,
    scorecard: options.scorecard,
    memoryUpdates: options.memoryUpdates,
  });
}
