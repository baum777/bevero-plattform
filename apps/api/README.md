# bevero

**bevero** is the warehouse and inventory platform for the Motorworld BB bar
and kitchen operation. It pairs a Fastify backend/API (this repo) with the
Cockpit Next.js frontend in `apps/cockpit` (`bevero-plattform-cockpit`).

The backend is an independent service for moving external POS data into internal
workflow logic. The POS adapter has moved from Gastronovi to FoodNotify; external
POS data is never treated as operational truth directly. Payloads are imported,
normalized, versioned, and only then processed as internal workflow events.

Deployments: frontend on `bevero-plattform-cockpit`, backend/API on
`bevero-plattform-api`.

## Goals

The repository separates three responsibilities:

1. Ingestion: receive or fetch external data.
2. Normalization: translate external payloads into internal event contracts.
3. Workflow dispatch: validate, store, and trigger follow-up actions from events.

This keeps workflow apps, admin dashboards, and orchestrators from depending on
POS-specific APIs or payload shapes.

## Non-Goals in v1

- No full POS dashboard.
- No replacement for the upstream POS back office.
- No direct accounting logic.
- No automatic decision without audit trail.
- No assumption that all required POS endpoints are publicly available.
- No writeback to the POS or HOTAPI-adjacent systems.
- No writeback to FoodNotify, Microsoft Dynamics 365, DATEV, or central
  Rauschenberger systems. Bevero reads from these systems; it does not push
  mutations back. See `docs/automation/semi-automated-operations-layer.md`.
- No LLM-driven approval, ordering, or stock mutation. LLM components are
  optional, read-only text/classification helpers (handover synthesis, note
  classification, rule explanations). See the Agent / LLM Boundary section
  in the automation spec.
- No service-role credentials in user-facing request paths. RLS stays
  authoritative; service actions run backend-side only.

## Architecture

```txt
POS (FoodNotify) / HOTAPI / Export / Webhook
        |
Source Connector
        |
Raw Payload Store
        |
Normalizer
        |
Workflow Event Store
        |
Rules Engine (deterministic, versioned)
        |
Tasks / Alerts / Approvals / Reports
        |
+-- Automation Layer (new)
|     AutomationRule  ->  AutomationSuggestion  ->  AutomationDecision
|     (rule fires)        (immutable proposal)     (human approves/rejects)
|     |
|     +-- Shift Handover Drafts  (LLM-synthesized, human-confirmed)
|     +-- Offline Action Queue    (Service Worker, idempotent sync)
|
+-- Cockpit Next.js  (apps/cockpit/)
      Dashboard, Suggestions, Bar Refill, Alerts, Shift Handover
      Owner / Admin / Manager / Staff / Viewer (ADR-0015)
```

## Technical Defaults

```txt
Runtime:        Node.js + TypeScript
HTTP Layer:     Fastify
Validation:     Zod
Database:       PostgreSQL
ORM:            Prisma
Queue:          BullMQ + Redis later
Testing:        Vitest
Docs:           Markdown
```

## Current Implementation Status

**Implemented (Phase B/C/E):**

- Fastify service bootstrap with health/context routes.
- Prisma schema with 78 models, 59 migrations across 19 modules.
- Inventory management: bar refill runs, stock snapshots, correction requests (with RLS).
- Procurement: purchase orders, goods receipts, supplier management.
- Automation: rules engine (`AutomationRule`), suggestions (`AutomationSuggestion`), decisions (`AutomationDecision`).
- Shift Handover: drafts, confirmations, team assignment.
- Operational notes with audit events and RLS policies.
- Location/Operational-unit organization with multi-tenant context.
- Supabase Auth integration + 5-tier role-based access control (owner/admin/manager/staff/viewer).
- 632 tests covering 78 test files.

**Out of scope or pending (Phase D/F/G):**

- Live POS/FoodNotify webhook ingestion (Ticket 3+).
- Normalization of external payloads to internal events.
- Deterministic raw payload deduplication.
- Automatic writeback to FoodNotify / Dynamics / DATEV.
- LLM-driven decision-making (LLM synthesis only, human-gated).

## Active Specs & Roadmap

