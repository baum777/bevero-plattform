/**
 * Shared primitive types for the agent-team runtime.
 *
 * Per `docs/agent-team/runtime-design.md` → "Shared primitive types" and
 * "Module dependency graph", this module is the source of truth for the
 * cross-module vocab (AutonomyTier, SwarmRole, Verdict, Scorecard,
 * RoutingDecision, RolePolicyDecision).
 *
 * It has no internal deps and is safe to import from every other
 * agent-team module.
 *
 * Cross-references:
 *   - docs/agent-team/swarm_roles.md → "Autonomy tiers"
 *   - docs/agent-team/swarm_review_gate.md → "Verdict vocabulary" + "Scorecard"
 *   - docs/agent-team/swarm_task_routing.md → "Routing table"
 *   - docs/agent-team/swarm_policy.md → "Always block / Always review"
 */

/**
 * Autonomy tier per swarm_roles.md → "Autonomy tiers".
 * 0 = blocked, 1 = read-only, 2 = draft/spec, 3 = execute with review,
 * 4 = autonomous with strict limits.
 */
export type AutonomyTier = 0 | 1 | 2 | 3 | 4;

/**
 * Three swarm roles per swarm_roles.md. No fourth role is allowed.
 */
export type SwarmRole = "orchestrator" | "builder" | "reviewer";

/**
 * Verdict vocabulary per swarm_review_gate.md → "Verdict vocabulary".
 */
export type Verdict = "pass" | "needs_rework" | "blocked" | "approval_required";

/**
 * Reviewer scorecard per swarm_review_gate.md → "Scorecard".
 * Each dimension is 0..5. A score of 0 on `safety` is an automatic `blocked`;
 * a score of 0 on any other dimension is an automatic `needs_rework`.
 */
export interface Scorecard {
  /** Does the slice actually achieve the decision in the TTD frame? */
  outcomeQuality: 0 | 1 | 2 | 3 | 4 | 5;
  /** Are `pathsInScope` respected? Any out-of-scope edits? */
  scopeDiscipline: 0 | 1 | 2 | 3 | 4 | 5;
  /** `.env*`, secrets, prod config, destructive ops untouched? ADRs cited? */
  safety: 0 | 1 | 2 | 3 | 4 | 5;
  /** Are tests, typecheck, build, lint outputs present and named? */
  evidenceQuality: 0 | 1 | 2 | 3 | 4 | 5;
  /** Migration impact, RLS impact, cross-app impact, new dependencies, build size. */
  sideEffects: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Routing decision produced by swarm-router.ts.
 * Mirrors swarm_task_routing.md → "Routing table" + "Scope layer modifiers".
 */
export interface RoutingDecision {
  /** Resolved tier after applying the routing table and scope-layer override. */
  autonomyTier: AutonomyTier;
  /** True if a Reviewer verdict is required before finalization. */
  reviewRequired: boolean;
  /** True if a human owner must sign off (Tier 0 or production-sensitive). */
  humanApprovalRequired: boolean;
  /** Human-readable justification, e.g. "implementation + runtime_core → Tier 3". */
  reason: string;
  /** Source rows cited, e.g. ["swarm_task_routing.md#implementation", "…#runtime_core"]. */
  policyRefs: string[];
}

/**
 * Role-policy decision produced by swarm-role-policy.ts.
 */
export type RolePolicyDecision =
  | { decision: "allow"; reason: string; policyRef: string }
  | { decision: "block"; reason: string; policyRef: string }
  | { decision: "require_approval"; reason: string; policyRef: string };
