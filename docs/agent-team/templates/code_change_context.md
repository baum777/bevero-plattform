# MSPR Entry — <slice title>

- id: <uuid-or-local-hash>
- timestamp: <ISO-8601>
- runId: <run/session id>
- agentRole: orchestrator | builder | reviewer
- taskType: read_only_audit | docs_spec | implementation | bugfix | refactor | test_validation | governance_change | ci_build_change | infra_db_change | security_sensitive | destructive_operation

## Scope

- layer: docs_only | package_local | app_local | cross_package | runtime_core | governance_policy | infra_database | ci_deployment | production_sensitive
- pathsInScope:
  - <path>
- pathsOutOfScope:
  - <path>
- autonomyTier: 0 | 1 | 2 | 3 | 4

## Code Change Context

- Trigger/request:
- Why the change was needed:
- Files read:
  - <path>
- Files changed:
  - <path>
- Commands run:
  - `<command>` → pass | fail | not_run
- Validation results:
  - <result>

## Memory

- newFindings:
  - <finding>
- reusableRules:
  - <rule>
- gotchas:
  - <gotcha>

## Review

- status: pass | needs_rework | blocked | approval_required
- risks:
  - <risk>
- scorecard:
  - outcomeQuality: 0-5
  - scopeDiscipline: 0-5
  - safety: 0-5
  - evidenceQuality: 0-5
  - sideEffects: 0-5
- nextGate:

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md`