The repo is governed by three layered spec surfaces. When a new gate or
implementation decision is needed, the owning spec is the authority.

### 1. Semi-Automated Operations Layer (in flight)

Source: `docs/automation/semi-automated-operations-layer.md`

A controlled, rules-based automation layer that **assists** operational staff
at Motorworld Inn and CUBE without replacing human judgment. Automation is
**read-only** for external systems, **suggestion-first** for internal
operations, **human-gated** for all stock mutations, and **offline-capable**
for critical flows. LLM components are optional and limited to text synthesis,
classification, and explanation.

**In scope (per spec):**

- Rules-first suggestions (low stock, open receipt, consumption anomaly)
  producing immutable `AutomationSuggestion` records.
- Human-in-the-loop approval with append-only `AutomationDecision` audit.
- Offline queue with idempotent sync and conflict resolution
  (`OfflineActionQueue` + Service Worker contract).
- Shift handover drafts with optional LLM synthesis
  (`ShiftHandoverDraft`).
- Service Worker / IndexedDB caching for bar refill lists, snapshots, and
  recent movements.

**Out of scope (per spec, hard):**

- Automatic stock mutation, automatic purchase orders, automatic writeback
  to FoodNotify / Dynamics / DATEV.
- LLM deciding approval, ordering thresholds, or stock levels.
- Service-role credentials in client sessions.
- Bypassing `InventoryMovement` (append-only) to mutate
  `InventoryStockSnapshot` directly.

**New data model (proposed, not yet migrated):**

- `AutomationRule` (versioned, JSON condition + action, cron or on-write)
- `AutomationSuggestion` (open / approved / rejected / expired)
- `AutomationDecision` (append-only)
- `OfflineActionQueue` (per-device, per-user, idempotent)
- `ShiftHandoverDraft` (per shift lead, per day)

**New API surface (proposed):**

- `GET /automation/suggestions`, `POST /automation/suggestions/:id/{approve,reject}`
- `GET|POST|PATCH /automation/rules` (admin+), `POST /automation/rules/:id/test-dry-run`
- `POST /offline-actions/sync`, `GET /offline-actions/status`
- `GET|POST /shift-handover/draft`, `POST /shift-handover/draft/:id/{synthesize,confirm}`

**Phase plan (from spec):**

| Phase | Scope | Gate | Status |
|---|---|---|---|
| A | Spec & ADR | Team sign-off on scope, roles, guardrails | **closed** — ADR-0021 accepted |
| B | Rules Engine MVP (no LLM) | Backend tests + dry-run on production snapshot | **proposed** — ADR-0022 awaiting review |
| C | UI Suggestions MVP | Staff can see, approve, reject from mobile | not started — route stub shipped at `apps/cockpit-next/app/(app)/automation/suggestions/` |
| D | Offline Queue MVP | Offline → reconnect sync with no data loss | not started |
| E | Shift Handover Drafts | Shift lead can draft, confirm, hand over | promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS; LLM-synthesized handover draft remains out of scope for Phase F) |
| F | Agentic Summaries (LLM optional) | LLM is opt-in, works without it | not started |
| G | Export / Writeback prep | Manual export only, no automatic writeback | not started |

#### Recent gates and slices

- `docs/agent-team/mspr_logbook/2026-06-08-bevero-automation-spec-merge.md` —
  this slice: root + AGENTS + Cockpit planning + ADR-0021.
- `docs/agent-team/mspr_logbook/2026-06-08-phase-b-prep.md` — closure of
  the spec-merge flow with the MSPR/PR-template/Cockpit-stub/ADR-0022
  bundle.
- `docs/agent-team/mspr_logbook/2026-06-08-swarm-runtime-bootstrap.md`
  — recorded by a separate slice that landed the swarm runtime.
- `ccf0f50` — `feat(phase-1): Wareneingang + Schichtübergabe (Slice 2 & 3)`.
  First concrete Phase 1 implementation surface. Ships the read/draft/confirm
  flow for shift handover and a goods-receipt intake page. Does **not**
  ship the LLM-synthesized handover draft from Phase E.
- `401580d` — flips `ADR-0020` (Swarm Runtime Surface) to `Status: accepted`.
  The 5 modules under `src/agent-team/` are now part of the accepted
  contract.
