/**
 * swarm-router.ts
 *
 * Applies the routing table from `swarm_task_routing.md` to a typed
 * envelope and returns a `RoutingDecision` (tier, reviewRequired,
 * humanApprovalRequired, reason, policyRefs).
 *
 * Pure functions: no filesystem, no network, no Prisma.
 *
 * Cross-references:
 *   - docs/agent-team/swarm_task_routing.md → "Routing table" +
 *     "Scope layer modifiers" + "Default behavior"
 *   - docs/agent-team/swarm_policy.md → "Always block / Always review"
 */

import type { SwarmTaskEnvelope } from "./swarm-task-envelope.js";
import { decideAutonomyTier, rolePolicyTables } from "./swarm-role-policy.js";
import type { AutonomyTier, RoutingDecision } from "./types.js";

/**
 * Named error thrown when an internal invariant of the router is
 * violated (e.g. an enum sneaks past zod). The router never throws
 * free-form `Error`s; callers can branch on `name === "RoutingInvariantError"`.
 */
export class RoutingInvariantError extends Error {
  public override readonly name = "RoutingInvariantError";
  constructor(message: string) {
    super(message);
  }
}

/**
 * Apply the routing table to a typed envelope.
 *
 * Resolution order (highest authority wins):
 *   1. Always-block task types (infra_db_change, security_sensitive,
 *      destructive_operation) → tier 0, humanApprovalRequired: true.
 *   2. Scope-layer floor (e.g. runtime_core → 3, infra_database → 0).
 *   3. Task-class default tier.
 *   4. Final tier = max(floors).
 *
 * `reviewRequired` is `true` for any task type on the always-review list
 * (per swarm_task_routing.md → "Routing table"). The default behavior
 * for unclassified requests is Tier 3, full review, no human approval.
 */
export function route(envelope: SwarmTaskEnvelope): RoutingDecision {
  // Defensive: zod should have caught this, but a runtime invariant
  // violation must surface a named error rather than silently misbehave.
  if (typeof envelope.autonomyTier !== "number") {
    throw new RoutingInvariantError(
      `envelope.autonomyTier must be 0..4, got ${typeof envelope.autonomyTier}`,
    );
  }

  const { taskType, scopeLayer } = envelope;
  const policyRefs: string[] = [];

  // 1. Always-block task types.
  if (rolePolicyTables.tierZeroTaskTypes.has(taskType)) {
    policyRefs.push(`swarm_task_routing.md#${taskType}`);
    policyRefs.push("swarm_policy.md#always-block");
    return {
      autonomyTier: 0,
      reviewRequired: true,
      humanApprovalRequired: true,
      reason: `Task type '${taskType}' is on the always-block list; tier 0 + human approval required.`,
      policyRefs,
    };
  }

  // 2 + 3. Combine task-class default with scope-layer floor.
  const finalTier: AutonomyTier = decideAutonomyTier(taskType, scopeLayer);
  policyRefs.push(`swarm_task_routing.md#${taskType}`);
  if (
    rolePolicyTables.scopeLayerTierFloor[scopeLayer] >=
    rolePolicyTables.taskClassDefaultTier[taskType]
  ) {
    policyRefs.push(`swarm_task_routing.md#${scopeLayer}`);
  }

  // 4. Review / human approval.
  const reviewRequired = rolePolicyTables.alwaysReviewTaskTypes.has(taskType);
  const humanApprovalRequired =
    finalTier === 0 || scopeLayer === "production_sensitive";

  return {
    autonomyTier: finalTier,
    reviewRequired,
    humanApprovalRequired,
    reason: `taskType='${taskType}' + scopeLayer='${scopeLayer}' → Tier ${finalTier} (review=${reviewRequired}, humanApproval=${humanApprovalRequired}).`,
    policyRefs,
  };
}

/**
 * Convenience: returns the tier only, without the rest of the decision.
 */
export function resolveAutonomyTier(envelope: SwarmTaskEnvelope): AutonomyTier {
  return route(envelope).autonomyTier;
}

/**
 * Alias for `route` — provided for call sites that prefer
 * verb-noun naming (matches the user-task contract).
 */
export function routeEnvelope(envelope: SwarmTaskEnvelope): RoutingDecision {
  return route(envelope);
}
