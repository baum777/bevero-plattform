# Runtime Design — Swarm TypeScript Surface

This document is the **implementation contract** for the five TypeScript modules introduced by `ADR-0020` (proposed). The runtime lives under `src/agent-team/` and turns the documentation surface in `docs/agent-team/` into a small, testable, in-process TypeScript library. It is **not** a service, not a CLI, not a framework, and it does not introduce new dependencies beyond what `package.json` already declares (TypeScript + `zod` + `vitest`).

The contract follows `swarm_roles.md`, `swarm_policy.md`, `swarm_task_routing.md`, `swarm_review_gate.md`, and `mspr_logbook.md` exactly. Any change to the type or runtime behavior is a `governance_change` and requires an ADR (see `swarm_policy.md` → "Policy versioning").

## Scope of this document

- Module overview, one responsibility per module.
- Full TypeScript signatures with JSDoc for every exported value.
- ASCII dataflow and module dependency graph.
- Persistence strategy for the MSPR memory adapter.
- Error modes per module.
- Test strategy (vitest, per-module + one integration test).

## Out of scope for this document

- HTTP endpoints, Fastify routes, webhook handlers (out of scope per ADR-0020).
- LLM-driven synthesis, tool use, or agentic loops (deterministic policy checks only).
- Vector store, embeddings, semantic memory (out of scope per ADR-0020 and `agent_memory.md`).
- Cockpit UI integration (out of scope per ADR-0020).

## Module overview

| Module | Responsibility |
|---|---|
| `swarm-task-envelope.ts` | Defines the `SwarmTaskEnvelope` zod schema, the `SwarmTaskEnvelope` TS type via `z.infer`, and parsers that turn a JSON-shaped input into a typed envelope or a typed `ZodError`. |
| `swarm-role-policy.ts` | Encodes the role policy from `swarm_roles.md` and `swarm_policy.md` as data and exposes `evaluateRolePolicy(envelope, role, action)` returning `allow` / `block` / `require_approval` with a named reason. |
| `swarm-router.ts` | Applies the routing table from `swarm_task_routing.md` to a typed envelope and returns the resolved `AutonomyTier`, `reviewRequired`, and `humanApprovalRequired` flags plus a routing reason. |
| `swarm-review-gate.ts` | Implements the Reviewer scorecard from `swarm_review_gate.md` and produces a `SwarmReviewResult` (verdict, scope/policy violations, evidence, memory updates, next gate). |
| `mspr-memory-adapter.ts` | Writes MSPR entries as append-only Markdown to `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md` with frontmatter, atomically (write to temp + rename), and exposes a `distill(entry)` hook that promotes long-lived findings into `agent_memory.md`. |

## TypeScript signatures

All signatures below are the **public** surface of the runtime. Internal helpers are not listed; they are kept private to each module. Every exported type and function carries JSDoc that cross-references the originating governance file.

### Shared primitive types

```ts
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
```

### `swarm-task-envelope.ts`

```ts
import { z } from "zod";

/**
 * Canonical zod schema for the Swarm Task Envelope.
 * Mirrors docs/agent-team/swarm_task_envelope.schema.json (Draft-07).
 * The schema is the single source of truth: JSON Schema and TS type are
 * both derived from it and must stay in lock-step.
 */
export const SwarmTaskEnvelopeSchema = z
  .object({
    id: z.string().min(1)
      .describe("Stable identifier for this envelope (UUID, ULID, or repo-local hash)."),
    userRequest: z.string().min(1)
      .describe("Verbatim or paraphrased user request that triggered this envelope."),
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
      "destructive_operation"
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
      "production_sensitive"
    ]),
    pathsInScope: z.array(z.string().min(1)).default([]),
    pathsOutOfScope: z.array(z.string().min(1)).default([]),
    autonomyTier: z.union([
      z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)
    ]),
    assignedAgents: z
      .object({
        orchestrator: z.string().min(1),
        builder: z.string().min(1).optional(),
        reviewer: z.string().min(1).optional()
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
          "manual_smoke"
        ])
      )
      .min(1),
    approvalRequired: z.boolean(),
    humanApprovalRequired: z.boolean(),
    risks: z.array(z.string().min(1)),
    expectedOutputs: z.array(z.string().min(1)).min(1),
    deadline: z.string().datetime({ offset: true }).optional()
  })
  .strict();

/** Inferred TS type for a parsed Swarm Task Envelope. */
export type SwarmTaskEnvelope = z.infer<typeof SwarmTaskEnvelopeSchema>;

/**
 * Throws on invalid input. Use in trusted internal call sites.
 * @throws ZodError if the input does not match the schema.
 */
export function parseSwarmTaskEnvelope(input: unknown): SwarmTaskEnvelope;

/**
 * Non-throwing variant. Returns a discriminated union so callers can
 * branch on `success` without try/catch.
 */
export function safeParseSwarmTaskEnvelope(
  input: unknown
):
  | { success: true; data: SwarmTaskEnvelope }
  | { success: false; error: z.ZodError };

/**
 * Lightweight emptiness check used by the Orchestrator before issuing an
 * envelope. A "missing envelope" is a scope violation per swarm_roles.md
 * and must not enter the Builder.
 */
export function isEmptyEnvelope(input: unknown): boolean;
```

