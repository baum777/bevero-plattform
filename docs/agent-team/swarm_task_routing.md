# Swarm Task Routing

Routing table from **task class** to **autonomy tier**, **required review**, and **mandatory validation**. The Orchestrator applies this table when building the `SwarmTaskEnvelope`. Any case not covered here defaults to **Tier 3 with full review**.

## Routing table

| Task class | Orchestrator action | Builder action | Reviewer action | Autonomy | Review required | Human approval |
|---|---|---|---|---|---|---|
| `read_only_audit` | Classify scope, list paths | Read files, write findings | Light memory check | Tier 1 | No | No |
| `docs_spec` | Set scope, target structure | Draft spec under `docs/` | Consistency check vs existing docs | Tier 2 | Optional | No |
| `implementation` | Bound the slice, name in-scope paths | Code + tests under envelope | Full diff / test / policy check | Tier 3 | Yes | No (unless infra) |
| `bugfix` | Bound the slice, require repro test | Repro test + fix | Regression + scope check | Tier 3 | Yes | No (unless prod data) |
| `refactor` | Bound the slice, name cross-package effects | Code + tests | Full diff / test / side-effect check | Tier 3 | Yes | No (unless cross-app) |
| `test_validation` | Define check surface | Add/run tests | Validate evidence | Tier 2 | Optional | No |
| `governance_change` | Trigger ADR policy check | Edit governance docs / rules | Strict scope + ADR cross-ref check | Tier 3 | Yes | Owner sign-off recommended |
| `ci_build_change` | Set risk gate | Minimal CI change | Full validation run | Tier 3 | Yes | No |
| `infra_db_change` | Recognize approval need | Only with explicit envelope | Strict scope + rollback plan | Tier 0 / 3 | Yes | **Yes** |
| `security_sensitive` | Recognize approval need | Do not execute | Escalate to human | Tier 0 | Yes | **Yes** |
| `destructive_operation` | Block and escalate | Do not execute | Escalate to human | Tier 0 | Yes | **Yes** |

## Scope layer modifiers

The Orchestrator adjusts the tier using the scope layer even within the same task class:

| Scope layer | Tier minimum | Notes |
|---|---|---|
| `docs_only` | Tier 1 | New `.md` files, no governance edits. |
| `package_local` | Tier 2 | Single npm package, no shared types. |
| `app_local` | Tier 3 | Single app, e.g. `apps/cockpit/`. |
| `cross_package` | Tier 3 | Multiple packages, contract impact. |
| `runtime_core` | Tier 3 | `src/`, `prisma/`, `api/`. Always review-required. |
| `governance_policy` | Tier 3 | `docs/agent-team/`, `AGENTS.md`, ADRs. |
| `infra_database` | Tier 0 / 3 | Schema, migration, RLS changes. |
| `ci_deployment` | Tier 3 | Workflow, Vercel, secrets in CI. |
| `production_sensitive` | Tier 0 | Anything touching prod config or data. |

## Routing examples (repo-adaptive)

### Example 1 — read-only audit of `prisma/schema.prisma`

- Task class: `read_only_audit`
- Scope layer: `infra_database` (override pulls tier up to 2 for read, but read-only stays 1)
- Autonomy: **Tier 1** (read-only, no writes)
- Review: optional, but orchestrator logs findings
- Paths in scope: `prisma/schema.prisma`, `prisma/migrations/`
- Paths out of scope: `src/`, `apps/`, `prisma/seeds/`

### Example 2 — new `InventoryItem` field in Prisma

- Task class: `implementation` (or `infra_db_change` if a migration follows)
- Scope layer: `infra_database`
- Autonomy: **Tier 3** (review-required) or **Tier 0** if migration included
- Review: full diff + migration review + rollback plan
- Paths in scope: `prisma/schema.prisma`, a single new migration
- Paths out of scope: any runtime code, any seed data

### Example 3 — doc-only spec under `docs/`

- Task class: `docs_spec`
- Scope layer: `docs_only`
- Autonomy: **Tier 2** (drafts allowed)
- Review: optional consistency check
- Paths in scope: a new subdirectory under `docs/`
- Paths out of scope: `docs/DECISIONS.md`, `AGENTS.md`, `docs/agent-team/`

### Example 4 — CI workflow fix

- Task class: `ci_build_change`
- Scope layer: `ci_deployment`
- Autonomy: **Tier 3** (full validation run)
- Review: required
- Paths in scope: `.github/workflows/`
- Paths out of scope: `package.json`, runtime code

## Default behavior

If the Orchestrator cannot classify the request with confidence, the **default routing** is:

- Tier 3, full review, no human approval (unless the scope layer forces Tier 0).
- The Orchestrator must record the classification uncertainty in the MSPR `memory.gotchas` field so future runs can refine the table.

## Routing changes

Changes to the routing table itself are a `governance_change` and require an ADR in `docs/DECISIONS.md`. The Reviewer is expected to reject any routing change that lacks an ADR reference.
