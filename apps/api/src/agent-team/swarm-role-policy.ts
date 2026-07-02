/**
 * swarm-role-policy.ts
 *
 * Encodes the role policy from `swarm_roles.md` and `swarm_policy.md`
 * as data and exposes `evaluateRolePolicy(envelope, role, action)`.
 *
 * Pure functions: no filesystem access, no side effects. The function
 * always returns a typed decision with a human-readable `reason` and
 * a `policyRef` for audit (per runtime-design.md → error modes).
 *
 * Cross-references:
 *   - docs/agent-team/swarm_policy.md → "Always block", "Always review-required"
 *   - docs/agent-team/swarm_roles.md  → "Agent hard limits"
 *   - docs/agent-team/swarm_task_routing.md → tier floors
 */

import type { SwarmRole, SwarmTaskEnvelope } from "./swarm-task-envelope.js";
import type { AutonomyTier, RolePolicyDecision } from "./types.js";

/**
 * Coarse-grained action categories the policy can decide on.
 * The set is intentionally small; finer actions are routed via the
 * "action" parameter and mapped to these buckets inside the policy.
 */
export type SwarmAction =
  | "read" // file reads, repo audits
  | "draft" // write drafts under docs/
  | "edit" // edit code, tests, migrations under envelope
  | "finalize" // commit, push, merge
  | "deploy" // promote a build, run a workflow
  | "view_secrets" // read .env*, service-role, OAuth tokens
  | "destroy_data"; // rm -rf, prisma migrate reset, dropdb, hard delete

/**
 * Always-block action list. Mirrors `swarm_policy.md` → "Always block or escalate".
 */
const ALWAYS_BLOCK_ACTIONS: ReadonlySet<SwarmAction> = new Set<SwarmAction>([
  "view_secrets",
  "destroy_data",
]);

/**
 * Always-review-required task classes.
 * Mirrors `swarm_task_routing.md` → "Routing table" — reviewRequired = Yes
 * for everything except `read_only_audit` (and optional for `docs_spec`
 * and `test_validation`).
 */
const ALWAYS_REVIEW_TASK_TYPES: ReadonlySet<SwarmTaskEnvelope["taskType"]> =
  new Set<SwarmTaskEnvelope["taskType"]>([
    "implementation",
    "bugfix",
    "refactor",
    "governance_change",
    "ci_build_change",
    "infra_db_change",
    "security_sensitive",
    "destructive_operation",
  ]);

/**
 * Tier-0 task classes (always-block + always-approval per the policy).
 * Mirrors `swarm_task_routing.md` → "Routing table" rows with Tier 0.
 */
const TIER_ZERO_TASK_TYPES: ReadonlySet<SwarmTaskEnvelope["taskType"]> =
  new Set<SwarmTaskEnvelope["taskType"]>([
    "infra_db_change",
    "security_sensitive",
    "destructive_operation",
  ]);

/**
 * Scope-layer tier floors. Mirrors `swarm_task_routing.md` →
 * "Scope layer modifiers". The Orchestrator combines these floors
 * with the task-class default to resolve the final tier.
 */
const SCOPE_LAYER_TIER_FLOOR: Readonly<
  Record<SwarmTaskEnvelope["scopeLayer"], AutonomyTier>
> = {
  docs_only: 1,
  package_local: 2,
  app_local: 3,
  cross_package: 3,
  runtime_core: 3,
  governance_policy: 3,
  infra_database: 0,
  ci_deployment: 3,
  production_sensitive: 0,
};

/**
 * Task-class default tier. Mirrors `swarm_task_routing.md` → "Routing table"
 * (Autonomy column). The scope-layer floor can still push the resolved
 * tier up via `route()` in swarm-router.ts.
 */
const TASK_CLASS_DEFAULT_TIER: Readonly<
  Record<SwarmTaskEnvelope["taskType"], AutonomyTier>
> = {
  read_only_audit: 1,
  docs_spec: 2,
  implementation: 3,
  bugfix: 3,
  refactor: 3,
  test_validation: 2,
  governance_change: 3,
  ci_build_change: 3,
  infra_db_change: 0,
  security_sensitive: 0,
  destructive_operation: 0,
};

/**
 * Resolve a single tier floor for a taskType + scopeLayer pair,
 * using the policy tables. This is the role-policy view of the
 * routing floor (the router has additional review/approval flags).
 *
 * Resolution:
 *   1. Tier-0 task classes → 0
 *   2. task-class default
 *   3. max(floor, scope-layer floor)
 *
 * Pure, deterministic, no I/O.
 */