### `swarm-role-policy.ts`

```ts
import type { SwarmRole } from "./swarm-task-envelope.js";
import type { SwarmTaskEnvelope } from "./swarm-task-envelope.js";

/**
 * Coarse-grained action categories the policy can decide on.
 * The set is intentionally small; finer actions are routed via the
 * "action" parameter and mapped to these buckets inside the policy.
 */
export type SwarmAction =
  | "read"            // file reads, repo audits
  | "draft"           // write drafts under docs/
  | "edit"            // edit code, tests, migrations under envelope
  | "finalize"        // commit, push, merge
  | "deploy"          // promote a build, run a workflow
  | "view_secrets"    // read .env*, service-role, OAuth tokens
  | "destroy_data";   // rm -rf, prisma migrate reset, dropdb, hard delete

/**
 * Evaluate the role policy from swarm_roles.md and swarm_policy.md against
 * an envelope, a role, and an action. Always returns a typed decision with
 * a human-readable reason and a policy reference for audit.
 *
 * Hard guarantees:
 *   - Any `view_secrets` action is `block` (swarm_policy.md → "Always block").
 *   - Any `destroy_data` action is `block` (swarm_policy.md → "Always block").
 *   - Any `finalize` or `deploy` action with `humanApprovalRequired: true`
 *     is `require_approval` (swarm_roles.md → Reviewer hard limits).
 *   - The Builder may not act on a Tier 0 envelope without a recorded
 *     human approval → `require_approval`.
 */
export function evaluateRolePolicy(
  envelope: SwarmTaskEnvelope,
  role: SwarmRole,
  action: SwarmAction
): RolePolicyDecision;
```

### `swarm-router.ts`

```ts
import type { SwarmTaskEnvelope } from "./swarm-task-envelope.js";
import type { AutonomyTier, RoutingDecision } from "./types.js";

/**
 * Apply the routing table from swarm_task_routing.md to a typed envelope.
 *
 * Resolution order (highest authority wins):
 *   1. If `taskType` is in {infra_db_change, security_sensitive, destructive_operation}
 *      → tier floor is 0, `humanApprovalRequired: true` (always-block + always-approval).
 *   2. Apply the scope-layer floor from "Scope layer modifiers" (e.g. runtime_core → 3).
 *   3. Apply the task-class default from the routing table.
 *   4. Final tier is `max(floors)`.
 *
 * Default for unclassified requests: Tier 3, full review, no human approval
 * (per swarm_task_routing.md → "Default behavior"). The Orchestrator is
 * expected to log the classification uncertainty in MSPR `memory.gotchas`.
 */
export function route(envelope: SwarmTaskEnvelope): RoutingDecision;

/**
 * Convenience: returns the tier only, without the rest of the decision.
 * Useful in places that only need to gate a single action.
 */
export function resolveAutonomyTier(envelope: SwarmTaskEnvelope): AutonomyTier;
```

### `swarm-review-gate.ts`