- `2d55567` — `.github/PULL_REQUEST_TEMPLATE.md`. Bakes the authority
  order, ADR linearity, MSPR requirement, and the 9 hard guardrails
  into the PR opening flow.
- `406847e` — CI workflow fix (`checkout@v4`, `setup-node@v4`).

#### Next gates

1. **ADR-0022 review** — flip `Status: proposed` → `Status: accepted`
   or return for rework. Acceptance unlocks the Prisma migration for
   the 5 automation tables and the 2 read-only endpoints
   (`GET /automation/rules`, `POST /automation/rules/:id/test-dry-run`).
2. **Cockpit `/automation/suggestions`** stub is data-less and waiting
   for the Phase B slice. No change to the page until ADR-0022 is
   accepted.
3. **Phase E LLM-synthesized handover draft** is a follow-up to
   `ccf0f50`, not a replacement of it.

### 2. Product Vision & Phase Plan (working paper)

Source: `docs/VISION.md`

Strategic positioning: **Planung oben, Ausführung unten.** Bevero is the
mobile execution layer for site reality at Bar, Kitchen, Storage, Service,
and Event. It explicitly does **not** replace FoodNotify (planning),
Microsoft Dynamics 365 (accounting, HR, central planning), DATEV (tax,
payroll), or central Rauschenberger processes. It complements them with
audit-trail-rich operational truth.

Phased rollout:

- **Phase 0** — MVP stabilization (current Cockpit Next as active UI, `web/` frozen).
- **Phase 1** — Motorworld Inn operations pilot (bar refill, stock, consumption, receipts, notes, handover).
- **Phase 2** — Multi-standort structure (org model, locations, storage locations, role hardening).
- **Phase 3** — CUBE compatibility (site profiles, premium items, batch/quality notes, role-based landing pages).
- **Phase 4** — FoodNotify as complementary ingestion (mail/export ingest, mapping, deviation export).
- **Phase 5** — Rauschenberger mother-concern layer (cross-site overview, exports for procurement/controlling, audit trail).
- **Phase 6** — Event / bankett extension (packing lists, return quantities, post-event reconciliation).

### 3. Agent Team Governance (internal tooling)

Source: `docs/agent-team/README.md`

A controlled 3-agent swarm (Orchestrator / Builder / Reviewer) is the
default way AI coding agents and humans collaborate on this repo. The
contract is intentionally lightweight (Markdown + JSON Schemas) and lives
entirely under `docs/agent-team/`. ADR-0020 (accepted) promotes the
runtime surface to TypeScript modules under `src/agent-team/`. The
contract itself remains a documentation surface.

Key contracts:

- `swarm_roles.md` — three roles, no fourth agent, no unsupervised loop.
- `swarm_policy.md` — Tier 0 always-blocked, Tier 3 always-reviewed, Tier 1–2 usually free.
- `swarm_task_routing.md` — task class → autonomy tier → review requirement.
- `swarm_review_gate.md` — Reviewer scorecard and verdict vocabulary.
- `mspr_logbook.md` — Memory / Scope / Progress / Review entry schema.
- `agent_teamplan.md` — active workstreams, owners, blockers, next gate.
- `agent_memory.md` — working, repo, and optional semantic memory rules.
- `mspr_schema.json`, `swarm_task_envelope.schema.json` — machine-readable contracts.
- `src/agent-team/` — runtime modules (ADR-0020, accepted).