export function decideAutonomyTier(
  taskType: SwarmTaskEnvelope["taskType"],
  scopeLayer: SwarmTaskEnvelope["scopeLayer"],
): AutonomyTier {
  if (TIER_ZERO_TASK_TYPES.has(taskType)) return 0;
  const taskDefault = TASK_CLASS_DEFAULT_TIER[taskType];
  const layerFloor = SCOPE_LAYER_TIER_FLOOR[scopeLayer];
  // max() over a small numeric domain; defensive cast is safe because
  // both sides are constrained to 0..4 by their types.
  return (taskDefault > layerFloor ? taskDefault : layerFloor) as AutonomyTier;
}

/**
 * Evaluate the role policy from `swarm_roles.md` and `swarm_policy.md`
 * against an envelope, a role, and an action. Always returns a typed
 * decision with a human-readable reason and a policy reference.
 *
 * Hard guarantees (order of checks matters):
 *   1. `view_secrets` or `destroy_data` action → `block`
 *      (swarm_policy.md → "Always block").
 *   2. Builder finalizing or deploying a slice that requires human
 *      approval → `require_approval`
 *      (swarm_roles.md → "Agent 2: Builder" hard limits).
 *   3. Builder acting on a Tier 0 envelope without recorded human
 *      approval → `require_approval`
 *      (swarm_policy.md → "Tier 0").
 *   4. Builder performing `finalize` or `deploy` at all → `require_approval`
 *      (swarm_roles.md → "Agent 2: Builder" — may not finalize on its own).
 *   5. Otherwise → `allow`.
 */
export function evaluateRolePolicy(
  envelope: SwarmTaskEnvelope,
  role: SwarmRole,
  action: SwarmAction,
): RolePolicyDecision {
  // 1. Hard always-block list.
  if (ALWAYS_BLOCK_ACTIONS.has(action)) {
    return {
      decision: "block",
      reason:
        action === "view_secrets"
          ? "Reading secrets, service-role keys, or production credentials is always blocked (swarm_policy.md → Always block)."
          : "Destructive data operations are always blocked (swarm_policy.md → Always block).",
      policyRef: "swarm_policy.md#always-block",
    };
  }

  // 2. Builder finalizing/deploying a human-approval-required slice.
  if (
    role === "builder" &&
    envelope.humanApprovalRequired &&
    (action === "finalize" || action === "deploy")
  ) {
    return {
      decision: "require_approval",
      reason:
        "Builder may not finalize or deploy a slice that requires human approval (swarm_roles.md → Agent 2 hard limits).",
      policyRef: "swarm_roles.md#agent-2-hard-limits",
    };
  }

  // 3. Builder on a Tier 0 envelope without recorded human approval.
  // `humanApprovalRequired: true` on the envelope is the canonical
  // record of the human's sign-off; absence means Builder must escalate.
  if (
    role === "builder" &&
    envelope.autonomyTier === 0 &&
    !envelope.humanApprovalRequired &&
    action !== "read"
  ) {
    return {
      decision: "require_approval",
      reason:
        "Tier 0 envelopes require a recorded human approval before the Builder may act (swarm_policy.md → Tier 0).",
      policyRef: "swarm_policy.md#tier-0",
    };
  }

  // 4. Builder finalize / deploy in general — needs sign-off.
  if (role === "builder" && (action === "finalize" || action === "deploy")) {
    return {
      decision: "require_approval",
      reason:
        "Builder may not finalize or deploy on its own; the Reviewer or a human owner must sign off (swarm_roles.md → Agent 2 hard limits).",
      policyRef: "swarm_roles.md#agent-2-hard-limits",
    };
  }

  // 5. Default allow.
  return {
    decision: "allow",
    reason: `Role '${role}' may '${action}' inside envelope ${envelope.id}.`,
    policyRef: "swarm_policy.md#default-allow",
  };
}

/**
 * Test-only / advanced: re-export the policy tables for callers that
 * want to introspect the always-block and always-review-required lists
 * without re-deriving them from the docs.
 */
export const rolePolicyTables = {
  alwaysBlockActions: ALWAYS_BLOCK_ACTIONS,
  alwaysReviewTaskTypes: ALWAYS_REVIEW_TASK_TYPES,
  tierZeroTaskTypes: TIER_ZERO_TASK_TYPES,
  scopeLayerTierFloor: SCOPE_LAYER_TIER_FLOOR,
  taskClassDefaultTier: TASK_CLASS_DEFAULT_TIER,
} as const;