```ts
import type {
  AutonomyTier,
  Scorecard,
  Verdict
} from "./types.js";
import type { SwarmTaskEnvelope } from "./swarm-task-envelope.js";

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
 * The full Reviewer result. Mirrors the required fields of an MSPR `review`
 * block plus the in-memory evidence the Reviewer used.
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
  /** The next gate, phrased as a short imperative (e.g. "Builder may finalize"). */
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
}

/**
 * Evaluate the Reviewer scorecard per swarm_review_gate.md.
 *
 * Hard rules:
 *   - `safety: 0` → `blocked` (automatic).
 *   - any other score == 0 → `needs_rework` (automatic).
 *   - `safety < 4` → never `pass`.
 *   - `iteration === 2` and verdict would be `needs_rework` → upgrade to `blocked`.
 *   - `pathsInScope` mismatch with `filesChanged` → `scopeViolations` populated.
 *   - Touching `web/`, `prisma/`, `.env*`, `.gitleaks`-pattern files,
 *     or service-role credentials → `policyViolations` populated.
 */
export function evaluateReview(input: ReviewInput): SwarmReviewResult;
```

### `mspr-memory-adapter.ts`

```ts
import { z } from "zod";
import type { SwarmReviewResult } from "./swarm-review-gate.js";
import type { Scorecard, Verdict } from "./types.js";

/**
 * zod schema for one MSPR logbook entry.
 * Mirrors docs/agent-team/mspr_schema.json (Draft-07). The JSON Schema and
 * the TS type are both derived from this zod schema and must stay in
 * lock-step.
 */
export const MsprEntrySchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime({ offset: true }),
    runId: z.string().min(1),
    agentRole: z.enum(["orchestrator", "builder", "reviewer"]),
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
      "destructive_operation"
    ]),
    scope: z
      .object({
        layer: z.enum([
          "docs_only",
          "package_local",
          "app_local",
          "cross_package",
          "runtime_core",
          "governance_policy",
          "infra_database",
          "ci_deployment",
          "production_sensitive"
        ]),
        pathsInScope: z.array(z.string().min(1)),
        pathsOutOfScope: z.array(z.string().min(1)),
        autonomyTier: z.union([
          z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)
        ])
      })
      .strict(),
    memory: z
      .object({
        newFindings: z.array(z.string().min(1)),
        reusableRules: z.array(z.string().min(1)),
        gotchas: z.array(z.string().min(1))
      })
      .strict(),
    progress: z
      .object({
        actionsTaken: z.array(z.string().min(1)),
        filesRead: z.array(z.string().min(1)),
        filesChanged: z.array(z.string().min(1)),
        commandsRun: z.array(z.string().min(1)),
        validationResults: z.array(z.string().min(1))
      })
      .strict(),
    review: z
      .object({
        status: z.enum(["pass", "needs_rework", "blocked", "approval_required"]) satisfies z.ZodType<Verdict>,
        risks: z.array(z.string().min(1)),
        scorecard: z
          .object({
            outcomeQuality: z.number().int().min(0).max(5),
            scopeDiscipline: z.number().int().min(0).max(5),
            safety: z.number().int().min(0).max(5),
            evidenceQuality: z.number().int().min(0).max(5),
            sideEffects: z.number().int().min(0).max(5)
          })
          .strict() satisfies z.ZodType<Scorecard>,
        nextGate: z.string().min(1)
      })
      .strict()
  })
  .strict();

/** Inferred TS type for a parsed MSPR entry. */
export type MsprEntry = z.infer<typeof MsprEntrySchema>;

/** Result of an append call. */
export interface AppendResult {
  /** The parsed entry that was written. */
  entry: MsprEntry;
  /** Absolute path of the markdown file the entry was written to. */
  path: string;
  /** Number of bytes written (UTF-8). */
  bytes: number;
}

/** Options for `appendMsprEntry`. */
export interface AppendOptions {
  /**
   * Repo root, used to resolve `docs/agent-team/mspr_logbook/`.
   * Defaults to `process.cwd()`. Must be a directory; the function
   * refuses to write outside the repo.
   */
  repoRoot?: string;
  /**
   * Override the slug derived from `entry.id`. Slug must match
   * `/^[a-z0-9][a-z0-9-]{0,63}$/` after lower-casing.
   */
  slug?: string;
  /**
   * Skip the file-system write. Used by tests that assert on the
   * serialized Markdown without touching disk.
   */
  dryRun?: boolean;
}

/**
 * Serialize an MSPR entry to Markdown with frontmatter and append it to
 * `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md`. The file is created
 * on first write and appended to on subsequent writes within the same day.
 * Writes are atomic: the adapter writes to a temp file in the same
 * directory and then `rename`s it into place, so a crash mid-write never
 * leaves a half-written logbook.
 *
 * Hard rules:
 *   - The logbook is append-only. The adapter never edits a past entry.
 *   - The adapter never writes outside `docs/agent-team/mspr_logbook/`.
 *   - The adapter never reads or includes secrets, PII, or unverified
 *     claims (per mspr_logbook.md → "What never goes in an entry").
 */
export function appendMsprEntry(
  entry: MsprEntry,
  options?: AppendOptions
): Promise<AppendResult>;

/** Input for `distill`. */
export interface DistillInput {
  /** The MSPR entry to distill. */
  entry: MsprEntry;
  /** The Reviewer's verdict and memory updates for this entry. */
  review: SwarmReviewResult;
  /**
   * Absolute path to `docs/agent-team/agent_memory.md`. Defaults to
   * `<repoRoot>/docs/agent-team/agent_memory.md`.
   */
  memoryPath?: string;
  /**
   * Skip the file-system write. Used by tests.
   */
  dryRun?: boolean;
}

/** Result of a distill call. */
export interface DistillResult {
  /** Sections updated in `agent_memory.md`. */
  sectionsUpdated: string[];
  /** Number of bullets appended across all sections. */
  bulletsAppended: number;
  /** The path of the memory file that was updated (or would be, in dry-run). */
  path: string;
}

/**
 * Promote long-lived findings from an MSPR entry into
 * `docs/agent-team/agent_memory.md` under the matching section
 * (see agent_memory.md → "Sections").
 *
 * Promotion rules (per agent_memory.md → "Distillation process"):
 *   - Only `MemoryUpdate` items with `evidenceQuality >= 4` are eligible.
 *   - Each appended bullet is signed with `distilledFrom: <entry.id>`.
 *   - A contradiction moves the older bullet to "Superseded" with a link
 *     to the new one.
 *   - The function is non-destructive: it never rewrites past bullets.
 */
export function distill(input: DistillInput): Promise<DistillResult>;
```