The swarm is **bounded by `AGENTS.md` and `docs/DECISIONS.md`**; it extends
repo-local governance, it does not replace it. The automation spec's
no-writeback and human-gating guardrails are explicitly referenced as
policy hooks.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm test -- --run
npm run build
npx prisma validate
```

Frontend (Cockpit Next.js surface):

```bash
npm run dev:cockpit
npm run build:cockpit
```

## Frontend Surfaces

- Canonical active Cockpit frontend: `apps/cockpit-next/` (Next.js App Router).
- Legacy `web/` shell: frozen for feature work; keep as historical/reference surface only.
- Backend, Prisma schema ownership, and Supabase-backed validation remain canonical in this repository.

### Cockpit UI shell

The Cockpit frontend ships a role-aware app shell. See `apps/cockpit-next/README.md`
for details. Highlights:

- Responsive navigation: desktop sidebar (≥ 1024px) always visible; on mobile
  (< 1024px) a hamburger button (top-left in the topbar) opens the sidebar drawer.
  The sidebar contains all nav links plus Profil, Team, and a logout action.
- Mobile bottom tab bar (< 1024px) with a quick-action sheet for booking
  consumption / starting a bar refill run.
- Role-based access: navigation items and the post-login landing route are
  filtered by `OrganizationMember.role` (UI visibility only; backend auth/RLS
  stays authoritative).
- Quick-notes floating action button with note / checklist modes, persisted in
  the browser's `localStorage`.
- Light/dark theme toggle persisted per browser.
- Logout via sidebar footer: calls `supabase.auth.signOut()` and redirects to
  `/sign-in`.

### Bar refill quantity controls

The bar refill run item controls use an accumulate model:

- Six preset buttons (`-5`, `-2`, `-1`, `+1`, `+2`, `+5`) add to or subtract
  from the current quantity instead of replacing it. Negative presets are
  disabled when the result would go below zero.
- The status pill (Offen / Ausstehend / Erledigt) is shown inline left of the
  quantity display.
- A green checkmark button right of the quantity display confirms the item
  (active only when status is `pending`; replaces the previous separate
  "Bestätigen" button).

## Smoke Tests

Run the Supabase-backed inventory API smoke test with:

```bash
npm run smoke:inventory-api
```

Prerequisite: `DATABASE_URL` must be set. The command writes scoped
`codex-smoke-*` inventory rows to the configured Supabase database, then deletes
them again before exit.

The smoke test verifies:

- `POST /admin/inventory/items` creates a smoke inventory item.
- `GET /admin/inventory/items/:id` reads the created item.
- `GET /admin/inventory/items` lists the created item and confirms cleanup.
- `GET /inventory/master-data` returns HTTP 200 with a non-empty body.

For Cockpit runtime validation, use:

```bash
npm run smoke:supabase
```

This runner is gated by `SMOKE_TEST_ENABLED=true` and skips cleanly when Supabase-backed database URLs or seedable auth context are not available. See `docs/cockpit-runtime-smoke-checklist.md` and `docs/inventory-transfer-org-affinity.md` for the current runtime boundary and manual follow-up checks.

## Environment

Copy `.env.example` to `.env` for local development and replace every placeholder with values from the Supabase dashboard.

Supabase Postgres is the canonical database for this repo. Do not assume a local Postgres role or database exists, and do not create local DB users, roles, or databases without explicit approval.

Required database variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

- `DATABASE_URL` is used by the app/runtime. Prefer the Supabase/Supavisor pooled connection string for runtime connections.
- `DIRECT_URL` is used by Prisma CLI and migration workflows when a direct connection is required.
- For serverless deployments, `DATABASE_URL` must use the Supabase pooler URL
  with `pgbouncer=true` and a low connection limit; keep `DIRECT_URL` on the
  direct database host for migrations.
- Use dashboard-provided Supabase connection strings. Do not invent credentials.
- Keep real values in `.env` only. `.env.example` must contain placeholders only.
- Production Redis must be configured with either `REDIS_URL` or both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- The Cockpit Next.js frontend needs `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_API_BASE_URL` in its
  deployment environment. `NEXT_PUBLIC_API_BASE_URL` is public browser
  configuration for backend-dependent Cockpit flows; it must point to the
  stable `bevero-plattform-api` service, not to the Cockpit frontend origin.
- `NEXT_PUBLIC_APP_ENV` and `NEXT_PUBLIC_COMMIT_SHA` are public build display
  values for the Cockpit shell. On Vercel, `NEXT_PUBLIC_COMMIT_SHA` may mirror
  the deployment commit SHA value.

### Runtime secret ownership for app_user (staging/production)

- `app_user` connection URLs, passwords, and tokens are deployment secrets, not repository files.
- Do not store production or staging runtime env values in `.env.example`, committed `.env` files, or temporary local files such as `/tmp/app_user_runtime.env`.
- Set runtime values in deployment-managed secret surfaces only:
  - Vercel project environment variables for the deployed API runtime.
  - Supabase dashboard-managed connection values for role/user lifecycle and database access policy changes.
  - Any equivalent secret manager used by the active deployment target.
- Local `.env` is only for local development and must remain uncommitted.

DB-backed browser/runtime validation is runnable only when `.env` exists, both database URLs point to Supabase, Prisma can connect successfully, and the app can create/read/list DB-backed records. If those inputs are missing, the correct result is `blocked` pending valid Supabase credentials, not local Postgres admin setup.

Secrets must stay backend-owned. API keys, tenant identifiers, tokens, and raw secret-bearing payloads must not be logged or exposed in API responses.

### Prisma introspection drift guard

- Never commit raw `prisma db pull` output without a scoped review.
- Always run `npx prisma db pull --print` first and compare the result against the current `prisma/schema.prisma`.
- Keep changes in a dedicated schema-only slice and adopt models through an explicit allowlist.
- Current allowlist baseline for cross-schema support:
  - `public`: `Team`, `TeamInvite`, `TeamMember`, `UserProfile`
  - `auth`: minimal bridge model for `auth.users` only (`AuthUser`)
  - enums: `TeamRole`, `TeamMemberStatus`
- Current rejectlist baseline:
  - Supabase auth/session infrastructure such as `sessions`, `refresh_tokens`, `one_time_tokens`, `mfa_*`, `saml_*`, `sso_*`, `oauth_*`, `audit_log_entries`, `flow_state`, `webauthn_*`, and similar auth-internal tables.
- If new database tables appear:
  - classify by owner (`public` app-domain vs `auth` infra)
  - adopt only app-domain models needed by repository-owned features
  - keep `auth` adoption minimal and relation-driven
  - document accepted/rejected models before committing
  - validate with `npm run prisma:validate`, `npm run typecheck`, `npm run build`, and `git diff --check`

<!-- workspace-root-sync:readme:start -->
## Workspace Integration

This repository lives under `/home/baum/Schreibtisch/workspace/main_projects`. Its local `README.md`, `AGENTS.md`, `docs/`, manifests, contracts, validators, tests, and workflow files remain the authority for repo-specific product, runtime, archive, and implementation truth.

The workspace root is a routing and orientation layer. It points agents and humans to the correct authority surface; it must not be treated as a replacement for this repository's local truth.

### Workspace Work Path

```text
frontdoor -> authority check -> scope check -> reusable-surface check -> smallest safe work -> verification -> evidence / next gate
```

When work enters from the workspace root:

1. Read root `README.md` and root `AGENTS.md`.
2. Read this repository's `README.md`, `AGENTS.md`, and relevant local docs or contracts.
3. Identify the owning authority, scope, next gate, expected write targets, and validation path.
4. Check whether existing repo-local or shared-core assets already cover the task.
5. Make the smallest safe change and verify it locally.
6. Close with evidence, unresolved gaps, and the next re-entry pointer.

### Cross-Repo And Reusable Work

- Use portfolio surfaces for workspace inventory, cross-repo coordination, intake, disposition, daily notes, commit evidence, and re-entry tracking.
- Use `model-agnostic-workflow-system/` for reusable skills, contracts, templates, validators, provider exports, and workflow routing patterns.
- Do not duplicate root, portfolio, shared-core, or chat-room governance here unless this repository deliberately adopts a local copy.
- If this repository is `model-agnostic-workflow-system`, its own `AGENTS.md` and `WORKFLOW.md` are the local shared-core authority before reusable behavior is exported elsewhere.

### Evidence And Closure

Close meaningful work with:

- `Observed` facts from exact paths or commands;
- `Inferred` conclusions clearly labelled;
- `Applied` changes with exact paths;
- `Verified` checks or read-backs;
- `BLOCKED` items where authority, source, scope, validation, or permissions are insufficient;
- the next gate or re-entry pointer.

Do not treat summaries, imports, chat notes, MSPR packets, loose docs, archives, or derived knowledge as canonical truth until the owning surface has reviewed and promoted them.
<!-- workspace-root-sync:readme:end -->
