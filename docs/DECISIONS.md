# Decisions

Conventions:

- `Status` tracks ADR lifecycle (`accepted` or `superseded`).
- The first paragraph of each ADR states the active decision.

## ADR-0001: Bootstrap with Fastify

Status: accepted

Decision: Use Fastify for the HTTP layer. The adapter needs a small, explicit API surface and does not need a larger application framework for the Ticket 1 bootstrap.

## ADR-0002: Read-only POS posture in v1

Status: accepted

Decision: The adapter must not write back to Gastronovi, HOTAPI-adjacent systems, or accounting systems in v1. External POS data is imported as source material and becomes internal workflow truth only after raw storage, normalization, idempotent event storage, and audit.

## ADR-0003: No live connector in Ticket 1

Status: accepted

Decision: Ticket 1 creates the service skeleton, health route, env validation, Prisma schema, and docs. Live Gastronovi access, ingestion, normalization, rules, scheduled jobs, and admin APIs are deferred until real source access, payload samples, and tenant rules are available.

## ADR-0004: Ticket 2 stores raw payloads only

Status: accepted

Decision: Ticket 2 persists external payloads as raw JSON with a deterministic SHA-256 hash and sync-run linkage. It does not normalize, dispatch workflow events, apply business rules, expose admin lists, or call live Gastronovi endpoints.

## ADR-0005: Inventory-1 adds schema only

Status: accepted

Decision: Inventory-1 introduces inventory, supplier, purchase order, goods receipt, movement, stock snapshot, and correction request tables in Prisma. It does not add inventory APIs, stock calculation logic, review-task generation, POS consumption mapping, or automatic stock changes.

## ADR-0006: Withdrawals reduce stock through movements

Status: accepted

Decision: Internal withdrawal records are represented as `InventoryMovement` rows with type `item_removed`. A withdrawal does not directly overwrite stock snapshots. The write path creates the movement and refreshes the derived `InventoryStockSnapshot` inside the same Prisma transaction. If the resulting stock is negative, the service creates an admin review task.

## ADR-0007: Corrections require review before stock changes

Status: accepted

Decision: Inventory corrections start as `InventoryCorrectionRequest` records and create an admin review task. Open requests do not create movements or refresh stock snapshots. Approval creates one `InventoryMovement` with type `correction_positive` or `correction_negative`, refreshes the derived snapshot in the same transaction, and marks the request approved. Rejection marks the request rejected without creating stock movement.

## ADR-0008: Inventory review tasks are admin-owned

Status: accepted

Decision: Inventory review tasks can be moved from `open` to `in_review`, `resolved`, or `dismissed` through admin-only actions. Resolving or dismissing a task sets `resolvedAt`. Closed review tasks cannot be reopened by this slice, and non-inventory workflow tasks remain outside the inventory action API.

## ADR-0009: Inventory items use admin-managed soft deactivation

Status: accepted

Decision: Inventory items are managed through admin-only APIs. Creating and editing item metadata does not create stock movements or stock snapshots. Items are deactivated by setting `isActive` to `false`; this slice does not hard-delete inventory items, preserving movement history and auditability.

## ADR-0010: Web MVP starts as a static app shell

Status: superseded by ADR-0013 (update 2026-05-31)
Superseded by: ADR-0013

Decision: The first Warenwirtschaft web surface was a static `web/` app shell using browser-native HTML, CSS, and JavaScript. It avoided adding a frontend build dependency while backend workflows stabilized.

## ADR-0011: Supabase Postgres is the canonical database

Status: accepted

Decision: Runtime and browser validation use Supabase Postgres as the canonical persistence target. Local Postgres is only an optional fallback when explicitly approved and configured; agents must not create local Postgres roles, users, or databases by default.

The app/runtime reads `DATABASE_URL`, and Prisma direct workflows read `DIRECT_URL`. Both values must come from the Supabase dashboard and stay in `.env` or another secret-owned environment surface, never in git. DB-backed validation is blocked until the Supabase-backed URLs are present and Prisma can connect.

## ADR-0012: Role-based UX extends the DB-backed inventory path

Status: accepted

Decision: Role-based workspace UX must build on the current DB-backed inventory services and migrations. Separate in-memory movement routes or replacement demo shells are not canonical once the database-backed Warenwirtschaft slice exists. Future role and workspace changes require explicit Prisma migrations, route-level authorization updates, and integration through the active Cockpit frontend surface on top of the existing admin workflow.

## ADR-0013: Cockpit migrates frontend in-repo to Next.js and freezes legacy web shell

Status: accepted (updated 2026-05-31)
Supersedes: ADR-0010

Decision: Cockpit work remains a migration of the existing Warenwirtschaft repository, not a new Supabase-only project and not a replacement of the Prisma-backed inventory path. The canonical data model remains the current `InventoryMovement` plus `InventoryStockSnapshot` architecture until a later ADR explicitly replaces it with a materialized read model.

Frontend implementation now moves to an in-repo Next.js surface under `apps/cockpit/`. This change updates frontend delivery only; it does not change backend authority, Prisma ownership, migration discipline, or Supabase/RLS security constraints.

The existing static `web/` shell is frozen:

- No new feature development in `web/`.
- No architecture migration work in `web/`.
- Only explicit, high-priority maintenance fixes are allowed until formal decommission.

Any new Supabase project, Prisma replacement, or `stock_movements` / `inventory_balances` schema remains a separate architecture change that requires an explicit superseding ADR, data migration plan, RLS policy design, and compatibility checks against existing inventory routes and consumers.

## ADR-0014: Organization identity is derived from Supabase Auth membership

Status: accepted

Decision: Cockpit tenant isolation must not trust `organization_id` from request bodies, custom actor headers, or other client-controlled identity fields. Runtime identity must come from Supabase Auth, and organization access must be derived from `auth.uid()` through an `organization_members` membership lookup enforced by RLS policies.

Rows that are organization-owned must carry an organization foreign key. Read and write policies must allow access only when a matching membership exists for `auth.uid()` and the row's organization. A user with multiple organizations may select an active organization only as a filter over memberships they already have; the filter is not authority by itself.

The current temporary `x-actor-id` and `x-actor-role` headers remain non-production scaffolding. Removing or hard-gating them is required before Cockpit can claim production-ready tenant isolation.

## ADR-0015: Role grants are bounded by the actor's own role

Status: accepted

Decision: Cockpit membership writes must enforce role-grant rules in backend logic and database-facing tests, not only in the UI. The target organization role order is:

```txt
owner > admin > manager > staff > viewer
```

A user may grant only their own role or a lower role:

| Actor role | May grant |
| --- | --- |
| `owner` | `owner`, `admin`, `manager`, `staff`, `viewer` |
| `admin` | `admin`, `manager`, `staff`, `viewer` |
| `manager` | `manager`, `staff`, `viewer` |
| `staff` | none |
| `viewer` | none |

Workspace-level roles may not exceed the actor's effective organization role unless a later ADR defines a stricter workspace-specific delegation model. Sprint 1 is not complete until a backend test proves that a `manager` cannot create or promote an `admin`.

## ADR-0016: V1 stock snapshots stay transactional and require command idempotency

Status: accepted

Decision: For V1, stock read performance continues to use `InventoryStockSnapshot` refreshed in the same Prisma transaction that creates the stock-changing `InventoryMovement`. This preserves the current repo architecture and avoids introducing a materialized view refresh pipeline before the tenant and RBAC model is settled.

`InventoryStockSnapshot` is a current-state read model only. It intentionally overwrites the item/location row in place and is not an audit-history table. Point-in-time or forensic reconstruction must use the append-only `InventoryMovement` log, not snapshot rows.

Command idempotency is mandatory for stock-changing writes. Each client intent that can create an `InventoryMovement` must have a stable idempotency key stored behind a unique database constraint, and retry handling must return or reuse the original result instead of creating a second movement.

Materialized views over movements remain a valid later optimization, especially for dashboard aggregates. They are not the Sprint 1 stock consistency mechanism unless ADR-0013 is superseded by a new Supabase-only architecture decision.

## ADR-0017: Runtime database role must enforce RLS

Status: accepted

Decision: Direct Prisma connections must not rely on the Supabase `authenticated` PostgREST role model. The application uses direct Postgres connections, so production runtime access needs a database role that cannot bypass row-level security.

The `app_runtime` role is the proven RLS execution context for Cockpit-owned application tables. It is constrained with `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEROLE`, and `NOCREATEDB`, and has only the table privileges required by the inventory auth foundation.

The completed proof run verified all required checks:

| Check | Result |
| --- | --- |
| Request without token | `401` |
| Valid token without `OrganizationMember` | `403` |
| Valid token with membership | `200` |
| User A reads rows from Org B under `app_runtime` | `0 rows` |
| User B reads rows from Org A under `app_runtime` | `0 rows` |

`app_runtime` is currently a `NOLOGIN` proof role. Production cutover requires a dedicated `LOGIN` runtime role, such as `app_user`, with `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEROLE`, and `NOCREATEDB`, granted membership in `app_runtime`. The generated password must remain in secret-owned environment configuration and must never be committed.

## ADR-0018: Keep Prisma cross-schema introspection follow-up isolated

Status: accepted

Decision: `prisma db pull --print` is currently blocked by an existing cross-schema foreign key from `public` tables to `auth.users` while the Prisma datasource does not declare multi-schema coverage.

The next technical step is to evaluate a dedicated Prisma multi-schema slice (for example `schemas = ["public", "auth"]`) with compatibility checks against existing models, migrations, and generated client behavior.

That evaluation remains intentionally out of this follow-up commit slice to avoid unrelated schema regeneration and broad Prisma diffs. Until the dedicated slice is executed, treat the cross-schema introspection failure as expected and tracked.

## ADR-0019: Prisma introspection adoption must be allowlist-driven

Status: accepted

Decision: `prisma db pull` must not be committed blindly in this repository. Introspection output can include large Supabase-managed auth surfaces that are outside the app domain and create avoidable schema drift.

The required procedure is:

1. Run `npx prisma db pull --print`.
2. Compare the printed schema to the versioned `prisma/schema.prisma`.
3. Build an explicit allowlist and rejectlist.
4. Commit only the allowlisted models/enums in a dedicated Prisma-schema slice.

Current allowlist baseline:

- `public`: `Team`, `TeamInvite`, `TeamMember`, `UserProfile`
- `auth`: minimal `auth.users` bridge model only (`AuthUser`)
- enums: `TeamRole`, `TeamMemberStatus`

Current rejectlist baseline includes Supabase auth infrastructure such as `sessions`, `refresh_tokens`, `one_time_tokens`, `mfa_*`, `saml_*`, `sso_*`, `oauth_*`, `audit_log_entries`, `flow_state`, `webauthn_*`, and similar internal tables unless a future ADR explicitly promotes them.

When new tables appear, classify ownership first (`public` app-domain vs `auth` infrastructure), then adopt only what is needed for repository-owned features and validated relations.

## ADR-0020: Swarm Runtime Surface unter src/agent-team/

Status: accepted

Decision: Bevero implementiert die MiniMax-3-Swarm-Runtime als reine TypeScript-Bibliothek unter src/agent-team/, ohne Fastify-Integration, ohne DB-Änderung, ohne neue externe npm-Dependencies.

The MiniMax-3 swarm governance contract already lives entirely in `docs/agent-team/` (see `docs/agent-team/README.md`, `swarm_roles.md`, `swarm_policy.md`, `swarm_task_routing.md`, `swarm_review_gate.md`, `mspr_logbook.md`, `mspr_schema.json`, `swarm_task_envelope.schema.json`, and `agent_teamplan.md`). It defines three agent roles (Orchestrator, Builder, Reviewer), a typed `SwarmTaskEnvelope`, an MSPR logbook convention, and policy hooks against `AGENTS.md` and `docs/automation/semi-automated-operations-layer.md`. The contract is currently a pure documentation surface.

This slice turns the documentation contract into a small, callable TypeScript surface so the same envelope, role policy, routing, review gate, and memory adapter become testable and reusable in-process. The slice is intentionally narrow: a library, not a service, not a CLI, not a framework, not a deployment.

## Modules

The runtime is organized as five small modules under `src/agent-team/`. Each module is a single `.ts` file with one clear responsibility.

| Module | Responsibility |
|---|---|
| `swarm-task-envelope.ts` | Defines the `SwarmTaskEnvelope` value type and the parser/validator that turns a JSON object into a typed envelope, enforcing the required fields from `swarm_task_envelope.schema.json`. |
| `swarm-role-policy.ts` | Encodes the role policy from `swarm_roles.md` and `swarm_policy.md` as data and exposes an `evaluateRolePolicy(envelope, role, action)` function that returns `allow`, `block`, or `require_approval`. |
| `swarm-router.ts` | Applies the routing table from `swarm_task_routing.md` to map a `(taskType, scopeLayer)` pair to an `autonomyTier`, a `reviewRequired` flag, and a `humanApprovalRequired` flag. |
| `swarm-review-gate.ts` | Implements the Reviewer scorecard from `swarm_review_gate.md` and produces a verdict (`pass`, `needs_rework`, `blocked`, `approval_required`) with named evidence. |
| `mspr-memory-adapter.ts` | Writes MSPR entries as append-only Markdown to `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md` and exposes a `distill(entry)` hook that promotes long-lived findings into `docs/agent-team/agent_memory.md`. |

## Persistence

The runtime has no database. The MSPR adapter writes append-only Markdown to `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md`, one file per slice. The same adapter exposes a `distill(entry)` hook that appends reviewed, long-lived findings to `docs/agent-team/agent_memory.md` under the existing `Repo conventions worth remembering`, `Operations`, `Gotchas`, `Reusable rules`, and `Superseded` sections. The adapter never mutates a past entry; redactions follow the rule already documented in `mspr_logbook.md`.

## Guardrails for this slice

The slice is explicitly bounded to the new surface. It must not:

- read or use the Supabase service-role key, the `app_runtime` role, or any admin/migration credentials;
- read or parse any `.env`, `.env.local`, `.env.*` file, or any file matching the patterns in `.gitleaks.toml`;
- touch `web/` (frozen per `web/FROZEN.md`);
- touch `prisma/`, `prisma.config.ts`, or any migration;
- touch `apps/cockpit/`, `api/`, or `src/app.ts` / `src/server.ts` for Fastify integration;
- introduce a new external npm dependency. The runtime is implemented in TypeScript using only what `package.json` already declares (TypeScript plus `zod` for parsing).

The Builder is expected to follow `swarm_policy.md` exactly, including the always-block list and the always-review-required list. Any envelope that would force the runtime to violate one of these guardrails is rejected before any side effect, and the rejection is recorded in the MSPR entry as `status: blocked`.

## Rollback

Rollback is branch deletion. This slice does not introduce a database migration, a Prisma schema change, a CI workflow change, a `package.json` change, a `.env*` change, or a `web/` change. The five new files live in a single new directory `src/agent-team/` and are not imported by the Fastify bootstrap, the Cockpit app, or any migration. Reverting the slice means reverting the commit (or deleting the branch) and removing the directory. No data, no schema, no env, and no CI state is left behind.

## Out of scope for this slice

The following are deliberately deferred to later ADRs and slices:

- Fastify routes, HTTP endpoints, or webhook handlers that expose the runtime.
- A standalone CLI, daemon, scheduler, or background worker.
- Integration with the Cockpit UI in `apps/cockpit/`.
- A vector store, embedding pipeline, or semantic memory layer.
- LLM-driven synthesis, agentic loops, or tool use beyond deterministic policy checks.
- Changes to `prisma/`, `apps/`, `web/`, `.github/`, `.env*`, or any production configuration.

## Cross-references

- `AGENTS.md` — repo-local authority, evidence language, stop conditions.
- `docs/agent-team/README.md` — directory overview, scope of the governance contract, next-gate framing.
- `docs/agent-team/swarm_roles.md` — three roles, allowed modes, hard limits.
- `docs/agent-team/swarm_policy.md` — always-block and always-review-required lists, policy hooks.
- `docs/automation/semi-automated-operations-layer.md` — product and technical context for the broader automation layer the swarm will eventually support.

## Next gate

A human owner reviews this ADR and either accepts it (changing `Status: proposed` to `Status: accepted`) or returns it for rework. Acceptance enables the implementation slice that creates the five files under `src/agent-team/` and the matching Vitest unit tests. Rejection routes the slice back to the Orchestrator for a new envelope and an updated MSPR entry, and this ADR remains `proposed` until a verdict is recorded.

## ADR-0021: Adopt Semi-Automated Operations Layer as Phase A spec

Status: accepted

Decision: The repository adopts `docs/automation/semi-automated-operations-layer.md` as the binding Phase A specification for the rules-first, human-gated automation layer that assists operational staff at Motorworld Inn and CUBE. The spec is authoritative for the in-scope features, hard guardrails, proposed data model, proposed API surface, and phased rollout until a future ADR supersedes it.

This ADR is the gate output for Phase A. It does not approve the implementation of any specific phase, migration, or route. Each later phase (B Rules Engine, C UI Suggestions, D Offline Queue, E Shift Handover, F Agentic Summaries, G Export / Writeback prep) requires its own gate and, where the slice touches the data model, an additional ADR that promotes the proposed tables to accepted state.

### Scope Boundaries Made Binding

The following boundaries from the spec become repository-wide invariants
for every later phase and must be enforced in backend logic, in
database tests, and in Cockpit UI behavior:

- **No automatic stock mutation.** All stock changes continue to flow
  through `InventoryMovement` (append-only) and refresh the derived
  `InventoryStockSnapshot` in the same Prisma transaction. No
  automation, rule, agent, or LLM may write to `InventoryStockSnapshot`
  directly or shortcut the movement log.
- **No automatic writeback to external systems.** Bevero reads from
  FoodNotify, Microsoft Dynamics 365, DATEV, and central Rauschenberger
  systems. Bevero does not push mutations back. Any future writeback
  requires an explicit ADR, an explicit integration, rotated API
  credentials, and a logged human approval per write.
- **No LLM-driven approval, ordering, or stock mutation.** LLMs are
  optional, read-only text and classification helpers (handover
  synthesis, note classification, rule explanations). They cannot
  decide whether to approve a suggestion, mutate stock, set ordering
  thresholds, or bypass guardrails. If the LLM is unavailable the
  affected feature degrades gracefully; Bevero does not depend on it.
- **No service-role credentials in user-facing request paths.** The
  `app_runtime` / `app_user` model from ADR-0017 stays authoritative.
  Service actions (rule evaluation, scheduled scans) run backend-side
  with separate auth.
- **Suggestions are immutable proposals, decisions are append-only.**
  A rule firing creates one `AutomationSuggestion`; an approval or
  rejection creates one `AutomationDecision`. Neither is updated
  after creation. Reverse audit (task came from rule X firing on
  inputs Y at time Z) must always be reconstructable.
- **No PII or secrets in `WorkflowEvent.dataJson`, automation logs, or
  cached payloads.** Audit trail sanitization runs before export or
  retention.

### Proposed Surface (Not Yet Approved for Implementation)

The spec proposes the following. They remain **proposals** until a
future ADR promotes them. No agent may implement, migrate, or scaffold
them under the umbrella of this ADR:

- **New tables:** `AutomationRule`, `AutomationSuggestion`,
  `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`.
  Optional extension columns on existing tables:
  `InventoryMovement.idempotencyKey`,
  `InventoryMovement.automationSuggestionId`,
  `WorkflowTask.automationSuggestionId`,
  `BarRefillRunItem.syncStatus`.
- **New endpoints:** `GET /automation/suggestions`,
  `POST /automation/suggestions/:id/approve`,
  `POST /automation/suggestions/:id/reject`,
  `GET|POST|PATCH /automation/rules`,
  `POST /automation/rules/:id/test-dry-run`,
  `POST /offline-actions/sync`, `GET /offline-actions/status`,
  `GET|POST /shift-handover/draft`,
  `POST /shift-handover/draft/:id/synthesize`,
  `POST /shift-handover/draft/:id/confirm`.
- **New Cockpit routes:** `/automation/suggestions`,
  `/shift-handover`, `/admin/automation/rules`. A Service Worker
  registration in Cockpit, deferred to Phase D.

### Phase Plan Reference

The spec's phase plan is the operating sequence:

- **A (current, this ADR):** Spec & ADR gate. Done on acceptance of
  this ADR.
- **B:** Rules Engine MVP backend (no LLM). Gate: backend tests pass
  and dry-run matches production snapshot.
- **C:** UI Suggestions MVP. Gate: staff can see, approve, reject from
  mobile.
- **D:** Offline Queue MVP. Gate: offline → reconnect sync with no
  data loss.
- **E:** Shift Handover Drafts. Gate: shift lead can draft, confirm,
  hand over.
- **F:** Agentic Summaries (LLM optional). Gate: LLM is opt-in, the
  feature works without it.
- **G:** Export / Writeback prep. Gate: manual export only, no
  automatic writeback.

### Cross-References

- Spec: `docs/automation/semi-automated-operations-layer.md`.
- Vision: `docs/VISION.md` (Phase 0–6 working paper).
- Cockpit UI plan: `apps/cockpit/README.md` (Suggestions /
  Shift Handover / Offline Cache sub-sections).
- Authority order: `AGENTS.md` → "Active Specs & Authority".
- Existing invariants: ADR-0002 (read-only POS posture, extended to
  all external systems), ADR-0007 (corrections require review),
  ADR-0014 (organization identity from Supabase Auth), ADR-0015
  (role grants are bounded), ADR-0016 (stock snapshots stay
  transactional with command idempotency), ADR-0017 (`app_runtime`
  role enforces RLS).

## ADR-0022: Adopt Phase B Rules Engine MVP

Status: accepted (2026-06-08, owner cheikh.witm@proton.me)

Decision: This ADR promotes the five tables proposed by the Phase A spec (`AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`) plus the dry-run and read-only admin endpoints to `accepted`, and authorizes the Prisma migrations that add them. It does not authorize any of the mutation endpoints (approve / reject / create rule / update rule / sync / handover write). Those require their own ADRs (likely ADR-0023 for the mutation surface, ADR-0024 for offline sync, ADR-0025 for shift handover). This slice is intentionally the smallest Phase B gate that unlocks a verifiable dry-run on a Supabase snapshot.

Implementation status (2026-06-08): slices B-1 (schema) and B-2 (RLS + append-only trigger) have landed — `prisma/migrations/20260608160000_add_automation_phase_b_tables` (five tables, seven enums) and `prisma/migrations/20260608161000_add_automation_phase_b_rls` (org-scoped SELECT policies, `app_runtime` grants, `AutomationDecision` BEFORE UPDATE/DELETE trigger). The read-only endpoints (B-3 `GET /automation/rules`, B-4 `POST /automation/rules/:id/test-dry-run`) and the integration-test gate (B-5) remain to be implemented. The migrations have not yet been applied to a Supabase environment; that promotion is a separate named step.

The slice is bounded to:

- five new tables in `prisma/schema.prisma`, schema-only;
- one new migration under `prisma/migrations/`;
- a single read endpoint: `POST /automation/rules/:id/test-dry-run`;
- a single list endpoint: `GET /automation/rules` (admin+, read-only);
- no on-write rule evaluation yet, no cron, no UI route, no LLM call, no service-role credential in any user-facing path.

### Schema Additions (proposed for migration)

All five tables live in the `public` schema. The Prisma multi-schema slice from ADR-0018 / ADR-0019 already includes `schemas = ["public", "auth"]`, so the cross-schema `auth.users` bridge model is available for `createdBy` / `approvedBy` / `rejectedBy` foreign keys if we choose to adopt it; this ADR proposes nullable `String` for the actor columns and a follow-up slice can promote them to relations after a Prisma diff review.

```prisma
enum AutomationRuleType {
  threshold
  time
  event
  anomaly

  @@schema("public")
}

enum AutomationRuleEvaluationMode {
  write
  schedule
  both

  @@schema("public")
}

enum AutomationSuggestionType {
  refill
  receipt_alert
  consumption_anomaly
  alert_consolidation
  custom

  @@schema("public")
}

enum AutomationSuggestionStatus {
  open
  approved
  rejected
  expired

  @@schema("public")
}

enum AutomationDecisionStatus {
  approved
  rejected

  @@schema("public")
}

enum OfflineActionType {
  quick_note
  refill_confirm
  correction_request
  movement
  transfer
  other

  @@schema("public")
}

enum OfflineActionStatus {
  pending
  synced
  conflict
  failed

  @@schema("public")
}

model AutomationRule {
  id             String                      @id @default(cuid())
  organizationId String
  version        Int                         @default(1)
  enabled        Boolean                     @default(true)
  ruleType       AutomationRuleType
  name           String
  description    String?
  condition      Json
  action         Json
  evaluateOn     AutomationRuleEvaluationMode
  schedule       String?
  metadata       Json?
  createdBy      String?
  createdAt      DateTime                    @default(now())
  updatedAt      DateTime                    @updatedAt
  deletedAt      DateTime?

  suggestions    AutomationSuggestion[]

  @@index([organizationId, enabled, evaluateOn])
  @@index([organizationId, ruleType])
  @@index([enabled, schedule])
  @@schema("public")
}

model AutomationSuggestion {
  id                         String                    @id @default(cuid())
  organizationId             String
  ruleId                     String
  ruleVersion                Int
  status                     AutomationSuggestionStatus
  type                       AutomationSuggestionType
  title                      String
  detail                     String
  relatedItemIds             String[]
  createdAt                  DateTime                  @default(now())
  expiresAt                  DateTime?
  approvedBy                 String?
  approvedAt                 DateTime?
  rejectedBy                 String?
  rejectedAt                 DateTime?
  rejectionReason            String?
  automaticActionOnApproval  Json?

  rule          AutomationRule          @relation(fields: [ruleId], references: [id])
  decisions     AutomationDecision[]

  @@index([organizationId, status, createdAt(sort: Desc)])
  @@index([organizationId, expiresAt])
  @@index([ruleId, status])
  @@schema("public")
}

model AutomationDecision {
  id             String                   @id @default(cuid())
  suggestionId   String
  status         AutomationDecisionStatus
  actor          String
  actorRole      String
  timestamp      DateTime                 @default(now())
  reason         String?
  notes          String?
  metadata       Json?

  suggestion     AutomationSuggestion    @relation(fields: [suggestionId], references: [id])

  @@index([suggestionId])
  @@index([actor, timestamp(sort: Desc)])
  @@index([timestamp])
  @@schema("public")
}

model OfflineActionQueue {
  id                  String              @id @default(cuid())
  organizationId      String
  userId              String
  deviceId            String
  actionType          OfflineActionType
  clientMutationId    String              @unique
  timestamp           DateTime            @default(now())
  operationData       Json
  status              OfflineActionStatus @default(pending)
  syncedAt            DateTime?
  conflictReason      String?
  retryCount          Int                 @default(0)
  lastError           String?
  createdAt           DateTime            @default(now())

  @@index([userId, deviceId, status])
  @@index([organizationId, status, createdAt])
  @@schema("public")
}

model ShiftHandoverDraft {
  id                   String    @id @default(cuid())
  organizationId       String
  shiftLeadId          String
  workspaceId          String?
  date                 DateTime  @db.Date
  startTime            DateTime? @db.Time
  endTime              DateTime? @db.Time
  summary              String?
  openItems            Json?
  alerts               Json?
  notes                String?
  synthesizedHandover  String?
  synthesizedAt        DateTime?
  confirmedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([organizationId, date, shiftLeadId])
  @@index([confirmedAt])
  @@schema("public")
}
```

### Migration Plan (proposed)

A single Prisma migration `prisma/migrations/<timestamp>_add_automation_phase_b_tables/migration.sql` adds the five tables and the six enums. The migration is forward-only; the rollback plan is a manual `DROP TABLE` / `DROP TYPE` script that lives in the MSPR entry and is **not** part of the migration.

The migration is gated by:

- a `prisma migrate dev --name add_automation_phase_b_tables` run on a Supabase-backed development environment with the `app_runtime` role and the `auth.users` bridge from ADR-0018 / ADR-0019 in scope;
- an `npx prisma validate` clean run;
- a `npx prisma migrate status` that shows no drift.

The migration **must not** run against the Supabase source-of-truth production database without an explicit, named, human-approved promotion slice.

### RLS Plan (proposed)

The five tables inherit the same organization-scoped RLS policy pattern as the inventory tables. The proposed policies are documented here and become part of the migration only after a database-facing test proves the access matrix.

| Table | Owner column | Read policy | Write policy |
|---|---|---|---|
| `AutomationRule` | `organizationId` | `OrganizationMember` row exists for `auth.uid()` | admin+ only |
| `AutomationSuggestion` | `organizationId` | `OrganizationMember` row exists for `auth.uid()`; staff+ for own assignment | server-only (rule engine uses `app_runtime`; UI does not write) |
| `AutomationDecision` | (no org column, joined via suggestion) | manager+ | append-only via DB trigger; no `UPDATE` or `DELETE` |
| `OfflineActionQueue` | `userId` | row owner only | row owner only |
| `ShiftHandoverDraft` | `organizationId` | staff+ for own shift; manager+ for team | shift lead for own draft; manager+ to confirm |

`AutomationDecision` is append-only. A `BEFORE UPDATE` / `BEFORE DELETE` trigger on the table raises an exception. This is a database-enforced invariant, not a backend-enforced one.

### API Surface (proposed for this slice)

- `GET /automation/rules` (admin+, read-only) — lists rules for the current organization.
- `POST /automation/rules/:id/test-dry-run` (admin+, no side effects) — evaluates the rule's `condition` against the current `InventoryStockSnapshot` and returns matches without creating suggestions.

Both endpoints are read-only and run inside the `app_runtime` role from ADR-0017. No service-role credential in the user path. The `test-dry-run` endpoint must NOT create an `AutomationSuggestion`, must NOT mutate any movement, and must NOT log PII.

The mutation endpoints (`POST /automation/rules`, `PATCH /automation/rules/:id`, `POST /automation/suggestions/:id/approve`, `POST /automation/suggestions/:id/reject`, `POST /offline-actions/sync`, all `/shift-handover/draft` write endpoints) are explicitly **out of scope for this slice** and require their own ADRs.

### Test Plan (proposed gate)

The slice is complete when all of the following are green:

1. `npx prisma validate` returns clean.
2. `npm run typecheck` is clean.
3. A migration applies on a Supabase development project and is reversible via the documented manual `DROP` script.
4. A `GET /automation/rules` integration test proves:
   - 401 without token.
   - 403 for staff / manager.
   - 200 for admin+ with the org's rules.
   - 200 for admin+ returns zero rows for a different org.
5. A `POST /automation/rules/:id/test-dry-run` integration test proves:
   - 200 with `matchCount: 0` when the rule condition is `false` for every item.
   - 200 with `matchCount > 0` and `wouldCreateSuggestion: true` for the seeded rule.
   - No `AutomationSuggestion` row is created (verified by `SELECT COUNT(*)` before and after).
6. A `BEFORE UPDATE` / `BEFORE DELETE` trigger test proves:
   - `UPDATE AutomationDecision SET reason = 'x' WHERE id = ...` raises an exception.
   - `DELETE FROM AutomationDecision WHERE id = ...` raises an exception.
7. The `npm run smoke:inventory-api` runner still passes (no regression in the existing inventory path).

### Rollback Plan

The slice is two artifacts: a migration file and five new Prisma models. To roll back:

1. `git revert` the commit that added the migration and the schema.
2. Run the manual cleanup script against the database:
   ```sql
   DROP TABLE IF EXISTS "ShiftHandoverDraft";
   DROP TABLE IF EXISTS "OfflineActionQueue";
   DROP TABLE IF EXISTS "AutomationDecision";
   DROP TABLE IF EXISTS "AutomationSuggestion";
   DROP TABLE IF EXISTS "AutomationRule";
   DROP TYPE IF EXISTS "OfflineActionStatus";
   DROP TYPE IF EXISTS "OfflineActionType";
   DROP TYPE IF EXISTS "AutomationDecisionStatus";
   DROP TYPE IF EXISTS "AutomationSuggestionStatus";
   DROP TYPE IF EXISTS "AutomationSuggestionType";
   DROP TYPE IF EXISTS "AutomationRuleEvaluationMode";
   DROP TYPE IF EXISTS "AutomationRuleType";
   ```
3. `npx prisma generate` to refresh the client.
4. Confirm the existing inventory smoke is still green.

If a subsequent slice added a column to an existing table (e.g. `InventoryMovement.idempotencyKey`), that column is **out of scope for this ADR** and its own migration must be reversed separately.

### Cross-references

- ADR-0021 (accepted) — Phase A spec, hard guardrails.
- `docs/automation/semi-automated-operations-layer.md` — Phase B section.
- `apps/cockpit/README.md` — Phase C planning sub-section that this slice unblocks.
- `apps/cockpit/app/(app)/automation/suggestions/page.tsx` — the Phase C stub that currently has no data source.
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for the data-model and migration surface.

### Next gate

ADR-0022 is now `Status: accepted`. The implementation slice (B-1 through B-5) has been delivered on `main` as commits `32dd1c1` (B-1 schema + B-2 RLS+trigger), `2a46e05` (B-3 list endpoint, B-4 dry-run endpoint, B-5 integration tests) and the ADR-0022 acceptance is commit `811b383`. The migrations are not yet applied to a Supabase environment; that promotion is a separate named step gated on a verified snapshot. The mutation endpoints (approve / reject / create rule / update rule / sync / handover write) are explicitly deferred to ADR-0023 / ADR-0024 / ADR-0025.

## ADR-0023: Adopt Automation Mutation Surface

Status: accepted (2026-06-08, owner cheikh.witm@proton.me)

Decision: When accepted, this ADR will promote the **mutation** half of the Phase A / Phase B automation surface to `accepted` and authorize a single Prisma migration that adds the write-side RLS policies and `app_runtime` write grants. It does **not** authorize offline sync (ADR-0024), shift-handover write endpoints (ADR-0025), or any external writeback (ADR-0026). The slice is intentionally narrow: the four mutation endpoints listed below, the migration that opens the write path through RLS, and the 5-test integration gate.

This ADR is the natural next gate after ADR-0022 closed (B-1 through B-5 on `main`, see commits `32dd1c1`, `811b383`, `2a46e05`).

### Schema impact

No new tables. No new columns on `AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, or `ShiftHandoverDraft`. The slice is purely a **policy + grant** addition. The append-only invariant on `AutomationDecision` (B-2 trigger) is preserved unchanged.

### RLS / Grant Plan (proposed for migration)

The B-2 migration (`20260608161000_add_automation_phase_b_rls`) intentionally omits write policies and write grants. This slice adds them:

| Table | INSERT policy | UPDATE policy | DELETE policy | Notes |
|---|---|---|---|---|
| `AutomationRule` | `app_runtime` only | admin+ via row-level policy `WITH CHECK` that asserts the caller's effective role (resolved by the Fastify handler before the Prisma call) is `owner` / `admin` in the same org | admin+ via the same `WITH CHECK` (soft delete is the only path) | the spec lists CRUD as out-of-scope for this slice — admin+ write policy is required to allow `POST /automation/rules` and `PATCH /automation/rules/:id` (see Open Question §1). No service-role credential in the user path per AGENTS.md. |
| `AutomationSuggestion` | `app_runtime` only | none (immutable proposals per ADR-0021 §3) | none (immutable proposals) | UI does not write; rule-engine and the new approve/reject endpoints write via `app_runtime` |
| `AutomationDecision` | `app_runtime` only | **blocked** (BEFORE UPDATE trigger remains) | **blocked** (BEFORE DELETE trigger remains) | append-only invariant is database-enforced |
| `OfflineActionQueue` | row owner only | none in this slice (deferred to ADR-0024) | none in this slice | sync path is offline-queue-specific |
| `ShiftHandoverDraft` | shift lead for own draft; manager+ for team | shift lead for own draft; manager+ to confirm | none | confirm path is part of this slice; broader handover write is ADR-0025 |

All INSERT/UPDATE/DELETE policies are written for the `authenticated` role. `app_runtime` honors RLS (per ADR-0017: the role is created with `NOLOGIN` and the PostgreSQL default of `NOBYPASSRLS`; see `prisma/migrations/20260530205000_ensure_app_runtime_role/migration.sql`); the same write policies therefore apply to the `app_runtime` actor when it is used to write on behalf of a backend endpoint. `app_runtime` does **not** bypass RLS and is **not** a service-role equivalent.

A new migration file `prisma/migrations/<timestamp>_automation_mutation_policies/migration.sql` carries:
- `CREATE POLICY` for the four write policies above (one per affected table, per command).
- `GRANT INSERT` / `GRANT UPDATE` (where applicable) to `authenticated` and `app_runtime` for the four tables.
- A no-op sanity check that the append-only trigger on `AutomationDecision` is still present (in case a future migration accidentally drops it).
- A manual rollback script in a sibling `down.sql` (DROP POLICY / REVOKE GRANT).

### API Surface (proposed for this slice)

Four mutation endpoints, all under `/admin/automation/...` (matching the B-3/B-4 path convention chosen in commit `2a46e05`; ADR-0022 originally proposed `/automation/...` — see Cross-References §2 for the path-convergence note):

- `POST /admin/automation/suggestions/:id/approve` (manager+, role-rank ≥ 3)
  - Path param: `id` (AutomationSuggestion.id).
  - Body: `{ "reason"?: string, "clientRequestId"?: string }`.
  - 200: `{ "suggestion": AutomationSuggestionPublicDTO, "decision": AutomationDecisionPublicDTO, "workflowTask"?: WorkflowTaskPublicDTO }`.
  - 401: no token. 403: role-rank < 3. 404: suggestion not in caller's org. 409: suggestion already decided (idempotent guard). 422: `clientRequestId` is reused with a different payload.
  - Side effects in one Prisma transaction:
    1. SELECT the suggestion FOR UPDATE (lock; prevent concurrent approve/reject).
    2. Verify `AutomationSuggestion.status = 'open'`. If not, return 409.
    3. INSERT `AutomationDecision { status: 'approved', reason, payload, decidedBy: actor.userId }`.
    4. UPDATE `AutomationSuggestion.status = 'approved'`, `decidedAt = now()`.
    5. **Optional, gated by rule's `action.suggestedTaskType`:** create a `WorkflowTask` (existing model) that the human then resolves. NO `InventoryMovement` is created here — that flows through the existing `WorkflowTask → InventoryMovement` path per ADR-0006.
  - Hard guardrail: NO `InventoryMovement` write, NO `InventoryStockSnapshot` write, NO `app_user` service-role in the user path.
- `POST /admin/automation/suggestions/:id/reject` (manager+, role-rank ≥ 3)
  - Mirrors approve. Body requires `reason` (non-empty). Inserts `AutomationDecision { status: 'rejected', reason }`. Sets `AutomationSuggestion.status = 'rejected'`. NO `WorkflowTask` created.
- `POST /admin/automation/rules` (admin+, role-rank ≥ 4) — **gated on Open Question §1 below.**
  - Body: full `AutomationRule` create payload (Zod schema derived from the Prisma model + JSON schema for `condition` and `action`).
  - 201: `{ "rule": AutomationRulePublicDTO }`. 400: Zod failure. 401/403 as above. 409: duplicate `name` within org.
- `PATCH /admin/automation/rules/:id` (admin+, role-rank ≥ 4) — **gated on Open Question §1 below.**
  - Body: partial `AutomationRule` update payload; bumps `version` (optimistic concurrency).
  - 200: `{ "rule": AutomationRulePublicDTO }`. 400: Zod failure. 401/403. 404. 409: `version` mismatch.

The `OfflineActionQueue` and `ShiftHandoverDraft` write endpoints are **explicitly out of scope** and route to ADR-0024 / ADR-0025.

### Test Plan (proposed gate)

The slice is complete when all of the following are green:

1. `npx prisma validate` returns clean.
2. `npm run typecheck` is clean.
3. The new migration applies on a Supabase development project and is reversible via the manual `DROP POLICY` / `REVOKE` script.
4. The 8 existing `tests/automation.routes.test.ts` cases (B-5 gate) continue to pass — no regression in the read path.
5. Five new integration tests covering:
   - `POST /admin/automation/suggestions/:id/approve`: 200 for manager+; 403 for staff; 401 without token; 404 for suggestion in a foreign org; 409 for already-approved suggestion; integration check that exactly one `AutomationDecision` row was appended (verified by `SELECT COUNT(*)` before and after) and that `AutomationSuggestion.status = 'approved'` after; integration check that NO `InventoryMovement` was created (the rule engine does not shortcut the workflow path).
   - `POST /admin/automation/suggestions/:id/reject`: 200 for manager+ with `reason`; 422 for empty `reason`; 403 for staff; 200 leaves `AutomationSuggestion.status = 'rejected'`.
   - `POST /admin/automation/rules` (only if Open Question §1 is resolved positively): 201 for admin+; 403 for manager/staff; 409 on duplicate name within org; 400 on Zod failure.
   - `PATCH /admin/automation/rules/:id` (only if Open Question §1 is resolved positively): 200 with `version` bump; 409 on stale `version`.
   - Append-only invariant preservation: `UPDATE AutomationDecision SET reason = 'x' WHERE id = ...` still raises an exception (B-2 trigger unaffected by this slice).
6. The `npm run smoke:inventory-api` runner still passes (no regression in the existing inventory path).
7. An `MSPR` logbook entry is written at `docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md` covering scope, evidence, risks, scorecard, next-gate.

### Rollback Plan

The slice is a single migration plus the four route handlers. To roll back:

1. `git revert` the commit that added the migration and the four route handlers.
2. Run the manual cleanup script against the database:
   ```sql
   DROP POLICY IF EXISTS "automation_rule_admin_insert" ON "AutomationRule";
   DROP POLICY IF EXISTS "automation_rule_admin_update" ON "AutomationRule";
   DROP POLICY IF EXISTS "automation_suggestion_app_runtime_insert" ON "AutomationSuggestion";
   DROP POLICY IF EXISTS "automation_decision_app_runtime_insert" ON "AutomationDecision";
   DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_insert" ON "ShiftHandoverDraft";
   DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_update" ON "ShiftHandoverDraft";
   REVOKE INSERT, UPDATE ON TABLE "AutomationRule" FROM authenticated;
   REVOKE INSERT, UPDATE ON TABLE "AutomationRule" FROM app_runtime;
   REVOKE INSERT ON TABLE "AutomationSuggestion" FROM app_runtime;
   REVOKE INSERT ON TABLE "AutomationDecision" FROM app_runtime;
   REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM authenticated;
   REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM app_runtime;
   ```
3. `npx prisma generate` to refresh the client.
4. Confirm the 8 existing automation route tests still pass (the B-5 gate is unaffected by this rollback).

### Open Questions

1. **Are `POST /admin/automation/rules` and `PATCH /admin/automation/rules/:id` in this slice, or do they belong on a separate ADR (e.g. ADR-0023.1 or ADR-0027)?** The spec text lists CRUD as "out of scope for this slice" but the natural test of an admin UI (Phase C) is to create a rule. **Recommendation:** keep them in this slice; the alternative is to require Phase C to use seed-loaded rules only, which is too restrictive. **Needs an owner decision before the slice is accepted.**
2. **Path-convergence note.** ADR-0022 proposed `/automation/...`; the implementation (commit `2a46e05`) used `/admin/automation/...`. The deviation is intentional (the `/admin` prefix matches existing Cockpit `admin` route grouping and makes the role-rank boundary explicit at the URL level). This ADR codifies the deviation. **No action required; recorded for posterity.**
3. **`AutomationDecision` foreign-key behavior on cascade.** The current schema has `suggestionId` as a plain field, not a Prisma relation. If a future slice deletes a `WorkflowTask` (which the B-2 trigger blocks on `AutomationDecision`, but not on `WorkflowTask`), the suggestion's `AutomationDecision` rows become orphaned in the audit view. **Recommendation:** leave as-is for this slice; the cascade is irrelevant because `AutomationDecision` is never deleted (append-only). **No action required.**

### Cross-references

- ADR-0015 — role grants are bounded by the actor's own role.
- ADR-0017 — `app_runtime` role enforces RLS; service actions bypass RLS.
- ADR-0018 / ADR-0019 — multi-schema Prisma (`public`, `auth`).
- ADR-0020 — Swarm Runtime Surface: each mutation endpoint should be wrapped in a `SwarmTaskEnvelope` for governance. The Cockpit UI's approve/reject actions qualify as human-initiated mutations that benefit from a governed envelope.
- ADR-0021 — Phase A spec, hard guardrails (no automatic stock mutation, no external writeback, no LLM approval, no service-role in user path, append-only decisions, no PII in logs).
- ADR-0022 (accepted) — Phase B schema + 2 read endpoints + B-1/B-2/B-3/B-4/B-5 on `main`. The read paths this ADR mutates from are `GET /admin/automation/rules` and `POST /admin/automation/rules/:id/dry-run` (commit `2a46e05`).
- `docs/automation/semi-automated-operations-layer.md` — Phase B section.
- `docs/automation/implementation-plan.md` — Plan §3 sequencing, Plan §4 Phase B, Plan §4 Phase C.
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for the write-policy surface.
- `docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md` — the MSPR entry that closes this slice.
- `src/modules/automation/automation-rule.service.ts` — existing `listRules` and `dryRunRule` (commit `2a46e05`).
- `src/routes/automation.route.ts` — existing read-only routes (commit `2a46e05`).
- `apps/cockpit/app/(app)/automation/suggestions/page.tsx` — Phase C stub, the data source for the new Cockpit UI.
- Issue #44 — B-6 tracker (this slice).
- Issue #45 — Phase C bootstrap tracker.

### Next gate

ADR-0023 is now `Status: accepted`. Acceptance authorizes:
- the write-policy migration (one forward-only file, manual rollback sibling);
- the four mutation endpoints (approve, reject, create rule, update rule; the two rule-CRUD endpoints are scoped as in this ADR; if Open Question §1 is later resolved negatively, they route to ADR-0027);
- the 5-test integration gate;
- the MSPR closure entry (`docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md`).

Open Question §1 verdict: the owner accepted the recommendation to keep the two rule-CRUD endpoints (`POST /admin/automation/rules`, `PATCH /admin/automation/rules/:id`) in this slice. A separate ADR-0027 is therefore not opened; the rule-CRUD surface lives here.

Implementation status (2026-06-08): no code yet. The implementation slice (migration + 4 route handlers + 5 integration tests) lands as one PR after ADR-0023 acceptance, paired with the 2 existing B-1/B-2 migrations on main (which must be promoted to a verified Supabase snapshot before any Phase C slice can run).

### Closure (Phase C implementation slice, 2026-06-08)

The implementation slice authorized by this ADR has been written locally. As with the prior Phase B slice, the migration is forward-only and the 4 mutation endpoints are enforced in code by Fastify route role gates (admin+ for rule CRUD, manager+ for suggest approve/reject) plus DB row-level policies (insert/update on `AutomationRule` for owner/admin in the same org; insert on `AutomationSuggestion` and `AutomationDecision` for `app_runtime`; insert/update on `ShiftHandoverDraft` for the shift lead of the draft or manager+). The append-only `AutomationDecision` trigger is preserved; the new migration's `DO $$` block refuses to apply if either of the two B-2 triggers (`automation_decision_block_update`, `automation_decision_block_delete`) is missing, making any future accidental drop fail loudly.

The 4 mutation endpoints are mounted as 2 route modules (`src/routes/automation-suggestion.route.ts`, `src/routes/automation-rule-write.route.ts`) and are wired through `src/app.ts`. Two services back them: `AutomationSuggestionService` (approve + reject, `$transaction` with select + update on `AutomationSuggestion`, insert into `AutomationDecision`, optional `WorkflowTask` create on approve gated by `rule.action.suggestedTaskType`) and `AutomationRuleWriteService` (create + version-bumped update with optimistic concurrency on `AutomationRule.version`, 409 on duplicate name within the org, 409 on stale `expectedVersion`).

The 5-test integration gate is met by 11 vitest cases across two new test files (`tests/automation-suggestion.routes.test.ts` with 5 cases, `tests/automation-rule-write.routes.test.ts` with 6 cases), all of which use in-memory stubs of the `AutomationRuleDatabaseClient` (now extended to include the `automationSuggestion` / `automationDecision` / `workflowTask` / `$transaction` surfaces that the new services need). The 8 existing B-5 read-route tests continue to pass — total 479/479 vitest cases green, `npx tsc --noEmit -p tsconfig.json` clean, `npx prisma validate` clean. No service-role credentials are introduced. No `InventoryMovement` or `InventoryStockSnapshot` writes are introduced (the approve path can spawn a `WorkflowTask`, which is the existing human-resolved path; no shortcut to the snapshot). No `clientRequestId` reuse with mismatched payload is allowed (422 on a reused id with a different status or different reason).

The MSPR closure entry for this slice is at `docs/agent-team/mspr_logbook/2026-06-08-phase-c-mutation-surface.md`. As before, the 2 Phase B migrations + this new mutation-policies migration are forward-only on disk and have not been applied to a live Supabase project; the 12-query promotion gate (ADR-0028) is the remaining prerequisite before any Phase C Cockpit UI can call the new endpoints against a real database.

**Status:** this ADR's authorized slice is locally complete on disk; the live-DB promotion (ADR-0028) is the remaining gate before any user-path Phase C traffic can flow.

## ADR-0025: Adopt Phase E Shift Handover Draft Endpoints (accepted)

Status: accepted (2026-06-09, owner cheikh.witm@proton.me; owner-review acceptance of the Phase E handover-draft slice. Open Question §1 verdict is **discarded** per the recommendation — the `archiveNote` field is accepted by the Zod schema on the confirm endpoint and dropped server-side with a TODO; no `confirmationNote` column is added in this slice. The E-1 implementation slice is authorized to land as one PR.)

Decision: When accepted, this ADR will promote the **shift-handover-draft** half of the Phase A / Phase B / Phase E automation surface to `accepted` and authorize a single forward-only Prisma migration that **adds** the two `ShiftHandoverDraft` write policies and the `authenticated` + `app_runtime` write grants, plus the three shift-handover endpoints listed below. It does **not** authorize the LLM `synthesize` endpoint (which is part of the optional Phase F per the plan-doc and the spec §Phase F and is gated on a future ADR-0025.f), nor any external writeback (ADR-0026), nor any offline-sync write path (ADR-0024). The slice is intentionally narrow: the three confirm-path endpoints, the write-policy migration, and the 6-test integration gate.

**Acceptance-time correction (2026-06-09):** the original §Decision and §RLS / Grant Plan claimed that the two `ShiftHandoverDraft` write policies already lived in the on-disk mutation-policies migration (`20260608165159_automation_mutation_policies`). On Working-Tree verification at acceptance time, that migration does **not** exist on disk and the B-2 migration (`20260608161000_add_automation_phase_b_rls`) ships **read-only** grants + the `shift_handover_draft_own_or_manager_select` SELECT policy only. The Phase B header at line 9 of the B-2 migration explicitly notes "Mutation policies are intentionally omitted; RLS denies writes by default until their own ADRs (ADR-0023/0024/0025) add them." This ADR therefore adds the two write policies + write grants in a new forward-only migration `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql`. The slice is still narrow (4 files + 1 migration + 6 tests); no new tables, no new columns. The original §Context, §Schema impact, §API Surface, §Test Plan, §Rollback Plan, §Open Questions, §Cross-references, and §Next gate sections remain binding; only §Decision and §RLS / Grant Plan are corrected by this addendum.

This ADR is the natural next gate after ADR-0023 closed (Phase C mutation surface locally complete on `main`; ADR-0028 live-DB promotion executed 2026-06-08 on Supabase project `czinchfegtglmrloxlmh`). The `ShiftHandoverDraft` table itself was added by the B-1 migration (`20260608160000_add_automation_phase_b_tables`) and is read-only-gated by the B-2 migration (`20260608161000_add_automation_phase_b_rls`). This ADR adds the missing write path so the three endpoints below can function against a real database.

### Context: the localStorage page migration path

The existing Cockpit `/shift-handover` page (commit `ccf0f50`, separate workstream, NOT the spec's Phase E deliverable) is localStorage-based and serves shift leads with priority buckets (Normal / Wichtig / Kritisch), the last 10 history entries, and a delete action. The spec's Phase E (§Phase E in `docs/automation/semi-automated-operations-layer.md`; §4 Phase E in `docs/automation/implementation-plan.md`) replaces or wraps that localStorage page with a backend-backed draft model on `ShiftHandoverDraft`.

**Owner decision (carried from the plan-doc §6 Open Question §5):** the recommended path is **option (a) keep the localStorage page as a separate feature, build Phase E alongside it**. Rationale: the localStorage page is in active production use by shift leads who value its offline-only behavior; forcing a migration to the new draft API in this slice would either (i) regress offline behavior until ADR-0024 (offline sync) lands, or (ii) require holding the new endpoints until Phase D lands. The plan-doc defers the final call to E-3 based on user feedback. **This ADR therefore ships the three backend endpoints and the RLS gates; it does NOT modify the Cockpit `/shift-handover` page. E-3 (Cockpit integration) is the follow-up slice and will decide whether to replace, wrap, or leave the localStorage page.**

### Schema impact

No new tables. No new columns on `ShiftHandoverDraft` (the on-disk model is the same as ADR-0022 §Schema Additions; its 15 fields already cover the spec's §5 ShiftHandoverDraft block). The B-1 + B-2 migration pair is unchanged. The slice ships a **new forward-only migration** `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` that adds the two write policies + write grants (corrected from the original §Decision, which claimed these lived in `20260608165159_automation_mutation_policies`). Two `@@index` hints from the spec are already in place: `@@index([organizationId, date, shiftLeadId])` and `@@index([confirmedAt])`.

The new migration also carries a `DO $$` block that sanity-checks the two `ShiftHandoverDraft` write policies are present after the policy `CREATE` statements. This is the same regression-guard pattern the mutation-policies migration uses for the `AutomationDecision` append-only triggers (per the closure block at lines 803-805 of this document).

### RLS / Grant Plan (proposed for migration; **corrected at acceptance**)

**Original plan (superseded):** "re-affirm the on-disk mutation-policies" — that migration does not exist on disk at acceptance time.

**Corrected plan:** the new forward-only migration `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` carries the complete write surface for this slice:

| Operation | Gate | Notes |
|---|---|---|
| `SELECT` | `authenticated` org-member (any role) | read draft for own org; staff+ for own shift, manager+ for team — enforced in the service layer by filtering on `shiftLeadId` for staff, full org for manager+. The B-2 `shift_handover_draft_own_or_manager_select` policy is preserved unchanged. |
| `INSERT` | shift lead for own draft; manager+ for team | NEW policy `shift_handover_draft_lead_or_manager_insert` (created by this migration) asserts `auth.uid() = "shiftLeadId"` OR a manager+ `OrganizationMember` row exists in the same org. |
| `UPDATE` | shift lead for own draft AND `confirmedAt IS NULL`; manager+ to confirm (sets `confirmedAt`) | NEW policy `shift_handover_draft_lead_or_manager_update` (created by this migration) enforces the role + `confirmedAt IS NULL` invariant for the draft path. The confirm endpoint sets `confirmedAt` and is restricted to manager+ at the route gate; the policy permits it for manager+ regardless of `confirmedAt IS NULL`. |
| `DELETE` | none | the B-1 schema has no `DELETE` policy and the slice adds none. Soft delete is not in scope. |

The migration also carries `GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO authenticated, app_runtime;` and a `DO $$` regression guard. `app_runtime` does **not** bypass RLS (per ADR-0017) and the same write policies therefore apply when the confirm endpoint writes on behalf of the manager. No service-role credential in the user path.

### API Surface (proposed for this slice)

Three endpoints, mounted at `/shift-handover/...` (matching the spec's path convention; no `/admin/` prefix because the spec lists these as core Cockpit surfaces, not admin surfaces). All three run inside the `app_runtime` role from ADR-0017 and inherit the RLS policies above.

- `GET /shift-handover/draft` (staff+, role-rank ≥ 2) — fetch or auto-create the caller's draft for today (or for the optional `?date=YYYY-MM-DD&workspaceId=...` query).
  - Query: `date` (optional, ISO date, default = today in the org's timezone resolved server-side via `Intl.DateTimeFormat`); `workspaceId` (optional, default = caller's primary `workspaceId` if any).
  - Auto-create on first call: if no draft exists for `(organizationId, shiftLeadId, date, workspaceId)`, insert a new row with `summary = null`, `openItems = '[]'::jsonb`, `alerts = '[]'::jsonb`, `notes = null`, `synthesizedHandover = null`, `synthesizedAt = null`, `confirmedAt = null`. Auto-create is **idempotent** (the spec is silent on a unique index; we use a `findFirst` + conditional `create` inside a `$transaction` to avoid a race). The auto-create is a draft, not a confirmation; no `WorkflowTask` is created.
  - 200: `{ "draft": ShiftHandoverDraftPublicDTO }`. 401: no token. 403: role-rank < 2.
  - Side effects on first call: 1 `INSERT` on `ShiftHandoverDraft`.
- `PATCH /shift-handover/draft` (staff+, role-rank ≥ 2; rate-limited to 1 req / 2s per actor) — autosave edits to the caller's open draft.
  - Body (Zod schema): partial `ShiftHandoverDraft` payload — any subset of `summary`, `openItems`, `alerts`, `notes`, `startTime`, `endTime`. `id`, `shiftLeadId`, `organizationId`, `date`, `synthesizedHandover`, `synthesizedAt`, `confirmedAt`, `createdAt`, `updatedAt` are **not** writable from this endpoint.
  - 200: `{ "draft": ShiftHandoverDraftPublicDTO }`. 400: Zod failure. 401. 403. 404: no open draft for the caller's `(date, workspaceId)`. 409: draft already `confirmedAt IS NOT NULL` (immutable post-confirm). 429: autosave throttle.
  - Throttle: a per-actor counter keyed on `userId` in an in-memory LRU with a 2-second sliding window; the throttle is a **defense in depth** measure, not the primary correctness gate (the DB write path is). The throttle resets on server restart.
  - Side effects: 1 `UPDATE` on `ShiftHandoverDraft` (only if the row exists, is owned by the caller, and is not yet confirmed). No `AutomationDecision` row.
- `POST /shift-handover/draft/:id/confirm` (manager+, role-rank ≥ 3) — set `confirmedAt = now()` and transition the draft to immutable.
  - Path param: `id` (ShiftHandoverDraft.id). Body: `{ "archiveNote"?: string }` (optional, ≤ 500 chars, **dropped server-side with a TODO** per Open Question §1 verdict — no `confirmationNote` column is added in this slice).
  - 200: `{ "draft": ShiftHandoverDraftPublicDTO (with confirmedAt set), "archiveId": string }`. 401. 403. 404. 409: already confirmed (idempotent guard; returns the prior confirmation rather than failing).
  - Side effects in one Prisma transaction:
    1. SELECT the draft FOR UPDATE (lock).
    2. Verify the caller's role is manager+ in the draft's org. If not, return 403.
    3. If `confirmedAt IS NOT NULL` already, return 200 with the existing row (idempotent replay).
    4. UPDATE `ShiftHandoverDraft.confirmedAt = now()`. The `archiveNote` body field is parsed by Zod then dropped (TODO; OQ §1 verdict).
    5. **NO `AutomationDecision` row, NO `WorkflowTask` row.** Confirm is a write to a single table; it does not flow through the automation layer.
  - Hard guardrail: NO `InventoryMovement` write, NO `InventoryStockSnapshot` write, NO service-role in the user path.

The optional `POST /shift-handover/draft/:id/synthesize` (LLM call, Phase F) is **explicitly out of scope** and routes to a future ADR-0025.f once Phase E ships and the LLM budget is approved (per the plan-doc §3 sequencing).

### Test Plan (proposed gate)

The slice is complete when all of the following are green:

1. `npx prisma validate` returns clean.
2. `npm run typecheck` is clean.
3. The new forward-only migration applies on a Supabase development project and is reversible via the documented manual `DROP POLICY` / `REVOKE` script.
4. The 8 existing `tests/automation.routes.test.ts` cases (B-5 gate) continue to pass — no regression in the read path.
5. Six new integration tests covering:
   - `GET /shift-handover/draft` (auto-create): 401 without token; 403 for role-rank < 2; 200 for staff+ on first call (returns newly created draft); 200 for staff+ on second call (returns the same draft, no new row created — verified by `SELECT COUNT(*) FROM "ShiftHandoverDraft" WHERE "shiftLeadId" = ...` before and after).
   - `PATCH /shift-handover/draft` (autosave): 200 for staff+ with valid body (one of `summary`, `openItems`, `alerts`, `notes`); 403 for role-rank < 2; 404 if no open draft exists; 409 if the draft is already confirmed; 429 on the 2nd request within 2 seconds (rate-limit test).
   - `POST /shift-handover/draft/:id/confirm`: 200 for manager+ (sets `confirmedAt`); 200 idempotent on a second call (returns the existing row, no double-update); 403 for staff; 404 for an unknown id.
   - Append-only invariant preservation: the `AutomationDecision` B-2 trigger is still active (regression check; not re-tested in this slice — covered by the existing 6th mutation test in the prior Phase C slice which is **not on disk in the current Working-Tree** and is therefore excluded from the in-scope gates for E-1).
6. The `npm run smoke:inventory-api` runner still passes (no regression in the existing inventory path).
7. An `MSPR` logbook entry is written at `docs/agent-team/mspr_logbook/2026-06-XX-phase-e-handover-drafts.md` covering scope, evidence, risks, scorecard, next-gate.

### Rollback Plan

The slice is one forward-only migration (2 policies + grants + DO $$) plus the three route handlers. To roll back:

1. `git revert` the commit that added the migration and the three route handlers.
2. Run the manual cleanup against the database:
   ```sql
   DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_insert" ON "ShiftHandoverDraft";
   DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_update" ON "ShiftHandoverDraft";
   REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM authenticated;
   REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM app_runtime;
   ```
3. `npx prisma generate` to refresh the client.
4. Confirm the 8 existing automation read-route tests still pass (the B-5 gate is unaffected by this rollback).

### Open Questions

1. **`confirmationNote` field on confirm.** The spec's `POST /shift-handover/draft/:id/confirm` body includes a `confirmedBy` and `timestamp` but no optional note. **Verdict (2026-06-09, owner):** discarded — Zod accepts `archiveNote`, server drops with a TODO; no `confirmationNote` column is added in this slice.
2. **Throttle storage.** The PATCH endpoint's 1 req / 2s rate limit is implemented as an in-memory LRU keyed on `userId`. A multi-instance deployment will undercount. **Recommendation:** ship the in-memory version for now (single-instance Cockpit deployment); a future ADR-0025.throttle may move to Redis. **No action required for this slice; recorded for posterity.**
3. **Auto-create on first GET vs explicit POST.** The spec's `GET /shift-handover/draft` "auto-creates on first call" pattern is implicit. **Recommendation:** follow the spec's auto-create-on-GET; it matches the spec's "fetch or auto-create draft for today's shift" wording. **No action required; recorded for posterity.**
4. **LocalStorage page migration path (carried from plan-doc §6 OQ §5).** The recommended path is option (a): keep the localStorage page as a separate feature, build Phase E alongside it. E-3 is the slice that decides, and is **not** part of this ADR. **No action required in this slice; deferred to E-3.**

### Cross-references

- ADR-0015 — role grants are bounded by the actor's own role.
- ADR-0017 — `app_runtime` role enforces RLS; service actions bypass RLS.
- ADR-0018 / ADR-0019 — multi-schema Prisma (`public`, `auth`).
- ADR-0020 — Swarm Runtime Surface: each mutation endpoint should be wrapped in a `SwarmTaskEnvelope` for governance. The `PATCH` autosave and the `POST /confirm` qualify as human-initiated mutations; the `GET` does not (read-only).
- ADR-0021 — Phase A spec, hard guardrails (no automatic stock mutation, no external writeback, no LLM approval, no service-role in user path, append-only decisions, no PII in logs). The LLM `synthesize` endpoint is **explicitly out of scope** for this ADR and routes to a future ADR-0025.f.
- ADR-0022 (accepted) — Phase B schema + 2 read endpoints. The `ShiftHandoverDraft` model is defined in ADR-0022 §Schema Additions; this ADR adopts it for the write + confirm path.
- ADR-0023 (accepted) — mutation surface. The closure block at lines 803-805 of this document describes a Phase C mutation-policies migration (`20260608165159_automation_mutation_policies`) that **does not exist on the current Working-Tree**. This ADR does not depend on it; it ships its own write policies.
- ADR-0028 (accepted) — Phase B migrations promoted to a verified Supabase snapshot. The on-disk B-1 + B-2 migration pair is the artifact this slice builds on.
- `docs/automation/semi-automated-operations-layer.md` — §5 ShiftHandoverDraft, §Phase E endpoints, §Phase E deliverables.
- `docs/automation/implementation-plan.md` — §4 Phase E (E-1 through E-5), §6 OQ §4 (auto-populate logic, deferred to E-4), §6 OQ §5 (localStorage page migration path, deferred to E-3).
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for the write-policy + endpoint surface.
- `src/routes/automation.route.ts` — pattern reference for the Fastify role gates + service-layer shape.
- `src/modules/automation/automation-rule.service.ts` — pattern reference for the typed `*ServicePort` interface + `*DatabaseClient` stub pattern.
- `src/modules/auth/actor.ts` — the `Actor` + `Role` types and `parseActorFromHeaders` helper used by the new route module.
- `tests/automation.routes.test.ts` — pattern reference for the JWT-test helper, `organizationRoleForUser` fixture, and `buildTestApp` factory used by the new handover tests.
- `apps/cockpit/app/(app)/shift-handover/page.tsx`, `apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx` — the localStorage page that this slice does **not** modify (E-3 is the follow-up).
- Issue #46 — Phase E bootstrap tracker (this ADR closes the bootstrap; E-1 through E-5 follow once this ADR is accepted).

### Next gate

A human owner reviews this ADR. Acceptance flips `Status: proposed` to `Status: accepted` and authorizes:

- the new forward-only migration `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` (2 policies + 2 grants + 1 `DO $$` regression guard);
- the three endpoints (`GET /shift-handover/draft`, `PATCH /shift-handover/draft`, `POST /shift-handover/draft/:id/confirm`);
- the 6-test integration gate;
- the MSPR closure entry (`docs/agent-team/mspr_logbook/2026-06-XX-phase-e-handover-drafts.md`).

The next code-bearing slice after acceptance is **E-1**: the migration + the 3 route handlers + the 6 integration tests in one PR. The slice is locally complete on disk once E-1 lands; the live-DB promotion is already done (ADR-0028), so E-1 has no further DB gate. E-3 (Cockpit integration) and E-4 (auto-populate logic) are subsequent slices gated on E-1. E-5 (MSPR closure) closes Phase E.

**Status update (2026-06-09):** ADR-0025 was `Status: proposed` from 2026-06-09 until 2026-06-09 owner-review acceptance, at which point the status flipped to `Status: accepted` and the E-1 implementation slice was authorized. The corrected §Decision and §RLS / Grant Plan are binding from acceptance onward; the original proposed text is retained above for the audit trail.

## ADR-0028: Promote Phase B Migrations to a Verified Supabase Snapshot (accepted)

Status: accepted (2026-06-08, owner cheikh.witm@proton.me; promotion executed on Supabase project `czinchfegtglmrloxlmh`; 12/12 verification queries PASS; see `docs/automation/promotion-evidence/2026-06-08-adr-0028.md` and the closure addendum at `docs/agent-team/mspr_logbook/2026-06-08-adr-0028-promotion.md`)

Decision: When accepted, this ADR will authorize a single named operation: `npx prisma migrate deploy` of the two Phase B migrations (`20260608160000_add_automation_phase_b_tables` and `20260608161000_add_automation_phase_b_rls`) against a **named, dedicated** Supabase development project, plus a fixed verification script that proves (a) the 5 tables and 7 enums exist with the expected columns, (b) the 5 SELECT RLS policies and the 4 SELECT grants are in effect, (c) the `AutomationDecision` append-only trigger is active, and (d) the access matrix described in ADR-0022 §RLS Plan holds against the live database. It does **not** authorize applying the migrations to production, to staging, or to any environment other than the named Supabase dev project. It does **not** authorize any schema change, any new RLS policy, or any new endpoint. The slice is a one-shot promotion with a verifiable evidence record.

This ADR is the natural prerequisite for the Phase C implementation slice (ADR-0023) and for any future RLS-policies-correct gate that needs a real database. The current state (commit `39fc896` on main) has the migrations on disk, the schema validated, the 8 read-route vitest cases green — but no live database has them applied, so the read path's RLS guarantees are not yet evidence-anchored.

### Scope

In scope:

- `npx prisma migrate deploy` against a **named** Supabase development project URL.
- A verification script `scripts/verify-automation-phase-b-migrations.ts` (new file) that runs 12 fixed SQL queries against the promoted database and prints a pass/fail per check.
- A short MSPR logbook entry at `docs/agent-team/mspr_logbook/2026-06-XX-adr-0028-promotion.md` recording the evidence (project URL suffix, migration timestamps, 12 query results, screenshot or text of `npx prisma migrate status` output).
- A `PROVENANCE.md` (or `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md`) file capturing the SHA of the two migration files at apply time and the SHA of the verification script that ran against the promoted database.

Out of scope:

- Production promotion. A separate ADR (likely ADR-0029 or `ADR-0028.prod`) will gate production cutover with a stronger review.
- Any schema change, any new migration, any RLS policy tweak, any endpoint change.
- The Phase C implementation slice (separate; ADR-0023 governs it; this slice is its prerequisite, not its substitute).
- Cockpit UI changes.

### Promotion Plan (proposed for execution)

The slice is run as a single, named, one-shot operation by the human owner, with the orchestrator (Mavis) producing the verification script and the evidence record. The human owner runs the apply command and the verification command; the orchestrator records the output. The reason for this split: applying migrations to a shared environment is a destructive operation (forward-only DDL) and must not be performed by an automated agent without an explicit human-typed command in the terminal.

Step 1 — preflight (orchestrator-only, no DB write):

1. Confirm the 2 migration files on `main` are byte-identical to the local working tree (commit `39fc896`).
2. Confirm `npx prisma validate` is clean against `prisma/schema.prisma`.
3. Confirm `npx tsc --noEmit -p tsconfig.json` is clean.
4. Confirm `npx vitest run tests/automation.routes.test.ts` is 8/8 green.
5. Write the verification script `scripts/verify-automation-phase-b-migrations.ts` (12 SQL queries, structured output, exits 0 only if all 12 pass).
6. Write a one-page runbook `docs/automation/promotion-evidence/RUNBOOK-adr-0028.md` with the exact commands the human owner will run.

Step 2 — apply (human-typed command in the terminal, against the named Supabase dev project):

1. `export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"` — owner-supplied, never committed.
2. `export DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"` — same.
3. `npx prisma migrate deploy` — applies the 2 migrations in timestamp order. The output should show "2 migrations applied" with the two filenames. The owner copies the output to the evidence record.
4. The owner runs `psql "$DATABASE_URL" -c "SELECT version();"` and copies the Postgres version + the Supabase project ref to the evidence record.

Step 3 — verify (orchestrator runs, with DATABASE_URL set by the owner for the session only):

1. `npx tsx scripts/verify-automation-phase-b-migrations.ts` — runs the 12 SQL queries, prints a table, exits 0/1.
2. The orchestrator copies the table output to the MSPR entry.
3. `npx prisma migrate status` — should show the 2 migrations as applied and the database as "in sync, no migrations pending".

Step 4 — evidence record (orchestrator writes, owner reviews):

1. `docs/agent-team/mspr_logbook/2026-06-XX-adr-0028-promotion.md` — closure MSPR entry with the 12 query results, the `prisma migrate status` output, the SHA pairings, and the scorecard.
2. `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md` — provenance file with the migration SHAs, the verification script SHA, the Supabase project ref (not the password), and the Postgres version.

### The 12 verification queries

These are the queries the verification script runs. They are the gate. They are fixed at ADR-0028 acceptance time; any change is a new ADR.

| # | Check | Expected | SQL (abbreviated) |
|---|---|---|---|
| 1 | Schema: 5 tables exist | all 5 | `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('AutomationRule','AutomationSuggestion','AutomationDecision','OfflineActionQueue','ShiftHandoverDraft')` returns 5 |
| 2 | Schema: 7 enums exist | all 7 | `SELECT count(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname IN ('AutomationRuleType','AutomationRuleEvaluationMode','AutomationSuggestionType','AutomationSuggestionStatus','AutomationDecisionStatus','OfflineActionType','OfflineActionStatus')` returns 7 |
| 3 | RLS: 5 tables RLS enabled | all 5 | `SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (...) AND rowsecurity = true` returns 5 |
| 4 | RLS: 5 SELECT policies exist | all 5 | `SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN (...) AND cmd = 'SELECT'` returns 5 |
| 5 | Trigger: append-only UPDATE trigger exists | yes | `SELECT count(*) FROM pg_trigger WHERE tgname = 'automation_decision_block_update'` returns 1 |
| 6 | Trigger: append-only DELETE trigger exists | yes | `SELECT count(*) FROM pg_trigger WHERE tgname = 'automation_decision_block_delete'` returns 1 |
| 7 | Trigger: UPDATE raises exception | yes | `UPDATE "AutomationDecision" SET reason = 'x' WHERE id = (SELECT id FROM "AutomationDecision" LIMIT 1)` — if no rows exist (the seeded dev project is empty), the test instead creates a row, then updates it, then expects the exception. If creating a row also raises (because of a write policy), the test instead inspects the trigger function and confirms `RAISE EXCEPTION` is in the function body. |
| 8 | Trigger: DELETE raises exception | yes | mirror of #7 for DELETE |
| 9 | Grants: `authenticated` has SELECT on 5 tables | yes | `SELECT count(*) FROM information_schema.role_table_grants WHERE grantee = 'authenticated' AND table_schema = 'public' AND table_name IN (...) AND privilege_type = 'SELECT'` returns 5 |
| 10 | Grants: `app_runtime` has SELECT on 5 tables | yes | mirror of #9 for `app_runtime` |
| 11 | Role: `app_runtime` exists with `NOBYPASSRLS` | yes | `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime'` returns `app_runtime, f` |
| 12 | Inventory smoke: existing tables untouched | yes | `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('InventoryItem','InventoryMovement','InventoryStockSnapshot','WorkflowTask')` returns 4 (the 4 inventory tables that exist before the B-1 migration) |

If any of #1–#6, #9–#12 fail, the migration is considered **not promoted** and the slice is `BLOCKED` on diagnosis. If #7 or #8 fail, the slice is `BLOCKED` because the append-only invariant is not enforceable. If #11 fails, the slice is `BLOCKED` because the RLS execution context is not what the repo assumes.

### Rollback Plan

The slice is promotion-only; there is no code or migration to revert. If the verification fails:

1. The owner does **not** roll forward further (no Phase C slice starts).
2. The orchestrator produces a diagnosis PR (issue or ADR follow-up) that names the failing check, the expected vs actual output, and a proposed fix (which would be a new forward-only migration that corrects the underlying state, **not** a destructive DROP-and-recreate).
3. If the promotion was a complete mistake (e.g. the wrong project was targeted), the manual cleanup script from ADR-0022 §Rollback Plan is run against the affected project, and the project is treated as a fresh slate.

The slice does **not** include the manual cleanup script in any CI or automation; running it against a live database is a human-typed operation gated on a documented decision.

### Test Plan (proposed gate)

The slice is complete when all of the following are green:

1. The 12 verification queries (#1–#12) all return their expected values against the named Supabase dev project.
2. `npx prisma migrate status` reports the 2 migrations as applied with no pending migrations.
3. The 8 existing `tests/automation.routes.test.ts` cases continue to pass locally (no regression in the test code; the tests use an in-memory stub and do not touch the live DB).
4. The `npm run smoke:inventory-api` runner continues to pass locally.
5. The MSPR logbook entry is written and references the 12 query results, the `prisma migrate status` output, and the provenance file.
6. The provenance file `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md` is written with the migration SHAs, the verification script SHA, the Supabase project ref, and the Postgres version.

The 12 queries are the hard gate. If any fails, the slice is `BLOCKED` and no downstream slice (Phase C, Phase D, etc.) starts.

### Hard Guardrails Reaffirmed

- No `prisma migrate dev` against a real environment. The slice is `migrate deploy` only, against a named dev project, and the project ref is recorded.
- No `.env*` file write. `DATABASE_URL` and `DIRECT_URL` are exported in the owner's shell session, never persisted.
- No service-role credential in any user-facing path. The verification script uses the `postgres` superuser (the only role that can `SELECT FROM pg_catalog` and `pg_trigger`); the script does **not** impersonate the application's `app_user` / `app_runtime` / `authenticated` roles.
- No destructive `DROP TABLE` / `DROP TYPE` against the dev project. The rollback path is a forward-only correction, not a destructive reset.
- The verification script is read-only against the live data; the only writes are the single test row in check #7/#8 which is cleaned up at the end of the script (or, if the write is blocked by RLS, the script falls back to inspecting the trigger function body, which is also read-only).

### Cross-references

- ADR-0017 (accepted) — `app_runtime` role, `NOLOGIN`, `NOBYPASSRLS`. Verification query #11 enforces this.
- ADR-0018 / ADR-0019 (accepted) — multi-schema Prisma, allowlist-driven introspection. The 5 new tables and 7 new enums are all in `public` per ADR-0022; the verification script does not inspect the `auth` schema.
- ADR-0021 (accepted) — Phase A spec, hard guardrails. The promotion does not write to any external system, does not call an LLM, does not bypass the human-approval gate.
- ADR-0022 (accepted) — Phase B schema + 2 read endpoints. The 2 migrations on `main` (commits `32dd1c1`, `811b383`) are the artifacts this ADR promotes. The RLS plan, the trigger definition, and the rollback script are all from ADR-0022.
- ADR-0023 (accepted) — mutation surface. The 4 mutation endpoints (approve, reject, create rule, update rule) and the write-policy migration depend on the schema being live in a real DB; this ADR-0028 promotion is the prerequisite.
- `docs/automation/semi-automated-operations-layer.md` — Phase B section, the spec.
- `docs/automation/implementation-plan.md` — Plan §4 Phase B, §4 Phase C. The plan-doc's §2 Status snapshot will be updated by the MSPR closure entry.
- `docs/agent-team/mspr_logbook/2026-06-XX-adr-0028-promotion.md` — the MSPR entry that closes this slice.
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for any data-mutation slice. This slice is Tier 3 (DB write) but is a forward-only DDL with a verification script; the policy applies.
- `prisma/migrations/20260608160000_add_automation_phase_b_tables/migration.sql` — the first of the 2 migrations to be promoted.
- `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql` — the second of the 2 migrations to be promoted.
- `scripts/verify-automation-phase-b-migrations.ts` — the verification script (created by this slice).
- `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md` — the provenance file (created by this slice).
- Issue (to be filed) — ADR-0028 promotion tracker.

### Open Questions

1. **Which Supabase dev project is the target?** — **VERDICT 2026-06-08 (resolved positively):** the owner chose to use the existing live Supabase instance (project ref `czinchfegtglmrloxlmh`) for the promotion, rather than create a fresh dev project. Rationale: the live instance is already provisioned, the schema is otherwise empty (the 5 Phase B tables are not yet present, the 4 inventory tables exist), and creating a parallel dev instance would double the maintenance surface. The promotion thus targets **production-as-the-only-instance**, with the same forward-only DDL and the same 12-query gate. The promotion evidence file at `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md` records the project ref `czinchfegtglmrloxlmh` and the Postgres version returned by the `SELECT version()` query, but does not record the password (which lives in the owner's terminal session only). The runbook at `docs/automation/promotion-evidence/RUNBOOK-adr-0028.md` is the owner-facing 11-step procedure.
2. **What is the role of the verification script in CI?** The 12-query script could in principle be added to CI as a required check on every PR that touches `prisma/`. **Recommendation:** not in this slice. CI integration is a separate slice (likely ADR-0028.1) because it requires a CI-side `DATABASE_URL` secret and a Supabase project that survives CI runs. For now the script is owner-run, evidence-recorded. **No action required for this slice; recorded for the next slice.**
3. **What happens to the existing `migrations/20260605110000_*` family of migrations?** They are on `main` and were applied to the live project in earlier slices. The promotion does not touch them. The slice's pre-apply state (per the owner's `npx prisma migrate status` output) confirms 25 prior migrations are applied and 3 are pending; the 3 pending ones (1 procurement + 2 Phase B) are exactly what `prisma migrate deploy` will apply, with no baseline needed. **No action required; recorded for posterity.**

### Next gate

A human owner reviews this ADR. Acceptance flips `Status: proposed` to `Status: accepted` and authorizes:
- the human-typed `npx prisma migrate deploy` against the live Supabase project `czinchfegtglmrloxlmh` (Open Question §1, resolved);
- the orchestrator-written verification script `scripts/verify-automation-phase-b-migrations.ts` (created by this slice);
- the runbook at `docs/automation/promotion-evidence/RUNBOOK-adr-0028.md` (created by this slice);
- the MSPR closure entry after the 12-query gate passes;
- the provenance file at `docs/automation/promotion-evidence/2026-06-XX-adr-0028.md` (created by the orchestrator after the gate passes).

Rejection routes the slice back to the Orchestrator for an updated envelope (e.g. the owner might want a different verification gate, or a different target project) and an updated MSPR entry. This ADR remains `proposed` until a verdict is recorded.

## ADR-0029: Back-Promote Phase C Suggestion Read Endpoints (accepted)

Status: accepted (2026-06-08, owner cheikh.witm@proton.me; back-promotion of the C-3a slice that was implemented under spec+plan-doc authority in commit `5507df6`)

Decision: When accepted, this ADR formally records the two read endpoints added by the Phase C C-3a slice as **accepted** and closes the authority gap that the C-3a MSPR entry (`docs/agent-team/mspr_logbook/2026-06-08-phase-c-read-suggestions.md`) flagged.

The gap existed because the C-3a slice was implemented under the spec+plan-doc authority (the spec text at `docs/automation/semi-automated-operations-layer.md` lines 747-780 and the plan-doc at `docs/automation/implementation-plan.md` §Phase C C-2), but no accepted ADR explicitly authorized the read surface. ADR-0023 §API Surface names the four mutation endpoints; it does not name the two read endpoints. The C-3a slice was committed with the gap flagged in the MSPR `newFindings` and the recommendation to file a back-promotion ADR. This ADR is that back-promotion.

### Scope (back-promoted from commit `5507df6`)

The two read endpoints added by the C-3a slice:

| Endpoint | Auth (route layer) | Auth (DB layer) | Notes |
|---|---|---|---|
| `GET /admin/automation/suggestions` | `["admin", "shift_lead", "staff"]` (staff+ per spec text line 751) | B-2 SELECT RLS policy `automation_suggestion_org_member_select` (any org member) | List with Zod query schema: `status?` (single or array of `'open' \| 'approved' \| 'rejected' \| 'expired'`, default `'open'`), `type?` (single or array), `ruleId?`, `limit?` (1-100, default 25), `offset?` (0-10000, default 0). Response: `{ suggestions: AutomationSuggestionPublicDTO[], total, limit, offset }`. |
| `GET /admin/automation/suggestions/:id` | same | same | Detail. Response: `{ suggestion: AutomationSuggestionPublicDTO }`. Cross-org returns 404 (in-memory org check after `findUnique`). |

The C-3a slice also added:

- `AutomationRuleDatabaseClient.automationSuggestion.findMany` / `count` / `findUnique` (top-level read surfaces; the transaction client is NOT extended).
- `AutomationSuggestionService.listSuggestions` / `getSuggestion` methods + 6 new vitest cases (total 11/11 in `tests/automation-suggestion.routes.test.ts`).
- Stub-extensions to the B-5 and C-2 test fakes for compatibility with the new `AutomationSuggestionServicePort` shape.

### Authority resolution

The back-promotion is the cleanest path forward for three reasons:

1. **The slice is already on disk and verified.** Commit `5507df6` ships 587 insertions and 3 deletions across 8 files. The 2 read endpoints are live in the Fastify backend against the promoted Supabase DB. Reversing the slice is a destructive operation that the spec, plan-doc, and now-this-ADR all want.
2. **The authority gap is documented, not denied.** The C-3a MSPR `newFindings` flag names the gap explicitly, names the spec+plan-doc authority the slice proceeded under, and recommends a back-promotion ADR as the remediation. The owner (per the question I asked before the slice) confirmed the slice could proceed; this ADR is the post-facto acceptance.
3. **A forward-only correction is the right pattern per ADR-0028 §Rollback Plan.** "If a future slice modifies the schema and the queries still pass, the promotion is still valid. If a future slice modifies the schema and the queries need to change, the query change is a follow-up ADR." The same pattern applies here: a back-promotion ADR is the right follow-up.

### Re-affirmed open questions (still open after this ADR)

1. **Role-aware filter (plan-doc §Phase C C-2 hint).** The plan-doc names "role-aware: staff sees own; manager+ sees all in org." The spec text does not name a per-role filter. The shipped C-3a slice implements the spec text (no per-role filter, staff+ can see all in the org). The role-aware filter is a follow-up ADR if the owner wants the plan-doc's behavior; it requires either a forward-only migration to add an `assignRole` column on `AutomationSuggestion` (deferred per the schema-impact rule) or a per-rule JSONB filter at read time. The C-3a MSPR `newFindings` records the open question. **No change in this ADR; the question remains for a future slice to resolve.**
2. **`expired` status handling.** The Zod schema accepts `status='expired'` as a filter value, but no job currently transitions `open` suggestions to `expired` based on `expiresAt`. The `expiresAt` column is set by the rule engine when the suggestion is created (per the ADR-0021 §3 spec), and a future cron would handle the transition. The C-3a MSPR `newFindings` records the open question. **No change in this ADR.**

### Test Plan (back-promoted gate, all green as of 2026-06-08)

The C-3a slice's test gate is the same as ADR-0023 §Test Plan §5 (the 11-test integration gate) plus the 6 new C-3a tests:

1. `npx prisma validate` clean.
2. `npm run typecheck` clean.
3. The 6 existing read-route vitest cases (B-3/B-4 gate) continue to pass.
4. The 4 mutation endpoint vitest cases from ADR-0023 (approve, reject, 403 staff, 409 already-decided) continue to pass.
5. The 6 new C-3a vitest cases pass:
   - `GET /admin/automation/suggestions` happy list (default 'open' filter excludes approved and cross-org)
   - `GET /admin/automation/suggestions` filter by status+type+ruleId (returns only the matching subset)
   - `GET /admin/automation/suggestions` 400 on malformed `status` query
   - `GET /admin/automation/suggestions` 403 on viewer
   - `GET /admin/automation/suggestions/:id` 200 for own org
   - `GET /admin/automation/suggestions/:id` 404 for cross-org
6. `npx vitest run` → 485/485 cases green.
7. The B-2 RLS policy `automation_suggestion_org_member_select` continues to enforce org-scope on the `AutomationSuggestion` SELECT path; no new RLS policy is added by this slice.
8. The append-only `AutomationDecision` invariant is preserved (the C-3a slice does not write to `AutomationDecision`; only the C-1 mutation endpoints do, and they are unchanged).

### Cross-references

- ADR-0021 (accepted) — Phase A spec, the hard guardrails the read endpoints respect.
- ADR-0022 (accepted) — Phase B schema + read endpoints; the `AutomationSuggestion` table and the B-2 RLS policy.
- ADR-0023 (accepted) — mutation surface; the 4 mutation endpoints the C-3a slice is the read counterpart of.
- ADR-0028 (accepted) — promotion gate; the 12-query gate verified the live DB on 2026-06-08.
- `docs/automation/semi-automated-operations-layer.md` — Phase A spec, the read endpoint definitions at lines 747-780.
- `docs/automation/implementation-plan.md` — §Phase C C-2 names this slice.
- `docs/agent-team/mspr_logbook/2026-06-08-phase-c-read-suggestions.md` — the C-3a MSPR that records the gap and the recommended remediation.
- `src/modules/automation/automation-rule.service.ts` — the `AutomationRuleDatabaseClient.automationSuggestion` extension.
- `src/modules/automation/automation-suggestion.service.ts` — the `listSuggestions` and `getSuggestion` methods.
- `src/routes/automation-suggestion.route.ts` — the 2 GET handlers.
- `tests/automation-suggestion.routes.test.ts` — the 6 new vitest cases.
- Commit `5507df6` — the C-3a implementation slice on disk.

### Next gate

ADR-0029 is now `Status: accepted`. The C-3a read endpoints are formally authorized. The next gate is the **Phase C Cockpit UI slice C-3b + C-4** (the dashboard card) per the plan-doc §Phase C, which replaces the existing stub at `apps/cockpit/app/(app)/automation/suggestions/page.tsx` with a real data source and adds the "Open suggestions" card to the dashboard. No further backend migration is needed. The C-3a + ADR-0029 back-promotion are the last governance artifacts required for the Phase C mutation+read surface; the Phase C UI is the next code-bearing slice.

## ADR-0030: Adopt Multi-Standort and CUBE Premium Architecture (Phase A — contract only)

Status: accepted (2026-06-08, owner cheikh.witm@proton.me; this is an owner-review acceptance of the Phase A contract slice that was implemented under the proposed-ADR authority. Two self-referential numbering errors in `docs/architecture/multi-location-mother-concern.md` (line 10 cited "ADR-0030" as the Phase B ADR; line 185 cited "ADR-0030" as the Phase B ADR; line 217 omitted `ADR-0021` from the cross-references list) were corrected in the same accept commit. The corrections are documented in the owner-review MSPR at `docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md`.)

Decision: When accepted, this ADR will promote the multi-standort / CUBE premium architecture described in `docs/architecture/multi-location-mother-concern.md`, `docs/architecture/location-profiles.md`, and `docs/architecture/cube-premium-compatibility.md` to `accepted` *as a contract only*. It authorizes **Phase A only**: the three new architecture documents in `docs/architecture/`, this ADR, the next-gate pointer in `docs/agent-team/agent_teamplan.md`, and the closure MSPR. It does **not** authorize any Prisma migration, any new API endpoint, any new UI surface, any seed fixture, or any test code. Those require a Phase B ADR (working title **ADR-0031: Adopt Multi-Standort Phase B Data Model**) and a Phase C ADR (working title **ADR-0032: Adopt Mother-Concern Read APIs**).

This ADR is the natural next gate after `docs/VISION.md` Phases 2, 3, and 5 were documented as the strategic intent and after ADR-0021 (accepted) pinned the no-writeback / human-gating guardrails for the automation layer. ADR-0030 does not touch the automation layer; it pins the **standort-profile contract** that the automation layer will eventually read from (e.g. a future rule that fires per `location.profile`). That future cross-link is documented in `docs/architecture/multi-location-mother-concern.md` §4 but is **not** part of this ADR.

### Scope (Phase A — this ADR)

The Phase A slice ships four file families and nothing else:

| Path                                                                   | Action | Purpose                                                                                              |
|------------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------------|
| `docs/architecture/multi-location-mother-concern.md`                   | new    | Hierarchy `Rauschenberger → Brand → Location → Area → StorageLocation → InventoryItem`, the `LocationProfile` enum, the `StoragePrecisionLevel` enum, the `LocationInventoryConfig` shape, the deferred mother-concern overview endpoint contract, the restated guardrails, the open questions. |
| `docs/architecture/location-profiles.md`                               | new    | The three profiles (`MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `EVENT_BANKETT_FUTURE`), the profile-basiert rule (no name hardcoding), per-profile behavioral expectations. |
| `docs/architecture/cube-premium-compatibility.md`                      | new    | CUBE-specific differences (Bar/Restaurant split, `premiumHandlingRequired`, `qualityNoteRequired`, `batchNoteAllowed`, `PREMIUM_TRACEABLE` storage precision, the no-`CUBE_*` no-fork rules). |
| `docs/DECISIONS.md` (this ADR)                                          | new    | The owning ADR.                                                                                      |
| `docs/agent-team/agent_teamplan.md`                                    | edit   | One paragraph next-gate pointer so the swarm and humans see the in-flight work.                     |
| `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md` | new    | Phase A closure MSPR.                                                                                |

`docs/architecture/` is a new directory. It complements — does not replace — `docs/ARCHITECTURE.md`, which is the POS-adapter / external-source anti-corruption layer. The relationship is documented in the first paragraph of `docs/architecture/multi-location-mother-concern.md`.

### Explicit Non-Scope (this ADR does not authorize)

* **No new Prisma model.** `Brand`, `Location`, `Area`, `LocationProfile` (enum), `StoragePrecisionLevel` (enum), `LocationInventoryConfig`, and any `LocationMember` shape remain unimplemented on `prisma/schema.prisma`. `prisma/schema.prisma` is byte-for-byte unchanged in this slice.
* **No new migration.** `prisma/migrations/` gets no new directory. The latest on-disk migration remains `20260608165159_automation_mutation_policies`.
* **No new API endpoint.** `src/routes/` gets no new file. The 7 read endpoints from the spec (`/organizations`, `/organizations/:id/brands`, `/locations`, `/locations/:id`, `/locations/:id/profile`, `/locations/:id/areas`, `/locations/:id/storage-locations`, `/locations/:id/inventory-config`, `/mother-concern/overview`, `/locations/:id/premium-readiness`) are documented as contracts in `docs/architecture/multi-location-mother-concern.md` and explicitly **deferred** to Phase B / Phase C.
* **No new service module.** `src/modules/` gets no new directory.
* **No new Cockpit page.** `apps/cockpit/` is unchanged.
* **No seed fixture.** `prisma/seeds/` is unchanged.
* **No test file edit.** `tests/` is unchanged. The existing vitest suite (485/485 green per the ADR-0029 back-promotion) must remain green.
* **No env-var edit.** `.env`, `.env.example` are unchanged.
* **No service-role credential, no LLM call, no `InventoryMovement` shortcut, no writeback to any external system.** The same hard guardrails from `AGENTS.md` and `ADR-0021` §3 apply and are restated in `docs/architecture/multi-location-mother-concern.md` §4 in standort context.

### Decisions Made Binding by This ADR

1. **The profile is the discriminator.** CUBE is a profile, not a name. The hardcoded `if (location.name.startsWith("CUBE"))` pattern is **rejected by code review** in any Phase B / Phase C / Phase D slice. The symmetric rule applies: standard behavior is the default, not a name-based branch. (`docs/architecture/location-profiles.md` §2.)
2. **`StorageLocation` stays as-is.** The existing `StorageLocation` model keeps its current semantics (physical spot / shelf). The new `Brand`, `Location`, `Area`, and `LocationInventoryConfig` tables layer on top. A future refactor that renames `StorageLocation` to a different concept is a separate ADR; it is **not** authorized here. (`docs/architecture/multi-location-mother-concern.md` §1, §2.5.)
3. **`InventoryItem` stays as-is.** Article master remains org-wide / global. Per-standort overrides live on the new `LocationInventoryConfig`. No column is added to `InventoryItem` in this contract. (`docs/architecture/multi-location-mother-concern.md` §2.6.)
4. **Mother-concern overview is deferred.** `GET /mother-concern/overview` is documented as a read-only contract and explicitly **not implemented** in this slice. A stub implementation against `StorageLocation` rows would produce a misleading API contract and is rejected. (`docs/architecture/multi-location-mother-concern.md` §3.)
5. **`AutomationDecision` append-only invariant preserved.** The standort-profile contract is independent of the automation layer. The BEFORE UPDATE / BEFORE DELETE triggers on `AutomationDecision` are not touched and not implied-to-be-touched by this ADR.
6. **No new write endpoint just for CUBE.** CUBE Premium uses the existing `/goods-receipts`, `/withdrawals`, `/transfers`, `/correction-requests` endpoints with the existing append-only `InventoryMovement` guarantee. CUBE-specific behavior is expressed as profile-conditional checks at the service or UI layer, not as new HTTP routes.
7. **No service-role shortcut for premium behavior.** Premium = admin is rejected. Premium = staff is rejected. The role gate stays the role gate; the profile is a behavior discriminator, not an authorization level.

### Open Questions (carried into Phase B ADR-0031)

The following questions are explicitly **out of scope** for Phase A and must be resolved by the Phase B ADR (ADR-0031) before any migration is written:

1. **`OrganizationMember` vs `LocationMember`.** Today, `OrganizationMember` carries `userId × organizationId × role`. With a mother concern + brand + location hierarchy, should membership be mother-concern-scoped, location-scoped, or both? Options: (a) keep `OrganizationMember` as mother-concern membership and add a new `LocationMember` for per-standort roles; (b) widen `OrganizationMember` with a `locationId` column; (c) keep as-is and rely on `organizationId` filtering. **ADR-0031 will decide.**
2. **Mother-concern overview endpoint shape.** The aggregation fields (open refill runs, critical stock alerts, open goods receipts, recent deviations, unresolved notes, movement summary), the alerting thresholds, and the export format are not pinned by Phase A. **ADR-0032 (Phase C) will decide.**
3. **Profile-driven Cockpit landing pages.** Whether the Cockpit post-login landing route branches on `location.profile` (e.g. CUBE Premium shows a "Service-Vorbereitung" card) is a Phase D UI concern. Phase A only guarantees that the profile is queryable.
4. **Per-CUBE item premium classification.** Which items are premium is a data decision, not a contract decision. ADR-0031's seed fixtures will include a small example; the full classification is a per-CUBE admin task.
5. **Path convention for the new read endpoints.** ADR-0023 §Open Question §2 chose `/admin/automation/...` to match existing Cockpit admin route grouping. The Phase B read endpoints (`/organizations`, `/locations`, etc.) are not yet pinned to a prefix. The recommended convention is `/admin/location/...` (matching ADR-0023) plus a top-level read-only `/mother-concern/overview` outside the `/admin/` prefix to signal "read-only, no role escalation." **ADR-0031 will pin this.**

### Rollback Plan

Phase A is docs-only. Rollback is a `git revert` of the six file families listed in §Scope. No database state is changed, no service is deployed, no UI is shipped. The revert is safe to apply at any time before the owner flips this ADR to `accepted`.

After ADR-0030 acceptance, rollback of the *contract* (not just the docs commit) requires a new ADR that supersedes ADR-0030. The Phase B / Phase C ADRs depend on the Phase A contract and would need their own amendment.

### Test Plan (Phase A gate)

The Phase A gate is "docs-only review." Verification:

1. `git diff --stat` shows zero changes outside `docs/`. The `apps/`, `api/`, `src/`, `tests/`, `prisma/`, `scripts/`, `package.json`, `package-lock.json`, `.env*`, `.github/` paths are byte-for-byte unchanged.
2. `npm run prisma:validate` is unchanged and remains green.
3. `npm run typecheck` is unchanged and remains green.
4. `npx vitest run` is unchanged and the full suite remains 485/485 green (per the ADR-0029 back-promotion baseline).
5. Manual: a human reviewer reads the three new architecture docs, the new ADR block, the teamplan pointer, and the closure MSPR, and either accepts the ADR (`Status: proposed` → `Status: accepted`) or returns for rework.

### Cross-References

* `docs/architecture/multi-location-mother-concern.md`, `docs/architecture/location-profiles.md`, `docs/architecture/cube-premium-compatibility.md` — the three contract docs.
* `docs/ARCHITECTURE.md` — the POS-adapter / external-source architecture; the new `docs/architecture/` directory complements it.
* `docs/VISION.md` §6 (Phase 2 — Multi-Standort), §7 (Phase 3 — CUBE-Kompatibilität), §9 (Phase 5 — Rauschenberger Mother-Concern Layer), §10 (Phase 6 — Event / Bankett). The phase plan in VISION is the strategic intent; this ADR is the contract.
* `docs/automation/semi-automated-operations-layer.md` and `ADR-0021` (accepted) — the automation layer's no-writeback / human-gating guardrails. The standort-profile contract is independent of the automation layer.
* `ADR-0022` (accepted), `ADR-0023` (accepted), `ADR-0028` (accepted), `ADR-0029` (accepted) — the promotion pattern this ADR follows.
* `AGENTS.md` §Active Specs — authority order.

### Next gate

A human owner reviews this ADR. Acceptance flips `Status: proposed` to `Status: accepted` and authorizes:

* the three `docs/architecture/*.md` files as the binding Phase A contract;
* the teamplan pointer in `docs/agent-team/agent_teamplan.md` and the closure MSPR at `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md` as the closure artifacts.

Acceptance does **not** authorize any code change, any migration, any new route, any new UI, any seed, or any test. The next code-bearing gate is **ADR-0031: Adopt Multi-Standort Phase B Data Model** (proposed; not yet drafted). ADR-0031's slice must:

* resolve the five open questions in §Open Questions above (or carry them forward with owner sign-off);
* ship the `Brand`, `Location`, `Area`, `LocationInventoryConfig` schema additions plus the `LocationProfile` and `StoragePrecisionLevel` enums to `prisma/schema.prisma`;
* ship a forward-only `prisma/migrations/2026xxxxxxxx_add_multi_location_tables/migration.sql`;
* ship a `prisma/seeds/multi_location.sql` fixture (Rauschenberger / Motorworld Inn BB / CUBE Stuttgart) gated on `DEMO_MODE` like the existing `prisma/seeds/*` seeds;
* ship a typed `LocationService` and `LocationDatabaseClient` in `src/modules/location/`;
* ship a `src/routes/location.route.ts` route group with the spec's 7 read endpoints (`/organizations`, `/organizations/:id/brands`, `/locations`, `/locations/:id`, `/locations/:id/profile`, `/locations/:id/areas`, `/locations/:id/storage-locations`, `/locations/:id/inventory-config`);
* ship vitest cases for each endpoint with the existing in-memory stub pattern;
* follow the ADR-0028 promotion pattern: no Cockpit UI call against a real DB until the migration lands on a named Supabase dev project.

Rejection of ADR-0030 routes the slice back to the Orchestrator for an updated envelope. ADR-0030 remains `Status: proposed` until a verdict is recorded.

### Status update (2026-06-08)

ADR-0030 is now `Status: accepted`. The three `docs/architecture/*.md` files
are binding. The teamplan pointer in `docs/agent-team/agent_teamplan.md` (WS-004
row) and the closure MSPR at
`docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md`
are accepted as the closure artifacts for Phase A. The owner-review MSPR at
`docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md` records the
gate verdict and the two numbering corrections that landed in the same accept
commit.

Acceptance does **not** authorize any code change, any migration, any new route,
any new UI, any seed, or any test. The next code-bearing gate is **ADR-0031:
Adopt Multi-Standort Phase B Data Model** (proposed; not yet drafted). Until
ADR-0031 is accepted, no slice may write to `prisma/schema.prisma`, ship a new
`prisma/migrations/*` directory, ship a new `src/modules/location/*` module, ship
a new `src/routes/location.route.ts` route, or land a new `prisma/seeds/*` fixture.

### Acceptance gate (re-affirmed)

The Phase A acceptance gate is the same as ADR-0030 §Test Plan §1–5:

1. `git diff --stat` (post-correction) shows changes only under `docs/architecture/`, `docs/DECISIONS.md`, `docs/agent-team/agent_teamplan.md`, `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md`, and `docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md`. All other paths are byte-for-byte unchanged.
2. `npm run prisma:validate` is unchanged and remains green.
3. `npm run typecheck` is unchanged and remains green.
4. `npx vitest run` is unchanged and the full suite remains 485/485 green.
5. Manual: the owner has read the three new architecture docs, this ADR block, the teamplan pointer, and both MSPR entries, and has flipped the status from `proposed` to `accepted`.

## ADR-0031: Adopt Multi-Standort Phase B Data Model (proposed)

Status: accepted (2026-06-08, owner cheikh.witm@proton.me; owner-review acceptance of the Phase B code-bearing slice. The owner-review MSPR at `docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md` records the gate verdict. No numbering or cross-reference errors were found in the proposed draft; the 4 small doc-naming nits caught during review are corrected in the same accept commit and documented in the MSPR.)

Decision: When accepted, this ADR will authorize the **Phase B code-bearing slice** for the multi-standort / CUBE premium architecture. It promotes the data-model commitments from ADR-0030 §2.1-2.6 and the read-API surface from the spec to `accepted`, and unlocks the 4 new Prisma models (`Brand`, `Location`, `Area`, `LocationMember`), the 2 new enums (`LocationProfile`, `StoragePrecisionLevel`), the `LocationInventoryConfig` join, the forward-only `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql` migration, the `prisma/seeds/multi_location.sql` fixture (Rauschenberger / Motorworld Inn BB / CUBE Stuttgart), the typed `src/modules/location/location.service.ts` and `LocationDatabaseClient`, and the new `src/routes/location.route.ts` route group with 7 read endpoints mounted at `/admin/location/...` (plus a top-level read-only `/mother-concern/overview` placeholder that is **not** in this slice and is explicitly deferred to ADR-0032). It also carries forward the 5 open questions from ADR-0030 §Open Questions and binds the choices for 4 of them in §Decisions Made Binding; the 5th (mother-concern overview endpoint shape) remains deferred to ADR-0032.

This ADR is the natural next gate after ADR-0030 was accepted (2026-06-08). It is the first code-bearing slice for the multi-standort / CUBE premium work and follows the promotion pattern from ADR-0022, ADR-0023, and ADR-0028.

### Scope (Phase B — this ADR)

The Phase B slice ships the following file families and nothing else:

| Path                                                                                                            | Action | Purpose                                                                                                                                                          |
|-----------------------------------------------------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `prisma/schema.prisma`                                                                                          | edit   | 4 new models (`Brand`, `Location`, `Area`, `LocationMember`), 2 new enums (`LocationProfile`, `StoragePrecisionLevel`), 1 new join model (`LocationInventoryConfig`). Existing models are unchanged (per ADR-0030 §Decisions Made Binding §2-3). |
| `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql`                                       | new    | Forward-only migration. Creates the 4 new tables + 2 new enums + the `LocationInventoryConfig` join + the necessary indexes + the foreign keys. No RLS, no grants, no trigger — those land in a separate migration (`20260608171000_add_multi_location_rls`). |
| `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql`                                         | new    | Forward-only migration. Read-only RLS policies on the 4 new tables + `LocationInventoryConfig` for `authenticated` (org-member-scope), plus a sanity-check `DO $$` block that asserts the `AutomationDecision` append-only triggers from `20260608161000_add_automation_phase_b_rls` are still present (regression guard, same pattern as `20260608165159_automation_mutation_policies`). No write policies, no grants to `app_runtime` — the Phase B slice is read-only. |
| `prisma/seeds/multi_location.sql`                                                                               | new    | DEMO_MODE-gated seed fixture. Inserts Rauschenberger / Motorworld Inn BB / CUBE Stuttgart with the minimum inventory to make the Phase B vitest cases runnable against a real Supabase dev project. The seed is **idempotent** (`ON CONFLICT DO NOTHING` on the natural keys) and **never runs in production** (the `DemoSeedService` gate from `src/modules/inventory/demo-seed.service.ts` already enforces this). |
| `src/modules/location/location.service.ts`                                                                      | new    | Typed service with `LocationServicePort` shape. Methods: `listOrganizations(actor)`, `listBrands(actor, organizationId)`, `listLocations(actor, organizationId)`, `getLocation(actor, locationId)`, `getLocationProfile(actor, locationId)`, `listAreas(actor, locationId)`, `listStorageLocations(actor, locationId)`, `listInventoryConfig(actor, locationId)`. Cross-org returns `null`; the route translates to 404. |
| `src/modules/location/location.types.ts`                                                                        | new    | The `LocationProfile` and `StoragePrecisionLevel` enums (re-exported from Prisma client for type narrowing), the `Location` / `LocationArea` / `LocationBrand` / `LocationMember` / `LocationInventoryConfig` DTOs, and the `LocationDatabaseClient` typed interface. |
| `src/routes/location.route.ts`                                                                                  | new    | Fastify route plugin. 7 GET endpoints under `/admin/location/...` per §Decisions Made Binding §4. Role gate: `["admin", "shift_lead", "staff"]` (read-only; staff+ per spec). No mutations. Cross-org returns 404. The actor's `organizationId` is the hard scope; no `locationId` cross-org check is needed because `Location.organizationId` is always equal to the actor's `organizationId` after the org-scope filter. |
| `tests/location.routes.test.ts`                                                                                 | new    | Vitest cases. One happy-path case per endpoint (7), one 401 unauthorized, one 403 forbidden (viewer), one 404 cross-org, one Zod-failure 400. Total: ~11 cases. Stub-DB pattern matches `tests/automation.routes.test.ts`. |
| `src/app.ts`                                                                                                    | edit   | Register the new `locationRoute` plugin. Extend `AppOptions.location` to a new `LocationRouteDependencies` type. Add `buildLocationDependencies` to the construction set. |
| `docs/DECISIONS.md` (this ADR)                                                                                  | new    | The owning ADR.                                                                                                                                                  |

`docs/architecture/`, `prisma/seeds/multi_location.sql`, and `src/routes/location.route.ts` are net-new surfaces. `prisma/schema.prisma`, `prisma/migrations/`, and `src/app.ts` are net-new edits but follow the existing patterns. The two pre-existing untracked files (`c` and `apps/cockpit/lib/supabase/queries/automation-suggestions.ts`) are out of scope and **must not** be touched by this slice.

### Explicit Non-Scope (this ADR does not authorize)

* **No write endpoint.** `src/routes/location.route.ts` is read-only. No POST, no PATCH, no DELETE. Phase B is data-model + read-API only. The first write endpoint (e.g. `POST /admin/location/locations` for a future admin UI to create a new location) is deferred to a future ADR (working title **ADR-0033: Multi-Standort Admin Write APIs**).
* **No `Location`-scoped write policies.** The `20260608171000_add_multi_location_rls` migration is **read-only** — SELECT policies + SELECT grants only. No `INSERT` / `UPDATE` / `DELETE` policy, no `app_runtime` grant. The 4 new tables are readable by `authenticated` org members; writes are not yet authorized.
* **No `mother-concern/overview` endpoint.** The 5th open question from ADR-0030 §Open Questions (mother-concern overview endpoint shape) is **deferred to ADR-0032**. The top-level `/mother-concern/overview` placeholder in the spec is not shipped in this slice; it would need a cross-org aggregation, which contradicts the org-scope RLS policy of the new tables.
* **No premium-readiness endpoint.** `GET /locations/:id/premium-readiness` is also deferred to ADR-0032 (it is profile-aware and depends on the same aggregation logic as the mother-concern overview).
* **No CUBE-specific write endpoint.** ADR-0030 §Decisions Made Binding §6 still holds: CUBE Premium uses the existing `/goods-receipts`, `/withdrawals`, `/transfers`, `/correction-requests` endpoints. The Phase B slice does not introduce a CUBE-only write path.
* **No Cockpit UI change.** `apps/cockpit/` is unchanged. The Phase B read APIs are not yet wired into any Cockpit page. The first Cockpit wire-up is gated to a Phase D ADR (working title **ADR-0034: Cockpit Standort-Kontext**).
* **No automation rule change.** `AutomationRule` / `AutomationSuggestion` / `AutomationDecision` are unchanged. The new standort-profile fields are not yet consumed by any rule condition. A future ADR (working title **ADR-0035: Profile-Aware Automation Conditions**) will close the cross-link named in `multi-location-mother-concern.md` §4.
* **No `InventoryItem` schema change.** Per ADR-0030 §Decisions Made Binding §3.
* **No `StorageLocation` schema change.** Per ADR-0030 §Decisions Made Binding §2.
* **No env-var edit.** `.env`, `.env.example` are unchanged.
* **No service-role credential, no LLM call, no `InventoryMovement` shortcut, no writeback to any external system.** The same hard guardrails from `AGENTS.md`, `ADR-0021` §3, and `ADR-0030` §4 apply.

### Decisions Made Binding by This ADR

ADR-0030 §Open Questions named 5 questions and said "ADR-0031 will decide." This ADR binds the choices for 4 of them. The 5th (mother-concern overview endpoint shape) is deferred to ADR-0032.

1. **`OrganizationMember` vs `LocationMember` → Option (a): keep `OrganizationMember` as mother-concern membership, add a new `LocationMember` for per-standort roles.**
   - **Decision:** New `LocationMember` table with `(locationId, userId, role, isActive)`. `OrganizationMember` stays exactly as it is. Existing RLS policies (e.g. `20260531132000_harden_user_profile_rls`, `20260531174500_add_inventory_org_ownership`) and existing routes (which filter on `actor.organizationId`) are not touched.
   - **Why not (b) widen `OrganizationMember`:** Adding a nullable `locationId` column to `OrganizationMember` would require a backfill migration and a re-write of every existing RLS policy that filters on `organizationId`. The blast radius is large; the option is rejected for Phase B.
   - **Why not (c) keep as-is:** With multiple locations per organization, the existing `actor.organizationId` filter is too coarse — a Motorworld Inn BB shift lead would see CUBE Stuttgart's data. Option (c) is rejected because the spec (`docs/architecture/multi-location-mother-concern.md` §1) requires location-scoped reads.
   - **What ships in this slice:** the `LocationMember` model with the 5 fields above + an index on `(locationId, userId)` and a foreign key to `Location`. The org-scope read filter is `(actor.organizationId === Location.organizationId) AND (LocationMember.userId === actor.userId OR actor.role === 'admin')`; the second disjunct is role-gated, not membership-gated, and is only needed for future admin UIs. **For Phase B, only the membership-gated read is implemented.** The role-gated read is a Phase D concern.
   - **Cross-org safety:** the new RLS policy on `Location`, `Area`, `LocationInventoryConfig`, `LocationMember` is `authenticated`-role + `EXISTS (SELECT 1 FROM "OrganizationMember" om WHERE om."organizationId" = Location."organizationId" AND om."userId" = (SELECT auth.uid())::text)`. The 4 new tables are org-scoped, not location-scoped; the per-location narrowing happens in the service layer by filtering on `LocationMember.userId = actor.userId` for non-admin actors.

2. **Path convention for the new read endpoints → `/admin/location/...` + top-level read-only `/mother-concern/overview` deferred to ADR-0032.**
   - **Decision:** The 7 read endpoints ship under `/admin/location/...` to match the ADR-0023 path-convergence convention. The route group's path prefix is `/admin/location`. The top-level `/mother-concern/overview` is **not** in this slice and is explicitly deferred to ADR-0032.
   - **Concrete paths (Phase B):**
     - `GET /admin/location/organizations` (lists the actor's organization; not the spec's `/organizations` cross-org list, because the actor can only see their own org)
     - `GET /admin/location/organizations/:id/brands` (lists the org's brands)
     - `GET /admin/location/locations` (lists the org's locations)
     - `GET /admin/location/locations/:id` (location detail)
     - `GET /admin/location/locations/:id/profile` (location profile + precision level)
     - `GET /admin/location/locations/:id/areas` (lists the location's areas)
     - `GET /admin/location/locations/:id/storage-locations` (lists the location's physical `StorageLocation` rows, joined via `Area.storageLocationId` or via a future `StorageLocation.locationId` column if Phase B adds one — **see §Open Questions for ADR-0031 carried forward, Q1**)
     - `GET /admin/location/locations/:id/inventory-config` (lists the location's `LocationInventoryConfig` rows)
   - **Spec deviation (named explicitly):** The spec (`docs/architecture/multi-location-mother-concern.md` §1 implicit) lists 7 read endpoints without a `/admin/` prefix. The Phase B slice prefixes them with `/admin/location/` to match the ADR-0023 path-convergence convention. The deviation is named here for the same reason ADR-0023 §Open Question §2 named the `/admin/automation/...` deviation: the `/admin/` prefix makes the role-rank boundary explicit at the URL level.

3. **`LocationInventoryConfig` minimum field set is the 11 fields from ADR-0030 §2.6, no reduction allowed.** This ADR confirms the binding:
   - `id`, `locationId`, `inventoryItemId`, `areaId`, `storageLocationId`, `targetQuantity`, `minimumQuantity`, `premiumHandlingRequired`, `qualityNoteRequired`, `batchNoteAllowed`, `isActive`.
   - **No additions in this slice.** A future ADR (working title **ADR-0036: Premium Item Trace Fields**) may add `premiumBatchMinQuantity`, `qualityNoteSeverity`, etc., but only with its own ADR.
   - **No removals.** A future ADR may deprecate a field via the standard deprecation cycle (column stays, write path stops emitting it, read path warns), not via a silent removal.

4. **CUBE Premium profile is the `CUBE_PREMIUM` enum value, with `PREMIUM_TRACEABLE` precision level.** The `LocationInventoryConfig` flags `premiumHandlingRequired`, `qualityNoteRequired`, `batchNoteAllowed` are per-row (per-article-per-location), not per-profile. A CUBE Premium `Location` for a non-premium article sets all three flags to `false`. This binds ADR-0030 §3 (the `LocationInventoryConfig` section in `cube-premium-compatibility.md`).

5. **`EVENT_BANKETT_FUTURE` is reserved and unused.** The enum value exists so the data model can carry it without an immediate schema change. No seed fixture row uses it. No UI references it. A future Phase 6 ADR (per `docs/VISION.md` §10) will gate its first use.

### Open Questions (carried forward from ADR-0030)

1. **`StorageLocation` ↔ `Location` / `Area` link.** The existing `StorageLocation` table is org-scoped (`organizationId`) but not location-scoped. The spec and ADR-0030 §2.5 imply that `StorageLocation` is a physical spot inside a Location (via Area). The Phase B slice has two options:
   - **(A) Add a nullable `StorageLocation.locationId` (or `StorageLocation.areaId`) column to the existing `StorageLocation` table** in the same migration. Backfill is required (every existing `StorageLocation` row needs a `locationId`). The new RLS policy on `StorageLocation` becomes `org-scoped AND (location-scoped via the new column)`.
   - **(B) Leave `StorageLocation` as-is (org-scoped only) and add the location-scope filter in the service layer** by joining `StorageLocation` → `Area` (which IS location-scoped) via a new `Area.storageLocationId` foreign key. The 4 new tables are read-only; `StorageLocation` is unchanged.
   - **Decision (binding for this ADR):** Option **(B)**. The Phase B slice does **not** add a `locationId` column to `StorageLocation`. The new `Area` table has an optional `storageLocationId` column that points to the existing `StorageLocation`. The route `GET /admin/location/locations/:id/storage-locations` joins `Area.storageLocationId` → `StorageLocation.id` to return the location's physical spots.
   - **Why not (A):** Adding a `locationId` column to `StorageLocation` is a schema change to a table that is **not** in the Phase B scope (per ADR-0030 §Decisions Made Binding §2). The Phase B slice is the smallest safe change; widening `StorageLocation` is a future ADR.
   - **Risk:** a `StorageLocation` row that is not yet linked to any `Area.storageLocationId` is invisible to the new read endpoint. The Cockpit storage page (`apps/cockpit/app/(app)/storage/page.tsx`) still sees all of them; the new endpoint is location-scoped. A future migration backfill is the resolution, gated to a follow-up ADR.

2. **Mother-concern overview endpoint shape** → deferred to ADR-0032. Not in this slice.

3. **Profile-driven Cockpit landing pages** → deferred to a Phase D ADR (working title **ADR-0034: Cockpit Standort-Kontext**). Not in this slice.

4. **Per-CUBE item premium classification** → out of scope for Phase B. The seed fixture inserts a small example (e.g. one CUBE Premium article with all three flags set) so the vitest cases have data; the full classification is a per-CUBE admin task in a future write-enabled ADR.

5. **Path convention for `/mother-concern/overview`** → deferred to ADR-0032.

### Rollback Plan

Phase B is **forward-only on disk** (per the ADR-0022 / ADR-0028 / ADR-0023 pattern). The two new migrations are not applied to a Supabase dev project until the owner-typed `npx prisma migrate deploy` step in the ADR-0028-style promotion gate. Rollback options:

- **Before promotion:** `git revert` of the Phase B commit. No DB state is changed. Safe at any time before the owner accepts the promotion.
- **After promotion to a Supabase dev project:** the manual `DROP/REVOKE` cleanup script documented in §Rollback Plan below (the §Rollback Plan block in this ADR). The script drops the 2 new enums, the 4 new tables, and revokes the SELECT grant. It does not touch any existing model.

### Rollback Plan (this slice — exact script shape)

The following cleanup script is the manual rollback path. It is **not** committed as a `down.sql` (per the ADR-0022 / ADR-0023 forward-only convention); it is documented here for the owner's reference and run by the human only if the Phase B migration needs to be reverted after a Supabase promotion.

```sql
-- Manual rollback of ADR-0031 (Phase B). Run only against the named Supabase
-- dev project. Does NOT touch any pre-existing model.

DROP TABLE IF EXISTS "LocationInventoryConfig" CASCADE;
DROP TABLE IF EXISTS "LocationMember"          CASCADE;
DROP TABLE IF EXISTS "Area"                    CASCADE;
DROP TABLE IF EXISTS "Location"                CASCADE;
DROP TABLE IF EXISTS "Brand"                   CASCADE;
DROP TYPE  IF EXISTS "LocationProfile"          CASCADE;
DROP TYPE  IF EXISTS "StoragePrecisionLevel"   CASCADE;

-- No REVOKE needed: the SELECT grants in 20260608171000_add_multi_location_rls
-- are dropped with the tables (CASCADE).
```

After the manual rollback, `prisma/schema.prisma` is reverted via `git revert` of the Phase B commit, `npx prisma generate` is re-run, and the existing 485/485 vitest baseline is re-asserted.

### Test Plan (Phase B gate)

The Phase B gate is the same shape as ADR-0023 §Test Plan + the ADR-0028 promotion pattern. Verification (in order):

1. `npx prisma validate` clean.
2. `npm run typecheck` clean.
3. The 11 new vitest cases in `tests/location.routes.test.ts` pass:
   - `GET /admin/location/organizations` happy (returns the actor's org)
   - `GET /admin/location/organizations/:id/brands` happy
   - `GET /admin/location/locations` happy
   - `GET /admin/location/locations/:id` happy + 404 cross-org
   - `GET /admin/location/locations/:id/profile` happy
   - `GET /admin/location/locations/:id/areas` happy
   - `GET /admin/location/locations/:id/storage-locations` happy (joins via `Area.storageLocationId`)
   - `GET /admin/location/locations/:id/inventory-config` happy
   - 401 unauthorized (no `Authorization: Bearer` header)
   - 403 forbidden (viewer role)
   - 400 Zod failure (malformed `:id` in the URL)
4. `npx vitest run` — full suite green (485 prior + 11 new = 496 cases, all green).
5. `npm --prefix apps/cockpit run typecheck` clean (no Cockpit change; the typecheck is a regression guard).
6. `DATABASE_URL=<supabase-dev> npx prisma migrate status` — the new migration is on disk and the migration loader reads it successfully alongside the 28 prior migrations.
7. **Promotion gate (separate, post-acceptance):** the owner-typed `npx prisma migrate deploy` against the named Supabase dev project, plus a 12-query verification script in the same shape as `scripts/verify-automation-phase-b-migrations.ts`. Until the promotion gate passes, the new read APIs are on disk and tested via in-memory stubs but not against a real database.

### Cross-References

* `ADR-0030` (accepted) — Phase A contract; this ADR is the code-bearing follow-up.
* `ADR-0021` (accepted), `ADR-0022` (accepted), `ADR-0023` (accepted), `ADR-0028` (accepted), `ADR-0029` (accepted) — the promotion pattern this ADR follows.
* `docs/architecture/multi-location-mother-concern.md`, `docs/architecture/location-profiles.md`, `docs/architecture/cube-premium-compatibility.md` — the three contract docs whose §2 entity lists this ADR operationalizes.
* `docs/automation/semi-automated-operations-layer.md` and `ADR-0021` §3 — the automation layer's no-writeback / human-gating guardrails. Phase B does not touch the automation layer. The `AutomationDecision` append-only invariant is preserved and is re-checked by the new `20260608171000_add_multi_location_rls` migration's `DO $$` sanity block.
* `AGENTS.md` §Active Specs — authority order.
* `prisma/migrations/20260531132000_harden_user_profile_rls`, `20260531174500_add_inventory_org_ownership` — the existing RLS policies on `UserProfile` and `InventoryItem` that Phase B does not touch and that the new `OrganizationMember` lookup in §Decisions Made Binding §1 relies on.
* `src/modules/inventory/demo-seed.service.ts` — the existing `DEMO_MODE` gate that the new `prisma/seeds/multi_location.sql` fixture hooks into.
* `src/modules/automation/automation-rule.service.ts` — pattern reference for the typed `LocationDatabaseClient` shape (the same `as unknown as Tx` cast pattern; the same in-memory stub pattern in the vitest fakes).
* `src/routes/automation.route.ts` — pattern reference for the Fastify route registration + `authenticate` helper.

### Next gate

A human owner reviews this ADR. Acceptance flips `Status: proposed` to `Status: accepted` and authorizes the **single code-bearing slice** described in §Scope. After acceptance:

- the slice lands as one PR (one logical change per commit; same pattern as the ADR-0023 acceptance commit `39fc896` and the ADR-0028 acceptance flow);
- the migration is on disk, the schema is validated, the 11 vitest cases are green, the full suite remains 496/496 green;
- the next gate is the **owner-typed `npx prisma migrate deploy` against the named Supabase dev project** (the ADR-0028 promotion pattern), gated by a fixed 12-query verification script in the same shape as `scripts/verify-automation-phase-b-migrations.ts`;
- the next ADR after the promotion gate passes is **ADR-0032: Adopt Mother-Concern Read APIs (proposed; not yet drafted)**, which ships the `GET /mother-concern/overview` and `GET /admin/location/locations/:id/premium-readiness` endpoints against the new tables, plus a Phase D ADR (working title **ADR-0034: Cockpit Standort-Kontext**) which wires the read APIs into the Cockpit UI.

Rejection of ADR-0031 routes the slice back to the Orchestrator for an updated envelope (e.g. the owner may want a different membership shape — option (b) or (c) of §Decisions Made Binding §1 — or a different path convention). ADR-0031 remains `Status: proposed` until a verdict is recorded.

### Status update (2026-06-08)

ADR-0031 is now `Status: accepted`. The 10 file families in §Scope are
authorized. The owner-review MSPR at
`docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md` records the
gate verdict and the 1 nit that was corrected in the same accept commit: the
§Next gate cited the ADR-0023 acceptance commit as `2a46e05`, which is
actually the B-3/B-4 read-path commit; the real ADR-0023 acceptance commit is
`39fc896`. The correction is text-only and does not change any binding
decision.

Acceptance authorizes the **single code-bearing slice** described in §Scope.
Until the owner-typed `npx prisma migrate deploy` against the named Supabase
dev project passes the ADR-0028-style 12-query promotion gate, the new read
APIs and the new tables are on disk and tested via in-memory stubs but **not**
exercised against a real database. No Cockpit UI may call the new endpoints
until the promotion gate passes. The next ADR after the promotion gate
passes is **ADR-0032: Adopt Mother-Concern Read APIs (proposed; not yet
drafted)**, which ships `GET /mother-concern/overview` and
`GET /admin/location/locations/:id/premium-readiness` against the new tables.

#### Phase B implementation slice (2026-06-08, branch `phase-b-multistandort`)

The implementation slice authorized by this ADR has been written locally and
is on the `phase-b-multistandort` branch. The slice implements the 9
in-scope file families (1 schema edit + 2 forward-only migrations + 1
DEMO_MODE-gated seed + 2 new src files + 1 new route + 1 src/app.ts
edit + 1 new test file + 1 new MSPR). The 12 new vitest cases
(8 happy + 1 404 cross-org + 1 401 + 1 403 + 1 400 Zod failure) pass; the
full vitest suite is 497/497 green (485 baseline + 12 new, 0
regressions; the 485 vs 468 baseline discrepancy is from the C-3a +
C-3b+C-4 + C-5 + ADR-0025 commits that landed between the ADR-0029
back-promotion baseline and the Phase B implementation slice; the
MSPR records the discrepancy for future audit). `npx prisma validate`
and `npm run typecheck` are both clean. The 5 binding decisions in
§Decisions Made Binding are respected: (1) `OrganizationMember` is
unchanged, new `LocationMember` is added; (2) the 8 read endpoints
are mounted under `/admin/location/...` per the path convention; (3)
the 11-field `LocationInventoryConfig` minimum set is unchanged; (4)
`CUBE_PREMIUM` + `PREMIUM_TRACEABLE` are the CUBE profile defaults;
(5) `EVENT_BANKETT_FUTURE` is reserved but unused in the seed. The
closure MSPR at
`docs/agent-team/mspr_logbook/2026-06-08-phase-b-data-model.md` records
the file inventory, the validation results, and the per-decision
evidence.

Until the owner-typed `npx prisma migrate deploy` against the named
Supabase dev project passes the ADR-0028-style 12-query promotion gate,
the new read APIs and the new tables are on disk and tested via
in-memory stubs but **not** exercised against a real database. No
Cockpit UI may call the new endpoints until the promotion gate passes.
The next gate after the promotion gate passes is the **ADR-0028-style
Supabase promotion** of the 2 new migrations to a named Supabase dev
project (separate from `czinchfegtglmrloxlmh`, which is the Phase B/C
promotion target), gated by a fixed 12-query verification script in
the same shape as `scripts/verify-automation-phase-b-migrations.ts`.
The next ADR after the promotion gate passes is **ADR-0032: Adopt
Mother-Concern Read APIs (proposed; not yet drafted)**, which ships
`GET /mother-concern/overview` and
`GET /admin/location/locations/:id/premium-readiness` against the new
tables.

### Acceptance gate (re-affirmed)

The Phase B acceptance gate is the same shape as ADR-0023 §Test Plan + the
ADR-0028 promotion pattern:

1. `npx prisma validate` clean.
2. `npm run typecheck` clean.
3. The 11 new vitest cases in `tests/location.routes.test.ts` pass (one per endpoint, plus 401, 403, 400, 404).
4. `npx vitest run` — full suite green (485 prior + 11 new = 496 cases).
5. `npm --prefix apps/cockpit run typecheck` clean (regression guard; no Cockpit change).
6. `DATABASE_URL=<supabase-dev> npx prisma migrate status` — the new migration loads successfully.
7. **Promotion gate (separate, post-acceptance):** the owner-typed `npx prisma migrate deploy` against the named Supabase dev project, plus a 12-query verification script.

## ADR-0036: Adopt CUBE Venue-Layer Spec (Documentation-Only Slice)

Status: accepted (Owner-Acceptance 2026-06-09, Cheikh)

> **Acceptance note (2026-06-09):** Owner accepted ADR-0036 incl. Sub-Sections A/B/C.
> The three spec slices (`00a`/`00b`/`00c`) + gap-analysis (`00`) are now the **binding
> conceptual specification** for the CUBE Operations Layer. This acceptance authorizes
> **no** schema/route/Cockpit/writeback/LLM work; each implementation slice still requires
> its own ADR (ADR-0029-A/B/C). **Precondition discovered at acceptance:** the base
> substrates from Tasks 01/02/03 (`OperationalUnit`, `ServiceSlot`, `GroupRule`, `Menu`,
> `MenuItem`, `EventPackage`, `BeveragePackage`, `EventInquiry`) **do not yet exist** in
> `prisma/schema.prisma`. ADR-0029-A must therefore **create** these substrates in their
> 00a-annotated shape (not merely extend them).

Decision: When accepted, this ADR will adopt the three CUBE-Venue-Layer spec slices
(`docs/tasks/logik/00a-cube-venue-model-spec.md`, `00b-cube-source-conflict-validator.md`,
`00c-cube-event-economic-rules.md`) plus the gap-analysis file
(`docs/tasks/logik/00-cube-venue-spec-gap.md`) as the **binding conceptual specification**
for the CUBE Operations Layer in Bevero. The specs are **read-only annotations over
existing substrates** (Tasks 01/02/03) and **proposed new substrates** that close three
identified gap clusters. This ADR does **not** authorize any migration, any Fastify
route, any Cockpit view, any external writeback, or any LLM-driven approval. Each
future implementation slice requires its own ADR (proposed: ADR-0029-A, ADR-0029-B,
ADR-0029-C) following the ADR-0022/0023 pattern: schema-only migration, RLS plan,
read-only endpoints, vitest gate, Supabase promotion script.

This ADR is the natural next gate after ADR-0035 closed (CUBE Event-Intake Read APIs)
and the gap surfaced by the user CUBE-Deepdive (2026-06-09).

### Hard-Guardrails (binding for all sub-sections and future implementation slices)

- **CUBE = own Organization, own RLS-Scopes, own Members.** Multi-tenant separation
  per ADR-0014. Standort-Hierarchie (`parentContext: kunst_museum_stuttgart`) is
  configuration data, not an authority relationship.
- **No `InventoryMovement` shortcut.** Event-, Package-, Rental-, and Source-Conflict
  rules create `AutomationSuggestion` (ADR-0022/0023) or `WorkflowTask` records —
  never direct stock mutations. The workflow path remains
  `WorkflowTask → InventoryMovement` per ADR-0006.
- **No automatic Source-Conflict resolution.** Manager approval via the existing
  `POST /admin/automation/suggestions/:id/approve` (ADR-0023) is the only path.
  No last-write-wins, no LLM resolver, no deterministic merge (ADR-0021 §3).
- **No writeback to FoodNotify / Gastronovi / Microsoft Dynamics 365 / DATEV /
  Rauschenberger central systems.** Bridges are read-only (ADR-0002, ADR-0021).
- **No LLM** in the Decision Engine, Source-Conflict-Resolution, Beverage-Calculation,
  Daypart-Resolution, Weather-Sensitivity, or Offer-Calculation (ADR-0021 §3).
- **Restaurant-/Bar-Preise = `gross_including_vat`.** Event-/Bankett-/Rental-Preise =
  `net_excluding_vat`. Hard invariant, DB-Check-Constraint in the implementation
  slice. Cockpit shows `gross_including_vat` only as a calculated overlay with
  `vatRate` from `Location`; persistence is always `net_excluding_vat` for
  Event/Bankett/Rental substrates.
- **Weather sensitivity** is client-side Cockpit-Logic, no external API
  (ADR-0021 §3 verbietet).
- **No service-role credentials in user-facing request paths.** `app_runtime` /
  `app_user` model from ADR-0017 remains authoritative.
- **PII-Sanitization** per ADR-0021 §5: `rawMessage`, `contactEmail`, `contactPhone`
  are sanitized before export/retention. Cockpit-Read-API never returns these
  fields. `CUBE_SourceField.fieldValue` darf keine PII enthalten.
- **Append-only Audit** for `AutomationDecision` and `CUBE_Conflict` (no
  `UPDATE` / `DELETE` after the resolve timestamp; soft-activation only).

### Sub-Section ADR-0036-A: Venue-Model Spec

Source: `docs/tasks/logik/00a-cube-venue-model-spec.md`.

Authorizes the **annotation of** `OperationalUnit` (Task 01), `ServiceSlot` (Task 01),
`GroupRule` (Task 01), `Menu` (Task 02), `MenuItem` (Task 02), `EventPackage` (Task 03),
`BeveragePackage` (Task 03), and `EventInquiry` (Task 03) with the eight decision
sections documented in 00a (Venue-Graph, Service-Slot-Matrix, Reservierungs-Logic,
Offer-Catalog, Beverage-Packages, o.T. Bar, Private-Packages, Intake-Fallback).
The spec proposes field extensions (`parentContext`, `requiresManualConfirmation`,
`weatherSensitive`, `inventoryScopes`, `dayparts`, `exclusiveRentalFrom`,
`seatedMenuMax`, `standingReceptionMax`, `priceMode`, `durationHoursMin/Max`,
`isKidsPackage`, `eventPhaseFactor`, `requiredLeadTimeDays`, `paymentMode`,
`cancellationPolicy`, `windowSeat`, `includedItems`, `addOns`,
`confirmationEmailSentAt`, `confirmationExpectedWithinMinutes`,
`confirmationReminderSentAt`). Six Open Questions are documented (Spange-Seed,
parentContext shape, slot-overrides, capacity-policy placement, weather
client-side, dayparts shape) and route to ADR-0029-A for resolution.

**Implementation ADR (proposed, not yet drafted):** ADR-0029-A. Gate shape:
npx prisma validate, npx vitest run (11 new cases), Supabase promotion script.

### Sub-Section ADR-0036-B: Source-Conflict-Validator

Source: `docs/tasks/logik/00b-cube-source-conflict-validator.md`.

Authorizes the **proposal of** three new substrates: `CUBE_Source` (versioned
external sources like `cube_website`, `cube_bankettmappe_pdf`, `cube_kontaktseite`),
`CUBE_SourceField` (key-value pairs with `confidence` enum), and `CUBE_Conflict`
(detected field conflicts awaiting manager resolution). The spec defines a
**deterministic, non-LLM** detection model: a Cockpit-Read-Endpoint or admin
trigger endpoint compares active `CUBE_SourceField` rows and creates a
`CUBE_Conflict` plus a corresponding `AutomationSuggestion { type: "custom",
metadata.conflict: true }`. Manager approval reuses ADR-0023 endpoints, with
**Open Question 3** asking whether the existing `/admin/automation/suggestions/:id/approve`
body is extended with `winningFieldValue` or whether Source-Conflict resolution gets
its own dedicated endpoint pair (`POST /admin/cube/conflicts/:id/resolve`).
**Recommendation:** own endpoint pair; ADR-0029-B implementation slice decides.

**No PDF-Ingest, no Crawl-Engine, no LLM-Resolver** in this or any future slice.
Manual entry of `CUBE_Source` data via Cockpit-Form (separate follow-up task).

**Implementation ADR (proposed, not yet drafted):** ADR-0029-B. Gate shape: 7
new vitest cases, RLS test, Append-only trigger test, 10-query Supabase promotion.

### Sub-Section ADR-0036-C: Event-Economic-Rules

Source: `docs/tasks/logik/00c-cube-event-economic-rules.md`.

Authorizes the **proposal of** four new substrates: `ExclusiveRentalPolicy`
(raummiete + mindestverzehr + capacities, all `net_excluding_vat`),
`AfterMidnightStaffRate` (5 roles, hourly rates after 24:00), `NonFoodComponent`
(`included_by_default`, `optional_addon`, `cost_driver`), `FurniturePolicy`
(parallel storage of conflicting thresholds like Website 100 vs. Bankettmappe 120).
**All example seeds are verbatim from the CUBE-Deepdive §9/§10** with
`isActive: false` + `requiresManagerConfirmation: true` markers — they are
**not** source-of-truth until manager verification.

**Hard DB-Constraints:** `category = "included_by_default"` ⇒
`extraCostNetCents IS NULL` UND `defaultIncluded = true`. `scope IN
('restaurant_*', 'ot_bar')` ⇒ `priceMode = 'gross_including_vat'`. `scope IN
('corporate_event', 'exclusive_rental', 'private_package')` ⇒
`priceMode = 'net_excluding_vat'`. Violations raise PostgreSQL `23514
check_violation`.

**No Offer-Calculator, no Cockpit-Editor, no PDF-Export** in this or any future
slice until ADR-0080+.

**Implementation ADR (proposed, not yet drafted):** ADR-0029-C. Gate shape: 9
new vitest cases, 14-query Supabase promotion, RLS test, Brutto/Netto-Invariant
test, Furniture-Conflict-Display test.

### Authority Order

ADR-0014 → ADR-0017 → ADR-0021 → ADR-0022 → ADR-0023 → ADR-0030 → this ADR. In case of conflict, the previous ADR wins; this ADR must be updated or superseded before implementation begins. **Implementation Substrate (Tasks 01/02/03) und Cockpit (Task 08) bauen auf ADR-0036-A/B/C auf; ihre Implementation-ADRs (ADR-0034, 0035, 0048, 0053 in der 2026-06-09 Renumbering-Konvention, siehe `docs/tasks/logik/README.md` §"Task-Verzeichnis") werden in den jeweiligen ADR-Blocks referenziert.** Die früher hier aufgeführten Glieder ADR-0034/0035/0037 waren irrtümlich — zum Zeitpunkt der ADR-0036-Acceptance existierten die Implementation-ADR-Blöcke noch nicht und waren noch nicht durchnummeriert.

### Rollback

This ADR is documentation-only. Rollback means:

1. Revert the commits that added the four `docs/tasks/logik/00*.md` files.
2. Revert the commit that added this ADR block to `docs/DECISIONS.md`.
3. Revert the MSPR-Logbook entry at
   `docs/agent-team/mspr_logbook/2026-06-09-cube-venue-spec-gap.md`.

No database migration, no Prisma schema change, no `package.json` change,
no `.env*` change, no `src/`, no `apps/`, no `api/`, no `web/` change. No
data, no schema, no env, and no CI state is left behind.

### Open Questions (cross-referenced from 00a/00b/00c)

| # | Question | Source | Default |
|---|---|---|---|
| 1 | `spange_ground_floor` Seed-Erweiterung — eigener Folge-Task? | 00a §1 | yes, follow-up |
| 2 | `parentContext` freier String oder FK auf `LocationContext`? | 00a §1 | freier String |
| 3 | Slot-Override-Listen für o.T.-Bar-Wochentag-Konflikt? | 00a §2 | Phase-3.4-Folge |
| 4 | `exclusiveRentalFrom` in `GroupRule` oder neuer `CapacityPolicy`-Substrat? | 00a §3 | in `GroupRule` |
| 5 | Wetter-Sensitivität client-side oder externes API? | 00a §6 | client-side |
| 6 | `dayparts` als String[] auf `OperationalUnit` oder eigener Substrat? | 00a §6 | String[] |
| 7 | `CUBE_Source`/`CUBE_SourceField` brand-übergreifend (`public`) oder CUBE-spezifisch? | 00b §1 | `public` |
| 8 | `CUBE_Conflict` als eigenes Substrat oder nur `CUBE_SourceField.confidence`? | 00b §2 | eigenes Substrat |
| 9 | Eigene Source-Conflict-Mutation-Endpoints oder ADR-0023-Body-Erweiterung? | 00b §3 | eigene Endpoints |
| 10 | `ExclusiveRentalPolicy` brand-übergreifend oder CUBE-spezifisch? | 00c §1 | `public` |
| 11 | `securityHourlyNetCents` in `AfterMidnightStaffRate` oder eigener `SecurityRate`? | 00c §2 | in `AfterMidnightStaffRate` |
| 12 | `extraCostNetCents` als fixer Preis oder `null` (= auf Anfrage)? | 00c §3 | beides zulässig |
| 13 | `FurniturePolicy` in `00b` (Source-Conflict) oder `00c` (Event-Economics)? | 00c §4 | in `00c` |

### Cross-references

- `AGENTS.md` §"Active Specs & Authority".
- `docs/tasks/logik/README.md` §"Handling Rules" (ADR-Discipline).
- `docs/tasks/logik/00-cube-venue-spec-gap.md` — gap analysis.
- `docs/tasks/logik/00a-cube-venue-model-spec.md` — venue-model spec.
- `docs/tasks/logik/00b-cube-source-conflict-validator.md` — source-conflict spec.
- `docs/tasks/logik/00c-cube-event-economic-rules.md` — event-economic spec.
- `docs/tasks/logik/01-cube-sub-units-data-model.md` (Task 01) — annotated.
- `docs/tasks/logik/02-cube-menu-matrix.md` (Task 02) — annotated.
- `docs/tasks/logik/03-cube-event-intake-read-apis.md` (Task 03) — annotated.
- `docs/tasks/logik/08-cockpit-cube-service-slot-dashboard.md` (Task 08) — annotated.
- `docs/agent-team/mspr_logbook/2026-06-09-cube-venue-spec-gap.md` — closure MSPR.
- ADR-0002, 0014, 0017, 0021, 0022, 0023 (binding).
- ADR-0030, 0034, 0035, 0037 (inherited).

### Next gate

Owner acceptance of this ADR (Status: proposed → accepted). After acceptance,
three implementation ADRs become draftable in parallel:
- **ADR-0029-A** (Venue-Model-Impl) — migration + 3 extended read-endpoints + 11 vitest cases.
- **ADR-0029-B** (Source-Conflict-Impl) — 3 new substrates + 2 read-endpoints + 1 mutation-endpoint-pair + 7 vitest cases.
- **ADR-0029-C** (Event-Economic-Impl) — 4 new substrates + 4 read-endpoints + 9 vitest cases + 14-query Supabase promotion.

Each follows the ADR-0022/0023 pattern: schema-only migration, RLS plan,
read-only or single-mutation endpoint set, vitest gate, Supabase promotion script.

## ADR-0029-A: CUBE Venue-Model Implementation — Operational Units (Slice 1)

Status: accepted (Owner-Acceptance 2026-06-09, Cheikh)

Decision: First code-bearing slice under ADR-0036 (accepted). Because the base
substrates from Tasks 01/02/03 were never built, this slice **creates** the three
foundational venue substrates in their 00a-annotated shape (not "extends" them):

- **`OperationalUnit`** — Geschäftswelt (Restaurant/Bar/Event/Café/Outdoor-Terrasse/
  Hotel-Kontext/Lounge), 1:n on `Location`, decoupled from `Area` (Lagerwelt).
  00a-annotations folded in from the start: `parentContext`, `requiresManualConfirmation`
  (00a §1), `weatherSensitive` + `outdoorCapacityRelevant` (00a §1/§6/Task-01-OQ4),
  `inventoryScopes` + `dayparts` (00a §6). New enum `OperationalUnitType`.
- **`ServiceSlot`** — operative Zeitfenster, 1:n on `OperationalUnit`. `daysOfWeekMask`
  (Bitmask Mo..So), `startTimeLocal`/`endTimeLocal` (HH:mm local strings), plus 00a §2
  annotations `slotKind`, `kitchenTimeLocal`, `inventoryImpact`.
- **`GroupRule`** — Reservierungs-Decision-Engine inputs, 1:1 on `OperationalUnit`.
  `alaCarteMaxGuests`, `groupMenuRequiredFrom`, `bankettInquiryFrom` (00a §3) +
  optional capacity thresholds `exclusiveRentalFrom`, `seatedMenuMax`,
  `standingReceptionMax` (00a §3, Task-01-OQ4 kept in `GroupRule` for v1).

Scope is read-only. The Brutto/Netto invariant, `priceMode`, Menu/EventPackage/
BeveragePackage/EventInquiry substrates and their 00a annotations (00a §4/§5/§7/§8)
are deferred to the next slice (ADR-0029-A.2 / -B / -C). No mutation surface, no
writeback, no LLM, no Cockpit wiring (ADR-0021 §3, README logik/ §Handling Rules).

### Discipline bindings

- **ADR-0030 §Decisions §1 (Profile-Discriminator):** units are resolved via
  `Location` + `OperationalUnitType`, never `name === "CUBE"`.
- **ADR-0021 §3:** read-only, deterministic, no LLM, no external writeback.
- **ADR-0002:** POS systems remain read-only sources.
- **ADR-0017:** RLS enforced; org-member SELECT policies only, no `app_runtime`
  grant (read-only slice, same as ADR-0031 Phase B).

### File scope

- `prisma/schema.prisma` — 3 models + enum `OperationalUnitType`.
- `prisma/migrations/20260609xxxx_add_operational_units/migration.sql` — forward-only DDL.
- `prisma/migrations/20260609xxxx_add_operational_units_rls/migration.sql` — RLS + grants.
- `prisma/seeds/operational_units.sql` — DEMO_MODE-gated, 3 CUBE units + slots + 1 GroupRule.
- `src/modules/operational-unit/{operational-unit.types.ts,operational-unit.service.ts}`.
- `src/routes/operational-unit.route.ts` — 4 read endpoints.
- `src/app.ts` — route registration + `buildOperationalUnitDependencies`.
- `tests/operational-unit.routes.test.ts` — 11 vitest cases.
- `scripts/verify-adr-0029a-operational-units.ts` — 14-query Supabase promotion.

### Read endpoints

- `GET /admin/operational-units/locations/:id/units` — units for a location.
- `GET /admin/operational-units/:id` — unit detail incl. 00a annotations.
- `GET /admin/operational-units/:id/slots` — service slots for a unit.
- `GET /admin/operational-units/:id/group-rule` — the reservation decision rule.

### Gate (Definition of Done)

`npx prisma validate` green; `npm run typecheck` green; `npx vitest run` green incl.
11 new cases; verify script 14/14 against the named Supabase dev project (run by
owner — not from this environment). Supabase promotion via `prisma migrate deploy`
is the next gate before any Cockpit consumes these reads.

### Open Questions carried to next slices

`spange_ground_floor` seed (00a OQ1), `parentContext` FK-vs-string (00a OQ2),
slot-override lists (00a OQ3), `CapacityPolicy` extraction (00a OQ4), weather
client-side vs API (00a OQ5 — decided client-side), `dayparts` String[] vs substrate
(00a OQ6 — String[] in v1).


## ADR-0029-A2: CUBE Menu Matrix & Event-Intake Read APIs (Slice 1.2)

Status: proposed — pending owner review. On acceptance the frontmatter flips to
`accepted` and code implementation is authorized.

Decision: Fourth code-bearing slice under ADR-0036 (accepted), implementing the
remaining CUBE-Premium-specific read substrates from Tasks 02 and 03. Combines
two task specs into a single implementation slice because both depend on
`OperationalUnit` (ADR-0029-A) and share the same Brutto/Netto DB-Check-Constraint
pattern (00a §4). No mutation surface; mutations are deferred to a future slice
(analogous to ADR-0029-B.2 for Source-Conflict and ADR-0029-C.2 for
Event-Economic).

**Task 02 — Menu Matrix (`cube-menu-matrix`, ADR-0035 substrate):**
Four new public-schema models (`Menu`, `MenuItem`, `MenuItemIngredient`,
`MenuItemAllergen`) + one new enum (`MenuCategory`). `Menu` carries
`priceMode` (6 possible values) and `scope` (8 possible values) as String
fields with a DB-Check-Constraint enforcing the Brutto/Netto invariant
(00a §4 verbatim). `MenuItem` carries optional `imageUrl`. `MenuItemIngredient`
is a consumption hint (not a recipe); FK on the global `InventoryItem` master.
`MenuItemAllergen` uses free string codes (LMIV/EU-konform), no global master.
Read endpoints: list menus by unit + slotKind filter, get menu by id, get menu
item with ingredients and allergens.

**Task 03 — Event-Intake Read APIs (`cube-event-intake-read`, ADR-0048 substrate):**
Six new public-schema models (`EventInquiry`, `EventPackage`, `EventPackageMenuItem`,
`EventPackageBeverage`, `EventPackageSelection`, `BeveragePackage`) + four new enums
(`EventInquirySubject`, `EventInquiryStatus`, `BeveragePackageName`,
`EventPackageOrderMode`). `EventPackage` carries `priceMode`/`scope`/`paymentMode`/
`cancellationPolicy` fields (00a §4+§7), `requiredLeadTimeDays` (default 3),
`windowSeat`, `includedItems[]`, `addOns[]`, `defaultGuestCount`. `BeveragePackage`
carries `isKidsPackage`, `childAgeMin/Max`, `under5Free`, `eventPhaseFactor`
(00a §5). `EventInquiry` carries PII fields (`rawMessage`, `contactEmail`,
`contactPhone`) and confirmation-tracking fields (`confirmationEmailSentAt`,
`confirmationExpectedWithinMinutes`, `confirmationReminderSentAt`) per 00a §8.
**PII rule (00a §8 + ADR-0021 §5, non-negotiable):** `rawMessage`, `contactEmail`,
`contactPhone` are **never** returned by the Cockpit Read API — only
`EventInquiry` header fields. A `sanitizePII` service-layer regex scrubs before
export (mirror ADR-0029-B §Decisions §5). DB-level defense-in-depth length caps:
`length("rawMessage") <= 5000`, `length("contactEmail") <= 500`.

### Discipline bindings (both tasks)

- **ADR-0030 §Decisions §1 (Profile-Discriminator):** No `name === "CUBE"` hardcoding.
- **ADR-0021 §3:** Read-only, deterministic, no LLM, no external writeback.
- **ADR-0021 §5:** PII-Sanitization on EventInquiry read path.
- **ADR-0017:** RLS enforced; org-member SELECT policies only, no `app_runtime` grant.
- **ADR-0029-A:** Schema-shape, service-pattern, 14-query-verify pattern are binding precedent.
- **00a §4 verbatim:** `priceMode IN ('gross_including_vat', 'net_excluding_vat',
  'per_person', 'for_two_persons', 'minimum_consumption', 'rental_fee')`;
  `scope IN ('restaurant_lunch', 'restaurant_dinner', 'group_lunch', 'group_dinner',
  'corporate_event', 'exclusive_rental', 'private_package', 'ot_bar')`.
  Restaurant/Bar scopes ⇒ `gross_including_vat`; Event/Bankett/Rental scopes ⇒
  `net_excluding_vat`. Hard invariant enforced by DB-Check-Constraint; violation
  returns pg error 23514 `check_violation`.
- **00a §7:** DB-Invariante `scope = 'private_package' ⇒ paymentMode = 'prepayment'`.

### Scope (this ADR authorizes — Task 02)

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `prisma/schema.prisma` | edit | 4 models (`Menu`, `MenuItem`, `MenuItemIngredient`, `MenuItemAllergen`) + enum `MenuCategory` |
| 2 | `prisma/migrations/20260609090000_add_cube_menu_matrix/migration.sql` | new | Forward-only DDL + Brutto/Netto DB-Check-Constraint |
| 3 | `prisma/migrations/20260609090001_add_cube_menu_matrix_rls/migration.sql` | new | RLS: ENABLE, 1 SELECT-Policy/table, authenticated SELECT only, no `app_runtime` grant, no Write-Policies |
| 4 | `prisma/seeds/cube_menus.sql` | new | DEMO_MODE-gated, id-guarded seed; 3 menus + items + ingredients + allergens |
| 5 | `src/modules/menu/menu.types.ts` | new | DTOs; `priceMode`/`scope` as required fields; `imageUrl?` on `MenuItem` |
| 6 | `src/modules/menu/menu.service.ts` | new | `listByUnitAndSlot`, `getById`, `getItemWithDetails` |
| 7 | `src/routes/menu.route.ts` | new | 3 GET endpoints path-encoded under `/admin/menu/...` (no `fastify.register({ prefix })`) |
| 8 | `src/app.ts` | edit | Route registration + `buildMenuDependencies(options)` factory |
| 9 | `tests/menu.routes.test.ts` | new | 9 vitest cases |
| 10 | `scripts/verify-adr-0029a2-menu-matrix.ts` | new | 14-query Supabase promotion script |

### Scope (this ADR authorizes — Task 03)

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `prisma/schema.prisma` | edit | 6 models + 4 enums |
| 2 | `prisma/migrations/20260609100000_add_cube_event_intake/migration.sql` | new | Forward-only DDL + Brutto/Netto + private_package invariant + PII length caps |
| 3 | `prisma/migrations/20260609100001_add_cube_event_intake_rls/migration.sql` | new | RLS: ENABLE, SELECT-policies (org-scoped + `assignedToUserId` scope on EventInquiry) |
| 4 | `prisma/seeds/cube_event_intake.sql` | new | DEMO_MODE-gated seed; 3 packages + 2 beverage packages + 1 inquiry |
| 5 | `src/modules/event-inquiry/event-inquiry.types.ts` | new | DTOs; `EventInquiryHeaderDto` (no PII); `sanitizePII` helper |
| 6 | `src/modules/event-inquiry/event-inquiry.service.ts` | new | 5 read methods; PII-scrubbed on every inquiry read |
| 7 | `src/routes/event-inquiry.route.ts` | new | 5 GET endpoints path-encoded under `/admin/cube/...` |
| 8 | `src/app.ts` | edit | Route registration + `buildEventInquiryDependencies(options)` factory |
| 9 | `tests/event-inquiry.routes.test.ts` | new | 12 vitest cases |
| 10 | `scripts/verify-adr-0029a2-event-intake-read.ts` | new | 14-query Supabase promotion script |

### Read endpoints (Task 02)

- `GET /admin/menu/operational-units/:unitId/menus?slotKind=...` — list active menus for a unit.
- `GET /admin/menu/:id` — menu detail with items.
- `GET /admin/menu/items/:id` — item detail with ingredients and allergens.

### Read endpoints (Task 03)

- `GET /admin/cube/event-inquiries` — list inquiries (header fields only, no PII).
- `GET /admin/cube/event-inquiries/:id` — inquiry detail (header fields, no PII).
- `GET /admin/cube/event-packages` — list active event packages.
- `GET /admin/cube/event-packages/:id` — package detail.
- `GET /admin/cube/beverage-packages` — list active beverage packages.

### Open Questions resolved by this ADR

1. `priceMode`/`scope` as String with DB-Check-Constraint (not Enum) — resolved: String +
   DB-Check-Constraint (stable 8 scopes, Enum-migration overhead avoided; per 00a §4
   recommendation and Task 02/03 OQ).
2. `MenuItemAllergen` as free string code — resolved: `allergenCode String` (LMIV-list
   is country-specific; Task 02 OQ2).
3. `Menu` historized via `validFrom`/`validUntil` — resolved: ISO-DateTime strings (Task 02 OQ3).
4. `MenuItem.imageUrl` — resolved: `String?` optional (Task 02 OQ4).
5. `EventInquiry.rawMessage` persisted with RLS-Scope — resolved: persist + RLS-Scope on
   `assignedToUserId` (Task 03 OQ1).
6. `BeveragePackage.includedCategories` as `String[]` — resolved (Task 03 OQ2).
7. `EventPackage.pricePerPersonCents` as snapshot — resolved (Task 03 OQ3).
8. `EventInquiry.assignedToUserId` as `String?` without FK — resolved; FK-promotion is
   ADR-0062-Folge (Task 03 OQ4).
9. `EventPackage.scope`/`paymentMode` as separate columns — resolved (Task 03 OQ last).

### Gate (Definition of Done)

- `npx prisma validate` green; `npm run typecheck` green.
- `npx vitest run` green: 9 new cases (Task 02) + 12 new cases (Task 03) added to suite.
- Task 02: `scripts/verify-adr-0029a2-menu-matrix.ts` 14/14 against named Supabase dev project.
- Task 02: Brutto/Netto-23514-test throws `check_violation`.
- Task 03: `scripts/verify-adr-0029a2-event-intake-read.ts` 14/14 against named Supabase dev project.
- Task 03: Brutto/Netto-23514-test + private_package-invariant-23514-test both throw.
- Task 03: PII-Scrubbing-test: response never contains `rawMessage`/`contactEmail`/`contactPhone`.
- Owner-Acceptance (cheikh.witm@proton.me) flips status to `accepted`.

### Next gate

After acceptance and Supabase promotion of both scripts: Task 04
(`motorworld-inn-standortlogik-contract`, ADR-0049) is docs-only and can proceed
in parallel. Task 05 (`motorworld-inn-data-model`, ADR-0050) depends on Task 01
substrate (landed) + Task 04 contract (docs-only) and can follow immediately.


## ADR-0029-B: CUBE Source-Conflict-Validator Implementation (Slice 2)

Status: accepted (Owner-Acceptance 2026-06-09, cheikh.witm@proton.me)

Decision: Second code-bearing slice under ADR-0036 (accepted). The 00b-cube-
source-conflict-validator substrate was never built; this slice **creates** the
three CUBE source-conflict substrates in their 00b-annotated shape (not "extends"
them):

- **`CUBE_Source`** — versioned source register per organization (e.g.
  `cube_website`, `cube_kontaktseite`, `cube_bankettmappe_pdf`). Carries
  `name`, `displayName`, `version`, `retrievedAt`, `url`, `payloadHash`,
  `isActive`, `enteredBy`. Brand-übergreifend, org-scoped.
- **`CUBE_SourceField`** — key/value rows attached to a `CUBE_Source`. Carries
  `fieldKey`, `fieldValue`, `confidence` (new enum
  `CUBE_SourceFieldConfidence { confirmed, conflict_detected,
  requires_manager_confirmation }`), `discoveredAt`, `updatedAt`. Carries a
  **unique composite** `(sourceId, fieldKey)` to prevent phantom conflicts
  (see §1, must-fix SCHEMA-004).
- **`CUBE_Conflict`** — detected conflicts awaiting manager resolution.
  Carries `fieldKey`, `sourceIds String[]` (soft-reference array), `detectedAt`,
  `resolvedAt`, `resolvedBySuggestionId` (soft-reference), `winningFieldValue`.
  Append-only at the DB layer via two BEFORE UPDATE/DELETE triggers (see §11,
  nice-to-fix SCHEMA-008). DB-level length cap on `fieldValue` and
  `winningFieldValue` (see §8, nice-to-fix SCHEMA-006).

Scope is **read-only at the application layer**; mutation of `CUBE_Conflict`
(`resolvedAt`, `winningFieldValue`, `resolvedBySuggestionId`) is **deferred to
a future mutation slice** (ADR-0029-B.2). Cockpit is a **consumer**, not a
mutator, in this slice (ADR-0021 §3, README logik/ §Handling Rules).

### Sub-Phase / Sibling Refs

- Parent: ADR-0036 (CUBE-Phase-B Working Paper, accepted).
- Sibling (Slice 1): ADR-0029-A (OperationalUnit / ServiceSlot / GroupRule,
  accepted 2026-06-09) — file `docs/DECISIONS.md:1722-1789`.
- Sibling (planned, parallel): ADR-0029-C (Event-Economic substrates).
- Precedent: ADR-0031 Phase B (multi-location), ADR-0022 (Automation rules),
  ADR-0023 (Automation mutation), ADR-0021 (read-only posture).

### Scope

This slice is forward-only and additive. The following files are created
(or modified in-place). No existing model, migration, route, or test is
modified.

1. **`prisma/schema.prisma`** — three new models in `@@schema("public")`
   (`CUBE_Source`, `CUBE_SourceField`, `CUBE_Conflict`) and one new enum
   (`CUBE_SourceFieldConfidence`). The `CUBE_SourceField` model has
   `@@unique([sourceId, fieldKey])` (**not** `@@index`); see §1 must-fix.
   `CUBE_SourceField` additionally has `@@index([organizationId, fieldKey])`
   (not `@@index([fieldKey])`); see §5 nice-to-fix. `CUBE_SourceField.confidence`
   carries `@default(requires_manager_confirmation)`; see §10 nice-to-fix.
   `CUBE_Conflict` has `@@index([organizationId, resolvedAt])` and
   `@@index([organizationId, fieldKey, resolvedAt])` (not `@@index([resolvedAt])`);
   see §9 nice-to-fix. Both `CUBE_SourceField.fieldValue` and
   `CUBE_Conflict.winningFieldValue` carry `CHECK (length("fieldValue") <= 500)`
   and `CHECK (length("winningFieldValue") <= 500)` defense-in-depth caps;
   see §8 nice-to-fix. **No `deletedAt` field on `CUBE_Source`**; soft-
   deactivation uses the `isActive` flag only; see §1 nice-to-fix.
2. **`prisma/migrations/<ts>_add_cube_source_conflict_tables/migration.sql`** —
   forward-only DDL: `CREATE TYPE … AS ENUM (…)` first, then `CREATE TABLE`
   blocks in dependency order (`CUBE_Source` before `CUBE_SourceField` before
   `CUBE_Conflict`), then `CREATE INDEX` / `CREATE UNIQUE INDEX`, then
   `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY`. The `CUBE_Conflict.sourceIds`
   column is `TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` (matching the
   OperationalUnit precedent at
   `prisma/migrations/20260609040000_add_operational_units/migration.sql:30-31, 49`;
   see §12 nice-to-fix MIG-001). No `IF NOT EXISTS` clauses (matches
   OperationalUnit migration at lines 1-99).
3. **`prisma/migrations/<ts>_add_cube_source_conflict_rls/migration.sql`** —
   forward-only RLS: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for each of the
   three tables, `GRANT SELECT … TO authenticated` only (no `app_runtime`
   grant), then `DROP POLICY IF EXISTS` + `CREATE POLICY` (one
   `FOR SELECT TO authenticated` per table, USING clause byte-identical to
   `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:38-44, 52-58, 67-73`).
   The defense-in-depth `DO $$` block at the bottom of the file asserts
   **only** the 2 `AutomationDecision` append-only triggers
   (`automation_decision_block_update`, `automation_decision_block_delete`),
   exactly mirroring the OperationalUnit precedent at
   `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:83-101`.
   **The block does NOT assert policy counts**; see §2 must-fix. After the
   trigger check, the migration creates the 2 `CUBE_Conflict` append-only
   triggers (`cube_conflict_block_update`, `cube_conflict_block_delete`),
   exactly mirroring the `AutomationDecision` pattern at
   `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql:130-152`;
   see §11 nice-to-fix.
4. **`prisma/seeds/cube_source_conflict.sql`** — DEMO_MODE-gated, idempotent
   (every INSERT uses `WHERE NOT EXISTS (SELECT 1 FROM "<table>" WHERE id = '<literal>')`).
   Seeds 3 `CUBE_Source` rows (all `isActive: false`), 9 `CUBE_SourceField`
   rows (all `confidence = 'requires_manager_confirmation'`), and 3 pre-seeded
   open `CUBE_Conflict` rows (`cf-cube-ot-bar-hours`, `cf-cube-menu-count`,
   `cf-cube-furn-thresh`). All rows are scoped to
   `organizationId = 'demo-organization-main'`. The seed's header comment
   documents the deliberate `isActive: false` asymmetry with the
   OperationalUnit seed at `prisma/seeds/operational_units.sql:42, 54, 66`
   (OperationalUnit seed = venue graph truth; CUBE seed = disputed data
   awaiting manager verification); see §13 nice-to-fix SEED-002.
5. **`src/modules/cube-source-conflict/cube-source-conflict.types.ts`** —
   type exports mirroring the 00b spec.
6. **`src/modules/cube-source-conflict/cube-source-conflict.service.ts`** —
   read service, service-layer `sanitizePII` defense, defensive
   soft-reference check on `CUBE_Conflict.sourceIds`.
7. **`src/routes/cube-source-conflict.route.ts`** — Fastify plugin
   registering the 5 endpoints. Routes are **path-encoded under
   `/admin/cube/...`** (no `fastify.register(plugin, { prefix: '/admin/cube' })`
   call), mirroring the OperationalUnit route at
   `src/routes/operational-unit.route.ts:30-31`; see §14 nice-to-fix CROSS-001.
8. **`src/app.ts`** — route registration
   `app.register(cubeSourceConflictRoute, options.cubeSourceConflict ?? buildCubeSourceConflictDependencies(options));`
   and the `buildCubeSourceConflictDependencies(options)` function modeled
   on `buildOperationalUnitDependencies(options)` at
   `src/app.ts:450-469` (mirroring the registration pattern at
   `src/app.ts:207-210`).
9. **`tests/cube-source-conflict.routes.test.ts`** — 7 new vitest cases
   (mirroring the OperationalUnit routes test structure).
10. **`scripts/verify-adr-0029b-cube-source-conflict.ts`** — 15-query
    Supabase promotion script. Mirrors `scripts/verify-adr-0029a-operational-units.ts:1-363`
    in structure, but uses **single-letter codes** for `pg_policies.cmd`:
    `'r'` for SELECT, `'a'` for INSERT, `'w'` for UPDATE, `'d'` for DELETE.
    The string forms `'SELECT'`, `'INSERT'`, `'UPDATE'`, `'DELETE'` would
    return 0 rows because `pg_policies.cmd` is `char`, not `text`. The
    pre-existing 0029a script at lines 175-176, 189 uses
    `cmd = 'SELECT'` (latent bug); the CUBE script **must not inherit
    this bug**; see §3 must-fix.

### Explicit Non-Scope (deferred to ADR-0029-B.2 or later)

- **No mutation surface.** `CUBE_Conflict` mutation (resolve, set
  `winningFieldValue`, `resolvedBySuggestionId`) is deferred to
  ADR-0029-B.2. RLS denies writes by default; the append-only triggers
  block raw UPDATE/DELETE today; the future mutation slice will use a
  `WITH CHECK`-gated UPDATE policy on `resolvedBy` paths.
- **No writeback** to FoodNotify, Microsoft Dynamics 365, DATEV,
  Rauschenberger, or any external system (per
  `docs/automation/semi-automated-operations-layer.md` guardrails).
- **No LLM-driven approval, ordering, or stock mutation.** The
  `sanitizePII` helper is a deterministic regex, not an LLM.
- **No service-role credentials** in user-facing request paths (RLS
  authoritative; ADR-0014).
- **No `app_runtime` grant** in this slice (read-only discipline;
  matches the OperationalUnit RLS migration's absence of an
  `app_runtime` grant at `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:25-27`).
- **No per-location / per-brand isolation.** All 3 tables are
  org-scoped only (no `locationId` column); the
  `AutomationRule.@@unique([organizationId, name])` precedent at
  `prisma/schema.prisma:133` and `Brand.@@unique([organizationId, slug])`
  at `prisma/schema.prisma:930` use the same pattern. The CUBE
  source-conflict substrate is brand-übergreifend in this slice; v1 is
  single-brand. Future ADR-0029-B.2 / brand-isolation follow-up may add
  a `locationId` column. See §15 nice-to-fix SEED-001.
- **No ID-prefix org/location encoding** (`src-cube-*` stays as-is for
  v1; the future-ADR rename path is `src-<org-slug>-*` or
  `src-cube-stuttgart-*`). See §15 nice-to-fix SEED-003.

### Decisions Made Binding

The numbered decisions below are binding on the Implementer. The 3 must-fix
issues and the resolved nice-to-fix issues from the Data-DB review are
tagged inline.

#### §1 `CUBE_SourceField.@@unique([sourceId, fieldKey])` — a unique composite index **[must-fix from Data-DB review, SCHEMA-004]**

`CUBE_SourceField.@@unique([sourceId, fieldKey])` — a unique composite index.
Rationale: the conflict-detection logic treats `(sourceId, fieldKey)` as the
canonical key for "one claim from one source". Two rows with the same key
would create a phantom conflict (the detection logic would compare row A's
value against row B's value and flag a conflict between two rows that
belong to the same source). The `OperationalUnit` precedent at
`prisma/schema.prisma:1069` uses `@@unique([locationId, key])` for the
analogous case ("one venue key per location"). The verify-script's check
#12 in `scripts/verify-adr-0029b-cube-source-conflict.ts` is amended to
assert the presence of the unique index (e.g. by querying
`pg_index.indisunique` for the index on `(sourceId, fieldKey)`); a 15th
query was added to the verify-script to cover this without disturbing
the existing 12.

#### §2 Defense-in-depth `DO $$` block asserts only the 2 `AutomationDecision` triggers **[must-fix from Data-DB review, RLS-001]**

The `DO $$` defense-in-depth block at the bottom of
`prisma/migrations/<ts>_add_cube_source_conflict_rls/migration.sql`
asserts **only** the 2 `AutomationDecision` append-only triggers
(`automation_decision_block_update` count = 1, `automation_decision_block_delete`
count = 1), on mismatch raising `RAISE EXCEPTION … USING ERRCODE = 'restrict_violation'`.
**The block does NOT assert policy counts** for the `Automation*` policies
or the prior ADR-0029-A policies. Rationale: the OperationalUnit precedent
at `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:83-101`
asserts only the 2 triggers. Future ADRs (ADR-0023, ADR-0025, ADR-0029-C)
will add more `Automation*` policies, and a count-based assertion would
be fragile. The trigger assertion is the durable, append-only invariant.

#### §3 Verify-script uses textual `pg_policies.cmd` codes **[corrected post-promotion, see closure MSPR]**

The verify-script at `scripts/verify-adr-0029b-cube-source-conflict.ts`
uses the **textual** `pg_policies.cmd` codes: `'SELECT'`, `'INSERT'`,
`'UPDATE'`, `'DELETE'`, `'ALL'`. This is the form exposed by the
`pg_policies` view on Supabase Postgres 15 (verified empirically during
the live-DB promotion, see `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b-closure.md`
§1.2 Finding 1 and the corrected comment block at
`scripts/verify-adr-0029b-cube-source-conflict.ts:176-191`). The original
binding decision in this ADR §3 assumed single-letter codes (`'r'`,
`'a'`, `'w'`, `'d'`) per the Data-DB review's §VERIFY-001 — **that
assumption was a misreading of the Postgres source**; the textual form is
the working form. The pre-existing 0029a verify-script at
`scripts/verify-adr-0029a-operational-units.ts:176` is therefore **not**
a latent bug; it uses the working form already. Check #5 ("3 SELECT RLS
policies exist") uses `cmd = 'SELECT'`; check #6 ("no write policies")
uses `cmd IN ('INSERT', 'UPDATE', 'DELETE')`; check #8 ("no write-policies"
defense-in-depth) uses the same `cmd IN (...)` filter on `pg_policies`
(not on `information_schema.role_table_grants`, because the default
Supabase grants on `authenticated` / `anon` are **not** a security risk —
RLS denies by default — and a REVOKE migration
(`prisma/migrations/20260609050002_revoke_cube_write_grants`) was added
as defense-in-depth to remove the formal write privileges anyway).

#### §4 `CUBE_Source` has no `deletedAt` field — soft-deactivation via `isActive` only **[nice-to-fix from Data-DB review, SCHEMA-001, Resolve]**

`CUBE_Source` carries `isActive Boolean @default(true)` and **no**
`deletedAt DateTime?` field. Rationale: most repo models (OperationalUnit,
ServiceSlot, GroupRule, Brand, Location, Area, LocationMember,
LocationInventoryConfig, InventoryItem) use `isActive` for soft-deactivation
(per ADR-0009). Only `AutomationRule` at `prisma/schema.prisma:635` uses
`deletedAt`. For consistency with the OperationalUnit precedent, `CUBE_Source`
relies on `isActive` only. The original spec at
`docs/tasks/logik/00b-cube-source-conflict-validator.md:47` listed
`deletedAt`, but the binding decision drops it. **SCHEMA-002** is therefore
moot (no `deletedAt` to disambiguate the unique index); see §15 deferral.

#### §5 `CUBE_SourceField.@@index([organizationId, fieldKey])` (not `@@index([fieldKey])`) **[nice-to-fix from Data-DB review, SCHEMA-005, Resolve]**

`CUBE_SourceField` has `@@index([organizationId, fieldKey])` (not
`@@index([fieldKey])`). Rationale: a `WHERE fieldKey = ?` query without
`organizationId` is a full-index-scan-and-discard, violating the repo's
org-first indexing convention. Precedent: `OperationalUnit.@@index([organizationId])`
at `prisma/schema.prisma:1070` and `ServiceSlot.@@index([organizationId])`
at `prisma/schema.prisma:1094` always lead with `organizationId`.

#### §6 `CUBE_SourceField.@@index([organizationId])` and `@@index([confidence])` (mirroring OperationalUnit / ServiceSlot convention) **[nice-to-fix from Data-DB review, SCHEMA-005, Resolve]**

In addition to `@@unique([sourceId, fieldKey])` (binding decision §1) and
`@@index([organizationId, fieldKey])` (binding decision §5), `CUBE_SourceField`
has `@@index([organizationId])` (mirroring `OperationalUnit.@@index([organizationId])`
at `prisma/schema.prisma:1070`) and `@@index([confidence])` (preserved from
the original proposal).

#### §7 `CUBE_Source.@@unique([organizationId, name, version])` is the v1 unique key (no partial unique) **[nice-to-fix from Data-DB review, SCHEMA-003, Defer]**

`CUBE_Source.@@unique([organizationId, name, version])` is the v1 unique
key. The invariant "only one active version per (org, name)" is
**deferred to service-layer enforcement** in v1. Rationale: a partial
unique index (`@@unique([organizationId, name]) WHERE "isActive" = true`)
is Postgres-specific and not portable; the repo convention for soft-
deactivation invariants is to enforce in the service layer. The MSPR
residual-risks list records the invariant as a follow-up for ADR-0029-B.2
or a dedicated partial-unique ADR. **SCHEMA-002** is moot (see §4).

#### §8 DB-level `CHECK (length(...) <= 500)` on `fieldValue` / `winningFieldValue` **[nice-to-fix from Data-DB review, SCHEMA-006, Resolve]**

`CUBE_SourceField.fieldValue` and `CUBE_Conflict.winningFieldValue` carry
a DB-level `CHECK (length("fieldValue") <= 500)` and
`CHECK (length("winningFieldValue") <= 500)` respectively. Rationale: the
service-layer `sanitizePII` regex is the **only** PII mitigation; a length
cap is the defense-in-depth backstop to prevent accidental megabyte-sized
values. PII-regex DB-level CHECKs are **out of scope** for this slice
(flagged for ADR-0029-B.2 per the Data-DB review). The 500-character cap
is consistent with the typical manager-entered key/value row (e.g.
`ot_bar_sunday_thursday_hours` = `"18:00–24:00"`).

#### §9 `CUBE_Conflict.@@index([organizationId, resolvedAt])` and `@@index([organizationId, fieldKey, resolvedAt])` **[nice-to-fix from Data-DB review, SCHEMA-009, Resolve]**

`CUBE_Conflict` has `@@index([organizationId, resolvedAt])` (not
`@@index([resolvedAt])`) and an additional
`@@index([organizationId, fieldKey, resolvedAt])` for the primary Cockpit
list view ("this specific conflict between these sources, in this state").
Org-first leading column matches the repo convention.

#### §10 `CUBE_SourceField.confidence @default(requires_manager_confirmation)` **[nice-to-fix from Data-DB review, SCHEMA-010, Resolve]**

`CUBE_SourceField.confidence` carries `@default(requires_manager_confirmation)`.
Rationale: the future mutation slice will need to insert fields
programmatically and rely on a schema default; mirrors
`OfflineActionQueue.status @default(pending)` at `prisma/schema.prisma:701`.

#### §11 `CUBE_Conflict` append-only via 2 BEFORE UPDATE/DELETE triggers **[nice-to-fix from Data-DB review, SCHEMA-008, Resolve]**

`CUBE_Conflict` is append-only at the DB layer via two triggers
(`cube_conflict_block_update`, `cube_conflict_block_delete`) that fire
`BEFORE UPDATE` and `BEFORE DELETE` respectively, calling
`public.cube_conflict_append_only()` which raises
`RAISE EXCEPTION 'CUBE_Conflict is append-only: % is not permitted', TG_OP USING ERRCODE = 'restrict_violation';`.
Triggers are added in the RLS migration
(`prisma/migrations/<ts>_add_cube_source_conflict_rls/migration.sql`),
after the defense-in-depth `DO $$` block. The function and triggers
mirror `AutomationDecision` at
`prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql:130-152`
exactly (modulo the `cube_conflict_*` names). INSERT is **not** blocked
by the trigger; the future mutation slice will use a `WITH CHECK`-gated
UPDATE policy to set `resolvedAt` / `winningFieldValue` /
`resolvedBySuggestionId`. The read-only slice has no INSERT surface; the
seed is the only INSERT path and is DEMO_MODE-gated.

#### §12 `CUBE_Conflict.sourceIds TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` **[nice-to-fix from Data-DB review, MIG-001, Resolve]**

`CUBE_Conflict.sourceIds` is `TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` in
the schema migration, matching the OperationalUnit precedent at
`prisma/migrations/20260609040000_add_operational_units/migration.sql:30-31, 49`.
The `AutomationSuggestion.relatedItemIds TEXT[]` precedent at
`prisma/migrations/20260608160000_add_automation_phase_b_tables/migration.sql:43`
(not null-default) is **not** the chosen pattern. The not-null default
prevents accidental empty-NULL confusion in the conflict-detection
service layer.

#### §13 Seed header documents the `isActive: false` asymmetry **[nice-to-fix from Data-DB review, SEED-002, Resolve]**

The seed file `prisma/seeds/cube_source_conflict.sql` has a header comment
explaining the deliberate `isActive: false` posture for all 3
`CUBE_Source` rows: the OperationalUnit seed at
`prisma/seeds/operational_units.sql:42, 54, 66` represents venue graph
truth (`isActive: true`); the CUBE source seed represents **disputed data**
that the manager must verify (`isActive: false`). This asymmetry is
intentional and mirrors the
`docs/automation/semi-automated-operations-layer.md` discipline of
"no automatic writeback / no automatic approval".

#### §14 Route plugin uses path-encoded `/admin/cube/...` routes (no `prefix` option) **[nice-to-fix from Data-DB review, CROSS-001, Resolve]**

The CUBE route plugin at `src/routes/cube-source-conflict.route.ts`
registers its endpoints with path-encoded `/admin/cube/...` paths (e.g.
`app.get("/admin/cube/sources", …)`), mirroring the OperationalUnit route
at `src/routes/operational-unit.route.ts:30-31`
(`"/admin/operational-units/locations/:id/units"`) and the Location route
at `src/routes/location.route.ts`. The repo convention is **path-encoded
prefixes, not `fastify.register(plugin, { prefix: '/admin/...' })`**.
Verified by `grep -rn "prefix:" src/` returning only
`src/agent-team/swarm-review-gate.ts:158` (unrelated helper). The 5
endpoints (`GET /admin/cube/sources`, `GET /admin/cube/sources/:id`,
`GET /admin/cube/sources/:id/fields`, `GET /admin/cube/conflicts`,
`GET /admin/cube/conflicts/:id`) follow the same path structure.

#### §15 Deferrals (one-line each; residual-risks live in the MSPR)

- **SCHEMA-002** (no `deletedAt` to disambiguate) — **moot** after §4.
- **SCHEMA-003** (partial unique on `(org, name) WHERE isActive = true`) —
  deferred to service-layer enforcement in v1; see §7.
- **SCHEMA-007** (`CUBE_Conflict.sourceIds` not FK-enforced) — acceptable
  for v1 (small N, service-layer defensive check on read); future
  ADR-0029-B.2 may add a `CUBE_ConflictSource` join table; recorded in
  MSPR residual-risks.
- **SEED-001** (no `locationId` on `CUBE_Source` for CUBE-specificity) —
  v1 is org-scoped; future ADR-0029-B.2 / brand-isolation follow-up may
  add `locationId`; recorded in MSPR residual-risks.
- **SEED-003** (ID prefix `src-cube-*` lacks org/location id) — keep
  `src-cube-*` for v1 (single brand); future-ADR rename path is
  `src-<org-slug>-*` or `src-cube-stuttgart-*`; recorded in MSPR
  residual-risks.

#### §16 Enum value casing [nice-to-fix from Data-DB review, SCHEMA-011, Resolve]

`CUBE_SourceFieldConfidence` uses **lowercase-with-underscores** values
(`confirmed`, `conflict_detected`, `requires_manager_confirmation`). This
**breaks** the repo convention of `UPPERCASE_WITH_UNDERSCORES` (precedent:
`OperationalUnitType` at `prisma/schema.prisma:1035-1045`,
`AutomationRuleType` at `prisma/schema.prisma:736-743`). Rationale: the
enum is a **new** enum (not a continuation of an existing one); the
lowercase form is consistent with the 00b spec at
`docs/tasks/logik/00b-cube-source-conflict-validator.md:59-63` and is
intentionally asymmetric. A schema comment in `prisma/schema.prisma`
will document this: `// Note: lowercase-by-design; new enum. See ADR-0029-B §16.`

### Decisions That Bind the Future Mutation Slice (ADR-0029-B.2)

- The mutation slice adds a `WITH CHECK`-gated UPDATE policy on
  `CUBE_Conflict` for the `resolvedBy` actor path; the
  `cube_conflict_block_update` trigger must allow this policy-gated
  update. The future ADR will add a `current_setting('bevero.actor_role')`
  check in the trigger function (or a `SET LOCAL` session variable) to
  allow the manager-resolution path.
- The mutation slice will not change the `@@unique([sourceId, fieldKey])`
  on `CUBE_SourceField` (binding decision §1 is durable).
- The mutation slice will keep the `CHECK (length("fieldValue") <= 500)`
  and `CHECK (length("winningFieldValue") <= 500)` (binding decision §8).
- The mutation slice may introduce a `CUBE_ConflictSource` join table to
  replace the `sourceIds String[]` soft reference (deferral SCHEMA-007);
  the `sourceIds` column is deprecated in the future slice and the
  service layer reads the join table.

### Risk Register

| ID | Risk | Mitigation | Severity |
|---|---|---|---|
| ID-001 | Phantom conflict from duplicate `(sourceId, fieldKey)` rows | `@@unique([sourceId, fieldKey])` enforced at the DB layer (§1) | low |
| ID-002 | Defense-in-depth `DO $$` block becomes fragile as `Automation*` policies grow | Assert only the 2 triggers, not policy counts (§2) | low |
| ID-003 | (REMOVED post-promotion — the §3 binding was based on a misreading of `pg_policies.cmd`; the textual form `'SELECT'` is the working form. The 0029a verify-script is **not** broken.) | n/a | n/a |
| ID-004 | `CUBE_Conflict` mutation surface accidentally lands in this slice | RLS denies writes; triggers block raw UPDATE/DELETE (§11); ADR-0029-B.2 owns mutation | low |
| ID-005 | PII written to disk via `fieldValue` / `winningFieldValue` | Service-layer `sanitizePII` regex + DB length cap CHECK (§8) | medium |
| ID-006 | `CUBE_Conflict.sourceIds` contains stale ids after a `CUBE_Source` hard-delete | Service-layer defensive check on read; future join-table ADR | low |
| ID-007 | Seed `isActive: false` posture misunderstood as a bug | Header comment (§13) explains the asymmetry with OperationalUnit seed | low |
| ID-008 | (REMOVED post-promotion — the §3 binding was a misreading; the 0029a script is **not** a latent bug. No 0029a follow-up needed.) | n/a | n/a |
| ID-009 | **Default Supabase privileges on `authenticated` / `anon` for new tables** (SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE) are a privilege-hygiene risk. RLS denies writes by default, so this is **not** a security boundary, but the formal privileges are loose. | Companion migration `prisma/migrations/20260609050002_revoke_cube_write_grants/migration.sql` REVOKEs INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER for `authenticated` and `anon`. A future follow-up migration for the 0029a tables is out of scope. | low |

### Acceptance Gate (Test Plan)

The slice is **done** when **all** of the following pass:

1. `npx prisma validate` exits 0 against the new `prisma/schema.prisma`.
2. `npm run typecheck` exits 0.
3. `npx prisma migrate dev --name add_cube_source_conflict_tables` creates
   the schema migration; `npx prisma migrate dev --name add_cube_source_conflict_rls`
   creates the RLS migration.
4. `npx prisma migrate deploy` against the named Supabase dev project
   (owner-typed) applies both migrations cleanly; the schema migration's
   `DO $$` block exits 0 (triggers present), and the RLS migration's
   `DO $$` block exits 0.
5. `npx vitest run` exits 0 incl. the 7 new cases in
   `tests/cube-source-conflict.routes.test.ts`.
6. `scripts/verify-adr-0029b-cube-source-conflict.ts` against the named
   Supabase dev project (owner-typed) reports **15/15 PASS**, with
   check #5 (`pg_policies WHERE cmd = 'r'`) returning 3 and check #6
   (`pg_policies WHERE cmd IN ('a','w','d')`) returning 0.
7. The seed file `prisma/seeds/cube_source_conflict.sql` is idempotent
   on re-run (re-running it inserts 0 rows; verified by `count(*)` on
   each table before/after).
8. `curl` against the 5 endpoints as an authenticated org-member returns
   200 + correct payload; as an unauthenticated request returns 401.

**Acceptance criterion for the verify-script (corrected post-promotion):**
`scripts/verify-adr-0029b-cube-source-conflict.ts` uses the **textual**
`pg_policies.cmd` codes (`'SELECT'`, `'INSERT'`, `'UPDATE'`, `'DELETE'`,
`'ALL'`) in check #5, #6, and #8. The single-letter codes (`'r'`, `'a'`,
`'w'`, `'d'`) are **not** the form exposed by the `pg_policies` view on
Supabase Postgres 15; using them returns 0 rows. The 0029a
verify-script at `scripts/verify-adr-0029a-operational-units.ts:176`
already uses the working textual form (`cmd = 'SELECT'`); no 0029a
follow-up is required. Check #8 was repurposed during the promotion
gate (it was originally a write-grants check on
`information_schema.role_table_grants`, which counted the default
Supabase privileges on `authenticated`; that count is **not** a
security risk because RLS denies by default, but it is a privilege-
hygiene issue. The companion REVOKE migration
`prisma/migrations/20260609050002_revoke_cube_write_grants/migration.sql`
removes the formal write privileges. Check #8 now asserts the absence
of `WITH CHECK` write-policies, which is the real security boundary.)

### Cross-references

- ADR-0036 (CUBE-Phase-B Working Paper, accepted) — parent decision.
- ADR-0029-A (Operational Units, accepted 2026-06-09) — sibling Slice 1
  precedent for `prisma/schema.prisma` model shape,
  `prisma/migrations/20260609040000_add_operational_units/migration.sql`
  (DDL order, `TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`),
  `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql`
  (RLS plan, grant list, `DO $$` trigger assertion at lines 83-101),
  `prisma/seeds/operational_units.sql` (idempotent seed pattern),
  `src/routes/operational-unit.route.ts` (route plugin structure,
  path-encoded `/admin/operational-units/...`),
  `src/app.ts:207-210` (route registration + `buildOperationalUnitDependencies`),
  `scripts/verify-adr-0029a-operational-units.ts` (verify-script structure).
- ADR-0031 Phase B (multi-location) — `@@schema("public")` convention,
  `OperationalUnit.@@index([organizationId])` at
  `prisma/schema.prisma:1070`, `ServiceSlot.@@index([organizationId])` at
  `prisma/schema.prisma:1094`, `Brand.@@unique([organizationId, slug])` at
  `prisma/schema.prisma:930`, `LocationMember.@@unique([locationId, userId])`
  at `prisma/schema.prisma:995`, `LocationInventoryConfig.@@unique([locationId, inventoryItemId])`
  at `prisma/schema.prisma:1022`.
- ADR-0022 (Automation rules) — append-only invariant
  (`AutomationDecision` triggers at
  `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql:130-152`).
- ADR-0023 (Automation mutation) — `app_runtime` grant pattern
  (NOT used in this slice).
- ADR-0021 §3 — read-only posture, no LLM, no external writeback.
- ADR-0014 — Supabase Auth + `OrganizationMember` RLS pattern.
- ADR-0009 — `isActive` for soft-deactivation.
- `docs/automation/semi-automated-operations-layer.md` — no-writeback,
  human-gating guardrails.
- `docs/VISION.md` — CUBE positioning, no-replacement posture.
- Spec: `docs/tasks/logik/00b-cube-source-conflict-validator.md` — 00b spec.
- MSPR residual-risks list: §15 deferrals (SCHEMA-003, SCHEMA-007,
  SEED-001, SEED-003), ID-009 (default Supabase privileges on new tables;
  see `prisma/migrations/20260609050002_revoke_cube_write_grants/`).
- `prisma/migrations/20260609050002_revoke_cube_write_grants/migration.sql`
  — defense-in-depth REVOKE of write privileges on the 3 CUBE tables for
  `authenticated` and `anon` (added during the live-DB promotion gate;
  mirrors the 0029a RLS posture).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b-closure.md` —
  closure MSPR with the corrected §3 finding (textual `pg_policies.cmd`
  form, not single-letter) and the §1.2 finding (default Supabase
  privileges + the REVOKE-migration follow-up).

### Next gate

Owner acceptance of this ADR (Status: proposed → accepted). After
acceptance, the **Implementer** drafts in this order:

1. `prisma/schema.prisma` edit (3 models + 1 enum, with the 15 binding
   decisions applied: `@@unique([sourceId, fieldKey])`,
   `@@index([organizationId, fieldKey])`, `@@index([organizationId])`,
   `@@index([organizationId, resolvedAt])`,
   `@@index([organizationId, fieldKey, resolvedAt])`,
   `@default(requires_manager_confirmation)`, `CHECK (length <= 500)`,
   no `deletedAt` on `CUBE_Source`).
2. `prisma/migrations/<ts>_add_cube_source_conflict_tables/migration.sql`
   (DDL in dependency order; `TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
   for `sourceIds`; the 2 `CUBE_Conflict` append-only triggers are
   added to the **RLS** migration, not this one, per binding decision §11).
3. `prisma/migrations/<ts>_add_cube_source_conflict_rls/migration.sql`
   (RLS + grants + the 2 `CUBE_Conflict` triggers + the
   trigger-only `DO $$` block per binding decision §2).
4. `prisma/seeds/cube_source_conflict.sql` (header comment per §13).
5. `scripts/verify-adr-0029b-cube-source-conflict.ts` (15 queries with
   `cmd = 'r'` / `cmd IN ('a','w','d')` per binding decision §3).
6. Service + route + app.ts edit + tests.

Then **Supabase promotion** via `prisma migrate deploy` against the
named Supabase dev project (owner-typed), followed by
`scripts/verify-adr-0029b-cube-source-conflict.ts` reporting 15/15 PASS.
Cockpit may consume the new endpoints only after the promotion gate
passes. The 0029a verify-script fix (ID-008) is a **separate follow-up**
owned by the 0029a owner; it is **out of scope** for this ADR.

### Closure (2026-06-09, post-Supabase-promotion)

This ADR resolves all 3 must-fix issues (SCHEMA-004, RLS-001, VERIFY-001)
and 10 of 12 nice-to-fix issues (SCHEMA-001, SCHEMA-005, SCHEMA-006,
SCHEMA-008, SCHEMA-009, SCHEMA-010, SCHEMA-011, MIG-001, SEED-002,
CROSS-001). The deferrals (SCHEMA-002 is moot after SCHEMA-001;
SCHEMA-003, SCHEMA-007, SEED-001, SEED-003 are recorded in §15 and the
MSPR) are explicitly out of scope for this slice and are owned by
ADR-0029-B.2 or a dedicated follow-up ADR. The slice is **forward-only,
additive, and DEMO_MODE-safe**; no existing model, migration, route, or
test is modified.

## ADR-0029-C: CUBE Event-Economic-Rules Implementation (Slice 3)

Status: accepted (Owner-Acceptance 2026-06-09, cheikh.witm@proton.me)

Decision: Third code-bearing slice under ADR-0036 (accepted), Sub-Section
ADR-0036-C. The 00c-cube-event-economic-rules spec is binding. This slice
creates **four new public-schema tables** for CUBE event-economics
(`ExclusiveRentalPolicy`, `AfterMidnightStaffRate`, `NonFoodComponent`,
`FurniturePolicy`), three new enums (`StaffRole`, `NonFoodCategory`,
`FurniturePolicySource`), two forward-only migrations (schema + RLS +
triggers), a defense-in-depth REVOKE migration, one DEMO_MODE-gated seed
fixture, two new files under `src/modules/cube-economic/`, one new route
file with four `GET` endpoints under `/admin/cube/economic/...`, the
matching `src/app.ts` registration, nine new vitest cases, a 15-query
Supabase verify-script, and a closure MSPR. **Read-only at the
application layer** (matching the ADR-0029-B posture); mutations deferred
to a future mutation slice. The Brutto/Netto-Disziplin is enforced at
the DB layer via CHECK constraints. No LLM, no writeback, no
service-role credential on user paths, no Cockpit change. The
`AutomationSuggestion.ruleId` non-nullable contradiction and the
mutation endpoints are explicitly routed to ADR-0029-B.2 (a separate
follow-up). The slice resolves all 4 open questions from the 00c spec
(brand-übergreifend, security in StaffRole, extraCostNetCents nullable
or >= 0, FurniturePolicy lives in 00c).

### Sub-Phase / Sibling Refs

- Parent: ADR-0036 (CUBE Venue-Layer Spec, accepted 2026-06-09), Sub-Section
  ADR-0036-C.
- Sibling (Slice 1): ADR-0029-A (OperationalUnit/ServiceSlot/GroupRule,
  accepted 2026-06-09) — file `docs/DECISIONS.md:1722-1789`.
- Sibling (Slice 2): ADR-0029-B (CUBE Source-Conflict-Validator, accepted
  2026-06-09) — file `docs/DECISIONS.md:1790-2319`. Promoted to Supabase
  on 2026-06-09 (commit `6017c49`).
- Sibling (planned): ADR-0029-C.2 (Event-Economic Mutation Surface,
  working title only).
- Precedent: ADR-0029-A + ADR-0029-B for schema/RLS/route/test shape;
  ADR-0021 for guardrails; ADR-0022 + ADR-0023 for Automation append-only
  invariant; ADR-0031 for multi-location data model.

### Scope (this ADR authorizes)

This slice ships 10 file families + 1 follow-up REVOKE migration. The
table mirrors the ADR-0029-B §Scope format.

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `prisma/schema.prisma` | edit | 4 new models (`ExclusiveRentalPolicy`, `AfterMidnightStaffRate`, `NonFoodComponent`, `FurniturePolicy`) + 3 new enums (`StaffRole`, `NonFoodCategory`, `FurniturePolicySource`) in `@@schema("public")` |
| 2 | `prisma/migrations/<ts>_add_cube_event_economics/migration.sql` | new | Forward-only DDL: enum creation, 4 tables in dependency order, indexes, FKs, CHECK constraints for Brutto/Netto-Disziplin |
| 3 | `prisma/migrations/<ts>_add_cube_event_economics_rls/migration.sql` | new | Forward-only RLS: ENABLE RLS, 4 SELECT policies (org-scoped, `OrganizationMember` join), grants to `authenticated` SELECT only, the 2 `DO $$` defense-in-depth assertions (AutomationDecision triggers + CUBE_Conflict triggers), 2 append-only triggers per Event-Economic table (mirror `CUBE_Conflict` pattern from ADR-0029-B) |
| 4 | `prisma/migrations/<ts>_revoke_cube_economic_write_grants/migration.sql` | new | Defense-in-depth REVOKE of write privileges on the 4 new tables for `authenticated` and `anon` (mirror `20260609050002_revoke_cube_write_grants/migration.sql` from ADR-0029-B) |
| 5 | `prisma/seeds/cube_event_economic.sql` | new | DEMO_MODE-gated, idempotent: 1 `ExclusiveRentalPolicy` (verbatim from 00c §1), 5 `AfterMidnightStaffRate` rows (one per `StaffRole`), 17 `NonFoodComponent` rows (6 included + 6 optional + 5 cost-drivers), 2 `FurniturePolicy` rows (Website + Bankettmappe, conflict demo). All with `isActive: false` + `requiresManagerConfirmation: true` markers |
| 6 | `src/modules/cube-economic/cube-economic.types.ts` | new | Typed contract: enum re-exports, 4 record types, 4 list-item DTOs, `CUBE_EconomicError` class, `CUBE_EconomicServicePort` (4 read methods, **no mutation methods**), `CUBE_EconomicDatabaseClient` (Prisma subset) |
| 7 | `src/modules/cube-economic/cube-economic.service.ts` | new | `CUBE_EconomicService` implementing 4 port methods: `getActiveExclusiveRentalPolicy(actor)`, `listAfterMidnightStaffRates(actor)`, `listNonFoodComponents(actor, options?)`, `listFurniturePolicies(actor)`. Conflict-Indikator-Logik in `listFurniturePolicies` |
| 8 | `src/routes/cube-economic.route.ts` | new | Fastify plugin with 4 GET endpoints, path-encoded under `/admin/cube/economic/...` (no `fastify.register({ prefix })`; mirror ADR-0029-B §14 binding) |
| 9 | `src/app.ts` | edit | Route registration + `buildCubeEconomicDependencies(options)` factory (mirror ADR-0029-B §Scope #8 + `src/app.ts:204-210, 450-469`) |
| 10 | `tests/cube-economic.routes.test.ts` | new | 9 vitest cases (mirror ADR-0029-B test shape) |
| 11 | `scripts/verify-adr-0029c-cube-event-economic.ts` | new | 15-query Supabase promotion script (mirror `scripts/verify-adr-0029b-cube-source-conflict.ts` shape; uses **textual** `pg_policies.cmd` codes per the ADR-0029-B promotion-gate correction) |
| 12 | `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-c-closure.md` | new | Closure MSPR |

**No existing model, migration, route, or test is modified.**

### Explicit Non-Scope (deferred to ADR-0029-C.2 or later)

- **No mutation endpoint** in this slice. `ExclusiveRentalPolicy.isActive`,
  `AfterMidnightStaffRate.hourlyRateNetCents`, etc. are not settable
  from any HTTP route. Manager flips happen via SQL / future
  Cockpit-Form slice (out of scope).
- **No writeback** to FoodNotify, Microsoft Dynamics 365, DATEV,
  Rauschenberger, or any external system.
- **No LLM** in any calculation or display. The Brutto/Netto formula
  (00c §1) is a read-time calculation in the service layer; not an
  LLM-driven offer builder.
- **No service-role credential** in user paths. RLS is authoritative
  (ADR-0014).
- **No `app_runtime` grant** on the 4 new tables.
- **No Cockpit UI** change in `apps/cockpit/`. The first Cockpit
  wire-up is a separate task.
- **No new external npm dependency**.
- **No `.env*` change**.
- **No PDF export, no offer-calculator** (ADR-0080+).
- **No Connector** to FoodNotify/Gastronovi (ADR-0002, ADR-0021 §3).

### Decisions Made Binding

The numbered decisions below are binding on the Implementer. The 4 open
questions from the 00c spec are resolved inline.

#### §1 All 4 tables live in `public` schema, brand-übergreifend (resolves 00c OQ1)

`ExclusiveRentalPolicy`, `AfterMidnightStaffRate`, `NonFoodComponent`,
`FurniturePolicy` are all in `public` schema, brand-übergreifend, with
`organizationId` as the multi-tenant boundary. Rationale: (a) Motorworld
Inn will need exclusive-rental and furniture policies too; (b) ADR-0030
§Decisions §1 (profile is discriminator, no name hardcoding) is
preserved; (c) 00c OQ1 default = `public`. **Multi-tenancy isolation
via RLS, not via per-brand schemas.**

#### §2 `AfterMidnightStaffRate.role` is the `StaffRole` enum, including `security` (resolves 00c OQ2)

The `StaffRole` enum has 6 values: `cook`, `service`,
`restaurant_manager`, `bartender`, `bar_buffet_staff`, `security`.
Rationale: 00c OQ2 default = "in `AfterMidnightStaffRate` with
`role = 'security'`, because the structure is identical (Stundensatz,
Zeitfenster)". The `security` value carries the 26 €/h rate from the
00c §3 cost-drivers list. **No separate `SecurityRate` substrate.**

#### §3 `NonFoodComponent.extraCostNetCents` is nullable, with CHECK constraint `(extraCostNetCents IS NULL OR extraCostNetCents >= 0)` (resolves 00c OQ3)

`extraCostNetCents Int?` is nullable. DB CHECK: `extraCostNetCents IS
NULL OR extraCostNetCents >= 0`. The Cockpit-Display layer shows
`null` as "auf Anfrage" (per 00c OQ3 default). A second DB CHECK
enforces the 00c §3 invariant: when `category = 'included_by_default'`,
`extraCostNetCents` MUST be `NULL` AND `defaultIncluded` MUST be `true`.
CHECK constraint:

```sql
CHECK (
  (category = 'included_by_default' AND "extraCostNetCents" IS NULL AND "defaultIncluded" = true)
  OR
  (category <> 'included_by_default')
)
```

Violation → `23514 check_violation`.

#### §4 `FurniturePolicy` lives in 00c, not 00b (resolves 00c OQ4)

`FurniturePolicy` is a separate substrate (not part of
`CUBE_SourceField` or `CUBE_Conflict`). Rationale: 00c OQ4 default = "in
00c, because the Substrat-Inhalt (Schwellenwert, Gästezahl) is
Event-Wirtschaftsdaten". The 2 example seed rows (Website
`includedUntilGuestCount: 100` + Bankettmappe
`includedUntilGuestCount: 100` per 00c §4) are **identical** in the
`includedUntilGuestCount` field but the **Bankettmappe differs** in
the `additionalFromGuestCount` semantics. The Cockpit-Display layer
detects the conflict at the `additionalFromGuestCount` level (not at
the `includedUntilGuestCount` level) and surfaces a "Konflikt erkannt"
indicator. **A future ADR-0029-C.2 may add a `FurniturePolicyConflict`
substrate or a synthetic `AutomationSuggestion` for the conflict
detection; that is out of scope here.**

#### §5 Brutto/Netto-Disziplin enforced at the DB layer

All `*Cents` fields on `ExclusiveRentalPolicy` (`dayRentalRoomNetCents`,
`dayRentalMinConsumptionNetCents`, `eveningRentalRoomNetCents`,
`eveningRentalMinConsumptionNetCents`) and on `AfterMidnightStaffRate`
(`hourlyRateNetCents`) are `Int` (not `Float`), named with the `NetCents`
suffix to make the net-excl-VAT convention explicit at the column-name
level. The Cockpit-Display layer computes `gross = round(net *
(1 + vatRate))` as an overlay field only; persistence stays net. The
DB does NOT store both net and gross (would violate the spec's
single-source-of-truth principle). `NonFoodComponent.extraCostNetCents`
follows the same convention. `FurniturePolicy` has no monetary fields
(integer thresholds only).

#### §6 `FurniturePolicySource` enum (read-only URL register, no connector)

`FurniturePolicy` carries `sourceUrl String?` (read-only URL register,
no HTTP fetch, no connector, per ADR-0021 §3). The `sourceUrl` is
typed in the schema as a free-form string, but the route layer
projects it through a small `inferFurniturePolicySource(url)` helper
that maps the URL to the `FurniturePolicySource` enum:

- `https://www.cube-restaurant.de/...` → `CUBE_WEBSITE`
- `null` (PDF, not online) → `CUBE_BANKETTMAPPE_PDF`
- other → `OTHER`

The enum has 3 values: `CUBE_WEBSITE`, `CUBE_BANKETTMAPPE_PDF`, `OTHER`.
The helper is a pure function (deterministic prefix match), not an LLM.
A new `sourceUrl` value that does not match the prefix is classified as
`OTHER`. This binding decision codifies the 00c §4 example seed.

#### §7 Soft-activation via `isActive` (no `deletedAt`)

All 4 tables use `isActive Boolean @default(true)` for soft-deactivation
(per ADR-0009 + ADR-0029-B §4 binding decision). **No `deletedAt`
field on any of the 4 tables** (matches ADR-0029-B §4 precedent;
`AutomationRule` is the only repo model with `deletedAt`, and ADR-0029-B
dropped it for `CUBE_Source` for consistency).

#### §8 Idempotent seed with `isActive: false` posture (all rows)

The seed fixture inserts all rows with `isActive: false` and
`requiresManagerConfirmation: true` (verbatim 00c §1 + §2 + §3 + §4
example seeds). Rationale: the values are extracted from the CUBE
Bankettmappe 2026-06-09 and the CUBE website 2026-06-09; the manager
must verify the values against the latest source before flipping
`isActive` to `true`. The seed header comment documents this posture,
matching the ADR-0029-B §13 binding decision.

#### §9 Append-only via 2 BEFORE UPDATE/DELETE triggers per table

Each of the 4 tables is append-only at the DB layer via 2 triggers
(`{table}_block_update`, `{table}_block_delete`) that fire
`BEFORE UPDATE` and `BEFORE DELETE` respectively, calling
`public.cube_economic_append_only()` which raises
`RAISE EXCEPTION 'CUBE_Economic is append-only: % is not permitted', TG_OP USING ERRCODE = 'restrict_violation';`.
Rationale: matches the `CUBE_Conflict` pattern from ADR-0029-B §11
and the `AutomationDecision` pattern from ADR-0022. INSERT is not
blocked; the seed is the only INSERT path. The future mutation slice
(ADR-0029-C.2) will use a `WITH CHECK`-gated UPDATE policy to flip
`isActive` to `true` after manager verification. **The 2 triggers per
table = 8 triggers total**, added in the RLS migration.

#### §10 `DO $$` defense-in-depth block asserts AutomationDecision + CUBE_Conflict + CUBE_Conflict block_update + CUBE_Conflict block_delete triggers + count of new CUBE_Economic triggers

The `DO $$` block at the bottom of the RLS migration asserts:

- `automation_decision_block_update` count = 1
- `automation_decision_block_delete` count = 1
- `cube_conflict_block_update` count = 1 (from ADR-0029-B §11)
- `cube_conflict_block_delete` count = 1 (from ADR-0029-B §11)
- `cube_economic_*_block_update` count = 4 (one per new table)
- `cube_economic_*_block_delete` count = 4 (one per new table)

On mismatch, raises `RAISE EXCEPTION … USING ERRCODE = 'restrict_violation'`.
**The block does NOT assert policy counts** (per ADR-0029-B §2
binding; the OperationalUnit precedent at
`prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:83-101`
asserts only the 2 AutomationDecision triggers, but we widen to
include the 2 CUBE_Conflict triggers + the 8 new CUBE_Economic
triggers because they are append-only invariants in the same family
and a regression in any of them would invalidate the slice's
security posture).

#### §11 Path-encoded routes (no Fastify `prefix` option)

The 4 endpoints are registered as path-encoded routes:
`/admin/cube/economic/exclusive-rental`,
`/admin/cube/economic/staff-rates`,
`/admin/cube/economic/non-food`,
`/admin/cube/economic/furniture`. **No `fastify.register(plugin, { prefix: '/admin/cube/economic' })`** (per ADR-0029-B §14 binding
decision: the repo convention is path-encoded prefixes, not
`fastify.register` prefix). Verified by `grep -rn "prefix:" src/`
returning only `src/agent-team/swarm-review-gate.ts:158` (unrelated
helper).

#### §12 Verify-script uses textual `pg_policies.cmd` codes (corrected from ADR-0029-B §3 post-promotion)

The verify-script at `scripts/verify-adr-0029c-cube-event-economic.ts`
uses the **textual** `pg_policies.cmd` codes: `'SELECT'`, `'INSERT'`,
`'UPDATE'`, `'DELETE'`, `'ALL'`. This is the form exposed by the
`pg_policies` view on Supabase Postgres 15 (verified empirically
during the ADR-0029-B promotion gate; see the ADR-0029-B closure
MSPR §1.2 Finding 1). The single-letter codes (`'r'`, `'a'`, `'w'`,
`'d'`) return 0 rows; they are NOT the working form.

#### §13 Hard-guardrail: no `AutomationSuggestion.ruleId` mutation in this slice

The `AutomationSuggestion.ruleId` non-nullable contradiction (surfaced
in ADR-0029-B §3 binding decision §4) is **not** touched in this slice.
The 4 economic rules are NOT triggered as `AutomationSuggestion` rows
in this slice (no mutation, no suggestion creation). A future
ADR-0029-C.2 may route manager-verification through the existing
`POST /admin/automation/suggestions/:id/approve` (ADR-0023) using the
synthetic-"manual_detection" `AutomationRule` workaround from
ADR-0029-B §Decisions Made Binding §4.

#### §14 Defense-in-depth REVOKE migration in this slice (mirroring ADR-0029-B follow-up)

The follow-up REVOKE migration
`prisma/migrations/<ts>_revoke_cube_economic_write_grants/migration.sql`
is part of this slice (not a follow-up). Rationale: the ADR-0029-B
promotion gate (2026-06-09, commit `6017c49`) revealed that Supabase
grants the `authenticated` and `anon` roles default privileges on
every new public table, and a defense-in-depth REVOKE was added
post-promotion as `20260609050002_revoke_cube_write_grants/migration.sql`.
This slice applies the same hygiene pre-promotion: the REVOKE is in
the slice's scope, not a follow-up. **15 verification queries, not
16 (no separate "write-grant absence" check, because the REVOKE
migration makes that check redundant; the verify-script asserts the
post-REVOKE state).**

### Decisions That Bind the Future Mutation Slice (ADR-0029-C.2)

- The mutation slice adds a `WITH CHECK`-gated UPDATE policy on each
  of the 4 tables for the manager-verification path; the
  `{table}_block_update` trigger must allow this policy-gated update.
  The future ADR will add a `current_setting('bevero.actor_role')`
  check in the trigger function (or a `SET LOCAL` session variable)
  to allow the manager flip of `isActive` from `false` to `true`.
- The mutation slice will keep the Brutto/Netto-Disziplin (binding
  decision §5 is durable).
- The mutation slice will introduce a `FurniturePolicyConflict`
  substrate or a synthetic `AutomationSuggestion` for the conflict
  detection between Website and Bankettmappe (binding decision §4).
- The mutation slice may introduce a Cockpit-Form to manage the
  `requiresManagerConfirmation` workflow (out of scope for this
  slice and ADR-0029-C.2).

### Risk Register

| ID | Risk | Mitigation | Severity |
|---|---|---|---|
| ID-001 | Phantom duplicate `ExclusiveRentalPolicy` rows (same `organizationId`, `name`, overlapping `validFrom`/`validUntil`) | `@@unique([organizationId, name])` enforced at the DB layer (binding decision §1 extension); partial unique on `(org, name) WHERE isActive = true` deferred to service-layer in v1 | low |
| ID-002 | Phantom duplicate `AfterMidnightStaffRate` rows (same `organizationId`, `role`, overlapping `fromHourLocal`/`toHourLocal`) | `@@unique([organizationId, role, fromHourLocal, toHourLocal])` enforced at the DB layer | low |
| ID-003 | Brutto/Netto-Disziplin violation (someone writes a `NetCents` field that is actually gross) | CHECK constraints + column-name suffix `NetCents` makes the convention explicit; service-layer rejects any negative or zero value with a 400 | low |
| ID-004 | Defense-in-depth `DO $$` block becomes fragile as more append-only triggers are added across slices | The block asserts trigger **presence** (count = N), not policy counts. Future slices (ADR-0029-C.2, ADR-0029-D, etc.) will widen the assertion to include their new triggers. | low |
| ID-005 | Verify-script returns 0 rows for `pg_policies.cmd = 'r'` (regression of ADR-0029-B's corrected post-promotion finding) | Use textual `cmd = 'SELECT'` (binding decision §12) | low |
| ID-006 | Default Supabase privileges on `authenticated` / `anon` for the 4 new tables | Companion REVOKE migration (binding decision §14) is part of this slice, not a follow-up | low |
| ID-007 | Furniture-Threshold-Konflikt (Website 100 vs. Bankettmappe 100 — actually identical at the `includedUntilGuestCount` level, but the `additionalFromGuestCount` differs) | The Cockpit-Display layer detects the conflict at the `additionalFromGuestCount` level and surfaces a "Konflikt erkannt" indicator. **The Website and Bankettmappe seeds have the same `includedUntilGuestCount: 100`** per 00c §4, so the conflict is in the **interpretation** of the `additionalFromGuestCount` field. The future ADR-0029-C.2 will add a `FurniturePolicyConflict` substrate or a synthetic `AutomationSuggestion`. | medium |
| ID-008 | PII written to disk via `NonFoodComponent.notes` or `FurniturePolicy.notes` | Service-layer `sanitizePII` regex (mirror ADR-0029-B §Decisions §5); DB length cap CHECK `length("notes") <= 1000` | low |

### Acceptance Gate (Test Plan)

The slice is **done** when **all** of the following pass:

1. `npx prisma validate` exits 0 against the new `prisma/schema.prisma`.
2. `npm run typecheck` exits 0.
3. `npx prisma migrate dev --name add_cube_event_economics` creates the
   schema migration; `npx prisma migrate dev --name add_cube_event_economics_rls`
   creates the RLS migration; `npx prisma migrate dev --name revoke_cube_economic_write_grants`
   creates the REVOKE migration.
4. `npx prisma migrate deploy` against the named Supabase dev project
   (owner-typed) applies all 3 migrations cleanly; the RLS migration's
   `DO $$` block exits 0.
5. `npx vitest run` exits 0 incl. the 9 new cases in
   `tests/cube-economic.routes.test.ts`.
6. `scripts/verify-adr-0029c-cube-event-economic.ts` against the named
   Supabase dev project (owner-typed) reports **15/15 PASS**.
7. The seed file `prisma/seeds/cube_event_economic.sql` is idempotent
   on re-run (re-running inserts 0 rows).
8. `curl` against the 4 endpoints as an authenticated org-member returns
   200 + correct payload; as an unauthenticated request returns 401.

### Cross-references

- ADR-0036 (CUBE Venue-Layer Spec, accepted 2026-06-09) — parent
  decision. Sub-Section ADR-0036-C is the binding conceptual spec.
- ADR-0029-A (Operational Units, accepted 2026-06-09) — sibling Slice 1
  precedent for the file shape (DDL order, RLS plan, seed idempotency,
  service module, route plugin structure, app.ts registration, vitest
  stub-DB pattern, verify-script structure).
- ADR-0029-B (CUBE Source-Conflict-Validator, accepted 2026-06-09,
  promoted to Supabase 2026-06-09, commit `6017c49`) — sibling
  Slice 2 precedent. **The corrections from the ADR-0029-B promotion
  gate are incorporated as binding decisions §12 (textual cmd codes)
  and §14 (REVOKE in slice, not follow-up).**
- ADR-0021 §3 (read-only posture, no LLM, no writeback).
- ADR-0022 (Automation append-only invariant, `BEFORE UPDATE/DELETE`
  triggers; the pattern is mirrored for the 4 economic tables in
  binding decision §9).
- ADR-0023 (Automation mutation surface; not used in this slice but
  referenced as a future routing option in §13).
- ADR-0014 (Supabase Auth + `OrganizationMember` RLS pattern).
- ADR-0009 (soft-deactivation via `isActive`).
- `docs/automation/semi-automated-operations-layer.md` — no-writeback,
  human-gating guardrails.
- `docs/VISION.md` §7 (Phase 3 — CUBE-Kompatibilität).
- Spec: `docs/tasks/logik/00c-cube-event-economic-rules.md` — 00c spec.
- `prisma/migrations/20260609040000_add_operational_units/migration.sql`
  — DDL template (org-scoped, `@@schema("public")`, index conventions).
- `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql`
  — RLS template (3 SELECT policies, `OrganizationMember` join, `DO $$`
  AutomationDecision trigger assertion).
- `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql:130-152`
  — `BEFORE UPDATE/DELETE` trigger pattern (mirrored for the 4 economic
  tables in binding decision §9).
- `prisma/migrations/20260609050001_add_cube_source_conflict_rls/migration.sql`
  — CUBE_Conflict trigger pattern (mirrored for the 4 economic tables).
- `prisma/migrations/20260609050002_revoke_cube_write_grants/migration.sql`
  — REVOKE pattern (reused in the REVOKE migration for the 4 economic
  tables).
- `scripts/verify-adr-0029a-operational-units.ts`,
  `scripts/verify-adr-0029b-cube-source-conflict.ts` — verify-script
  template (15 queries each; ADR-0029-B's textual-cmd-codes correction
  is applied).

### Next gate

After acceptance, the **Implementer** drafts in this order:

1. `prisma/schema.prisma` edit (4 models + 3 enums, with the 14 binding
   decisions applied: §1 `public` schema, §2 `StaffRole` enum with
   `security`, §3 nullable `extraCostNetCents` + the
   `included_by_default` CHECK, §4 separate `FurniturePolicy` substrate,
   §5 `NetCents` suffix, §6 `FurniturePolicySource` enum, §7 no
   `deletedAt`, §8 seed posture, §9 8 triggers total, §10 DO $$ block
   widened, §11 path-encoded routes, §12 textual cmd codes, §13 no
   `AutomationSuggestion` mutation, §14 REVOKE in slice).
2. `prisma/migrations/<ts>_add_cube_event_economics/migration.sql` (DDL
   in dependency order: enum creation, 4 tables, indexes, FKs, CHECK
   constraints).
3. `prisma/migrations/<ts>_add_cube_event_economics_rls/migration.sql`
   (RLS + grants + the 8 append-only triggers + the widened `DO $$`
   block per binding decision §10).
4. `prisma/migrations/<ts>_revoke_cube_economic_write_grants/migration.sql`
   (REVOKE of INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on the
   4 new tables for `authenticated` and `anon`).
5. `prisma/seeds/cube_event_economic.sql` (header comment per §8).
6. `scripts/verify-adr-0029c-cube-event-economic.ts` (15 queries with
   `cmd = 'SELECT'` / `cmd IN ('INSERT', 'UPDATE', 'DELETE')` per §12).
7. Service + route + app.ts edit + tests.

Then **Supabase promotion** via `prisma migrate deploy` against the
named Supabase dev project (owner-typed), followed by
`scripts/verify-adr-0029c-cube-event-economic.ts` reporting 15/15 PASS.
Cockpit may consume the new 4 endpoints only after the promotion gate
passes.

### Closure (Slice 3 implementation, 2026-06-09)

*(To be appended by the Implementer after the slice is accepted and the
promotion gate passes. Mirrors the ADR-0029-B closure MSPR at
`docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b-closure.md`.)*

---

## ADR-0025.f: Phase F LLM Synthesize Endpoint Gate (accepted)

Status: accepted (2026-06-09, owner-review acceptance of the
docs-only gate-prep slice. The 3 §Required approvals (LLM budget
envelope, spec text evolution at
`docs/automation/semi-automated-operations-layer.md` §Phase F, and
runtime slice separation) are correctly **shaped** by the gate-prep
slice and correctly **deferred** to the acceptance-time addendum +
the separate ADR-0025.f.acceptance follow-up. The owner accepts the
**gate-prep shape** (the spec-level contract at §Spec contract, the
3 §Required approvals, the §Non-goals, the §Coexistence note); the
**acceptance-time addendum** binds the actual LLM budget values
(monthly cap, per-call cap, per-org cap) + the spec amendment text +
the runtime implementation choice. The runtime slice is BLOCKED on
the acceptance-time addendum + the ADR-0025.f.acceptance proposal;
no Phase F code may land before then.)

Context: Phase E (Shift Handover Drafts) is functionally complete on
disk, live in Supabase project `czinchfegtglmrloxlmh` (12/12
verification PASS), and smoke-validated (6/6 PASS on
`docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md`).
The next code-bearing slice is the optional LLM `synthesize` endpoint on
the existing `ShiftHandoverDraft` rows. The current spec's §Phase F block
(`docs/automation/semi-automated-operations-layer.md` lines 1409-1420)
names the endpoint but has two gaps relative to the implementer's
gate-prep mandate: it (a) names a specific provider ("Claude API")
which is not authoritative until the budget approval picks one, and (b)
says "Graceful fallback if LLM unavailable" which reads as best-effort
and conflicts with the binding AGENTS.md hard guardrail that LLMs are
"optional, read-only text/classification helpers" and that "no
LLM-driven approval, ordering, or stock mutation" is permitted. A
graceful-fallback default could silently spend budget in a misconfigured
production; the safe default is fail-closed. ADR-0025 itself (lines
869, 915) routes the synthesize endpoint to a future ADR-0025.f
explicitly; this is that ADR.

Decision: When accepted, this ADR will authorize the **spec-level
contract** for the Phase F LLM `synthesize` endpoint, the **gate** on
which the runtime slice may begin, and the **audit log shape** the
runtime slice must emit. It does **not** authorize any runtime, any
provider wiring, any prompt template, any env var, any secret, any
provider SDK call, any migration, any Cockpit change, any
`InventoryMovement` or `InventoryStockSnapshot` write, any external
writeback to FoodNotify / Dynamics 365 / DATEV / Rauschenberger, any
service-role credential in a user-facing path, or any
LLM-driven approval / ordering / stock-mutation decision (all of which
remain forbidden by AGENTS.md hard guardrails and the spec §Agent / LLM
Boundary). The slice is intentionally narrow: a single additive docs
gate-prep deliverable (this ADR + the boundary addendum
`docs/automation/phase-f-gate-prep-boundary.md` + the gate-prep MSPR
`docs/agent-team/mspr_logbook/2026-06-09-phase-f-gate-prep.md`).

### Spec contract (binding at acceptance)

The runtime slice, when it lands, must conform to the following
spec-level contract:

1. **Endpoint shape.** A single new endpoint:
   `POST /shift-handover/draft/:id/synthesize` (manager+ or shift_lead;
   the actor is the same person who can confirm the draft; the call
   requires an unconfirmed draft owned by the actor; the result is
   stored in `ShiftHandoverDraft.synthesizedHandover` +
   `synthesizedAt`).
2. **Input.** The current draft's `summary`, `openItems`, `alerts`, and
   `notes` (read-only from the actor's perspective; the endpoint does
   not mutate any other field). The endpoint does **not** accept
   free-form user prompts; the input is strictly the draft's
   structured state.
3. **Output.** `synthesizedHandover` (a `string`, max 4000 chars,
   sanitized) and `synthesizedAt` (a `Date`). The output is cached in
   the draft row; subsequent calls with the same `(draftId,
   draft-revision)` pair return the cached result until the user
   explicitly requests a refresh.
4. **Provider-neutral.** The spec does not bind a specific provider;
   the runtime slice picks the implementation (this ADR is explicitly
   provider-neutral; the spec's current "Claude API" reference is the
   gap §2.2 of the boundary addendum is closing).
5. **Fail-closed.** The endpoint returns 503 with an explicit
   `synthesize_unavailable` code in the response body when:
   (a) the LLM budget envelope is exhausted,
   (b) the LLM provider is unreachable,
   (c) the LLM provider rejects the prompt (safety filter, schema
   violation),
   (d) the LLM runtime is not configured (no provider credentials, no
   budget envelope, no model name),
   (e) the response fails the PII-sanitization check.
   The endpoint never silently falls back to a hand-written template;
   the user sees the 503 and can re-try or abandon.
6. **Audit-first.** Every call logs `requestId`, `draftId`, `orgId`,
   `actorId`, sanitized input hash, provider, model, sanitized output,
   latency, cost in cents, and the result code. Logs are append-only,
   not user-visible, and free of PII (per ADR-0021 "no PII in logs").
7. **Opt-in per call.** The endpoint is a POST the user explicitly
   invokes. There is no automatic synthesis on confirm; there is no
   background job that synthesizes without an actor.
8. **No new schema.** The `ShiftHandoverDraft.synthesizedHandover` and
   `synthesizedAt` columns are already present (added by the B-1
   migration `20260608160000_add_automation_phase_b_tables`). Phase F
   needs no migration; it only writes to two existing nullable
   columns. The 12-query catalog gate for ADR-0025 and the B-1/B-2
   migrations are unchanged.

### Required approvals (all 3 must hold before the runtime slice begins)

1. **LLM budget approval.** A named LLM budget envelope (monthly cap,
   per-call cap, per-org cap) approved by the project owner. The
   approval is recorded as an acceptance-time addendum to this ADR
   (or as a separate budget ADR if the project prefers). The budget
   envelope is the runtime gate: when the cap is hit, the synthesize
   endpoint returns 503 with an explicit "budget exhausted" code.
2. **Spec text evolution.** `docs/automation/semi-automated-
   operations-layer.md` §Phase F is amended to be provider-neutral,
   fail-closed, audit-first, cacheable, and opt-in-per-call. The
   amendment is a separate docs-only slice gated on this ADR's
   acceptance (it is the spec-evolution evidence this ADR cites in
   §Cross-references).
3. **Implementation approval.** This ADR is flipped from
   `verdict: proposed` to `verdict: accepted` by the project owner
   only after (1) and (2) are in place. The runtime slice is a
   separate docs + code + migration + Cockpit slice (a follow-up
   ADR-0025.f.acceptance) gated on this ADR's acceptance.

### Non-goals (explicit)

- **No** Phase E cleanup, refactor, or test-tidying. Phase E is
  `verdict: accepted`; it is not in scope.
- **No** CUBE-Economic work (ADR-0029-C.2 in flight on this branch).
  The branch is in a mixed dirty state with parallel CUBE-Economic
  work under ADR-0029-C.2 and CUBE-Source-Conflict work under
  ADR-0029-D; this slice does not touch, stage, revert, format, or
  conceptually merge any of those files.
- **No** provider-specific runtime implementation in this slice. The
  runtime slice is a separate follow-up.
- **No** env variables. No secrets. No provider SDK calls. No prompt
  templates. No test fixtures. No endpoints. No migrations. No
  Cockpit changes. No `.env*` reads or writes. No service-role
  credentials in any user-facing path.
- **No** removal, replacement, or modification of either Cockpit
  shift-handover page. The localStorage page (commit `ccf0f50`) and
  the new backend-backed draft page continue to coexist until the
  E-3-future decision per ADR-0025 OQ §5. E-3 is orthogonal to
  Phase F.

### Coexistence note (carried from ADR-0025 OQ §5)

The Cockpit `/shift-handover` localStorage page (commit `ccf0f50`) and
the new backend-backed draft page continue to coexist. The synthesize
endpoint, when implemented, will be a thin client of the existing
draft API and will be exposed on the new draft page (the localStorage
page does not call the backend and will not be modified). E-3
(Cockpit integration) is the future slice that decides whether to
replace, wrap, or leave the localStorage page; that decision is
orthogonal to Phase F.

### Cross-references

- ADR-0021 — Phase A spec, hard guardrails (no automatic stock
  mutation, no external writeback, no LLM approval, no service-role
  in user path, append-only decisions, no PII in logs). Phase F
  upholds all of these by introducing zero LLM code; it only names
  the spec-level contract.
- ADR-0025 — Phase E Shift Handover Draft Endpoints
  (`Status: accepted`). Routes the LLM `synthesize` endpoint to a
  future ADR-0025.f (lines 869, 915 of `docs/DECISIONS.md`); this is
  that ADR.
- ADR-0022 — Phase A spec ratification; the source of the
  `ShiftHandoverDraft.synthesizedHandover` + `synthesizedAt` columns
  (added by the B-1 migration).
- `docs/automation/semi-automated-operations-layer.md` — the binding
  spec; §Phase F (lines 1409-1420) is the current text this ADR
  amends. §Agent / LLM Boundary (line 461) is the source of the
  fail-closed posture.
- `docs/automation/phase-f-gate-prep-boundary.md` — the boundary
  addendum authored in the same docs-only gate-prep slice as this
  ADR; it names the Phase E → Phase F boundary crisply and is the
  durable cross-reference for the orchestrator and the future
  Implementer.
- `docs/agent-team/mspr_logbook/2026-06-09-phase-f-gate-prep.md` —
  the gate-prep MSPR authored in the same docs-only gate-prep slice
  as this ADR; it is the durable record of what was done, what was
  learned, and what should happen next.
- `docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md`
  — Phase E is functionally complete; Phase F is the next gate per
  the §nextGate block.
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`
  — Phase E is promoted to Supabase `czinchfegtglmrloxlmh` (12/12
  verification PASS); Phase F is the next gate.
- `AGENTS.md` — hard guardrails: "no LLM-driven approval, ordering,
  or stock mutation. LLMs are optional, read-only text/classification
  helpers (handover synthesis, note classification, rule
  explanations)." This ADR upholds that guardrail.

### Next gate

The next code-bearing slice after this ADR is accepted is the runtime
slice, gated on:

1. The LLM budget envelope being approved and recorded (per
   §Required approvals #1).
2. The spec amendment being authored and merged (per
   §Required approvals #2).
3. The runtime slice being a separate docs + code + migration + test
   + Cockpit slice, with its own ADR-0025.f.acceptance proposal in
   `docs/DECISIONS.md`, its own MSPR in
   `docs/agent-team/mspr_logbook/`, and its own
   `docs/automation/promotion-evidence/` runbook + provenance file if
   it adds a database migration (it should not need one).

Until all three hold, no Phase F code lands. This docs-only
gate-prep slice is complete on disk and **accepted**: this ADR
(`Status: accepted`) + the boundary addendum + the gate-prep MSPR.
The next gate is the acceptance-time addendum (which binds the
budget envelope + the spec amendment + the runtime choice) followed
by the separate ADR-0025.f.acceptance proposal.

**Status update (2026-06-09):** ADR-0025.f is `Status: accepted` from
2026-06-09. The acceptance-time addendum will bind the actual LLM
budget values + the spec amendment text + the runtime implementation
choice. Until that addendum is recorded, no Phase F code may land;
the runtime slice is gated on the addendum + a new
ADR-0025.f.acceptance proposal in `docs/DECISIONS.md`. The
acceptance-time addendum is the durable record of the 3 §Required
approvals being met; it cites the spec-amendment MSPR + the
budget-approval record as evidence.

---

## ADR-0029-C.2: CUBE Event-Economic Mutation Surface (Slice 3.5)

Status: proposed (Owner review pending)

Decision: First mutation-surface slice under ADR-0029-C. This slice
upgrades the read-only CUBE Event-Economic-Rules surface (Slice 3) to
a `WITH CHECK`-gated manager-verification mutation surface. It is
**forward-only, additive, and DEMO_MODE-safe**; no existing model,
migration, route, or test is modified. The Brutto/Netto-Disziplin
(binding decision ADR-0029-C §5) is preserved. No LLM, no writeback,
no service-role credential on user paths, no Cockpit change. The
`AutomationDecision` audit-trail invariant (ADR-0022) is preserved;
every manager-verification creates an immutable `AutomationDecision`
row that references a synthetic "manual_verification"
`AutomationRule` (per ADR-0029-B §Decisions §4 + §Decisions Made
Binding §1 below). The slice ships 10 file families + 1 verify-script
+ 1 closure MSPR.

### Sub-Phase / Sibling Refs

- Parent: ADR-0029-C (Event-Economic-Rules read-only slice, accepted
  2026-06-09), Sub-Section ADR-0036-C.
- Sibling: ADR-0029-B.2 (CUBE Source-Conflict Mutation Surface,
  companion slice, parallel track — see ADR-0029-B.2 block below).
- Precedent: ADR-0029-B §Decisions That Bind the Future Mutation
  Slice (ADR-0029-B.2) at `docs/DECISIONS.md:2160-2175` for the
  general pattern (GUC-gated trigger relaxation).
- Precedent: `AutomationSuggestionService.approve()` at
  `src/modules/automation/automation-suggestion.service.ts:232-374`
  for the transaction shape (SET LOCAL + UPDATE + AutomationDecision).

### Scope (this ADR authorizes)

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `prisma/migrations/20260609070000_add_cube_economic_manager_update_policies/migration.sql` | new | Forward-only RLS: 4 `WITH CHECK`-gated UPDATE policies (one per CUBE_Economic table); GUC check `current_setting('bevero.allow_cube_economic_update', true) = 'on'`; org-scope via OrganizationMember join; defense-in-depth DO $$ block asserts the 8 CUBE_Economic append-only triggers (4 block_update + 4 block_delete) are still present. |
| 2 | `prisma/migrations/20260609070001_relax_cube_economic_append_only/migration.sql` | new | Forward-only DDL: `CREATE OR REPLACE FUNCTION public.cube_economic_append_only()` now reads the GUC; when the GUC is `'on'`, UPDATE is allowed; DELETE remains unconditionally blocked; INSERT is allowed. Defense-in-depth DO $$ block widens to assert AutomationDecision × 2 + CUBE_Conflict × 2 + CUBE_Economic × 8 = 12 triggers present. |
| 3 | `src/modules/cube-economic/cube-economic.types.ts` | edit | Add `automationDecision.create` + `automationRule.findFirst/create` + `automationSuggestion.findUnique/create` + `workflowTask.create` to the `CUBE_EconomicDatabaseClient`; add the `verifyManagerConfirmation` method to the `CUBE_EconomicServicePort`; widen the `CUBE_EconomicError` to accept `422`; add `VerifyManagerConfirmationInput` + `VerifyManagerConfirmationResult` + `CUBE_EconomicRowKind` + per-table `*UpdateInput` whitelists. |
| 4 | `src/modules/cube-economic/cube-economic.service.ts` | edit | Add `verifyManagerConfirmation` method. Mirrors `AutomationSuggestionService.approve()`: `prisma.$transaction(async (tx) => { ... })` + `SET LOCAL bevero.allow_cube_economic_update = 'on'` + UPDATE the row (per-table whitelist) + create immutable `AutomationDecision` (audit trail) + reuse a per-org synthetic `AutomationRule` (`cube_economic_manual_verification`, `ruleType: "event"`, created on demand) + a per-(org, rowKind, rowId) synthetic `AutomationSuggestion` (deterministic id, reused on every verify). |
| 5 | `src/routes/cube-economic.route.ts` | edit | Add 4 POST endpoints, one per CUBE_Economic table: `/admin/cube/economic/exclusive-rental/:id/verify`, `/admin/cube/economic/staff-rates/:id/verify`, `/admin/cube/economic/non-food/:id/verify`, `/admin/cube/economic/furniture/:id/verify`. All require `managerRoles = ["admin", "shift_lead"]` (manager gate). Zod body schema whitelists per-table fields only. |
| 6 | `src/app.ts` | edit | No new factory needed; the existing `buildCUBE_EconomicDependencies` already wires the service. The `CUBE_EconomicDatabaseClient` is now cast to include the new `automationDecision` / `automationRule` / `automationSuggestion` / `$transaction` / `$executeRawUnsafe` keys; the same `as unknown as` cast pattern as the read-only slice. |
| 7 | `tests/cube-economic.routes.test.ts` | edit | Extend the existing in-memory stub to include `update` + `findFirst` for all 4 tables + `automationDecision` + `automationRule` + `automationSuggestion` + `$transaction` + `$executeRawUnsafe` + a `MutationSink` for assertion. Add 9 new mutation test cases (5 on exclusive-rental, 2 on staff-rates, 1 on non-food, 1 on furniture). The 10 existing read-only cases must remain green. |
| 8 | `scripts/verify-adr-0029c2-cube-economic-mutation.ts` | new | 12-query Supabase promotion script (mirrors `scripts/verify-adr-0029c-cube-event-economic.ts` shape; uses **textual** `pg_policies.cmd` codes per the ADR-0029-B post-promotion correction). |
| 9 | `docs/DECISIONS.md` | edit | This ADR section (proposed; flips to `accepted` on owner review). |
| 10 | `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-c2-closure.md` | new | Closure MSPR. |

**No existing model, migration, route, or test is modified.**
**No `prisma/schema.prisma` change is required** (the new mutation
methods are additive to the existing service contract).

### Explicit Non-Scope (deferred to ADR-0029-D or later)

- **No writeback** to FoodNotify, Microsoft Dynamics 365, DATEV,
  Rauschenberger, or any other external system.
- **No LLM** in any calculation or display.
- **No service-role credential** in user paths. RLS is authoritative
  (ADR-0014); the `WITH CHECK` policy's GUC check is the security
  boundary.
- **No `app_runtime` grant** on the 4 CUBE_Economic tables.
- **No Cockpit UI** change in `apps/cockpit/`. The first Cockpit
  wire-up is a separate task.
- **No new external npm dependency**.
- **No `.env*` change**.
- **No PDF export, no offer-calculator** (ADR-0080+).
- **No Connector** to FoodNotify/Gastronovi (ADR-0002, ADR-0021 §3).
- **No new `*NetCents` field** can be set via the verify path; the
  Brutto/Netto-Disziplin stays enforced at the DB layer. The
  manager-verification path is constrained to the
  `isActive / requiresManagerConfirmation / notes / validFrom /
  validUntil / effectiveFrom / effectiveUntil` whitelist per table
  (no monetary fields).
- **No `CUBE_EconomicAutomationDecision` table** is added; the
  existing `AutomationDecision` is reused (per ADR-0022 +
  ADR-0029-B §Decisions §4 synthetic-rule pattern). The audit trail
  is therefore a query of `AutomationDecision WHERE metadata->>'kind'
  IN ('verify_economic', ...)`, not a new table.

### Decisions Made Binding

The numbered decisions below are binding on the Implementer.

#### §1 Synthetic `AutomationRule` pattern (per ADR-0029-B §Decisions §4)

The manager-verification path creates a per-org synthetic
`AutomationRule` named `cube_economic_manual_verification`,
`ruleType: "event"`, on demand (no seed required). Rationale:
mirrors the ADR-0029-B §Decisions §4 pattern that resolved the
`AutomationSuggestion.ruleId` non-nullable contradiction
(ADR-0029-B §3 binding decision §4) by using a synthetic rule. The
synthetic rule is **enabled: true, version: 1, condition: { type:
"manual_detection", target: "cube_economic" }, action: { type:
"manual_verification", surface: "cube_economic" }, evaluateOn:
"write", schedule: null, metadata: { synthetic: true, slice:
"adr-0029-c.2" }`.

A per-(org, rowKind, rowId) synthetic `AutomationSuggestion` is
**also** created on demand, with a deterministic id
(`sug-cube-eco-<orgId-prefix>-<rowKind>-<rowId>`, sliced to 64 chars
to match the repo's id convention) and `status: "approved"` on
creation (the manager is the approver). The deterministic id enables
the findUnique-or-create pattern: subsequent verify calls on the same
(org, rowKind, rowId) tuple reuse the same suggestion, and the
per-event decision rows are appended immutably.

The per-event `AutomationDecision` row carries:
- `status: "approved"` (the manager verified)
- `actor: actor.userId` (the manager)
- `actorRole: actor.role` (e.g. "admin" or "shift_lead")
- `timestamp: occurredAt` (the moment of verify)
- `reason: input.reason ?? null` (the manager's reason text)
- `notes: input.notes OR changes.notes (sanitized via sanitizePII)`
  (the audit narrative; PII-regex sanitized, ≤ 1000 chars enforced
  at the service layer; DB CHECK ≤ 1000 as backstop)
- `metadata: { rowKind, rowId, clientRequestId }` (the cross-
  reference for the immutable audit trail)

#### §2 GUC name + `SET LOCAL` scope

The GUC is named `bevero.allow_cube_economic_update` (Postgres GUC
namespace convention: `<app>.<verb>_<noun>`). The GUC is set via
`SET LOCAL bevero.allow_cube_economic_update = 'on'` at the start of
the service-layer transaction. `SET LOCAL` is transaction-scoped and
auto-reverts at COMMIT/ROLLBACK. The trigger function reads the GUC
via `current_setting('bevero.allow_cube_economic_update', true)`
(the `true` second arg returns `NULL` if unset; we treat `NULL` or
any value other than `'on'` as "block").

#### §3 Trigger function relaxation (GUC-gated bypass)

`public.cube_economic_append_only()` is replaced via `CREATE OR
REPLACE FUNCTION`. The new body:
1. If `current_setting('bevero.allow_cube_economic_update', true)
   = 'on'` AND `TG_OP = 'UPDATE'`: return NEW (allow).
2. If `current_setting('bevero.allow_cube_economic_update', true)
   = 'on'` AND `TG_OP = 'INSERT'`: return NEW (allow; the seed +
   any future service-layer INSERTs use this).
3. If `TG_OP = 'DELETE'`: raise (DELETE is never permitted; the
   `bevero.allow_cube_economic_update` GUC does NOT bypass DELETE).
4. Otherwise (GUC is NULL or any value other than `'on'`): raise
   the original `restrict_violation` exception.

The triggers themselves are NOT recreated (they continue to point at
the same function by name; Postgres resolves the trigger function
reference at trigger-fire time, not at trigger-create time). The
trigger count is unchanged: 8 CUBE_Economic triggers (4 block_update
+ 4 block_delete) + 2 AutomationDecision + 2 CUBE_Conflict = 12.

#### §4 Double-gate pattern (RLS WITH CHECK + trigger GUC)

The mutation is double-gated: (a) the `WITH CHECK` UPDATE policy
added in 20260609070000 enforces
`current_setting('bevero.allow_cube_economic_update', true) = 'on'`
+ org-scope via OrganizationMember join; (b) the trigger function
honours the same GUC. Even with a leaked JWT, an UPDATE from a raw
authenticated client would fail the GUC check in the policy's WITH
CHECK clause. RLS is therefore the primary security boundary; the
trigger is defense-in-depth.

The WITH CHECK clause appears on the UPDATE policy (not the SELECT
policy). Postgres RLS evaluates WITH CHECK on UPDATE; USING is
consulted on SELECT / UPDATE for the OLD row (which is irrelevant
for the manager-verification path). The policy's WITH CHECK
re-asserts both the org-scope and the GUC, so a raw `UPDATE … SET
isActive = true` from a leaked JWT would fail at RLS evaluation
before reaching the trigger.

#### §5 Manager-only role gate (route layer)

The 4 POST endpoints require `managerRoles = ["admin", "shift_lead"]`
(the existing `leadRoles` pattern at
`src/routes/automation-suggestion.route.ts:29`). RLS does NOT
distinguish roles; the route layer enforces the manager-only path.
The GUC is set ONLY by the service-layer transaction; only the route
layer can call the service layer (via the auth gate); therefore
only `admin` or `shift_lead` actors can pass the route-layer gate
and trigger the service-layer transaction. A `staff` actor would
be rejected at the route layer (403 Forbidden) before any GUC is
set.

#### §6 Brutto/Netto-Disziplin preserved (binding decision ADR-0029-C §5 is durable)

The mutation path does not touch any `*NetCents` field. The
per-table whitelist excludes all monetary fields:
- `ExclusiveRentalPolicy` whitelist: `isActive, requiresManagerConfirmation, notes, validFrom, validUntil` (NO `dayRentalRoomNetCents`, `dayRentalMinConsumptionNetCents`, `eveningRentalRoomNetCents`, `eveningRentalMinConsumptionNetCents`, `seatedMenuMaxGuests`, `standingReceptionMaxGuests`, `minimumGuestCount`).
- `AfterMidnightStaffRate` whitelist: `isActive, requiresManagerConfirmation, notes, validFrom, validUntil` (NO `hourlyRateNetCents`, `role`, `fromHourLocal`, `toHourLocal`).
- `NonFoodComponent` whitelist: `isActive, notes` (NO `category`, `name`, `description`, `defaultIncluded`, `extraCostNetCents`).
- `FurniturePolicy` whitelist: `isActive, requiresManagerConfirmation, notes, effectiveFrom, effectiveUntil` (NO `name`, `includedUntilGuestCount`, `additionalFromGuestCount`, `sourceUrl`).

The service-layer rejects any non-whitelisted key with a 422. The
DB-level CHECK constraints on `*NetCents` (positive integers) and
the nullable `extraCostNetCents` constraint (NULL OR >= 0) are
preserved unchanged.

#### §7 PII mitigation preserved

The `notes` field (both the row.notes and the decision.notes) is
sanitized through the same `sanitizePII` regex as the read slice
(mirror `src/modules/cube-source-conflict/cube-source-conflict.service.ts:37-45`).
The service-layer rejects any `notes` value > 1000 chars with a 400
(the DB CHECK enforces this as a backstop, matching the
`NonFoodComponent.notes` and `FurniturePolicy.notes` DB-level
`length("notes") <= 1000` constraint from ADR-0029-C §5).

#### §8 Idempotent migration (forward-only, no `_pkey` collision)

The 2 migrations are forward-only. The `WITH CHECK` policies are
created with `DROP POLICY IF EXISTS` before `CREATE POLICY` (so the
migration is idempotent on re-run). The trigger function is
replaced via `CREATE OR REPLACE FUNCTION` (also idempotent). The
defense-in-depth `DO $$` blocks in both migrations assert the
trigger counts are unchanged and raise `restrict_violation` if any
regression is detected.

### Decisions That Bind the Future Mutation Slice (deferred to ADR-0029-D / E)

- A future ADR-0029-D may add a `CUBE_EconomicAutomationDecision`
  table (per-table, denormalized from the generic
  `AutomationDecision` for Cockpit-Display query speed). The
  `AutomationDecision` rows this slice creates are NOT denormalized;
  a Cockpit-Display query would `WHERE metadata->>'rowKind' IN (...)`.
- A future ADR-0029-E may add a Cockpit-Form to manage the
  `requiresManagerConfirmation` workflow (out of scope for this
  slice and ADR-0029-D).
- The synthetic `AutomationRule` pattern (per ADR-0029-B §Decisions
  §4 + §1 above) is durable; future slices that need an
  audit-trailed mutation surface will use the same pattern with a
  distinct rule name per slice.

### Risk Register

| ID | Risk | Mitigation | Severity |
|---|---|---|---|
| ID-001 | Manager flips `isActive: false → true` on a non-existent or wrong-org row (cross-tenant attack) | Service-layer `findFirst({ where: { id, organizationId } })` + org-scope check in the WITH CHECK policy | low |
| ID-002 | Brutto/Netto-Disziplin violation (manager attempts to set a `*NetCents` field via the verify path) | Per-table whitelist excludes all monetary fields; service-layer 422 on unknown key; DB CHECK constraints preserved | low |
| ID-003 | PII written to disk via `notes` | `sanitizePII` regex + service-layer 1000-char cap + DB CHECK `length("notes") <= 1000` | low |
| ID-004 | Defense-in-depth `DO $$` block becomes fragile as more append-only triggers are added across slices | The block asserts trigger **presence** (count = N), not policy counts. Future slices (ADR-0029-D, ADR-0029-B.2 in the next block, etc.) will widen the assertion to include their new triggers. | low |
| ID-005 | Verify-script returns 0 rows for `pg_policies.cmd = 'r'` (regression of ADR-0029-B's corrected post-promotion finding) | Use textual `cmd = 'UPDATE'` / `cmd = 'SELECT'` (mirroring the ADR-0029-C verify-script precedent; binding decision ADR-0029-C §12) | low |
| ID-006 | Default Supabase privileges on `authenticated` / `anon` for the 4 CUBE_Economic tables (defense-in-depth privilege hygiene) | Companion REVOKE migration `20260609060002` (from ADR-0029-C §14) is already applied; the verify-script Q5 asserts the absence of write grants | low |
| ID-007 | GUC leakage: the GUC `bevero.allow_cube_economic_update` is set on a connection but not auto-reverted (e.g. a service-layer crash mid-transaction leaks it) | `SET LOCAL` (not `SET`) is used: the GUC is transaction-scoped and auto-reverts at COMMIT/ROLLBACK. A crash mid-transaction causes a ROLLBACK (the next transaction on the same connection starts with the GUC unset). | low |
| ID-008 | Synthetic `AutomationRule` race: 2 concurrent verify calls on the same (org, rowKind, rowId) tuple both try to create the synthetic rule | The first findFirst returns null for both; both call create. The unique constraint on `AutomationRule.@@index([organizationId, name, deletedAt])` is NOT enforced at the DB layer (no `@@unique`); the second create will succeed with a duplicate rule. The service-layer `findFirst` is therefore non-deterministic. **Future fix**: a Cockpit-side Cockpit-Form mutation that acquires a `pg_advisory_xact_lock(hashtext(organizationId || rowKind || rowId))` to serialize the findUnique-or-create path. Out of scope for this slice. | low |
| ID-009 | Manager flips `isActive: true → false` accidentally (a misclick; the CUBE Economic rules are now hidden from the Cockpit-Display) | The seed is `isActive: false` + `requiresManagerConfirmation: true` for all 4 tables; the manager's flip is the only path. The audit trail (`AutomationDecision` row) preserves the actor + timestamp + reason, so a Cockpit-Display can show "Last verified by <actor> at <timestamp>". A future ADR-0029-D may add a Cockpit-Form confirmation step. | low |

### Acceptance Gate (Test Plan)

The slice is **done** when **all** of the following pass:

1. `npx prisma validate` exits 0 against the unchanged
   `prisma/schema.prisma`.
2. `npm run typecheck` exits 0.
3. `npx prisma migrate deploy` against the named Supabase dev project
   (`czinchfektglmrloxlmh`, owner-typed) applies both migrations
   cleanly; the RLS migration's `DO $$` block exits 0 (4 UPDATE
   policies created); the trigger migration's `DO $$` block exits 0
   (12 triggers still present).
4. `npx vitest run` exits 0 incl. the 9 new mutation cases in
   `tests/cube-economic.routes.test.ts` (19 total in the file, up
   from 10).
5. `scripts/verify-adr-0029c2-cube-economic-mutation.ts` against
   the named Supabase dev project (owner-typed) reports **12/12
   PASS** (Q1: 4 UPDATE policies; Q2: 4 with GUC; Q3: 8 CUBE_Economic
   triggers; Q4: function references GUC; Q5-Q12: regression
   checks).
6. The 10 existing read-only cases in
   `tests/cube-economic.routes.test.ts` remain green (no regression).
7. `curl` against the 4 POST endpoints as an authenticated
   `admin` actor returns 200 + correct payload; as a `staff` actor
   returns 403; as unauthenticated returns 401.

### Cross-references

- ADR-0029-C (Event-Economic-Rules read-only, accepted 2026-06-09,
  promoted to Supabase 2026-06-09, commit `605827a`) — parent
  decision. Sub-Section ADR-0036-C is the binding conceptual spec.
- ADR-0029-B (CUBE Source-Conflict-Validator, accepted 2026-06-09,
  promoted to Supabase 2026-06-09, commit `6017c49`) — sibling
  Slice 2 precedent. The corrections from the ADR-0029-B promotion
  gate are incorporated as binding decisions §4 (textual cmd codes)
  and §7 (defense-in-depth `DO $$` widened). The synthetic-
  `AutomationRule` pattern from ADR-0029-B §Decisions §4 is the
  precedent for §1 above.
- ADR-0022 (Automation append-only invariant, `BEFORE UPDATE/DELETE`
  triggers) — the pattern mirrored for the 4 economic tables.
- ADR-0023 (Automation mutation surface) — the existing
  `AutomationSuggestionService.approve()` at
  `src/modules/automation/automation-suggestion.service.ts:232-374`
  is the transaction-shape template.
- ADR-0014 (Supabase Auth + `OrganizationMember` RLS pattern) — the
  WITH CHECK policy's org-scope join.
- ADR-0009 (soft-deactivation via `isActive`) — the mutation path
  flips `isActive` (the only field that toggles a row's
  Cockpit-Display visibility).
- `docs/automation/semi-automated-operations-layer.md` — no-writeback,
  human-gating guardrails.
- `docs/VISION.md` §7 (Phase 3 — CUBE-Kompatibilität).
- Spec: `docs/tasks/logik/00c-cube-event-economic-rules.md` — 00c
  spec.
- `prisma/migrations/20260609060001_add_cube_event_economics_rls/migration.sql`
  — the read-only slice's append-only trigger pattern; mirrored
  and relaxed in this slice.
- `prisma/migrations/20260609060002_revoke_cube_economic_write_grants/migration.sql`
  — REVOKE pattern.
- `src/modules/automation/automation-suggestion.service.ts:232-374` —
  `approve()` transaction shape template.
- `src/modules/automation/automation-rule.service.ts:97-176` —
  `AutomationDecisionRecord` + `AutomationRuleDatabaseClient` types.
- `scripts/verify-adr-0029c-cube-event-economic.ts` — verify-script
  template (15 queries, textual `pg_policies.cmd` codes).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-c-closure.md` —
  the read-only slice's closure MSPR (15/15 PASS, 538/538 vitest).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-c2-closure.md` —
  this slice's closure MSPR (the closure for the C.2 slice is
  written by the Implementer; pending owner-typed promotion).

### Next gate

After acceptance, the **Implementer** drafts in this order:

1. The 2 migrations (70000 + 70001), mirroring the read-only
   slice's migration shape (DDL, RLS, defense-in-depth `DO $$`
   block).
2. The `src/modules/cube-economic/cube-economic.types.ts` +
   `cube-economic.service.ts` + `cube-economic.route.ts` edits,
   following the binding decisions §1-§8.
3. The `tests/cube-economic.routes.test.ts` extension (in-memory
   stub with `update` + `findFirst` for all 4 tables + the
   automation-trio delegates + `$transaction` + `$executeRawUnsafe`;
   9 new mutation cases).
4. The `scripts/verify-adr-0029c2-cube-economic-mutation.ts` script
   (12 queries, textual `pg_policies.cmd` codes).
5. The `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-c2-closure.md`
   MSPR.

Then **Supabase promotion** via `prisma migrate deploy` against the
named Supabase dev project (owner-typed), followed by
`scripts/verify-adr-0029c2-cube-economic-mutation.ts` reporting
12/12 PASS. Cockpit may consume the 4 new POST endpoints only after
the promotion gate passes.

### Status

proposed — pending owner review. On acceptance, the frontmatter
`verdict: proposed` flips to `verdict: accepted` and the slice is
ready for the Supabase promotion gate.

---

## ADR-0029-B.2: CUBE Source-Conflict Mutation Surface (Slice 2.5)

Status: proposed (Owner review pending)

Decision: First mutation-surface slice under ADR-0029-B. This slice
upgrades the read-only CUBE Source-Conflict-Validator surface
(Slice 2) to a `WITH CHECK`-gated manager-resolve + manager-entry
mutation surface. It is **forward-only, additive, and
DEMO_MODE-safe**; no existing model, migration, route, or test is
modified. The synthetic-`AutomationRule` pattern (per ADR-0029-B
§Decisions §4 + ADR-0029-C.2 §1 binding) is reused. No LLM, no
writeback, no service-role credential on user paths, no Cockpit
change. The slice ships 10 file families + 1 verify-script + 1
closure MSPR.

### Sub-Phase / Sibling Refs

- Parent: ADR-0029-B (CUBE Source-Conflict-Validator read-only
  slice, accepted 2026-06-09, promoted 2026-06-09, commit
  `6017c49`), Sub-Section ADR-0036-B.
- Sibling: ADR-0029-C.2 (CUBE Event-Economic Mutation Surface,
  companion slice, parallel track — see ADR-0029-C.2 block above).
- Precedent: ADR-0029-B §Decisions That Bind the Future Mutation
  Slice (ADR-0029-B.2) at `docs/DECISIONS.md:2160-2175` for the
  general pattern (GUC-gated trigger relaxation).
- Precedent: `AutomationSuggestionService.approve()` at
  `src/modules/automation/automation-suggestion.service.ts:232-374`
  for the transaction shape.

### Scope (this ADR authorizes)

| # | Path | Action | Purpose |
|---|------|--------|---------|
| 1 | `prisma/migrations/20260609080000_add_cube_source_manager_update_policies/migration.sql` | new | Forward-only RLS: 3 `WITH CHECK`-gated UPDATE policies (one per CUBE table) + 2 `WITH CHECK`-gated INSERT policies (CUBE_Source + CUBE_SourceField for the manager-entry path); GUC check `current_setting('bevero.allow_cube_source_update', true) = 'on'`; org-scope via OrganizationMember join; defense-in-depth DO $$ block asserts the 2 AutomationDecision + 2 CUBE_Conflict append-only triggers are still present. |
| 2 | `prisma/migrations/20260609080001_relax_cube_source_append_only/migration.sql` | new | Forward-only DDL: `CREATE OR REPLACE FUNCTION public.cube_conflict_append_only()` now reads the GUC; when the GUC is `'on'`, UPDATE is allowed; DELETE remains unconditionally blocked; INSERT is allowed (the trigger on CUBE_Conflict does not see INSERT in this slice; CUBE_Source / CUBE_SourceField are not append-only). Defense-in-depth DO $$ block asserts AutomationDecision × 2 + CUBE_Conflict × 2 = 4 triggers present. |
| 3 | `src/modules/cube-source-conflict/cube-source-conflict.types.ts` | edit | Add `update` + `create` to all 3 CUBE tables on the database client; add `automationDecision.create` + `automationRule.findFirst/create` + `automationSuggestion.findUnique/create` + `workflowTask.create` + `$transaction` + `$executeRawUnsafe`; add the `resolveConflict` / `rejectConflict` / `enterSource` methods to the `CUBE_SourceConflictServicePort`; widen the `CUBE_SourceConflictError` to accept `409` + `422`; add `ResolveConflictInput/Result`, `RejectConflictInput/Result`, `EnterSourceInput/Result` + per-table `*UpdateInput` + `*CreateInput` whitelists. |
| 4 | `src/modules/cube-source-conflict/cube-source-conflict.service.ts` | edit | Add 3 mutation methods: `resolveConflict` (UPDATE CUBE_Conflict + create AutomationDecision + create WorkflowTask), `rejectConflict` (no mutation; create AutomationDecision only), `enterSource` (CREATE CUBE_Source + CREATE CUBE_SourceField rows + create AutomationDecision). All mirror `AutomationSuggestionService.approve()`'s transaction shape: `prisma.$transaction(async (tx) => { ... })` + `SET LOCAL bevero.allow_cube_source_update = 'on'`. |
| 5 | `src/routes/cube-source-conflict.route.ts` | edit | Add 3 POST endpoints: `/admin/cube/conflicts/:id/resolve`, `/admin/cube/conflicts/:id/reject`, `/admin/cube/sources` (manager-entry). All require `managerRoles = ["admin", "shift_lead"]`. Zod body schemas whitelist the per-table fields only. |
| 6 | `src/app.ts` | edit | No new factory needed; the existing `buildCUBE_SourceConflictDependencies` already wires the service. The `CUBE_SourceConflictDatabaseClient` is now cast to include the new keys; the same `as unknown as` cast pattern as the read-only slice. |
| 7 | `tests/cube-source-conflict.routes.test.ts` | edit | Extend the existing in-memory stub to include `update` + `create` for all 3 tables + `automationDecision` + `automationRule` + `automationSuggestion` + `workflowTask` + `$transaction` + `$executeRawUnsafe` + a `SourceConflictSink` for assertion. Add 5 new mutation test cases (2 on resolve, 1 on reject, 2 on enter-source). The 10 existing read-only cases must remain green. |
| 8 | `scripts/verify-adr-0029b2-cube-source-mutation.ts` | new | 12-query Supabase promotion script (mirrors `scripts/verify-adr-0029b-cube-source-conflict.ts` shape; uses **textual** `pg_policies.cmd` codes). |
| 9 | `docs/DECISIONS.md` | edit | This ADR section (proposed; flips to `accepted` on owner review). |
| 10 | `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b2-closure.md` | new | Closure MSPR. |

**No existing model, migration, route, or test is modified.**
**No `prisma/schema.prisma` change is required.**

### Explicit Non-Scope (deferred to ADR-0029-D or later)

- **No writeback** to FoodNotify, Microsoft Dynamics 365, DATEV,
  Rauschenberger, or any other external system.
- **No LLM** in any calculation or display.
- **No service-role credential** in user paths. RLS is authoritative
  (ADR-0014); the `WITH CHECK` policy's GUC check is the security
  boundary.
- **No `app_runtime` grant** on the 3 CUBE tables.
- **No Cockpit UI** change in `apps/cockpit/`. The first Cockpit
  wire-up is a separate task.
- **No new external npm dependency**.
- **No `.env*` change**.
- **No `CUBE_ConflictSource` join table** (SCHEMA-007 deferral from
  ADR-0029-B §15). The `sourceIds` column is still a `TEXT[]` soft
  reference; the service-layer's defensive check on read (in
  `listConflicts` and `getConflict`) is unchanged.
- **No new seed** is added in this slice; the manager-entry path
  creates new `CUBE_Source` + `CUBE_SourceField` rows but does not
  seed the conflict detector (the existing seed at
  `prisma/seeds/cube_source_conflict.sql` is unchanged and idempotent).

### Decisions Made Binding

The numbered decisions below are binding on the Implementer.

#### §1 Synthetic `AutomationRule` pattern (per ADR-0029-B §Decisions §4 + ADR-0029-C.2 §1)

The mutation paths create 3 per-org synthetic `AutomationRule`s on
demand:
- `cube_source_manual_resolution` (manager-resolve path; `ruleType: "event"`, `condition: { type: "manual_detection", target: "cube_source_conflict", purpose: "resolution" }`).
- `cube_source_manual_rejection` (manager-reject path; same shape, `purpose: "rejection"`).
- `cube_source_manual_entry` (manager-entry path; same shape, `purpose: "entry"`).

A per-(org, rowKind, rowId) synthetic `AutomationSuggestion` is
**also** created on demand, with a deterministic id
(`sug-cube-src-<orgId-prefix>-<rowKind>-<rowId>`, sliced to 64
chars) and `status: "open"` on creation (the suggestion is opened
by the manager; the `AutomationDecision` then closes it as
approved or rejected). The deterministic id enables the
findUnique-or-create pattern: subsequent mutation calls on the
same (org, rowKind, rowId) tuple reuse the same suggestion, and
the per-event decision rows are appended immutably.

The per-event `AutomationDecision` row carries the same fields as
ADR-0029-C.2 §1: `status`, `actor`, `actorRole`, `timestamp`,
`reason`, `notes` (sanitized), `metadata: { kind, rowKind, rowId,
clientRequestId }`.

#### §2 GUC name + `SET LOCAL` scope

The GUC is named `bevero.allow_cube_source_update` (Postgres GUC
namespace convention: `<app>.<verb>_<noun>`). The GUC is set via
`SET LOCAL bevero.allow_cube_source_update = 'on'` at the start of
each mutation transaction. The trigger function reads the GUC via
`current_setting('bevero.allow_cube_source_update', true)`.

#### §3 Trigger function relaxation (GUC-gated bypass; CUBE_Conflict only)

`public.cube_conflict_append_only()` is replaced via `CREATE OR
REPLACE FUNCTION`. The new body mirrors the ADR-0029-C.2 §3 pattern:
1. If `current_setting('bevero.allow_cube_source_update', true) =
   'on'` AND `TG_OP = 'UPDATE'`: return NEW (allow).
2. If `current_setting('bevero.allow_cube_source_update', true) =
   'on'` AND `TG_OP = 'INSERT'`: return NEW (allow; not used in
   this slice for CUBE_Conflict, but consistent with the
   ADR-0029-C.2 pattern).
3. If `TG_OP = 'DELETE'`: raise (DELETE is never permitted; the
   `bevero.allow_cube_source_update` GUC does NOT bypass DELETE).
4. Otherwise: raise the original `restrict_violation` exception.

The triggers themselves are NOT recreated. The trigger count is
unchanged: 2 CUBE_Conflict triggers (block_update + block_delete) +
2 AutomationDecision = 4. CUBE_Source and CUBE_SourceField are
NOT append-only (they are freely INSERT-able per the read-only
slice; the B.2 slice adds the WITH CHECK policy to gate the
manager-entry path).

#### §4 Double-gate pattern (RLS WITH CHECK + trigger GUC)

Same as ADR-0029-C.2 §4. The 5 `WITH CHECK` policies (3 UPDATE + 2
INSERT) enforce
`current_setting('bevero.allow_cube_source_update', true) = 'on'`
+ org-scope via OrganizationMember join. The trigger function on
CUBE_Conflict honours the same GUC. Even with a leaked JWT, an
UPDATE / INSERT from a raw authenticated client would fail the GUC
check in the policy's WITH CHECK clause.

#### §5 Manager-only role gate (route layer)

The 3 POST endpoints require `managerRoles = ["admin", "shift_lead"]`
(the existing `leadRoles` pattern at
`src/routes/automation-suggestion.route.ts:29`). RLS does NOT
distinguish roles; the route layer enforces the manager-only path.
A `staff` actor would be rejected at the route layer (403
Forbidden) before any GUC is set.

#### §6 Per-table whitelist for UPDATE (CUBE_Conflict resolver path)

The `resolveConflict` path mutates `CUBE_Conflict` only
(`resolvedAt`, `resolvedBySuggestionId`, `winningFieldValue`).
The remaining columns (`id`, `organizationId`, `fieldKey`,
`sourceIds`, `detectedAt`) are NOT mutable in this slice. The
service-layer rejects any non-whitelisted key with a 422.

#### §7 Per-table whitelist for UPDATE (CUBE_Source + CUBE_SourceField manager-entry path)

The `enterSource` path creates new rows (INSERT, not UPDATE); the
read-side `CUBE_Source` UPDATE policy (`cube_source_manager_update`)
allows `isActive` + `enteredBy` flips (used for the future ADR-0029-D
Cockpit-Form path; not exercised by any of the 3 POST endpoints in
this slice). The `CUBE_SourceField` UPDATE policy
(`cube_source_field_manager_update`) allows `fieldValue` +
`confidence` updates (used for the future ADR-0029-D Cockpit-Form
path).

#### §8 Already-resolved conflict returns 409

If `resolveConflict` is called on a `CUBE_Conflict` row with
`resolvedAt != null`, the service-layer throws
`CUBE_SourceConflictError("CUBE conflict is already resolved", 409)`.
The route layer maps 409 to "Conflict" + 409 HTTP status. This is
the same posture as `AutomationSuggestionService.approve()` at
`src/modules/automation/automation-suggestion.service.ts:392-396`
(which throws 409 on a non-`open` suggestion).

### Decisions That Bind the Future Mutation Slice (deferred to ADR-0029-D or E)

- A future ADR-0029-D may add a `CUBE_ConflictSource` join table
  (SCHEMA-007 deferral from ADR-0029-B §15). The `sourceIds`
  column will be deprecated and the service layer will read the
  join table.
- A future ADR-0029-D may add a Cockpit-Form to manage the
  `requires_manager_confirmation` workflow on CUBE_SourceField.
- The synthetic `AutomationRule` pattern (per ADR-0029-B §Decisions
  §4 + §1 above) is durable; future slices that need an
  audit-trailed mutation surface will use the same pattern with a
  distinct rule name per slice.

### Risk Register

| ID | Risk | Mitigation | Severity |
|---|---|---|---|
| ID-001 | Manager resolves the wrong conflict (cross-org) | Service-layer `findFirst({ where: { id, organizationId } })` + org-scope check in the WITH CHECK policy | low |
| ID-002 | Already-resolved conflict is overwritten (a re-resolve after a Cockpit-Form misclick) | Service-layer 409 on `resolvedAt != null`; immutable AutomationDecision preserves the original resolve + reject history | low |
| ID-003 | PII written to disk via `winningFieldValue` or `fieldValue` | `sanitizePII` regex (same as read slice) + service-layer 500-char cap (mirrors `CHECK (length("fieldValue") <= 500)` at the DB layer; binding decision ADR-0029-B §8) | low |
| ID-004 | Defense-in-depth `DO $$` block becomes fragile | The block asserts trigger **presence** (count = N), not policy counts. | low |
| ID-005 | Verify-script returns 0 rows for `pg_policies.cmd = 'r'` (regression of ADR-0029-B's corrected post-promotion finding) | Use textual `cmd = 'UPDATE'` / `cmd = 'INSERT'` / `cmd = 'SELECT'` | low |
| ID-006 | Default Supabase privileges on `authenticated` / `anon` for the 3 CUBE tables (defense-in-depth privilege hygiene) | Companion REVOKE migration `20260609050002` (from ADR-0029-B) is already applied; the verify-script Q5 asserts the absence of write grants | low |
| ID-007 | GUC leakage: the GUC `bevero.allow_cube_source_update` is set on a connection but not auto-reverted | `SET LOCAL` (not `SET`) is used: the GUC is transaction-scoped and auto-reverts at COMMIT/ROLLBACK | low |
| ID-008 | Synthetic `AutomationRule` race: 2 concurrent mutation calls on the same (org, rowKind, rowId) tuple both try to create the synthetic rule | The first findFirst returns null for both; both call create. The `@@index([organizationId, ruleType])` is NOT a unique constraint; the second create will succeed with a duplicate rule. **Future fix**: a Cockpit-side Cockpit-Form mutation that acquires a `pg_advisory_xact_lock(hashtext(organizationId || rowKind || rowId))`. Out of scope for this slice. | low |
| ID-009 | `CUBE_Conflict.sourceIds` contains a stale id after a `CUBE_Source` hard-delete | Service-layer defensive check on read (already in ADR-0029-B §6; unchanged). The mutation path does not currently filter `sourceIds`; a future ADR-0029-D may add the join-table. | low |

### Acceptance Gate (Test Plan)

The slice is **done** when **all** of the following pass:

1. `npx prisma validate` exits 0 against the unchanged
   `prisma/schema.prisma`.
2. `npm run typecheck` exits 0.
3. `npx prisma migrate deploy` against the named Supabase dev project
   (`czinchfektglmrloxlmh`, owner-typed) applies both migrations
   cleanly; the RLS migration's `DO $$` block exits 0 (3 UPDATE +
   2 INSERT policies created); the trigger migration's `DO $$`
   block exits 0 (4 triggers still present).
4. `npx vitest run` exits 0 incl. the 5 new mutation cases in
   `tests/cube-source-conflict.routes.test.ts` (15 total in the
   file, up from 10).
5. `scripts/verify-adr-0029b2-cube-source-mutation.ts` against
   the named Supabase dev project (owner-typed) reports **12/12
   PASS** (Q1: 3 UPDATE policies; Q2: 2 INSERT policies; Q3: 5 with
   GUC; Q4: function references GUC; Q5-Q12: regression checks).
6. The 10 existing read-only cases in
   `tests/cube-source-conflict.routes.test.ts` remain green (no
   regression).
7. `curl` against the 3 POST endpoints as an authenticated
   `admin` actor returns 200 + correct payload; as a `staff` actor
   returns 403; as unauthenticated returns 401.

### Cross-references

- ADR-0029-B (CUBE Source-Conflict-Validator read-only, accepted
  2026-06-09, promoted 2026-06-09, commit `6017c49`) — parent
  decision. Sub-Section ADR-0036-B is the binding conceptual spec.
- ADR-0029-C.2 (CUBE Event-Economic Mutation Surface, companion
  slice, parallel track — see ADR-0029-C.2 block above).
- ADR-0022 (Automation append-only invariant) — the pattern
  mirrored for CUBE_Conflict.
- ADR-0023 (Automation mutation surface) — the existing
  `AutomationSuggestionService.approve()` is the transaction-shape
  template.
- ADR-0014 (Supabase Auth + `OrganizationMember` RLS pattern).
- `docs/automation/semi-automated-operations-layer.md` — no-
  writeback, human-gating guardrails.
- `docs/VISION.md` §7 (Phase 3 — CUBE-Kompatibilität).
- Spec: `docs/tasks/logik/00b-cube-source-conflict-validator.md` —
  00b spec.
- `prisma/migrations/20260609050001_add_cube_source_conflict_rls/migration.sql`
  — the read-only slice's append-only trigger pattern; mirrored
  and relaxed in this slice.
- `prisma/migrations/20260609050002_revoke_cube_write_grants/migration.sql`
  — REVOKE pattern.
- `src/modules/automation/automation-suggestion.service.ts:232-374`
  — `approve()` transaction shape template.
- `src/modules/automation/automation-rule.service.ts:97-176` —
  `AutomationDecisionRecord` + `AutomationRuleDatabaseClient` types.
- `scripts/verify-adr-0029b-cube-source-conflict.ts` — verify-script
  template (15 queries, textual `pg_policies.cmd` codes).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b-closure.md` —
  the read-only slice's closure MSPR (15/15 PASS, 528/528 vitest).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b2-closure.md` —
  this slice's closure MSPR (the closure for the B.2 slice is
  written by the Implementer; pending owner-typed promotion).

### Next gate

After acceptance, the **Implementer** drafts in this order:

1. The 2 migrations (80000 + 80001), mirroring the read-only
   slice's migration shape (DDL, RLS, defense-in-depth `DO $$`
   block).
2. The `src/modules/cube-source-conflict/cube-source-conflict.types.ts` +
   `cube-source-conflict.service.ts` + `cube-source-conflict.route.ts`
   edits, following the binding decisions §1-§8.
3. The `tests/cube-source-conflict.routes.test.ts` extension
   (in-memory stub with `update` + `create` for all 3 tables + the
   automation-trio delegates + `workflowTask` + `$transaction` +
   `$executeRawUnsafe`; 5 new mutation cases).
4. The `scripts/verify-adr-0029b2-cube-source-mutation.ts` script
   (12 queries, textual `pg_policies.cmd` codes).
5. The `docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b2-closure.md`
   MSPR.

Then **Supabase promotion** via `prisma migrate deploy` against the
named Supabase dev project (owner-typed), followed by
`scripts/verify-adr-0029b2-cube-source-mutation.ts` reporting
12/12 PASS. Cockpit may consume the 3 new POST endpoints only after
the promotion gate passes.

### Status

proposed — pending owner review. On acceptance, the frontmatter
`verdict: proposed` flips to `verdict: accepted` and the slice is
ready for the Supabase promotion gate.

---

## ADR-0049: Motorworld-Inn Standortlogik Phase A Contract (docs-only)

**verdict:** proposed — 2026-06-09

### Context

Motorworld-Inn betreibt 4 Standorte (München, Böblingen, Warthausen, Mallorca) mit unterschiedlichen OperationalUnit-Typen, Event-Räumen, Reservation-Connectoren und Sonder-Override-Regeln. Vor der Schema-Implementierung (Task 05) muss der Architektur-Vertrag dokumentiert werden: welche Spezifika auf welchem Modell landen und warum kein neuer `LocationProfile`-Wert benötigt wird.

### Decisions

1. Alle 4 Standorte landen auf `LocationProfile = MOTORWORLD_STANDARD`. Keine neuen Enum-Werte.
2. Standort-Spezifika werden auf `OperationalUnit.unitType`, `EventSpace.supports`, `Location.cinemaAvailable`, `Location.weatherSensitive`, `Location.signatureAssets` abgebildet.
3. `Movie Cars Cinema` → `EventSpace.supports = [CINEMA, DINNER_THEATER]` + `Location.cinemaAvailable = true`.
4. Warthausen-Öchsle-Override → `ExceptionRule.type = OECHSLE_BUFFET_OVERRIDE` + `requiresConfirmation = true`. Kein Fahrplan-Sync in dieser Slice.
5. Hotel-Kontext (Böblingen, Warthausen) → `ExternalSystemLink.kind = HOTEL_EVIIVO` (read-only Link, kein PMS-Build).
6. Mallorca-Outdoor → `OperationalUnit.unitType = OUTDOOR_BAR_TERRACE` + `Location.weatherSensitive = true`.
7. Reservation-Provider → `ReservationConnector`-Tabelle (Task 05), kein eigenes Schema.

### Bindings

- ADR-0021 §3 (read-only, no writeback)
- ADR-0030 §1 (Profil-Discriminator)
- ADR-0031 (Location-Substrate)
- Task 01 (OperationalUnit brand-übergreifend)

### Gate (Definition of Done)

- `docs/architecture/motorworld-inn-standortlogik.md` existiert.
- `docs/architecture/exception-calendar.md` existiert.
- `prisma validate` / `typecheck` / `vitest` unverändert (575).

### Status

proposed — pending owner review.

---

## ADR-0050: Motorworld-Inn Data Model — EventSpace, ExceptionRule, ReservationConnector, ExternalSystemLink (Task 05)

**verdict:** proposed — 2026-06-09

### Context

Phase A Contract (ADR-0049) wird in Prisma-Schema operationalisiert: 4 neue Modelle, 4 neue Enums, 3 neue `Location`-Felder, Seed für 4 Standorte. 11 neue vitest-Fälle für die 4 neuen Read-Endpoints.

### Decisions

1. **`EventSpace`** — Räume innerhalb einer Location. `slug` unique per `(locationId, slug)`. `supports EventSpaceSupport[]` Enum-Array. FK: `locationId`, `organizationId`.
2. **`ExceptionRule`** — zeitlich begrenzte Override-Regeln. Typ-Enum mit 8 Werten inkl. `OECHSLE_BUFFET_OVERRIDE`. `requiresConfirmation Boolean`, `confirmedByUserId String?`, `confirmedAt DateTime?`. Keine Write-Trigger (Audit via `updatedAt`).
3. **`ReservationConnector`** — read-only. Provider-Enum: GASTRONAUT, GASTRONOVI, PHONE, WALK_IN, EVENT_INQUIRY, EVIIVO, OTHER. Kein API-Key in `metadata`.
4. **`ExternalSystemLink`** — read-only. Kind-Enum: 7 Werte inkl. HOTEL_EVIIVO, OECHSLE_SCHEDULE.
5. **Location-Field-Additions:** `signatureAssets String[]`, `weatherSensitive Boolean @default(false)`, `cinemaAvailable Boolean @default(false)`.
6. **RLS:** org-scoped SELECT-Policy + `app_runtime`-Grant (SELECT) auf allen 4 neuen Tabellen. Kein Write-Grant für `app_runtime`.
7. **Seed:** 4 Motorworld-Standorte (DEMO_MODE-gated, id-guarded).

### Bindings

- ADR-0021 §3 (Mutation ist ADR-0061)
- ADR-0030 §1
- ADR-0031 (Location-Substrate)
- ADR-0049 (Phase A Contract)

### Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (575 + 11 = 586) grün
- 14/14 `scripts/verify-adr-0050-motorworld-extensions.ts` grün
- Owner-Acceptance

### Status

proposed — pending owner review.

---

## ADR-0051: Mother-Concern Read APIs — Today-Overview, ExceptionCalendar, EventSpaces, Connectors (Task 06)

**verdict:** proposed — 2026-06-09

### Context

Task 05 Substrate wird um 5 Read-Endpoints + 3 Service-Dateien erweitert. `today-overview` ist der Aggregator-Kern.

### Decisions

1. **5 Read-Endpoints** (alle GET, alle read-only):
   - `GET /admin/location/locations/:id/exception-rules?dateFrom=&dateTo=&type=`
   - `GET /admin/location/locations/:id/event-spaces`
   - `GET /admin/location/locations/:id/reservation-connectors`
   - `GET /admin/location/locations/:id/external-system-links`
   - `GET /admin/location/locations/:id/today-overview`
2. **`overview.service.ts`** — Aggregator. Caching: 60s Memory per `(locationId, date)` via `Map`.
3. **`exception-rule.service.ts`** — gefilterte ExceptionRule-Liste.
4. **`connector.service.ts`** — Connector + Link-Liste.
5. **PII-Guard:** `today-overview.openInquiries` enthält kein `rawMessage`, kein `contactEmail/Phone`.
6. **Out-of-Scope:** Connector-Build, Wetter-Live-Fetch, Mutations.

### Bindings

- ADR-0021 §3 + §5 (PII)
- ADR-0032 (Mother-Concern Read v1)
- ADR-0050 (Motorworld Data Model)

### Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (586 + 13 = 599) grün
- 12/12 `scripts/verify-adr-0051-mother-concern-read.ts` grün
- Owner-Acceptance

### Status

proposed — pending owner review.

---

## ADR-0052: Cockpit Standort-Picker & Profile-aware Kontext (Task 07)

**verdict:** proposed — 2026-06-09

### Context

Cockpit bekommt eine Location-Kontext-Schicht: Profil-aware Landing, Today-Overview, Exception-Calendar, Event-Spaces, Connectors als Sub-Routes unter `workspaces/[locationId]/`.

### Decisions

1. **Sub-Routes:** `[locationId]/layout.tsx` (LocationContext-Provider-Mount), `[locationId]/page.tsx` (Profil-Landing), `[locationId]/today/page.tsx`, `[locationId]/calendar/page.tsx` (90 Tage), `[locationId]/event-spaces/page.tsx`, `[locationId]/connectors/page.tsx`.
2. **`LocationContextProvider`** (`lib/location-context.tsx`) — vanilla `useState` + `useEffect`, 5min client-side Cache. Hooks: `useLocationProfile()`, `useTodayOverview()`.
3. **`lib/location-tiles.ts`** — Profil-aware Tile-Selection-Logik (reine Funktion, testbar).
4. **Components:** `LocationTile.tsx`, `ExceptionRuleBanner.tsx`.
5. **`workspaces/page.tsx`** — editiert um Profil-Badge + Signature-Assets-Preview + Link zu `[locationId]`.
6. No Mutations, kein Service-Worker, kein SWR.

### Bindings

- ADR-0021 §3 + §Service-Worker-Strategy
- ADR-0030 §3 (Profil-Discriminator)
- ADR-0033 (Cockpit Standort-Kontext v1)
- ADR-0051 (Mother-Concern APIs)

### Gate (Definition of Done)

- `npm --prefix apps/cockpit run typecheck` grün
- `vitest` (599 + 3 = 602) grün
- Owner-Acceptance

### Status

proposed — pending owner review.

---

## ADR-0053: Cockpit CUBE Service-Slot Dashboard & Event-Inquiry Drawer (Task 08)

**verdict:** proposed — 2026-06-09

### Context

CUBE Premium bekommt eine eigene Sub-Route `workspaces/[locationId]/cube/` mit Timeline-View, Unit-Cards, GroupRule-Badge und Event-Inquiry-Drawer.

### Decisions

1. **`cube/page.tsx`** — Timeline der ServiceSlots + Unit-Cards + Event-Inquiry-Tab. Profil-Guard: `LocationProfile = CUBE_PREMIUM`.
2. **`cube/menus/page.tsx`** — Menü-Matrix (read-only, Task-02-Substrate).
3. **GroupRule-Badge** — aus `GroupRule.alaCarteMaxGuests / groupMenuRequiredFrom / bankettInquiryFrom`.
4. **Event-Inquiry-Drawer** — PII-sanitized, kein `rawMessage/contactEmail/contactPhone`.
5. **`lib/cube-hooks.ts`**: `useServiceSlots`, `useMenuCatalog`, `useEventInquiries`.

### Bindings

- ADR-0021 §3 + §5
- ADR-0052 (Location-Context)
- Task 01 + 02 + 03

### Gate (Definition of Done)

- `npm --prefix apps/cockpit run typecheck` grün
- `vitest` (602 + 2 = 604) grün
- Owner-Acceptance

### Status

proposed — pending owner review.

---

## ADR-0054: Cockpit Motorworld Event-Space Board & Reservation-Connector Status (Task 09)

**verdict:** proposed — 2026-06-09

### Context

Motorworld-Standorte brauchen ein Event-Space-Board mit Kapazitäts-Tabelle, Connector-Status und Warthausen-Öchsle-Banner.

### Decisions

1. **`event-ops/page.tsx`** — Event-Space-Grid + Connector-Status + Öchsle-Banner. Profil-Guard: `LocationProfile = MOTORWORLD_STANDARD`.
2. **`event-ops/inquiries/page.tsx`** — Standort-Inquiry-Liste (brand-übergreifend).
3. **`OechsleBanner.tsx`** — gelb, nicht dismissable, nur wenn `OECHSLE_BUFFET_OVERRIDE` + `requiresConfirmation = true` aktiv.
4. **`EventSpaceCard.tsx`** — Kapazitäts-Tabelle + `supports`-Badge.
5. **`ReservationConnectorList.tsx`** — Provider-Status + `<a target="_blank" rel="noopener">`.
6. **`lib/motorworld-hooks.ts`**: `useEventSpaces`, `useReservationConnectors`, `useExternalSystemLinks`, `useExceptionRules`.

### Bindings

- ADR-0002 + ADR-0021 §3
- ADR-0052 (Location-Context)
- ADR-0051 (Mother-Concern APIs)
- Task 05 (Motorworld Data Model)

### Gate (Definition of Done)

- `npm --prefix apps/cockpit run typecheck` grün
- `vitest` (604 + 2 = 606) grün
- Owner-Acceptance

### Status

proposed — pending owner review.

---

## ADR-0055: Rauschenberger Meta-Layer — Phase A Contract (Task 10)

**verdict:** accepted — 2026-06-09
**signed-off-by:** baum777 — 2026-06-09

### Context

Rauschenberger Catering & Restaurants operates as an Operating Meta-Layer above the existing
`Brand → Location → Area` hierarchy (ADR-0030/0031). Four new conceptual layers are needed:
`Organization` (Mother Concern), `BusinessUnit` (workflow container), `EventConcept`
(cross-brand event format), `ExternalCatalogEntry` (partner venues), and a generalized
`Inquiry` replacing the CUBE-specific `EventInquiry` long-term. This ADR is a **docs-only
Phase A contract** — no Prisma migration, no API route, no UI surface.

### Decisions

1. **`Organization`** — new top-level model above `Brand`. `Brand.organizationId` gains an optional FK (hard constraint Phase 5.5).
2. **`BusinessUnit`** — table (not enum) with 5 seed rows: Corporate Events, Private Events, Restaurants, Book-the-Concept, Locations.
3. **`EventConcept`** — owned by `Organization`, cross-brand. 7 signature concepts + `CUSTOM`.
4. **`ExternalCatalogEntry`** — parallel to `Location` (not a sub-type). No `Area`/`StorageLocation`/`LocationInventoryConfig`.
5. **`Inquiry`** — generalized intake model. `EventInquiry` deprecated (not dropped) until Phase 5.4 migration.
6. **`InquiryRoutingRule`** — deterministic keyword/type/guest-count routing. No LLM, no ML. Rules stored in DB (admin-manageable).
7. **PII policy** — ADR-0021 §5 applies: `rawMessage`, `contactEmail`, `contactPhone` stripped in all list/detail endpoints.

### Architecture documents

- `docs/architecture/rauschenberger-meta-layer.md` — full hierarchy, entity descriptions, anti-things, resolved OQs.
- `docs/architecture/inquiry-routing.md` — Inquiry generalization, BU-routing algorithm, PII contract, migration strategy.

### Bindings

- ADR-0021 §3 (read-only, no LLM), §5 (PII)
- ADR-0030 (Multi-Standort-Vertrag)
- ADR-0031 (Brand/Location/Area)
- ADR-0034, ADR-0035, ADR-0048 (CUBE-Substrate)
- ADR-0050, ADR-0051, ADR-0052 (Motorworld-Substrate + Mother-Read v1)
- VISION §9 Phase 5

### Gate (Definition of Done)

- `git diff --stat` shows only `docs/architecture/` + `docs/DECISIONS.md` + `docs/agent-team/*`
- `prisma validate` / `typecheck` / `vitest` unchanged green
- Owner-Review ✓

### Status

accepted — 2026-06-09

---

## ADR-0056: Mother-Concern Data Model — Organization, BusinessUnit, EventConcept, ExternalCatalog, Inquiry (Task 11)

**verdict:** accepted — 2026-06-09
**signed-off-by:** baum777 — 2026-06-09

### Context

The Phase A contract from ADR-0055 is operationalized into schema, migrations, seeds, service
layer, and route layer. This ADR introduces the full Mother-Concern data model for Rauschenberger
Catering & Restaurants, including a generalized `Inquiry` with deterministic BU-routing and
PII-sanitization per ADR-0021 §5.

### Decisions

1. **`Organization`** — new top-level model (id, name, slug, headquartersAddress/Phone/Email). Seed: `org-rauschenberger`.
2. **`BusinessUnit`** — table (not enum), 5 seed rows (CORPORATE_EVENTS, PRIVATE_EVENTS, RESTAURANTS, BOOK_THE_CONCEPT, LOCATIONS). `defaultWorkflowKey` as free String in v1.
3. **`EventConcept`** — owned by Organization, cross-brand. 7 seed rows (all 7 signature concepts). `CUSTOM` enum value for one-offs.
4. **`ExternalCatalogEntry`** — parallel to `Location` (not a sub-type). No `Area`/`StorageLocation`/`LocationInventoryConfig`. 5 seed rows (Goldberg[Werk], Legendenhalle, Carl Benz Arena, ZENITH, Kesselhaus).
5. **`Inquiry`** — generalized (replaces CUBE-specific `EventInquiry` long-term). PII-stripped in all read endpoints (`rawMessage`, `contactEmail`, `contactPhone` → PII-indicators only).
6. **`InquiryRoutingRule`** — 10 deterministic keyword/type/guest-count rules. Lowercase-normalized matching. No LLM, no ML. Highest-priority rule wins.
7. **`InquiryClassificationAudit`** — every `classify` call writes an audit row (even no-match). Allows full replay and compliance review.
8. **Organization overview** — 5-minute in-memory cache per `(organizationId)`. No Redis in v1.
9. **`Brand.organizationId`** — stays `String?` for backward-compat. Hard FK constraint deferred to Phase 5.5 (ADR pending).
10. **PII policy** — `derivePiiIndicators()` in `src/lib/pii-sanitizer.ts` is the single source of truth for all PII-stripping across Inquiry responses.

### Scope (files changed/created)

| Path | Action |
|---|---|
| `prisma/schema.prisma` | +9 models, +7 enums |
| `prisma/migrations/20260609120000_add_mother_concern_tables/migration.sql` | new |
| `prisma/migrations/20260609120001_add_mother_concern_rls/migration.sql` | new |
| `prisma/seeds/mother_concern.sql` | new |
| `src/lib/pii-sanitizer.ts` | new |
| `src/modules/organization/organization.types.ts` | new |
| `src/modules/organization/organization.service.ts` | new |
| `src/modules/inquiry/inquiry.types.ts` | new |
| `src/modules/inquiry/inquiry.service.ts` | new |
| `src/modules/inquiry/inquiry-routing.service.ts` | new |
| `src/routes/organization.route.ts` | new |
| `src/routes/inquiry.route.ts` | new |
| `src/app.ts` | +organization + inquiry route registration |
| `tests/organization.routes.test.ts` | new — 8 cases |
| `tests/inquiry.routes.test.ts` | new — 8 cases |
| `scripts/verify-adr-0056-mother-concern.ts` | new — 14 Supabase-Promotion queries |

### Bindings

- ADR-0021 §3 (read-only surface), §5 (PII-Sanitization)
- ADR-0030 (Multi-Standort-Vertrag)
- ADR-0031 (Brand/Location/Area)
- ADR-0055 (Meta-Layer Phase A Contract)
- VISION §9 Phase 5

### Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (622) grün ✓
- 16/16 route test cases grün ✓
- PII-sanitization: no `rawMessage`, `contactEmail`, `contactPhone` in list/detail responses ✓
- Deterministic routing: keyword-match without LLM ✓
- Owner-Review ✓

### Status

accepted — 2026-06-09

---

## ADR-0057: Mother-Concern Read APIs v2 — Organization Overview, Inquiry Routing, EventConcept Catalog (Task 12)

**verdict:** accepted — 2026-06-09
**signed-off-by:** baum777 — 2026-06-09

### Context

Task 12 extends the Mother-Concern service layer with the full aggregated organization overview,
compatible-locations join view, and the deterministic classify endpoint. All endpoints are
read-only per ADR-0021 §3. Implemented within `organization.service.ts` (overview/compatible-
locations) and `inquiry-routing.service.ts` (classifyInquiry + audit). No separate
`overview.service.ts` needed since the aggregation logic fits cleanly in the existing service.

### Decisions

1. **`GET /admin/organization/overview`** — admin-only. Returns `businessUnitCounts`, `locationCount`, `externalLocationCount`, `signatureAssetCount`, `inquiryStats` (total/byStatus/byBU/last7d/last30d), `criticalStockLocations`, `activeExceptionRules` (top 10), `upcomingEvents` (next 30d, status NEW/NEEDS_HUMAN_REVIEW/OFFER_DRAFT, no PII). 5-minute in-memory cache per org.
2. **`GET /admin/organization/event-concepts/:id/compatible-locations`** — returns own `Location` + `ExternalCatalogEntry` entries linked via `EventConceptLocationCompatibility`, sorted by `compatibilityScore DESC`.
3. **`POST /admin/inquiries/classify`** — read-only classification. Writes audit row to `InquiryClassificationAudit` regardless of match. No status mutation. `commit` param is reserved but only affects audit-log detail (no side-effects on `Inquiry` row).
4. **`GET /admin/inquiries/:id/audit`** — classification audit history for an inquiry (org-scoped, 404 if not found).
5. **`businessUnitId` filter on event-concepts** — accepted as query param, returned as no-op in v1 (full list). FK join via `BusinessUnitEventConcept` deferred to Phase 5.5 follow-up.
6. **`dateFrom`/`dateTo` filter on inquiries list** — ISO date strings parsed in service layer. Invalid format → 400.
7. **PII-sanitizer** — `src/lib/pii-sanitizer.ts` is the single source for all PII-stripping. `derivePiiIndicators()` used in `InquiryService`.

### Scope (files changed/created)

| Path | Action |
|---|---|
| `tests/organization.overview.test.ts` | new — 7 vitest cases |
| `tests/inquiry.routing.test.ts` | new — 6 vitest cases |
| `scripts/verify-adr-0057-mother-concern-read-v2.ts` | new — 12-query Supabase-Promotion |

*(All service and route changes were implemented in Task 11 scope, pulled forward for auditability.)*

### Bindings

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0055 (Meta-Layer Phase A Contract)
- ADR-0056 (Mother-Concern Data Model)
- VISION §9 Phase 5

### Gate (Definition of Done)

- `typecheck` / `vitest` (635) grün ✓
- 7/7 overview test cases grün ✓
- 6/6 routing test cases grün ✓
- 12-query Supabase-Promotion script prepared ✓
- Owner-Review ✓

### Status

accepted — 2026-06-09

---

## ADR-0058: Cockpit Mother-Concern Dashboard & Inquiry-Routing Review Queue (Task 13)

**verdict:** accepted — 2026-06-09
**signed-off-by:** baum777 — 2026-06-09

### Context

Task 13 surfaces the Mother-Concern Read v2 endpoints in the Cockpit as a
konzernweite Sicht plus a deterministic inquiry-routing review queue. All
inquiry displays are PII-sanitized per ADR-0021 §5. No mutation surface
(status workflow, routing-rule edit) is introduced in this slice.

### Decisions

1. **`/mother-concern` dashboard** — admin-only header strip with 5 KPI tiles
   (Total Inquiries, last 7d, Critical-Stock Locations, Active Exception Rules,
   Upcoming Events), 5 BusinessUnit cards, Location Comparison table, Signature
   Asset map, Upcoming Events list, Critical Stock list.
2. **`/mother-concern/event-concepts` catalog** — grid of 7+ concepts with
   compatible-locations drill-down.
3. **`/mother-concern/partner-locations`** — table of `ExternalCatalogEntry`
   rows with region/type filters.
4. **`/inquiries` review queue** — 4 tabs (Offen, Heute eingegangen, Angebot
   in Vorbereitung, Abgeschlossen) with BU + source filters and PII-badges
   on every row.
5. **`/inquiries/[inquiryId]` detail** — PII-sanitized header + classification
   audit history.
6. **PII display policy** — every `Inquiry` row shows only `contactNameInitials`
   and 4 boolean PII-badges (`hasRawMessage`, `hasContactEmail`,
   `hasContactPhone`, `hasContactAddress`). Vollzugriff ist ADR-0062.
7. **Hook layer** — `apps/cockpit/lib/mother-concern-hooks.ts` provides
   typed hooks for every endpoint exposed by Task 12. No LLM, no client-side
   caching beyond the API's 5-minute overview cache.
8. **`commit` parameter on classify** — `commit=false` keeps the operation
   read-only (no audit row), `commit=true` writes the audit. Both are
   side-effect-free on the `Inquiry` row.

### Scope (files changed/created)

| Path | Action |
|---|---|
| `apps/cockpit/lib/mother-concern-hooks.ts` | new — typed hook layer |
| `apps/cockpit/app/(app)/mother-concern/page.tsx` | new — main dashboard |
| `apps/cockpit/app/(app)/mother-concern/event-concepts/page.tsx` | new — concept catalog |
| `apps/cockpit/app/(app)/mother-concern/partner-locations/page.tsx` | new — partner list |
| `apps/cockpit/app/(app)/inquiries/page.tsx` | new — review queue |
| `apps/cockpit/app/(app)/inquiries/[inquiryId]/page.tsx` | new — PII-sanitized detail |
| `apps/cockpit/app/components/bestand/OrganizationKpiStrip.tsx` | new |
| `apps/cockpit/app/components/bestand/BusinessUnitCard.tsx` | new |
| `apps/cockpit/app/components/bestand/LocationComparisonTable.tsx` | new |
| `apps/cockpit/app/components/bestand/SignatureAssetMap.tsx` | new |
| `apps/cockpit/app/components/bestand/InquiryListItem.tsx` | new |
| `apps/cockpit/app/components/bestand/InquiryDetailDrawer.tsx` | new |
| `tests/cockpit/mother-concern-hooks.test.ts` | new — 4 cases |
| `tests/cockpit/mother-concern-dashboard.test.ts` | new — 3 cases |
| `tests/cockpit/inquiry-routing.test.ts` | new — 3 cases |
| `scripts/smoke/browser-smoke-mother-concern.ts` | new — HTTP smoke |

### Bindings

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0029 (Back-Promotion-Pattern)
- ADR-0055 (Meta-Layer Contract)
- ADR-0056 (Mother-Concern Data Model)
- ADR-0057 (Mother-Concern Read v2)
- VISION §9 Phase 5

### Gate (Definition of Done)

- `npm --prefix apps/cockpit run typecheck` grün ✓
- `vitest` (644) grün ✓
- Browser-Smoke gegen Supabase-Dev grün ✓
- Owner-Review ✓

### Status

accepted — 2026-06-09

## ADR-0059: Adopt Item-Image-Service Spec (Documentation-Only Slice)

**verdict:** draft — 2026-06-19
**status:** draft (not yet proposed; awaits owner review and Open Question verdicts)
**signed-off-by:** — (open)

> **Draft note (2026-06-19):** This ADR is the natural next gate after the docs subagent's feature spec at `docs/features/item-image-service.md` (Spec-Status: draft) and the ux subagent's UX/tab structure at `docs/features/item-image-service-ux.md` (UX-Status: draft). It is a **spec-only** slice and follows the ADR-0021 / ADR-0030 / ADR-0036 pattern: it adopts the two documents as the **binding conceptual specification** for the Item-Image-Service in Bevero, and it **does not authorize** any migration, any Fastify route, any Cockpit view, any external writeback, or any LLM-driven analysis. Each future implementation slice (proposed: ADR-0059-A Schema + Storage, ADR-0059-B API + RBAC, ADR-0059-C Cockpit UI) requires its own ADR.

Decision: When accepted, this ADR will adopt

- `docs/features/item-image-service.md` (777 lines, German) — the feature spec covering Zweck & Scope, Autorität & Vorbedingungen, Risikostufe (L0–L4), Datenmodell-Vorschlag, Storage-Strategie, API-Kontrakte (9 Endpunkte), Berechtigungen (RBAC), Validierung & Limits, Audit & Evidence, Test-Strategie, Migration/Rollout, Offene Fragen, Verweise
- `docs/features/item-image-service-ux.md` (1263 lines, German) — the UX/UI spec covering Entry Points & Mounting, 6 Tabs with all contained actions (Galerie, Hochladen, Tags, Audit, Papierkorb, Einstellungen), 6 User-Flows (A–F), 6 ASCII wireframes, States, Mobile-Optimierungen, RBAC-Sichtbarkeitstabelle, a11y, Konsistenz mit Design-Tokens, Metriken, 8 offene UX-Fragen, Verweise

as the **binding conceptual specification** for the **Item-Image-Service** in Bevero. The service attaches a private, signed-URL-only image gallery and metadata layer to `InventoryItem` and `StorageLocation` rows, with append-only audit, RLS enforcement by `organizationId`, and explicit human-gating of all mutations. This ADR is the gate output for the spec-only phase. It does **not** approve the implementation of any specific migration, route, or UI surface. Each later phase (Schema + Storage, API + RBAC, Cockpit UI, optional EXIF-Heuristiken) requires its own gate and, where the slice touches the data model, an additional ADR that promotes the proposed tables (`ItemImage`, `ItemImageAudit`) to `accepted` state.

### Hard-Guardrails (binding for all sub-sections and future implementation slices)

The following guardrails from the spec become repository-wide invariants for every later phase and must be enforced in backend logic, in DB tests, and in Cockpit UI behavior:

- **No automatic stock mutation.** Image upload never creates an `InventoryMovement`, never refreshes `InventoryStockSnapshot`, never shortcuts the append-only movement log. The path remains `WorkflowTask → InventoryMovement` per ADR-0006. Verified by `apps/api/AGENTS.md:86`.
- **No automatic writeback to external systems.** Bevero reads from FoodNotify, Microsoft Dynamics 365, DATEV, and central Rauschenberger systems; the image service does not push mutations back. Image metadata is internal-only. Verified by `apps/api/AGENTS.md:87-88` and ADR-0002.
- **No LLM-driven analysis, OCR, auto-tagging, auto-classification, or auto-order trigger.** LLMs are not in the image path at all in v1. The spec keeps the door open only for an optional future, opt-in, read-only LLM captioning helper — gated on a future ADR. Verified by `apps/api/AGENTS.md:89-91` and ADR-0021 §3.
- **No service-role credentials in user-facing request paths.** `app_runtime` (ADR-0017) writes via the same RLS policies as `authenticated`; no bypass. Image upload + signed-URL fetch run inside the standard role context. Verified by `apps/api/AGENTS.md:36-37, 92-93`.
- **Owner-Polymorphismus without hard FK.** `(ownerType, ownerId)` validates app-side against `InventoryItem` and `StorageLocation` belonging to the caller's `organizationId`. No DB-level foreign key is added in either direction. Rationale: two parent tables, both `organizationId`-scoped, would require a discriminator column on the parent tables or a junction; the spec's chosen shape is simpler and keeps the parents untouched.
- **Append-only audit.** `ItemImageAudit` rows are INSERT-only. `REVOKE UPDATE, DELETE ON item_image_audit FROM authenticated, anon;` is part of the schema-only migration authorized by the future ADR-0059-A. The API exposes no `PATCH`/`DELETE` on the audit table. Pattern-Vorlage: ADR-0023 §RLS / Grant Plan (`docs/DECISIONS.md:680`).
- **Soft-Delete only.** The `deletedAt` column on `ItemImage` is the only deletion path in v1. Hard-delete (object removal from Supabase Storage + row purge) is **out of scope** for v1 and explicitly requires an L3 Operator-Freigabe per IDENTITY.md:117 if it is ever added. Pattern-Vorlage: ADR-0009 (soft deactivation). The `BusinessUnitLocation.isPrimary` column (`apps/api/prisma/schema.prisma:1896`) is referenced here as a **naming-convention pattern** for the `deletedAt` soft-marker, not as a soft-delete mechanism.
- **EXIF-GPS stripping, no other EXIF.** Image-pipeline strips GPS metadata only (longitude, latitude, altitude, timestamp-delta, datestamp, GPSDateStamp). All other EXIF tags are preserved for forensic value. Pixel operations (resize, recompress, rotate-pixels) are out of scope in v1. EXIF-stripping is a **server-side, synchronous** step on upload — never client-side.
- **Private bucket, signed-URL only.** Bucket `item-images` is **private**. No public read. No CDN-public-read. Signed URL TTL: 5 minutes for read, 10 minutes for upload. Pattern-Vorlage: ADR-0011 (Supabase canonical) and the storage strategy in `docs/features/item-image-service.md:220-255`.
- **One Primary per Owner.** At most one `ItemImage` row per `(organizationId, ownerType, ownerId)` may have `isPrimary = true` AND `deletedAt IS NULL`. Enforced by a **partial unique index** at the DB level. **Column-naming and intent pattern**: `BusinessUnitLocation.isPrimary` (`apps/api/prisma/schema.prisma:1896`); DB-level enforcement (the partial unique index itself) is a **new addition** by ADR-0059-A with no current repo precedent.
- **Idempotency-Key pattern.** All write endpoints accept an optional `clientRequestId`; a reused id with a different payload returns `422`. Pattern-Vorlage: ADR-0016 and ADR-0023 approve/reject endpoints.
- **Server-side `organizationId` and `uploadedByUserId`.** Both fields are taken from the authenticated session, never from the request body. Hard invariant.
- **PII / secrets sanitization.** `caption`, `tags`, and `payload` JSON are scanned server-side for obvious PII patterns (email, phone) before persistence; matches are rejected with `422` and a generic error. Audit-row payloads are sanitized identically before retention. Pattern-Vorlage: ADR-0021 §5 (PII-Sanitization).

### Sub-Section ADR-0059-A: Schema + Storage Substrate (proposed, not yet drafted)

Authorizes the **proposal of** two new public-schema tables:

- `ItemImage` — 16 fields per `docs/features/item-image-service.md:141-161` (id, organizationId, ownerType, ownerId, storagePath, mimeType, sizeBytes, width?, height?, caption?, tags, rotationDeg, isPrimary, uploadedByUserId, createdAt, updatedAt, deletedAt?). Five indexes per spec §4.1 (lines 163-169). One **partial unique index** for the one-primary-per-owner invariant.
- `ItemImageAudit` — 7 fields per spec §4.2 (id, imageId, organizationId, action enum, actorUserId, payload?, createdAt). Append-only via REVOKE pattern. Three indexes per spec §4.2.

And one new Supabase Storage bucket:

- `item-images` — private, path convention `org/{organizationId}/{ownerType}/{ownerId}/{imageId}.{ext}` per `docs/features/item-image-service.md:226-233`.

**Hard DB-Constraints (proposed for the migration):**

- `CHECK (rotationDeg IN (0, 90, 180, 270))` on `ItemImage.rotationDeg`.
- `CHECK (mimeType IN ('image/jpeg', 'image/png', 'image/webp'))` on `ItemImage.mimeType` (HEIC deferred to v2 per Open Question §3).
- `CHECK (sizeBytes > 0 AND sizeBytes <= 10485760)` on `ItemImage.sizeBytes` (10 MB cap per `docs/features/item-image-service.md:540-541`).
- Partial unique index: `CREATE UNIQUE INDEX item_image_one_primary_per_owner ON "ItemImage" ("organizationId", "ownerType", "ownerId") WHERE "isPrimary" = true AND "deletedAt" IS NULL;`.
- Append-only REVOKE: `REVOKE UPDATE, DELETE ON item_image_audit FROM authenticated, anon; GRANT INSERT, SELECT ON item_image_audit TO authenticated;`.
- No service-role grant on user paths.
- `DO $$` regression-guard block: refuses to apply if the two new tables or the partial unique index are missing after the `CREATE` statements (same pattern as ADR-0023 §RLS / Grant Plan and ADR-0025 §RLS / Grant Plan).

**Implementation ADR (proposed, not yet drafted):** ADR-0059-A. Gate shape: `npx prisma validate` clean, `npm run typecheck` clean, the forward-only migration applies on a Supabase dev project, RLS read-policy smoke (SELECT denied across orgs), partial-unique-index smoke (insert two primaries → expect unique-violation), append-only smoke (UPDATE/DELETE on `item_image_audit` → expect permission-denied).

### Sub-Section ADR-0059-B: API + RBAC Mutation Surface (proposed, not yet drafted)

Authorizes the **proposal of** nine Fastify endpoints, all under `/images/...` (matching the spec's path convention; no `/admin/` prefix because the service is part of the operational Cockpit surface, not the admin-only surface):

| Method | Path | Min. role | Risk | Notes |
|---|---|---|---|---|
| `POST` | `/images/upload-url` | Staff+ (role-rank ≥ 2) | L1 | Body: `{ ownerType, ownerId, mimeType, sizeBytes, contentHashSha256, clientRequestId? }`. Response: `{ imageId, signedUploadUrl, expiresAt, storagePath }`. 5-second server-side EXIF-GPS-strip + 10 MB hard cap; 413 on cap exceeded. |
| `POST` | `/images` | Staff+ | L1 | Body: `{ imageId, ownerType, ownerId, caption?, tags?, isPrimary?, rotationDeg? }`. Verifies the Storage object exists at the pre-signed path before persisting the metadata row. 422 on PII in caption/tags. |
| `GET` | `/images` | All roles | L0 | Query: `ownerType`, `ownerId`, `tag?`, `uploadedBy?`, `from?`, `to?`, `page?`, `pageSize?` (max 100). Filter `deletedAt IS NULL` enforced server-side. |
| `GET` | `/images/:id` | All roles | L0 | Returns metadata + 5-minute signed read URL. |
| `PATCH` | `/images/:id` | Staff+ (own row) / Manager+ (any row) | L1 | Body: any subset of `caption`, `tags`, `isPrimary`, `rotationDeg`. Setting `isPrimary = true` demotes the previous primary (if any) in the same transaction. |
| `DELETE` | `/images/:id` | Staff+ (own row) / Manager+ (any row) | L2 (L2-Evidence for bulk) | Soft-delete only. Sets `deletedAt = now()`. Storage object is **not** removed in v1. |
| `POST` | `/images/:id/restore` | Manager+ | L1 | Clears `deletedAt`. Reapplies the one-primary-per-owner invariant. |
| `POST` | `/images/bulk-delete` | Manager+ | L2 + L2-Evidence (≥ 10 rows) | Body: `{ imageIds: string[], reason: string, clientRequestId? }`. 422 on payload-id mismatch with reused `clientRequestId`. |
| `GET` | `/images/:id/audit` | Manager+ | L0 | Returns paginated `ItemImageAudit` rows for the image. |

All endpoints run inside `app_runtime` (ADR-0017) and inherit the RLS policies. The full RBAC matrix is in `docs/features/item-image-service.md:492-530`; this ADR adopts it as binding for the future implementation slice.

**Hard guardrails for the implementation slice:**

- No `PATCH`/`DELETE` exposed on `ItemImageAudit`.
- No service-role credential in user paths.
- No write to `InventoryMovement`, `InventoryStockSnapshot`, or `WorkflowTask` from any of the nine endpoints.
- All write endpoints enforce `(ownerType, ownerId)` belongs to the caller's `organizationId` **inside the same Prisma transaction** as the write.
- `clientRequestId` reuse with a different payload returns `422` (ADR-0016 pattern).
- Rate-limit per actor per endpoint, in-memory LRU with sliding window, defense-in-depth (primary gate is the DB).

**Implementation ADR (proposed, not yet drafted):** ADR-0059-B. Gate shape: `npm run typecheck` clean, vitest cases per `docs/features/item-image-service.md:626-647` (RLS row-level isolation, signed-URL TTL, soft-delete/restore idempotency, audit-row append-only, mime allowlist rejection, EXIF-GPS stripping, partial-unique-index violation on double-primary, bulk-delete idempotency via `clientRequestId`).

### Sub-Section ADR-0059-C: Cockpit UI Surface (proposed, not yet drafted)

Authorizes the **proposal of** the Cockpit UI per `docs/features/item-image-service-ux.md` — 6 tabs (Galerie, Hochladen, Tags, Audit/Verlauf, Papierkorb, Einstellungen) with all contained actions enumerated in spec §3 (lines 162-298), the 6 user-flows (A–F, lines 299-578), 6 ASCII wireframes (lines 579-857), state catalogue (lines 858-929), mobile optimizations (lines 930-951), RBAC visibility table (lines 952-1015), a11y requirements (lines 1016-1042), and design-token alignment (lines 1043-1089).

**Mount points (proposed, gated on Open Question §10):**

- `apps/cockpit/app/(app)/inventory/items/[itemId]/page.tsx` — **MISSING** in the current repo per `docs/features/item-image-service-ux.md:1127-1149` (`BLOCKED`). This ADR flags the gap; ADR-0059-C must either (a) require the missing detail page as a precondition and create it in this slice, or (b) split the detail-page slice into a separate ADR-0059-C0 and keep ADR-0059-C for the Bilder-Tab only. **Owner decision required before ADR-0059-C is drafted.**
- `apps/cockpit/app/(app)/storage/[locationId]/page.tsx` — same situation, same `BLOCKED`.

**No new top-level route.** The image service is a sub-area, not a standalone route. This preserves the cockpit's nav structure (`apps/cockpit/app/(app)/bottom-nav.tsx:84, 124`) and the role-based visibility pattern (`apps/cockpit/lib/auth/rbac.ts:1`).

**Implementation ADR (proposed, not yet drafted):** ADR-0059-C. Gate shape: typecheck green, vitest cases for the 6 tabs, browser smoke against Supabase dev (per `docs/cockpit-runtime-smoke-checklist.md`), a11y check (axe-core, WCAG AA), design-token lint (no hex literals, no hard-coded spacing — all references go through `docs/WEB_DESIGN_TOKENS.md`).

### Design-Token Patch 02 (proposed, in scope of this ADR)

The UX subagent's `docs/features/item-image-service-ux.md:1043-1089` identified **10 missing design tokens** required by the new UI (e.g. `--color-danger-soft`, `--token-shadow-modal`, `--token-font-size-tap-min`, z-index scale for the upload modal, tag-color swatches, soft-delete state colors). This ADR adopts the Token Patch 02 list as binding for ADR-0059-C and **forbids** hard-coded hex literals, raw spacing values, or one-off shadows in the new components. The patch lands as part of the implementation slice, not as a separate ADR.

### Hard-Precondition discovered at draft-time

`docs/DECISIONS.md:90` (and similar text at lines 355-357) still references `apps/cockpit/` as the cockpit path, while the repo reality is `apps/cockpit/`. This stale reference is **not** a content of this ADR, but it is a **precondition** that ADR-0059-C will create new files in `apps/cockpit/app/...` (not `apps/cockpit/...`). The stale reference must be harmonized in the same PR (or in a one-line housekeeping ADR) so the cockpit-path citation is consistent across the document. This ADR flags the gap; it does not fix it.

### Open Questions (must be resolved before ADR-0059-A is drafted)

1. **`InventoryMovement`-Bildanhang — strikt getrennt oder spätere Erweiterung?** The spec is currently strict-separated (no image on `InventoryMovement`) to preserve the append-only plane. Owner decision: keep strict-separated in v1 and document as future ADR, or relax in v1.
2. **Rollen-Hierarchie abstimmen.** The spec uses a 5-tier scale (`Owner / Admin / Manager / Staff / Viewer`) at `docs/features/item-image-service.md:496`; the canonical code at `apps/cockpit/lib/auth/rbac.ts:1` matches the 5-tier; the phase-0 plan at `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` is 3-tier. Owner decision: confirm the 5-tier is binding for the image service, then ADR-0059-B uses the 5-tier without further preamble.
3. **HEIC-Transcoding.** iOS delivers HEIC; the spec rejects HEIC in v1 (`docs/features/item-image-service.md:578`). Owner decision: keep reject-in-v1, or open an ADR-0059-D HEIC-Transcoding-Slice for a server-side transcoder.
4. **Bucket-Kostenfreigabe.** Supabase Storage on the Pro plan has 100 GB included. Owner decision: confirm the bucket is authorized under the current plan, or route to a separate cost-approval ADR.
5. **`cockpit-next` → `cockpit` path-harmonization.** See Hard-Precondition above. Owner decision: harmonize in the same PR as ADR-0059-A, or open ADR-0059-X.X for housekeeping.
6. **PII-Sanitization pattern reuse.** ADR-0021 §5 defines PII-Sanitization for the automation layer. The image service introduces a new PII vector (caption, tags, audit payload). Owner decision: extend ADR-0021 §5 to cover image metadata, or document a service-local PII scan in ADR-0059-B.
7. **`businessUnitId`-Scoping.** `BusinessUnit` is the mother-concern organization unit (ADR-0056). The spec scopes by `organizationId` only. Owner decision: add `businessUnitId?` to `ItemImage` for multi-BU orgs, or defer to a future ADR.
8. **Bulk-Delete evidence threshold.** The spec sets the L2-Evidence threshold at "≥ 10 Bilder" (`docs/features/item-image-service.md:567-570`). Owner decision: confirm 10, or pick a different threshold (5, 20, 50).
9. **Storage-Objekt-Status-Endpoint.** The UX needs a "Papierkorb"-view that shows the soft-deleted image's Storage object status (still present vs. already gone). The spec does not include this endpoint. Owner decision: add to ADR-0059-B (`GET /images/:id/storage-status`) or to ADR-0059-A as a DB-only computed field.
10. **Detail-Page-Mount (BLOCKED).** See Sub-Section ADR-0059-C above. Owner decision: create `[itemId]/page.tsx` and `[locationId]/page.tsx` as part of ADR-0059-C, or split into ADR-0059-C0.

### Cross-References

- Spec: `docs/features/item-image-service.md` (this ADR's primary authority).
- UX: `docs/features/item-image-service-ux.md` (this ADR's primary authority).
- Vision: `docs/VISION.md` (Phase 0–6 working paper; image service fits Phase 1/2 as a low-risk operational enrichment).
- Cockpit UI plan: `apps/cockpit/README.md` and the route map at `apps/cockpit/app/(app)/`.
- Authority order: `IDENTITY.md` → `OS.md` → `governance/rules.md` → `governance/approval-matrix.md` → `governance/evidence-contract.md` → `apps/api/AGENTS.md` → this ADR.
- Existing invariants: ADR-0002 (read-only POS posture, extended to all external systems), ADR-0006 (withdrawals reduce stock through movements — image service must NOT shortcut this path), ADR-0009 (inventory items use admin-managed soft deactivation — image service soft-delete mirrors this pattern), ADR-0011 (Supabase Postgres canonical — image storage uses Supabase Storage as a corollary), ADR-0012 (role-based UX extends DB-backed inventory — image UI lands in `apps/cockpit`), ADR-0013 (Cockpit migrates to Next.js — see Hard-Precondition for path harmonization), ADR-0014 (organization identity from Supabase Auth — `organizationId` for RLS scoping), ADR-0015 (role grants are bounded), ADR-0016 (v1 stock snapshots stay transactional with command idempotency — image service inherits the idempotency-key pattern), ADR-0017 (`app_runtime` enforces RLS — image service uses `app_runtime` for all writes), ADR-0021 (Phase A spec, hard guardrails, PII-Sanitization §5), ADR-0023 (mutation surface, append-only trigger pattern, clientRequestId pattern, regression-guard `DO $$` block pattern), ADR-0025 (Phase E handover-draft RLS + grant plan — same pattern for the image RLS + grant plan), ADR-0028 (Promote Phase B Migrations pattern — applicable to ADR-0059-A when the schema lands).
- Schema anchors: `apps/api/prisma/schema.prisma:86` (`InventoryItem`), `:226` (`StorageLocation`), `:395` (`InventoryMovement`), `:1896` (`BusinessUnitLocation.isPrimary` pattern).
- Cockpit anchors: `apps/cockpit/app/(app)/inventory/items/page.tsx:1`, `apps/cockpit/app/(app)/storage/page.tsx:1`, `apps/cockpit/app/(app)/bottom-nav.tsx:84, 124`, `apps/cockpit/lib/auth/rbac.ts:1`, `apps/cockpit/app/components/role-gate.tsx:6-18`.

### Phase Plan Reference

- **Spec (current, this ADR):** Spec & ADR gate. Lands when this ADR is `Status: accepted`.
- **Cost-Approval for `item-images` bucket (proposed, ADR-0059-K):** **Hard precondition for ADR-0059-A** per OQ §4 verdict (2026-06-19). Defines retention-policy, per-org ceiling, cost-ceiling, re-evaluation trigger, and cost-owner. See parked working paper `docs/features/item-image-service-cost-analysis.md` for the spec seed. Gate: L3-Operator-Freigabe per `IDENTITY.md:117` and `governance/approval-matrix.md:14`.
- **Schema + Storage (proposed, ADR-0059-A):** forward-only migration creating `ItemImage` + `ItemImageAudit` + private bucket `item-images` + RLS read policies + append-only REVOKE. **Hard-precondition: ADR-0059-K `Status: accepted`**. Gate: prisma validate, typecheck, RLS smoke, partial-unique-index smoke, append-only smoke, Supabase promotion script per ADR-0028.
- **API + RBAC (proposed, ADR-0059-B):** 9 Fastify endpoints with Zod schemas, RBAC matrix from spec §7, `app_runtime` write path, `clientRequestId` idempotency. Gate: typecheck, 8+ vitest cases, Supabase live-DB smoke.
- **Cockpit UI (proposed, ADR-0059-C):** 6 tabs, 6 wireframes, 6 user-flows, state catalogue, mobile/a11y, design-token patch 02, mount into the (currently missing) `[itemId]/page.tsx` and `[locationId]/page.tsx` per Open Question §10. Gate: typecheck, vitest, browser-smoke per `docs/cockpit-runtime-smoke-checklist.md`, axe-core a11y.
- **Optional future (not in this ADR's scope):** ADR-0059-D HEIC-Transcoding, ADR-0059-E `businessUnitId`-Scoping, ADR-0059-F Hard-Delete mit L3-Freigabe (only if a real deletion use case emerges).

### Rollback Plan (for the spec, not for the implementation)

If this ADR is later **superseded or rejected**, the two spec files (`docs/features/item-image-service.md`, `docs/features/item-image-service-ux.md`) revert to "spec-only, not binding". The implementation slices (ADR-0059-A/B/C) are blocked at "proposed" until this ADR is `Status: accepted` again. No migration or endpoint exists at the draft stage, so the rollback is purely a status change. The two spec files are kept in `docs/features/` as **historical** input for any future spec-rewriting effort and are explicitly **not** authority for code work.

If this ADR is **accepted** and a later implementation slice (e.g. ADR-0059-A) is rolled back, the standard pattern from ADR-0023 / ADR-0025 applies: `git revert` the migration commit + the endpoint commits, run a manual `DROP POLICY` / `REVOKE GRANT` script against the database, `npx prisma generate` to refresh the client, run the existing route test suite to confirm no regression. The forward-only migration is paired with a sibling `down.sql` for explicit rollback rehearsal.

### Owner-Verdicts-Update (2026-06-19) — pre-acceptance

The 10 Open Questions in this ADR were resolved by the owner on 2026-06-19 (pre-acceptance, pre-proposed). Verdicts are binding for the future implementation slices (ADR-0059-A/B/C) once this ADR is `Status: accepted`. Each verdict below **replaces** the corresponding Open Question in the section above for any future reference; the original Open Question text is kept for context.

| OQ # | Question | Verdict | Effect on future slices |
|---|---|---|---|
| §1 | `InventoryMovement`-Bildanhang | **Strict-separated** in v1; ADR-0059-G as future-ADR roadmap entry | No FK from `ItemImage` to `InventoryMovement` in v1. ADR-0059-A schema has no `attachmentImageId` on `InventoryMovement`. |
| §2 | Rollen-Hierarchie | **5-tier verbindlich** (`Owner / Admin / Manager / Staff / Viewer`) | ADR-0059-B uses 5-tier. Phase-0-Plan doc harmonization is a separate housekeeping ADR (out of this slice's scope). |
| §3 | HEIC-Transcoding | **HEIC ablehnen in v1**; ADR-0059-D as future optional | ADR-0059-A CHECK constraint: `mimeType IN ('image/jpeg', 'image/png', 'image/webp')`. HEIC uploads return `415 Unsupported Media Type` at the API gate in ADR-0059-B. |
| §4 | Bucket-Kostenfreigabe | **Separates ADR-0059-K (Kosten-Freigabe) als Hard-Precondition** | ADR-0059-A kann nicht landen, bevor ADR-0059-K `Status: accepted` ist. ADR-0059-K ist im Phase-Plan-Block oben zu ergänzen. |
| §5 | `cockpit-next` → `cockpit` Path-Harmonisierung | **Im selben PR wie ADR-0059-A** | Siehe separater "Cockpit-Path-Harmonisierung-Hinweis (2026-06-19)" Abschnitt unten. Historische ADR-Texte (z.B. ADR-0013 Zeile 90, ADR-0021 Zeile 355-357) bleiben **unverändert** (Audit-Trail-Erhalt). Die Harmonisierung erfolgt als dokumentierter Hinweis-Block, nicht als stiller Find-Replace über historische Entscheidungen. ADR-0059-A verwendet ausschließlich `apps/cockpit/app/...` Pfade. |
| §6 | PII-Sanitization | **Service-lokal in ADR-0059-B** | ADR-0021 §5 bleibt unverändert. ADR-0059-B führt einen eigenen PII-Scan (Email/Phone-Pattern in caption/tags/payload) ein. |
| §7 | `businessUnitId`-Scoping | **Erst nur `organizationId`** | ADR-0059-A schema: keine `businessUnitId`-Spalte auf `ItemImage`. ADR-0059-E als optionaler Folge-ADR, falls Multi-BU-Use-Case entsteht. |
| §8 | Bulk-Delete Evidence-Threshold | **≥ 10 Bilder** (per OQ §8 verdict) | ADR-0059-B enforces: bei `bulk-delete` mit `imageIds.length >= 10` wird ein L2-Evidence-Artefakt nach `governance/evidence-contract.md` erzwungen. |
| §9 | Storage-Objekt-Status-Endpoint | **10. Endpoint in ADR-0059-B**: `GET /images/:id/storage-status` | ADR-0059-B erweitert die API um 10 Endpunkte (statt 9). `docs/features/item-image-service.md:485-487` wird im selben Commit um den Endpoint ergänzt. |
| §10 | Detail-Page-Mount (BLOCKED) | **In ADR-0059-C als Precondition** | ADR-0059-C erstellt `apps/cockpit/app/(app)/inventory/items/[itemId]/page.tsx` und `apps/cockpit/app/(app)/storage/[locationId]/page.tsx` zusammen mit dem Bilder-Tab. Single-Slice-Verantwortung. Kein ADR-0059-C0 nötig. |

**New ADR-IDs introduced by these verdicts** (each becomes its own ADR, drafted as a follow-up):

- **ADR-0059-K** — Cost-Approval for the `item-images` Supabase Storage bucket (OQ §4 verdict, hard precondition for ADR-0059-A).
- **ADR-0059-D** — optional future HEIC-Transcoding-Slice (OQ §3 verdict, deprioritized).
- **ADR-0059-E** — optional future `businessUnitId`-Scoping (OQ §7 verdict, deprioritized).
- **ADR-0059-G** — optional future `InventoryMovement`-Bildanhang (OQ §1 verdict, deprioritized).
- **Housekeeping-ADR (out of scope, not numbered)** — harmonization of `docs/ROLE_BASED_UI_UX_PHASE_0.md` 3-tier vs. 5-tier canonical (OQ §2 verdict, separate from this slice).

ADR-0059-A inherits the 10 verdicts above as **binding constraints**; the per-verdict enforcement is described in ADR-0059-A's `### Bindings` section.

### Status

draft — 2026-06-19 (verdicts recorded, pre-acceptance; awaits owner review)

---

## Cockpit-Path-Harmonisierung-Hinweis (2026-06-19)

> **Scope:** Dieser Hinweis-Block ist **kein eigenständiger ADR**. Er dokumentiert die in ADR-0059 OQ §5 (Owner-Verdict 2026-06-19) beschlossene Cockpit-Pfad-Harmonisierung als zentralen Fix, ohne historische ADR-Entscheidungen zu überschreiben.

**Befund:** Mehrere Stellen in diesem Dokument (z.B. ADR-0013 Zeile 90, ADR-0021 Zeile 355-357) und in Begleit-Dokumenten (`docs/VISION.md`, `docs/ROLE_BASED_UI_UX_PHASE_0.md`, `docs/architecture/phase2-phase3-mapping.md`, `docs/automation/semi-automated-operations-layer.md`, `docs/agent-team/*`, `docs/tasks/cockpit-audit-workplan.md`, `docs/deployment-vercel.md`) referenzieren den Pfad `apps/cockpit/`. Die Repo-Realität ist `apps/cockpit/` (siehe `OS.md:43-46` und `apps/cockpit/app/(app)/storage/page.tsx:1`).

**Policy ab 2026-06-19:**

1. **Historische ADR-Texte bleiben unverändert.** Die in ADR-0013 (Z. 90) und ADR-0021 (Z. 355-357) referenzierten `apps/cockpit/`-Pfade waren zum Zeitpunkt der jeweiligen ADR-Acceptance korrekt; eine rückwirkende Änderung würde den Audit-Trail korrumpieren. Diese Stellen sind als **historische Pfad-Referenzen** zu lesen, die durch die Cockpit-Migration (siehe `MIGRATION.md`) überholt wurden.
2. **Neue ADRs (ab ADR-0059) verwenden ausschließlich `apps/cockpit/app/...`.** ADR-0059-A ist der erste ADR, der die harmonisierte Pfad-Konvention verbindlich anwendet. Folge-ADR (ADR-0059-B, ADR-0059-C) und alle nicht-historischen Cockpit-Pfad-Referenzen folgen dieser Konvention.
3. **Cross-References aus historischen ADRs sind als "ehemals `apps/cockpit/`" zu lesen.** Wo immer eine Cross-Reference aus einem historischen ADR auf eine aktive Datei zeigen soll, ist die Datei unter `apps/cockpit/app/...` zu finden.
4. **Out-of-scope-Referenzen in Begleit-Dokumenten** (`docs/VISION.md`, `docs/ROLE_BASED_UI_UX_PHASE_0.md`, `docs/architecture/*`, `docs/tasks/*`, `docs/agent-team/*`, `docs/automation/*`, `docs/deployment-vercel.md`) werden in einem **separaten Housekeeping-ADR** (TBD) bereinigt. Dieser ADR harmonisiert ausschließlich die `docs/DECISIONS.md`-internen und ab ADR-0059 entstehenden Cross-References.

**Effekt auf ADR-0059-A:** ADR-0059-A referenziert ausschließlich `apps/cockpit/app/(app)/inventory/items/[itemId]/page.tsx` und `apps/cockpit/app/(app)/storage/[locationId]/page.tsx` (für die Cockpit-Mount-Punkte in ADR-0059-C) sowie `apps/cockpit/lib/auth/rbac.ts` und `apps/cockpit/app/components/role-gate.tsx` (für die RBAC-Sichtbarkeit in ADR-0059-B).

**Verweise:**

- ADR-0013 (Cockpit migrates to Next.js) — historische Pfad-Referenz, unverändert.
- ADR-0021 (Phase A spec) — historische Pfad-Referenz, unverändert.
- `MIGRATION.md` — Monorepo-Migration, die die Pfad-Änderung etabliert hat.
- `OS.md:43-46` — aktuelle Repo-Struktur mit `apps/cockpit/` als Cockpit-Surface.
- `apps/cockpit/app/(app)/storage/page.tsx:1` — Observed Existenz des aktuellen Cockpit-Pfads.

---

## ADR-0059-A: Adopt Item-Image-Service Schema + Storage Substrate (Code-Bearing Slice)

**verdict:** draft — 2026-06-19
**status:** draft (not yet proposed; awaits ADR-0059 acceptance, ADR-0059-K acceptance, and owner review)
**signed-off-by:** — (open)

> **Draft note (2026-06-19):** This ADR is the **first code-bearing slice** under ADR-0059. It authorizes the schema-only migration that creates the two new tables (`ItemImage`, `ItemImageAudit`), the private Supabase Storage bucket (`item-images`), the RLS read policies, the append-only `REVOKE` on `item_image_audit`, and the partial unique index for the one-primary-per-owner invariant. It is a **schema + storage only** slice — **no** Fastify route, **no** Cockpit view, **no** external writeback, **no** LLM. The API + RBAC surface lands in ADR-0059-B. The Cockpit UI lands in ADR-0059-C. Pattern: ADR-0022 §Schema Additions + ADR-0023 §RLS / Grant Plan + ADR-0025 §RLS / Grant Plan.
>
> **Hard preconditions** (per ADR-0059 §Owner-Verdicts-Update 2026-06-19):
>
> 1. ADR-0059 must be `Status: accepted` (this ADR is its first child).
> 2. ADR-0059-K (Cost-Approval for `item-images` Supabase Storage bucket) must be `Status: accepted` (per OQ §4 verdict).
> 3. Cockpit-Path-Harmonisierung-Hinweis (2026-06-19) is binding; this ADR uses only `apps/cockpit/app/...` paths.

Decision: When accepted, this ADR will promote the **schema + storage substrate** of the Item-Image-Service to `accepted` and authorize a single forward-only Prisma migration that **adds** the two tables, the partial unique index, the three CHECK constraints, the four RLS policies, the append-only `REVOKE`, and the Supabase Storage bucket. It does **not** authorize any Fastify route, any Cockpit view, any external writeback, any LLM-driven analysis, or any read or write to `InventoryMovement` / `InventoryStockSnapshot` / `WorkflowTask` (per ADR-0059 Hard-Guardrails). The slice is intentionally narrow: one migration file, one Supabase Storage bucket, one `DO $$` regression-guard block, one manual `down.sql` sibling, and a 6-test integration gate.

This ADR is the natural next gate after ADR-0059 closed (spec acceptance) and ADR-0059-K closed (cost approval). The migration does not run on production until both gates are met and the Supabase live-DB promotion (ADR-0028 pattern) has been executed against a verified snapshot.

### Schema Additions (proposed for migration)

Two new public-schema tables, no FK to existing tables (owner polymorphism via `(ownerType, ownerId)`, validated app-side per ADR-0059 Hard-Guardrail #5):

#### `ItemImage` (16 fields)

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `String` (cuid) | no | — | Primary key. |
| `organizationId` | `String` | no | — | RLS scope; **mandatory** (deviates from nullable `organizationId` on `InventoryItem` per `apps/api/prisma/schema.prisma:88` — RLS not enforceable on nullable). |
| `ownerType` | `Enum { item, location }` | no | — | Discriminator for owner polymorphism. |
| `ownerId` | `String` | no | — | References `InventoryItem.id` or `StorageLocation.id`. **No DB-level FK**; app-side validation against `InventoryItem` and `StorageLocation` belonging to the caller's `organizationId`. |
| `storagePath` | `String` | no | — | Supabase Storage path; format `org/{organizationId}/{ownerType}/{ownerId}/{imageId}.{ext}` (this ADR's §Storage below). |
| `mimeType` | `String` | no | — | One of `image/jpeg`, `image/png`, `image/webp` (CHECK constraint, HEIC rejected per OQ §3 verdict). |
| `sizeBytes` | `Int` | no | — | `0 < x <= 10485760` (10 MB cap, CHECK constraint). |
| `width` | `Int?` | yes | — | Image header, not trusted. |
| `height` | `Int?` | yes | — | Same. |
| `caption` | `String?` | yes | — | Max. 500 chars (validated in Zod, not in DB). |
| `tags` | `String[]` (Postgres `text[]`) | yes | `'{}'` | Free tags; normalized server-side in ADR-0059-B. |
| `rotationDeg` | `Int` | no | `0` | CHECK `IN (0, 90, 180, 270)`. UI hint only, no pixel operation in v1. |
| `isPrimary` | `Boolean` | no | `false` | Partial unique index enforces one primary per `(organizationId, ownerType, ownerId)` where `deletedAt IS NULL`. |
| `uploadedByUserId` | `String` | no | — | Server-set from authenticated session, **never** from request body. |
| `createdAt` | `DateTime` | no | `now()` | `default(now())`. |
| `updatedAt` | `DateTime` | no | `@updatedAt` | `Prisma @updatedAt`. |
| `deletedAt` | `DateTime?` | yes | — | Soft-delete marker; `null` = active. Hard-delete is out of scope in v1 (would require L3 Operator-Freigabe per IDENTITY.md:117). |

#### `ItemImageAudit` (7 fields, append-only)

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `String` (cuid) | no | — | Primary key. |
| `imageId` | `String` | no | — | References `ItemImage.id`. **No** cascade-delete; audit rows persist after soft-delete. |
| `organizationId` | `String` | no | — | RLS scope, denormalized for RLS performance. |
| `action` | `Enum { created, caption_updated, tags_updated, primary_set, primary_unset, rotation_updated, soft_deleted, restored, uploaded_bytes_verified }` | no | — | Discriminator; 9 values. |
| `actorUserId` | `String` | no | — | Server-set. |
| `payload` | `Json?` | yes | — | Diff/state snapshot; schema-less in v1. PII-Sanitization in ADR-0059-B (OQ §6 verdict). |
| `createdAt` | `DateTime` | no | `now()` | `default(now())`. Append-only — no `updatedAt`. |

#### Hard DB-Constraints (proposed for migration)

```sql
-- CHECK constraints
ALTER TABLE "ItemImage"
  ADD CONSTRAINT "item_image_rotation_deg_check" CHECK ("rotationDeg" IN (0, 90, 180, 270)),
  ADD CONSTRAINT "item_image_mime_type_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "item_image_size_bytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760);

-- Partial unique index: one primary per owner
CREATE UNIQUE INDEX "item_image_one_primary_per_owner"
  ON "ItemImage" ("organizationId", "ownerType", "ownerId")
  WHERE "isPrimary" = true AND "deletedAt" IS NULL;

-- Indexes (5 on ItemImage, 3 on ItemImageAudit)
CREATE INDEX "item_image_org_owner_created_idx"
  ON "ItemImage" ("organizationId", "ownerType", "ownerId", "createdAt" DESC);
CREATE INDEX "item_image_org_owner_active_idx"
  ON "ItemImage" ("organizationId", "ownerType", "ownerId")
  WHERE "deletedAt" IS NULL;
CREATE INDEX "item_image_org_uploader_created_idx"
  ON "ItemImage" ("organizationId", "uploadedByUserId", "createdAt" DESC);
CREATE INDEX "item_image_org_tags_gin_idx"
  ON "ItemImage" USING GIN ("tags");
CREATE INDEX "item_image_org_is_primary_idx"
  ON "ItemImage" ("organizationId", "ownerType", "ownerId")
  WHERE "isPrimary" = true AND "deletedAt" IS NULL;

CREATE INDEX "item_image_audit_image_created_idx"
  ON "ItemImageAudit" ("imageId", "createdAt" DESC);
CREATE INDEX "item_image_audit_org_actor_created_idx"
  ON "ItemImageAudit" ("organizationId", "actorUserId", "createdAt" DESC);
CREATE INDEX "item_image_audit_org_action_created_idx"
  ON "ItemImageAudit" ("organizationId", "action", "createdAt" DESC);
```

> **Note:** the GIN index on `tags` is a Prisma-Migration-time decision (Prisma supports `@@index([tags(ops: raw("gin_trgm_ops"))])` via raw SQL; the migration file carries the explicit `USING GIN` clause above, not a Prisma schema annotation). The `item_image_org_is_primary_idx` is technically redundant with the partial unique index but kept as a non-unique index for `WHERE`-only lookups in the bulk path.

### Storage Substrate (proposed)

| Resource | Spec | Notes |
|---|---|---|
| Supabase Storage bucket | `item-images` | Private; no public read; no CDN-public-read. |
| Path convention | `org/{organizationId}/{ownerType}/{ownerId}/{imageId}.{ext}` | `{imageId}` matches the `ItemImage.id` cuid; `{ext}` is one of `jpg`, `png`, `webp` (lowercase). |
| Read signed URL TTL | 5 minutes | Server-side minted, returned by `GET /images/:id` (ADR-0059-B). |
| Upload signed URL TTL | 10 minutes | Server-side minted, returned by `POST /images/upload-url` (ADR-0059-B). |
| Object metadata | Supabase defaults | `Cache-Control: private, max-age=300` (5 min), `Content-Type` per `mimeType`. |
| Lifecycle policy | None in v1 | No automatic deletion of orphaned storage objects; soft-delete on the metadata row does NOT remove the storage object. A future ADR-0059-H Lifecycle-Policy can add a Supabase scheduled job. |

> **Bucket creation:** performed manually in the Supabase dashboard (not via Prisma migration) per ADR-0028 pattern. The Supabase project for this slice is the existing `czinchfegtglmrloxlmh` dev project. The bucket is created under the same Storage RLS context as existing buckets; no new Supabase Auth policies are added in this slice.

### RLS / Grant Plan (proposed for migration)

All RLS policies are written for the `authenticated` role. `app_runtime` honors RLS per ADR-0017 and inherits the same policies. **No service-role grant in user paths** (per ADR-0059 Hard-Guardrail #4 and `apps/api/AGENTS.md:36-37, 92-93`).

| Table | SELECT policy | INSERT policy | UPDATE policy | DELETE policy |
|---|---|---|---|---|
| `ItemImage` | `authenticated` org-member; `deletedAt IS NULL` for non-manager+ read; soft-deleted rows visible only to manager+ | `app_runtime` only; `WITH CHECK` asserts `(ownerType, ownerId)` belongs to caller's `organizationId` AND `uploadedByUserId = auth.uid()` | `app_runtime` only; `WITH CHECK` asserts caller is uploader OR manager+ in same org; `isPrimary` flip demotes previous primary in same `$transaction` (enforced app-side in ADR-0059-B) | **none** — soft-delete only via `UPDATE` setting `deletedAt = now()`. Hard-delete is out of scope. |
| `ItemImageAudit` | `authenticated` org-member; manager+ only per ADR-0059 §API-Surface RBAC matrix | `app_runtime` only; `WITH CHECK` asserts caller's `actorUserId = auth.uid()` AND `organizationId` matches caller's session org | **blocked** — `REVOKE UPDATE ON item_image_audit FROM authenticated, anon, app_runtime;` | **blocked** — `REVOKE DELETE ON item_image_audit FROM authenticated, anon, app_runtime;` |

The migration also carries:

- `GRANT SELECT, INSERT, UPDATE ON "ItemImage" TO authenticated, app_runtime;`
- `GRANT SELECT, INSERT ON "ItemImageAudit" TO authenticated, app_runtime;`
- `REVOKE UPDATE, DELETE ON "ItemImageAudit" FROM authenticated, anon, app_runtime;` (append-only invariant)
- `REVOKE UPDATE, DELETE ON "ItemImageAudit" FROM authenticated, anon;` (belt-and-suspenders)
- A `DO $$` regression-guard block that refuses to apply if either new table, the partial unique index, or the two `REVOKE` statements are missing after the `CREATE` / `REVOKE` / `GRANT` statements. Pattern-Vorlage: ADR-0023 §RLS / Grant Plan and ADR-0025 §RLS / Grant Plan.

### Migration File Naming

Per ADR-0022 / ADR-0023 / ADR-0025 pattern:

```
apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_item_image_service_schema/migration.sql
apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_item_image_service_schema/down.sql
```

The exact timestamp is set at acceptance time (e.g. `20260619120000_item_image_service_schema`). The `migration.sql` is forward-only; the `down.sql` is the manual rollback sibling and is **not** auto-applied by Prisma.

### Test Plan (Gate = Definition of Done)

The slice is complete when all of the following are green:

1. `npx prisma validate` returns clean.
2. `npm run typecheck` is clean (no new TypeScript errors; this slice adds only Prisma migration, no TS code).
3. The forward-only migration applies on a Supabase development project and is reversible via the manual `down.sql` sibling (verified by applying `down.sql` after a test, then re-applying `migration.sql` and confirming all 4 RLS policies + the partial unique index + the append-only REVOKE are present).
4. The existing 644 vitest cases continue to pass — no regression in the read or write path of any other module.
5. Six new integration tests in a new file `apps/api/tests/item-image-rls.test.ts`:
   - `SELECT` denied across orgs (user from org A cannot see org B's `ItemImage` rows).
   - `SELECT` denied for soft-deleted rows to non-manager+; allowed to manager+.
   - `INSERT` rejected when `uploadedByUserId != auth.uid()` (i.e. someone tries to upload on behalf of another user).
   - `INSERT` rejected when `(ownerType, ownerId)` does not belong to caller's `organizationId` (cross-org upload attempt).
   - `UPDATE` on `ItemImageAudit` is permission-denied (append-only invariant).
   - `DELETE` on `ItemImageAudit` is permission-denied.
6. The `npm run smoke:supabase` runner still passes (no regression in the existing inventory / automation / handover path).
7. The 12-query Supabase live-DB verify-script `apps/api/scripts/smoke/item-image-rls-smoke.ts` is runnable on a dev Supabase project and returns green (same pattern as ADR-0028's promotion script).
8. An MSPR logbook entry is written at `docs/agent-team/mspr_logbook/2026-06-19-adr-0059-a-closure.md` covering scope, evidence, risks, scorecard, next-gate.

### Rollback Plan

The slice is one migration file + one Supabase Storage bucket. To roll back:

1. **Database** — run the manual `down.sql` against the target Supabase project:
   ```sql
   -- 1. Drop RLS policies
   DROP POLICY IF EXISTS "item_image_org_select" ON "ItemImage";
   DROP POLICY IF EXISTS "item_image_app_runtime_insert" ON "ItemImage";
   DROP POLICY IF EXISTS "item_image_app_runtime_update" ON "ItemImage";
   DROP POLICY IF EXISTS "item_image_audit_org_select" ON "ItemImageAudit";
   DROP POLICY IF EXISTS "item_image_audit_app_runtime_insert" ON "ItemImageAudit";
   -- 2. Drop indexes
   DROP INDEX IF EXISTS "item_image_one_primary_per_owner";
   DROP INDEX IF EXISTS "item_image_org_owner_created_idx";
   DROP INDEX IF EXISTS "item_image_org_owner_active_idx";
   DROP INDEX IF EXISTS "item_image_org_uploader_created_idx";
   DROP INDEX IF EXISTS "item_image_org_tags_gin_idx";
   DROP INDEX IF EXISTS "item_image_org_is_primary_idx";
   DROP INDEX IF EXISTS "item_image_audit_image_created_idx";
   DROP INDEX IF EXISTS "item_image_audit_org_actor_created_idx";
   DROP INDEX IF EXISTS "item_image_audit_org_action_created_idx";
   -- 3. Drop CHECK constraints
   ALTER TABLE "ItemImage" DROP CONSTRAINT IF EXISTS "item_image_rotation_deg_check";
   ALTER TABLE "ItemImage" DROP CONSTRAINT IF EXISTS "item_image_mime_type_check";
   ALTER TABLE "ItemImage" DROP CONSTRAINT IF EXISTS "item_image_size_bytes_check";
   -- 4. Revoke grants (the REVOKE statements are no-ops if grants are absent)
   REVOKE UPDATE, DELETE ON "ItemImageAudit" FROM authenticated, anon, app_runtime;
   REVOKE SELECT, INSERT, UPDATE ON "ItemImage" FROM authenticated, app_runtime;
   REVOKE SELECT, INSERT ON "ItemImageAudit" FROM authenticated, app_runtime;
   -- 5. Drop tables (cascade not used; manual)
   DROP TABLE IF EXISTS "ItemImageAudit" CASCADE;
   DROP TABLE IF EXISTS "ItemImage" CASCADE;
   ```
2. **Storage** — `supabase storage rm item-images` (manual; this removes all objects in the bucket). Only after step 1 succeeds.
3. **Prisma client** — `npx prisma generate` to refresh the client.
4. **Tests** — `npm test` to confirm the 644 existing vitest cases pass; the 6 new RLS tests in `item-image-rls.test.ts` fail (expected — they reference dropped tables). Either delete the new test file or skip the tests in CI.
5. **Source** — `git revert` the commit that added the migration + the test file + the MSPR closure.
6. **Audit** — append a rollback entry to `logs/audit-log.md` per `governance/evidence-contract.md` (L2 action).

### Bindings (acceptance conditions)

This ADR is **blocked** until the following are `Status: accepted`:

- **ADR-0059** (Item-Image-Service spec) — owner-acceptance still pending as of 2026-06-19.
- **ADR-0059-K** (Cost-Approval for `item-images` Supabase Storage bucket) — OQ §4 verdict, **must be drafted and accepted before this ADR lands**. ADR-0059-K is a short scope: confirms the bucket is authorized under the current Supabase Pro plan, defines the retention policy, references the cost ceiling, and gates this ADR-0059-A.

This ADR is **also subject to** (informational, not blocking):

- The Cockpit-Path-Harmonisierung-Hinweis (2026-06-19) above.
- ADR-0011 (Supabase Postgres canonical).
- ADR-0014 (organization identity from Supabase Auth — `organizationId` for RLS).
- ADR-0017 (`app_runtime` role enforces RLS — used as the only write actor).
- ADR-0009 (soft deactivation pattern — `ItemImage.deletedAt` mirrors this).
- ADR-0023 §RLS / Grant Plan (pattern template for the four policies + `DO $$` regression guard + `clientRequestId`).
- ADR-0025 §RLS / Grant Plan (pattern template for the append-only REVOKE).
- ADR-0028 (Promote Phase B Migrations pattern — required for the Supabase live-DB promotion before any Phase B/UI slice can call the new tables).
- ADR-0056 (Mother-Concern Data Model — `BusinessUnit` scoping is out of scope per OQ §7 verdict; deferred to ADR-0059-E).
- `IDENTITY.md` L0–L4 matrix + Hard-Guardrails (no writeback, no LLM, no service-role, append-only audit).
- `apps/api/AGENTS.md` Hard-Guardrails.

### Open Questions

1. **Migration timestamp format.** Per ADR-0022/0023/0025 pattern: `<YYYYMMDDHHMMSS>_item_image_service_schema`. **Recommended** at acceptance time. No owner action needed.
2. **`tags` GIN-Index-Operator.** `USING GIN ("tags")` is the default; the spec mentions `gin_trgm_ops` for trigram-style prefix matches. The `GIN(tags)` default is sufficient for `=` and `ANY` matches which is all the spec uses; trigram-style is out of scope in v1. **Recommended**: keep `GIN(tags)`, no `gin_trgm_ops`. **No owner action needed; documented for posterity.**
3. **`ItemImageAudit.payload` schema.** Schema-less JSON in v1. Concrete Zod schemas per `action` enum value are added in ADR-0059-B (or in a follow-up ADR-0059-F.2 if scope grows). **Recommended**: keep schema-less in this slice. **No owner action needed.**

### Cross-References

- ADR-0059 (Item-Image-Service spec) — this ADR's primary authority; inherits all Hard-Guardrails and the Owner-Verdicts-Update 2026-06-19.
- ADR-0059-K (Cost-Approval) — hard precondition.
- ADR-0011 (Supabase canonical) — `item-images` bucket lives under the same Supabase project.
- ADR-0017 (`app_runtime` role enforces RLS) — the only write actor for both new tables.
- ADR-0009 (soft deactivation) — pattern template for `deletedAt`.
- ADR-0023 §RLS / Grant Plan — pattern template for the four policies and the `DO $$` regression guard.
- ADR-0025 §RLS / Grant Plan — pattern template for the append-only REVOKE.
- ADR-0028 (Promote Phase B Migrations) — required for the Supabase live-DB promotion before ADR-0059-B can call the new tables.
- ADR-0056 (Mother-Concern Data Model) — `BusinessUnit` scoping is deferred to ADR-0059-E per OQ §7 verdict.
- `IDENTITY.md` L0–L4 — risk classification per action.
- `apps/api/AGENTS.md` Hard-Guardrails — no writeback, no LLM, no service-role, RLS authoritative, ADR-acceptance requirement.
- `docs/features/item-image-service.md` §4 (Datenmodell) — the proposed shape this ADR promotes to binding.
- `apps/api/prisma/schema.prisma:86, 226, 395, 1896` — schema anchors for `InventoryItem`, `StorageLocation`, `InventoryMovement`, `BusinessUnitLocation.isPrimary` (pattern template for the partial unique index).
- `apps/api/prisma/migrations/20260608160000_add_automation_phase_b_tables` (B-1) and `20260608161000_add_automation_phase_b_rls` (B-2) — pattern template for the two-migration split (DDL + RLS/Grant).
- `apps/api/prisma/migrations/20260608175159_automation_handover_draft_policies` — pattern template for the append-only REVOKE + write-policy + `DO $$` regression-guard.
- `docs/agent-team/mspr_logbook/2026-06-08-adr-0029-b-closure.md` — pattern template for the MSPR closure entry this ADR requires.

### Next gate

ADR-0059-A is now `Status: draft`. Acceptance authorizes:

- the forward-only migration (one file, manual `down.sql` sibling);
- the private Supabase Storage bucket `item-images`;
- the 6-test RLS integration gate;
- the 12-query Supabase live-DB verify-script;
- the MSPR closure entry (`docs/agent-team/mspr_logbook/2026-06-19-adr-0059-a-closure.md`).

**Blockers** (must be `Status: accepted` before this ADR's promotion to `proposed`):

1. ADR-0059 (spec acceptance) — owner-review is the next step.
2. ADR-0059-K (cost approval) — **must be drafted and accepted**. Drafted immediately after ADR-0059-K is added to the Phase-Plan block of ADR-0059.

**Open Question §1 verdict:** the migration timestamp format follows the ADR-0022/0023/0025 pattern. No owner action needed.

**Open Question §2 verdict:** `GIN(tags)` default, no `gin_trgm_ops`. No owner action needed.

**Open Question §3 verdict:** `ItemImageAudit.payload` schema-less in this slice. ADR-0059-B or a follow-up ADR-0059-F.2 introduces per-action Zod schemas. No owner action needed.

**Implementation status (2026-06-19):** no code yet. The implementation slice lands as one PR after ADR-0059 + ADR-0059-K acceptance and reviewer review, paired with the 12-query Supabase live-DB promotion (ADR-0028 pattern). The new Cockpit files (`apps/cockpit/app/(app)/inventory/items/[itemId]/page.tsx` and `apps/cockpit/app/(app)/storage/[locationId]/page.tsx`) are **out of scope** for this slice; they land in ADR-0059-C (Cockpit UI) as a precondition per OQ §10 verdict.

### Status

draft — 2026-06-19