## Dataflow

The runtime implements the architecture described in `docs/agent-team/README.md` and the bounded rework loop in `swarm_review_gate.md`. The diagram below is the **runtime** dataflow, not the documentation one-liner; every arrow is a typed function call.

```text
                            ┌──────────────────────────────────────┐
                            │  User Request (free text, CLI, HTTP) │
                            └────────────────┬─────────────────────┘
                                             │
                                             ▼
                  ┌────────────────────────────────────────────────┐
                  │ Orchestrator (Agent 1)                          │
                  │  - classify taskType + scopeLayer               │
                  │  - build raw envelope object                    │
                  │  - parseSwarmTaskEnvelope(input)                │
                  │      ├── on failure → MSPR(status: blocked)     │
                  │      └── on success → SwarmTaskEnvelope         │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ swarm-task-envelope.ts                         │
                  │  - SwarmTaskEnvelopeSchema (zod)               │
                  │  - safeParseSwarmTaskEnvelope → typed env      │
                  │  - isEmptyEnvelope → refuse if empty           │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ swarm-role-policy.ts                           │
                  │  evaluateRolePolicy(env, role, action)         │
                  │      ├── block         → MSPR(blocked)         │
                  │      ├── require_approval → MSPR(approval)     │
                  │      └── allow         → continue              │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ swarm-router.ts                                │
                  │  route(env) → RoutingDecision                  │
                  │  - tier 0 / 1 / 2 / 3 / 4                      │
                  │  - reviewRequired                             │
                  │  - humanApprovalRequired                       │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ Builder (Agent 2)                              │
                  │  - read inside pathsInScope only               │
                  │  - implement / draft / repair / validate       │
                  │  - collect validationEvidence                  │
                  │  - run requiredValidation                      │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ Reviewer (Agent 3)                             │
                  │  evaluateReview({                              │
                  │    envelope, resolvedTier,                     │
                  │    filesChanged, evidence, iteration           │
                  │  }) → SwarmReviewResult                        │
                  │      ├── pass / needs_rework / blocked /       │
                  │      │   approval_required                     │
                  │      └── memoryUpdates[]                       │
                  └────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────────────────────┐
                  │ mspr-memory-adapter.ts                         │
                  │  appendMsprEntry(entry) →                      │
                  │    docs/agent-team/mspr_logbook/               │
                  │      YYYY-MM-DD-<slug>.md  (atomic, append)     │
                  │                                                  │
                  │  distill({ entry, review }) →                  │
                  │    docs/agent-team/agent_memory.md             │
                  │      (long-lived bullets only,                 │
                  │       evidenceQuality >= 4)                    │
                  └────────────────────────────────────────────────┘
```

