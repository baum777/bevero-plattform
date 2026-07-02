# Agent Team — Variable 3-Agent Swarm Governance

This directory defines a **controlled, auditable, policy-bound 3-agent swarm** for the `bevero-webapp` repository. The contract follows the OrchestrAI_Labs principle: the swarm is not a free autonomous colony. Every action is gated by a scope envelope, a task class, an autonomy tier, a policy check, and a review verdict.

The goal is **safe extensibility**, not raw capability. The contract is intentionally lightweight (Markdown + JSON Schemas) and lives entirely under `docs/agent-team/`. It does not introduce a runtime, a framework, a database, or a CI change. A future runtime slice is **out of scope for this bootstrap**; see the Next Gate below.

## Scope of this directory

- Governance contracts for AI coding agents and human operators working on this repo.
- A shared vocabulary for task classification, autonomy, and review.
- An MSPR-style logbook convention for traceability of multi-agent work.
- Repo-adaptive: terms, paths, and policy hooks are aligned with this repo's actual structure (Fastify + Prisma + Supabase backend, Next.js Cockpit, German product docs, ADR-style governance under `docs/DECISIONS.md`).

## Out of scope for this directory

- Runtime code, schedulers, hooks, daemons, or background workers.
- New CI jobs, new databases, new frameworks.
- Modifications to `prisma/`, `src/`, `apps/`, `web/`, `.env*`, or any production configuration.
- Overriding `AGENTS.md` or `docs/DECISIONS.md` — this directory **extends** repo-local governance, it does not replace it.

## Architecture (one-liner)

```text
User Request
  -> Agent 1: Orchestrator / Scope Governor  (classifies, envelopes, gates)
  -> Agent 2: Builder / Research / Execution (bounded work inside envelope)
  -> Agent 3: Reviewer / QA / Memory Auditor (verdict, memory, next gate)
  -> MSPR Logbook + Agent Memory + Team Plan + Review Gate
  -> Final Result or Next Gate
```

## Contents

| File | Purpose |
|---|---|
| `swarm_roles.md` | The three agent roles: responsibilities, modes, hard limits. |
| `swarm_policy.md` | Block / escalate / review-pflichtig / freigegeben rules. |
| `swarm_task_routing.md` | Routing table from task class to autonomy tier and review requirement. |
| `swarm_review_gate.md` | Reviewer scorecard, verdict vocabulary, and gate decisions. |
| `mspr_logbook.md` | MSPR (Memory, Scope, Progress, Review) entry schema and examples. |
| `work_documentation_rule.md` | Fixed repo rule: every work slice records code-change context and separate intent memory. |
| `intent_logbook/` | Per-slice memory log for product, architecture, governance, and operating intention. |
| `templates/` | Reusable templates for MSPR and intent-memory entries. |
| `agent_teamplan.md` | Active workstreams, owners, autonomy tiers, blockers, next gate. |
| `agent_memory.md` | Working, repo, and (optional) semantic memory rules. |
| `mspr_schema.json` | JSON Schema for a single MSPR logbook entry. |
| `swarm_task_envelope.schema.json` | JSON Schema for the task envelope passed between agents. |

## How to use this directory

1. Before any non-trivial work, the Orchestrator produces a `SwarmTaskEnvelope` (see `swarm_task_envelope.schema.json`).
2. The Builder executes only inside the envelope. Out-of-envelope changes are a scope violation.
3. The Builder records code-change context in an MSPR entry per `mspr_logbook.md`.
4. The Builder or Reviewer records the separate product/architecture intention in `intent_logbook/`.
5. The Reviewer issues a verdict using `swarm_review_gate.md` and verifies both records.
6. Long-lived findings go to `agent_memory.md`. The team plan in `agent_teamplan.md` reflects current workstreams.

## Repo-adaptive notes

- Roles reference the actual owner classes from `docs/DECISIONS.md` (owner > admin > manager > staff > viewer, ADR-0015).
- Policy forbids service-role credential use in user-facing flows (consistent with `AGENTS.md`).
- The "offline queue" / "human-gated automation" framing is consistent with `docs/automation/semi-automated-operations-layer.md`.
- Memory storage is Markdown under this directory; the repo has no vector DB, so semantic retrieval is **not** implemented here.

## Next Gate

The smallest safe next step after this contract lands:

1. A human review of the seven governance files and the two JSON Schemas.
2. Optionally: a TypeScript stub for the envelope and router under `src/agent-team/`, **gated by an ADR** in `docs/DECISIONS.md` and only if a real runtime need emerges. Not pre-implemented.
3. Optionally: an MSPR entry template auto-populated by the CI bot on PR open/close.
