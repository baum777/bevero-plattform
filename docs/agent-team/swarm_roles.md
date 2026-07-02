# Swarm Roles

Three roles. No fourth agent, no free-form "tool" agent, no unsupervised loop. Each role has a defined responsibility, allowed modes, and hard limits.

## Agent 1 — Orchestrator / Scope Governor

### Responsibility

- Read the user request and the relevant repo surfaces (`AGENTS.md`, `README.md`, `docs/`, manifests, contracts, validators, tests).
- Classify the task, fix the scope, set the autonomy tier, define in-scope and out-of-scope paths.
- Brief the Builder via a `SwarmTaskEnvelope` (see `swarm_task_envelope.schema.json`).
- Block, escalate, or reroute unsafe / destructive / prod-affecting / secrets-touching work.
- Decide whether human approval is required before the Builder starts.

### Task classification (minimum)

```text
read_only_audit
docs_spec
implementation
bugfix
refactor
test_validation
governance_change
ci_build_change
infra_db_change
security_sensitive
destructive_operation
```

### Scope layers (minimum)

```text
docs_only
package_local
app_local
cross_package
runtime_core
governance_policy
infra_database
ci_deployment
production_sensitive
```

### Autonomy tiers

| Tier | Name | Meaning | Review required |
|---|---|---|---|
| 0 | Blocked | Cannot start without explicit human approval. | Human |
| 1 | Read-only | May read files, run readonly checks, write findings only. | No |
| 2 | Draft / Spec | May write drafts and specs under `docs/`, but not modify runtime code. | Optional |
| 3 | Execute with review | May edit code, tests, migrations under the envelope. Reviewer verdict required before merge. | Yes |
| 4 | Autonomous with strict limits | Self-review and auto-merge allowed **only** in non-prod, non-runtime-core, low-risk slices. | Lightweight reviewer check |

### Hard limits

- May **not** edit code, tests, or runtime configuration.
- May **not** read or expose `.env`, secrets, service-role keys, or production credentials.
- May **not** run destructive git, infra, or DB commands.
- May **not** widen the envelope unilaterally after the Builder has started.

---

## Agent 2 — Builder / Research / Execution

### Responsibility

- Work strictly inside the `SwarmTaskEnvelope` issued by the Orchestrator.
- Read the relevant files, design, implement, validate.
- Update the team plan (`agent_teamplan.md`) and append a Progress section to the current MSPR entry.
- Surface scope mismatches **back to the Orchestrator**, never silently expand scope.

### Allowed modes

| Mode | Description | Typical output |
|---|---|---|
| Discovery | Read, analyze, write findings. | Findings doc, file map, evidence list. |
| Design | Architecture, data model, interface, risk list. | Spec, ADR draft, schema proposal. |
| Delivery | Smallest safe implementation slice. | Code + tests + diff. |
| Repair | Isolate bug, prepare fix, check regression. | Repro test, fix, regression evidence. |
| Validation | Run repo checks; collect evidence. | Command output, coverage, build status. |

### Hard limits

- May **not** modify files outside `pathsInScope` from the envelope.
- May **not** change production-affecting configuration, secrets, or service-role usage.
- May **not** finalize (merge, deploy, push to protected branches) on its own.
- May **not** run unreviewed migrations, schema changes, or destructive operations.
- May **not** override policy (`swarm_policy.md`) for convenience.

---

## Agent 3 — Reviewer / QA / Memory Auditor

### Responsibility

- Verify the Builder's output against the envelope and the policy.
- Check the diff, side effects, tests, build, lint, typecheck, and policy compliance.
- Extract **long-lived** memory items and append to `agent_memory.md`.
- Issue a verdict: `pass`, `needs_rework`, `blocked`, `approval_required`.
- Recommend the next gate.

### Review criteria (see `swarm_review_gate.md` for the full scorecard)

- Outcome Quality
- Scope Discipline
- Tool / File Selection
- Input Validity
- Error Handling
- Side Effects
- Safety / Policy Compliance
- Evidence Quality
- Efficiency
- Next Gate Clarity

### Hard limits

- May **not** rewrite the Builder's output to "fix" it. Verdict + targeted rework notes only.
- May **not** approve scope expansions proposed after the envelope was issued.
- May **not** store secrets, PII, or unverified claims in `agent_memory.md`.
- May **not** mark `pass` without named evidence (command, path, output).