The rework loop (per `swarm_review_gate.md` → "Bounded rework loop") re-enters at the **Reviewer** step with `iteration: iteration + 1`. After two reworks, the third review with `needs_rework` is upgraded to `blocked` and the slice escalates to a human owner.

## Module dependency graph

The graph is acyclic. Edges are `import` statements.

```text
swarm-task-envelope.ts
        │
        │  types: SwarmTaskEnvelope, SwarmRole, isEmptyEnvelope
        ▼
swarm-role-policy.ts ───────────────┐
        │                            │
        │  uses envelope + role      │
        ▼                            │
swarm-router.ts                      │
        │                            │
        │  uses envelope             │
        ▼                            │
swarm-review-gate.ts                 │
        │                            │
        │  produces SwarmReviewResult│
        ▼                            │
mspr-memory-adapter.ts ──────────────┘
        │
        │  uses SwarmReviewResult.memoryUpdates
        ▼
  (no further deps — writes Markdown to disk)
```

Concretely, the import edges are:

- `swarm-task-envelope.ts` — no internal deps; depends only on `zod`.
- `swarm-role-policy.ts` → `swarm-task-envelope.ts` (types only).
- `swarm-router.ts` → `swarm-task-envelope.ts` (types only).
- `swarm-review-gate.ts` → `swarm-task-envelope.ts` (types only).
- `mspr-memory-adapter.ts` → `swarm-review-gate.ts` (types only).

A shared `types.ts` file (not listed as a runtime module) re-exports `AutonomyTier`, `SwarmRole`, `Verdict`, `Scorecard`, and `RoutingDecision` so the three middle modules can be wired without forming cycles. `swarm-task-envelope.ts` re-exports `SwarmRole` and `AutonomyTier` to keep the public surface flat.

No module imports from `src/`, `prisma/`, `apps/`, `web/`, or any path under `process.cwd()/.env*` (per ADR-0020 guardrails).

## Persistence

The runtime has **no database** and **no new external dependencies**. The MSPR memory adapter writes append-only Markdown to disk, exactly as documented in `mspr_logbook.md` and `agent_memory.md`.

### Path schema

```text
docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md
```

- `YYYY-MM-DD` is derived from `entry.timestamp` in UTC. The adapter refuses
  a `timestamp` that does not parse as ISO-8601.
- `<slug>` defaults to a short, lower-case, kebab-case form of `entry.id`
  (first 32 chars after stripping non-`[a-z0-9-]`). Callers may override
  via `AppendOptions.slug`, but the override must still match
  `/^[a-z0-9][a-z0-9-]{0,63}$/`.
- The adapter refuses to write outside `docs/agent-team/mspr_logbook/`.
  Path traversal (`..`, absolute paths) is rejected before any `fs` call.

### File format

Each file is a single Markdown document. The first block is YAML frontmatter; the rest is the human-readable MSPR body that mirrors the JSON fields (see `mspr_logbook.md` → "Minimal Markdown entry template").

```md
---
id: <entry.id>
timestamp: <entry.timestamp>
runId: <entry.runId>
agentRole: orchestrator | builder | reviewer
taskType: <entry.taskType>
verdict: pass | needs_rework | blocked | approval_required
---

# MSPR Entry — <short slice title>

- **Scope**:
  - layer: <entry.scope.layer>
  - autonomyTier: <entry.scope.autonomyTier>
  - pathsInScope: [...]
  - pathsOutOfScope: [...]
- **Memory**:
  - newFindings: [...]
  - reusableRules: [...]
  - gotchas: [...]
- **Progress**:
  - actionsTaken: [...]
  - filesRead: [...]
  - filesChanged: [...]
  - commandsRun: [...]
  - validationResults: [...]
- **Review**:
  - status: <entry.review.status>
  - risks: [...]
  - scorecard:
    - outcomeQuality: 0-5
    - scopeDiscipline: 0-5
    - safety: 0-5
    - evidenceQuality: 0-5
    - sideEffects: 0-5
  - nextGate: <entry.review.nextGate>
```

