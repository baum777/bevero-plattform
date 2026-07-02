# MSPR Logbook

MSPR is the central logbook convention for the swarm. Every slice — whether a single read-only audit, a doc draft, or a multi-file implementation — produces **at least one** MSPR entry. Per `work_documentation_rule.md`, every non-trivial slice also produces a separate Intent Memory entry under `intent_logbook/`. The entry is the durable record of what the swarm did, what it learned, and what should happen next.

## MSPR — what it stands for

| Letter | Meaning | Captured in field |
|---|---|---|
| **M** | **Memory** — what was learned, which rules or gotchas are durable. | `memory` |
| **S** | **Scope** — what was allowed, what was out of scope, which autonomy tier applied. | `scope` |
| **P** | **Progress** — what was concretely done (files read, files changed, commands run, validation results). | `progress` |
| **R** | **Review** — verdict, risks, scorecard, next gate. | `review` |

The four letters map directly to the JSON Schema in `mspr_schema.json`.

## When to write an entry

- **Always**: at the end of every slice, regardless of verdict. A `blocked` slice still gets an entry — that is the most valuable kind, because it captures a policy or authority gap.
- **Optional mid-slice updates**: the Builder may append to `progress.actionsTaken` during a long slice so that an interrupted run leaves a usable trail.

## Entry format

Entries live as `.md` files under this directory (e.g. `mspr_logbook/2026-06-08-swarm-bootstrap.md`) **or** as an append-only Markdown section in this file, depending on volume. The JSON Schema in `mspr_schema.json` is the strict form. A Markdown entry is the human-readable form and must include all required fields.

### Minimal Markdown entry template

```md
# MSPR Entry — <short slice title>

- id: <uuid or hash>
- timestamp: <ISO-8601>
- runId: <run/session id>
- agentRole: orchestrator | builder | reviewer
- taskType: <see swarm_task_routing.md>
- scope:
  - layer: <docs_only | ... | production_sensitive>
  - pathsInScope: [...]
  - pathsOutOfScope: [...]
  - autonomyTier: 0 | 1 | 2 | 3 | 4
- memory:
  - newFindings: [...]
  - reusableRules: [...]
  - gotchas: [...]
- progress:
  - actionsTaken: [...]
  - filesRead: [...]
  - filesChanged: [...]
  - commandsRun: [...]
  - validationResults: [...]
- review:
  - status: pass | needs_rework | blocked | approval_required
  - risks: [...]
  - scorecard:
    - outcomeQuality: 0-5
    - scopeDiscipline: 0-5
    - safety: 0-5
    - evidenceQuality: 0-5
    - sideEffects: 0-5
  - nextGate: <short description>
```

## Example entries

### Example A — successful bootstrap of the swarm contract

- taskType: `docs_spec`
- scope.layer: `docs_only`
- autonomyTier: 2
- review.status: `pass`
- evidence: files exist in `docs/agent-team/`, JSON Schemas parse, cross-refs resolve.

### Example B — blocked CI workflow push

- taskType: `ci_build_change`
- scope.layer: `ci_deployment`
- autonomyTier: 0
- review.status: `blocked`
- reason: PAT lacks `workflow` scope; GitHub refused push to `.github/workflows/`.
- nextGate: human to either extend the token scope or apply the diff locally.

## Required companion entry

Each MSPR entry must link its corresponding intent-memory entry:

```md
## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md`
```

If the slice is truly mechanical and has no durable intent change, the companion entry may be compact, but it must still state `no durable logic change` and explain why.

## What never goes in an entry

- Secrets, API keys, service-role tokens, OAuth tokens.
- Customer data, PII, or any payload from a Supabase query.
- Unverified claims stated as fact. If something is "Inferred" or "Recommended", label it (per the evidence language in `AGENTS.md`).
- Diffs or large file dumps. Reference paths and commits instead.

## Retention

- The logbook is **append-only**. Edits to past entries are forbidden except to redact accidentally committed secrets (which must be accompanied by a follow-up entry that names the redaction).
- Entries survive across runs and are the primary input to `agent_memory.md` for distillation.
