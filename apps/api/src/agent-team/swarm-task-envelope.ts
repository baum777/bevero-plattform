/**
 * swarm-task-envelope.ts
 *
 * Canonical envelope issued by the Orchestrator to the Builder.
 * Defines the `SwarmTaskEnvelope` zod schema (mirror of
 * `docs/agent-team/swarm_task_envelope.schema.json`, Draft-07) plus
 * parsing helpers.
 *
 * The schema is the single source of truth: the JSON Schema and the
 * TypeScript type are both derived from it via `z.infer` and must
 * stay in lock-step with the .json file.
 *
 * Cross-references:
 *   - docs/agent-team/swarm_task_envelope.schema.json
 *   - docs/agent-team/swarm_roles.md → "Agent 1: Orchestrator"
 *   - docs/agent-team/swarm_task_routing.md
 *   - ADR-0020 (proposed)
 */

import { z } from "zod";

// Re-export the shared primitives so the public surface stays flat
// (per runtime-design.md → "Module dependency graph"). Other modules
// may also import directly from "./types.js".
export type {
  AutonomyTier,
  SwarmRole,
  Verdict,
  Scorecard,
  RoutingDecision,
  RolePolicyDecision,
} from "./types.js";

/**
 * Canonical zod schema for the Swarm Task Envelope.
 * Mirrors docs/agent-team/swarm_task_envelope.schema.json (Draft-07).
 */
export const SwarmTaskEnvelopeSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe(
        "Stable identifier for this envelope (UUID, ULID, or repo-local hash).",
      ),
    userRequest: z
      .string()
      .min(1)
      .describe(
        "Verbatim or paraphrased user request that triggered this envelope.",
      ),
    taskType: z.enum([
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
    ]),
    scopeLayer: z.enum([
      "docs_only",
      "package_local",
      "app_local",
      "cross_package",
      "runtime_core",
      "governance_policy",
      "infra_database",
      "ci_deployment",
      "production_sensitive",
    ]),
    pathsInScope: z.array(z.string().min(1)).default([]),
    pathsOutOfScope: z.array(z.string().min(1)).default([]),
    autonomyTier: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    assignedAgents: z
      .object({
        orchestrator: z.string().min(1),
        builder: z.string().min(1).optional(),
        reviewer: z.string().min(1).optional(),
      })
      .strict(),
    requiredValidation: z
      .array(
        z.enum([
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
        ]),
      )
      .min(1),
    approvalRequired: z.boolean(),
    humanApprovalRequired: z.boolean(),
    risks: z.array(z.string().min(1)),
    expectedOutputs: z.array(z.string().min(1)).min(1),
    deadline: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

/** Inferred TS type for a parsed Swarm Task Envelope. */
export type SwarmTaskEnvelope = z.infer<typeof SwarmTaskEnvelopeSchema>;

/**
 * Throws on invalid input. Use in trusted internal call sites.
 * @throws ZodError if the input does not match the schema.
 */
export function parseSwarmTaskEnvelope(input: unknown): SwarmTaskEnvelope {
  return SwarmTaskEnvelopeSchema.parse(input);
}

/**
 * Non-throwing variant. Returns a discriminated union so callers can
 * branch on `success` without try/catch.
 */
export function safeParseSwarmTaskEnvelope(
  input: unknown,
):
  | { success: true; data: SwarmTaskEnvelope }
  | { success: false; error: z.ZodError } {
  return SwarmTaskEnvelopeSchema.safeParse(input);
}

/**
 * Lightweight emptiness check used by the Orchestrator before issuing an
 * envelope. A "missing envelope" is a scope violation per swarm_roles.md
 * and must not enter the Builder.
 *
 * Returns `true` for `undefined`, `null`, an empty object `{}`, an
 * object whose `id` is empty, or a non-object value.
 */
export function isEmptyEnvelope(input: unknown): boolean {
  if (input === undefined || input === null) return true;
  if (typeof input !== "object") return true;
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return true;
  if (typeof obj.id === "string" && obj.id.length === 0) return true;
  return false;
}

/**
 * Strict constructor used by the Orchestrator to build a typed
 * envelope from a raw, partial input. Validates with zod and returns
 * a fully-typed `SwarmTaskEnvelope`. Throws `ZodError` on invalid input.
 *
 * This is a thin wrapper over `parseSwarmTaskEnvelope` provided for
 * ergonomic call sites; behavior is identical.
 *
 * @throws ZodError if the input does not match the schema.
 */
export function createEnvelope(input: unknown): SwarmTaskEnvelope {
  return parseSwarmTaskEnvelope(input);
}

/**
 * Non-throwing validator. Returns a discriminated union result that
 * is friendlier than the raw zod shape: callers branch on `ok` and
 * read `envelope` / `errors` directly. Implemented on top of
 * `safeParseSwarmTaskEnvelope` so behavior is identical.
 */
export type ValidateEnvelopeResult =
  | { ok: true; envelope: SwarmTaskEnvelope }
  | { ok: false; errors: z.ZodIssue[] };

export function validateEnvelope(input: unknown): ValidateEnvelopeResult {
  const result = safeParseSwarmTaskEnvelope(input);
  if (result.success) {
    return { ok: true, envelope: result.data };
  }
  return { ok: false, errors: result.error.issues };
}