### Append semantics

- **First write of the day**: create the file, write the frontmatter and body, then `rename` from `<file>.tmp-<random>` to the final path.
- **Subsequent writes of the day**: append a separator (`\n---\n\n`) plus a new frontmatter + body block to the existing file, then `rename` from the temp file.
- The temp file lives in the **same** directory as the target file so the final `rename` is atomic on every POSIX filesystem that Bevero targets (Linux on Vercel).
- The adapter never edits a past entry. The only allowed edit is the secret-redaction exception documented in `mspr_logbook.md` → "Retention", and even that requires a follow-up entry that names the redaction.

### Distillation to `agent_memory.md`

`distill(input)` appends bullets to `docs/agent-team/agent_memory.md` under the matching section from `agent_memory.md` → "Sections". The rules are:

- Only `MemoryUpdate` items from the `SwarmReviewResult` whose source
  `evidenceQuality >= 4` are eligible.
- Each appended bullet is suffixed with a `distilledFrom: <entry.id>` line.
- A bullet that contradicts an existing bullet in the same section moves the
  older bullet to "Superseded" with a link to the new one.
- `distill` is non-destructive: it never rewrites past bullets.

## Error modes

Each module has a small, typed error surface. The runtime never throws
free-form `Error` objects; it returns a discriminated union or a named
error class so callers can branch on the cause.

### `swarm-task-envelope.ts`

| Input | Behavior |
|---|---|
| `undefined` / `null` | `safeParseSwarmTaskEnvelope` returns `{ success: false, error }`; `parseSwarmTaskEnvelope` throws `ZodError`. `isEmptyEnvelope` returns `true`. |
| `{}` | Same as above; `isEmptyEnvelope` returns `true`. The Orchestrator must not pass this to the Builder. |
| Missing required field (e.g. `id`) | `ZodError` with `issues[].path = ["id"]`. |
| Wrong type (e.g. `autonomyTier: "3"` instead of `3`) | `ZodError` with `invalid_type`. |
| Unknown `taskType` (not in the enum) | `ZodError` with `invalid_enum_value`. |
| Extra property (e.g. `assignedAgents: { orchestrator: "x", god: true }`) | `ZodError` with `unrecognized_keys` (the schema is `.strict()`). |

### `swarm-role-policy.ts`

| Scenario | Behavior |
|---|---|
| `view_secrets` action | `block`, `policyRef: "swarm_policy.md#always-block"`. |
| `destroy_data` action | `block`, `policyRef: "swarm_policy.md#always-block"`. |
| Builder action with `humanApprovalRequired: true` | `require_approval`, `policyRef: "swarm_roles.md#agent-2-hard-limits"`. |
| Builder action on a Tier 0 envelope without recorded human approval | `require_approval`, `policyRef: "swarm_policy.md#tier-0"`. |
| `finalize` or `deploy` action by the Builder | `require_approval` (Reviewer or human must sign off), `policyRef: "swarm_roles.md#agent-2-hard-limits"`. |
| Otherwise | `allow`, with a one-line `reason` and a `policyRef` for audit. |

### `swarm-router.ts`

| Scenario | Behavior |
|---|---|
| `taskType` in {`infra_db_change`, `security_sensitive`, `destructive_operation`} | `autonomyTier: 0`, `humanApprovalRequired: true`, `reason` cites the always-block list. |
| `scopeLayer: runtime_core` | Tier floor `3`, `reviewRequired: true`. |
| `scopeLayer: infra_database` | Tier floor `0` (or `3` if no migration), `humanApprovalRequired: true` if migration. |
| Unclassified request | Tier `3`, `reviewRequired: true`, `humanApprovalRequired: false`. Orchestrator is expected to log the uncertainty in MSPR `memory.gotchas`. |
| Internal invariant violated (e.g. unknown enum sneaking past zod) | Throws a named `RoutingInvariantError`. |

### `swarm-review-gate.ts`

| Scenario | Behavior |
|---|---|
| `scorecard.safety === 0` | `verdict: "blocked"`. |
| Any other scorecard dimension is `0` | `verdict: "needs_rework"`. |
| `scorecard.safety < 4` and caller would have marked `pass` | `verdict` is downgraded to `needs_rework`. |
| `filesChanged` includes a path not in `pathsInScope` | `scopeViolations` populated; tier is escalated; verdict is at least `needs_rework`. |
| A touched file matches `.gitleaks.toml` patterns, or `web/`, or `prisma/`, or `.env*` | `policyViolations` populated; if `web/` or `.env*`, verdict is `blocked`. |
| `iteration === 2` and the scorecard would yield `needs_rework` | Verdict is upgraded to `blocked` (bounded rework loop). |
| `evidence` is empty and the envelope is not Tier 1 | `verdict: "needs_rework"`, with `nextGate: "collect named evidence"`. |

### `mspr-memory-adapter.ts`

| Scenario | Behavior |
|---|---|
| `appendMsprEntry` with an entry that fails `MsprEntrySchema` | Throws `ZodError` before any `fs` call. |
| `entry.timestamp` does not parse as ISO-8601 | Throws `MsprAdapterError` with `code: "BAD_TIMESTAMP"`. |
| `entry.id` contains characters that yield a non-kebab slug | Throws `MsprAdapterError` with `code: "BAD_SLUG"`. |
| `repoRoot` does not exist or is not a directory | Throws `MsprAdapterError` with `code: "REPO_ROOT_NOT_FOUND"`. |
| Path traversal attempt in `slug` (e.g. `../etc/passwd`) | Throws `MsprAdapterError` with `code: "PATH_TRAVERSAL"`. |
| `distill` would append a bullet to a section that does not exist | Creates the section (per `agent_memory.md` → "Sections") before appending. |
| `distill` would contradict an existing bullet | Moves the older bullet to "Superseded" with a link to the new one (non-destructive). |
| Disk write fails (EACCES, ENOSPC, EROFS) | Throws `MsprAdapterError` with `code: "WRITE_FAILED"` and the underlying `cause`. The temp file is removed. |
| Existing logbook file is malformed (no frontmatter) | Throws `MsprAdapterError` with `code: "MALFORMED_LOGBOOK"`. The adapter never silently "fixes" a past entry. |

## Test strategy

The runtime is covered by **vitest** unit tests (per module) plus one
integration test that exercises all five modules end-to-end. Tests live
under `src/agent-team/__tests__/` so the runtime is a self-contained
test surface; `vitest.config.ts` is extended to include this path
(`include: ["tests/**/*.test.ts", "src/agent-team/__tests__/**/*.test.ts"]`).

### Per-module unit tests

| Test file | Module under test | Coverage |
|---|---|---|
| `swarm-task-envelope.test.ts` | `swarm-task-envelope.ts` | Happy path parse, every required field, every enum, every `.strict()` rejection, `isEmptyEnvelope` for `null` / `{}` / `undefined`, and a round-trip through `safeParse` → JSON.stringify → `safeParse`. |
| `swarm-role-policy.test.ts` | `swarm-role-policy.ts` | Each role × each action matrix, with table-driven cases. The always-block list is covered with one assertion per item. The Tier 0 / human approval floor is covered with a `require_approval` case. |
| `swarm-router.test.ts` | `swarm-router.ts` | Every `taskType` × `scopeLayer` cell, plus the three task classes that always floor to Tier 0. The unclassified default is covered with a stub envelope. `RoutingInvariantError` is covered with a monkey-patched schema. |
| `swarm-review-gate.test.ts` | `swarm-review-gate.ts` | Each verdict path: `pass`, `needs_rework`, `blocked` (safety 0 and rework-loop upgrade), `approval_required` (human sign-off missing). Scorecard boundaries (0, 1, 4, 5) are covered. Scope and policy violations are populated with named evidence. |
| `mspr-memory-adapter.test.ts` | `mspr-memory-adapter.ts` | Round-trip `entry → Markdown → entry` via the frontmatter parser. Atomic write is asserted by simulating a crash mid-write (the temp file is removed, the target file is unchanged). Path traversal, bad slug, malformed logbook, and `WRITE_FAILED` are all covered. `distill` covers section creation, contradiction → "Superseded" move, and the `evidenceQuality < 4` filter. |

### Integration test

`integration/full-pipeline.test.ts` exercises all five modules together. The test is the only place where the modules are allowed to call each other; per-module tests use synthetic inputs.

```text
Orchestrator
  → parseSwarmTaskEnvelope(rawInput)        // swarm-task-envelope.ts
  → evaluateRolePolicy(env, "builder", "edit")  // swarm-role-policy.ts
  → route(env)                              // swarm-router.ts
Builder (stub)
  → produces filesChanged + validationEvidence
Reviewer
  → evaluateReview({ env, resolvedTier, filesChanged, evidence, iteration: 0 })
                                           // swarm-review-gate.ts
MSPR adapter
  → appendMsprEntry(entry)                  // mspr-memory-adapter.ts
  → distill({ entry, review })              // mspr-memory-adapter.ts
```

The integration test asserts:

- The envelope round-trips through zod without loss.
- The role policy returns `allow` for the in-envelope edit and `block` for
  an out-of-envelope edit.
- The router returns Tier 3 for an `implementation` + `app_local` envelope.
- The reviewer returns `pass` on a clean slice and `blocked` on a slice
  that touches `web/`.
- The MSPR file is created, the temp file is gone, and the frontmatter
  parses back to the original `MsprEntry`.
- `distill` appends at least one bullet to `agent_memory.md` and signs it
  with `distilledFrom: <entry.id>`.

### Test discipline

- No `.env*` file is read or written by any test (per ADR-0020 guardrails).
- The integration test uses a `memfs` (or a temp directory cleaned up in
  `afterEach`) for the logbook and memory file.
- The test suite is deterministic: no real network, no real Supabase, no
  real Vercel.
- A test that needs to read a fixture from `tests/fixtures/` must not
  touch any path under `web/`, `prisma/`, `apps/`, or `src/` outside the
  runtime itself.

## Cross-references

- `ADR-0020` (proposed) — the decision that authorizes this slice.
- `docs/agent-team/README.md` — directory overview, scope of the governance contract, next-gate framing.
- `docs/agent-team/swarm_roles.md` — three roles, allowed modes, hard limits, autonomy tiers.
- `docs/agent-team/swarm_policy.md` — always-block and always-review-required lists, policy hooks, policy versioning.
- `docs/agent-team/swarm_task_routing.md` — routing table and scope-layer modifiers.
- `docs/agent-team/swarm_review_gate.md` — verdict vocabulary, scorecard, bounded rework loop, reviewer hard limits.
- `docs/agent-team/mspr_logbook.md` — MSPR field semantics, retention, what never goes in an entry.
- `docs/agent-team/mspr_schema.json` — JSON Schema for an MSPR entry (source of truth for `MsprEntrySchema`).
- `docs/agent-team/swarm_task_envelope.schema.json` — JSON Schema for the envelope (source of truth for `SwarmTaskEnvelopeSchema`).
- `docs/agent-team/agent_memory.md` — sections and distillation rules.
- `AGENTS.md` — repo-local authority, evidence language, stop conditions.

## Next gate

A human owner reviews this design document and ADR-0020 together and either:

1. **Accepts both.** Flip `ADR-0020` from `Status: proposed` to `Status: accepted`. The implementation slice may then create the five files under `src/agent-team/`, the matching vitest test files, and the small `vitest.config.ts` `include` extension.
2. **Returns for rework.** Route the design back to the Orchestrator with a new envelope (an updated `docs/agent-team/runtime-design.md` and a follow-up MSPR entry under `mspr_logbook/`). The runtime slice is not started until the design is accepted.

After acceptance, the smallest safe next slice is the `swarm-task-envelope.ts` module plus its unit test, gated by its own MSPR entry. The remaining four modules land in separate MSPR-gated slices, in the order: envelope → role policy → router → review gate → memory adapter. The MSPR logbook is the source of truth for "what is done, what is next".
