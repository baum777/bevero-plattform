# AGENTS.md

Repository-wide instructions for AI coding agents working on `warenwirtschaft-gastronovi-workflow`.

## Database / Persistence

- Canonical database: Supabase Postgres.
- Local Postgres is only an optional development fallback when explicitly approved and configured.
- Do not assume a local Postgres role/database exists.
- Do not create local DB users, roles, or databases without explicit approval.
- Runtime validation must use a valid Supabase-backed `DATABASE_URL`.
- Secrets must stay out of git. Only `.env.example` may contain placeholders.

## Environment

Required local env vars:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

- `DATABASE_URL` is used by the app/runtime.
- `DIRECT_URL` is used for Prisma CLI/migrations when a direct connection is required.
- Serverless runtime URLs must use the Supabase pooler with pgbouncer enabled
  and a low connection limit; migration/direct URLs must stay direct.
- Use Supabase dashboard-provided connection strings; do not invent credentials.

## Prisma / Supabase Rules

- Keep Prisma provider as `postgresql`.
- Use Supabase Postgres as the source of truth for schema validation.
- Prefer Supabase connection pooling for runtime connections.
- Use a direct DB URL for migration workflows where Prisma requires a direct connection.
- Before browser/runtime validation, confirm `.env` exists and contains valid Supabase values.
- Service-role credentials are restricted to admin/migration/cron-style maintenance tasks.
- User-facing request paths must not use service-role credentials to bypass RLS.

## Validation Gate

A DB-backed browser flow is only runnable when:

1. `.env` exists.
2. `DATABASE_URL` points to Supabase.
3. `DIRECT_URL` points to Supabase.
4. Prisma can connect successfully.
5. The app can create/read/list DB-backed records.

If these are missing, report `blocked` and request valid Supabase credentials instead of attempting local Postgres setup.

## Local DB Test Runs

Supabase is the canonical target database.

For local test/runtime validation, agents may set up a local PostgreSQL database when explicitly approved.

Approved local test defaults:

```env
DATABASE_URL="postgresql://gastronovi_dev:gastronovi_dev@127.0.0.1:5432/gastronovi_workflow_adapter"
DIRECT_URL="postgresql://gastronovi_dev:gastronovi_dev@127.0.0.1:5432/gastronovi_workflow_adapter"
```

Rules:

- Local DB credentials may be written to local `.env`.
- Never commit `.env`.
- `.env.example` must only contain placeholders.
- Local DB is for test runs only.
- Supabase remains the production/source-of-truth DB target.

## Active Specs & Authority

When a new gate, decision, or implementation question is in scope, the
**owning spec is the authority**. This section names the three spec
surfaces that govern the current repo. Agents must read the relevant
spec before proposing changes in their area.

### 1. Semi-Automated Operations Layer (spec adopted; Phase B/C landed)

Source: `docs/automation/semi-automated-operations-layer.md`

Governs all automation, suggestions, rules, offline queue, shift handover,
and LLM usage in this repo. Hard guardrails agents must respect:

- No automatic stock mutation. Suggestions only; humans approve.
- No automatic writeback to FoodNotify, Microsoft Dynamics 365, DATEV,
  Rauschenberger, or any other external system. Bevero reads only.
- No LLM-driven approval, ordering, or stock mutation. LLMs are
  optional, read-only text/classification helpers (handover synthesis,
  note classification, rule explanations).
- No service-role credentials in user-facing request paths. RLS is
  authoritative.
- `InventoryStockSnapshot` is read-only from UI. Only
  `InventoryMovement` (append-only) updates snapshots.
- Every rule-fired proposal creates an immutable `AutomationSuggestion`
  and every approval/rejection creates an append-only
  `AutomationDecision`.

Data model status (migrated + accepted): the five automation tables
(`AutomationRule`, `AutomationSuggestion`, `AutomationDecision`,
`OfflineActionQueue`, `ShiftHandoverDraft`) are no longer "proposed" —
they are promoted to `accepted` and present in `prisma/schema.prisma`
via ADR-0022 (Phase B Rules Engine MVP, accepted 2026-06-08); the
mutation surface is authorized via ADR-0023 (accepted 2026-06-08). The
earlier "do not implement before the spec leaves Phase A" wording is
superseded by those ADRs.

API surface: read-only + dry-run endpoints accepted via ADR-0022;
mutation endpoints accepted via ADR-0023. Offline sync, shift-handover
write endpoints, and any external writeback remain out of scope until
separately authorized by their own ADRs. See `Active Specs & Roadmap`
in `README.md`.

### 2. Product Vision & Phase Plan (working paper)

Source: `docs/VISION.md`

Governs product positioning, phasing, and explicit non-replacement
posture. Bevero is the mobile execution layer for site reality
(Bar / Kitchen / Storage / Service / Event). It explicitly does not
replace FoodNotify, Dynamics 365, DATEV, or central Rauschenberger
processes. The Phase 0–6 working paper is the source for which
business problem is being solved at which stage.

### 3. Agent Team Governance (internal tooling)

Source: `docs/agent-team/README.md`

Governs how AI coding agents and humans collaborate on this repo
(3-agent swarm: Orchestrator / Builder / Reviewer). The swarm is
**bounded by this `AGENTS.md` and `docs/DECISIONS.md`**. It extends
repo-local governance, it does not replace it. The automation spec's
no-writeback and human-gating guardrails are explicitly referenced as
policy hooks in `swarm_policy.md`.

### Authority Resolution

When a user request, scope, or implementation question touches more
than one of the surfaces above, the order of authority is:

1. `docs/DECISIONS.md` (accepted ADRs are binding)
2. `docs/automation/semi-automated-operations-layer.md` (Phase A spec)
3. `docs/VISION.md` (strategic intent, working paper)
4. `docs/agent-team/*` (collaboration contract, not product truth)
5. `README.md` and this file (entry / routing)
6. Loose docs, chat summaries, MSPR packets, archives (never authority
   unless promoted by an owning surface)

If two of the above conflict, escalate to a new ADR or update the
relevant spec before writing code.

<!-- workspace-root-sync:agents:start -->
## Workspace Root Integration

Class: repo-local agent frontdoor extension.
Use rule: read after this repository's own opening instructions. The workspace root `README.md` and `AGENTS.md` route entry, authority checks, reusable-surface checks, evidence, and stop rules; this repository's local files remain the canonical source for repo-specific product, runtime, archive, contract, and implementation truth.

### Authority And Scope

- Repo-local `AGENTS.md`, `README.md`, `docs/`, manifests, contracts, validators, tests, and workflow files govern this repository.
- Workspace-root files provide routing and constraints only; they do not replace repo-local architecture, implementation, product, runtime, or archive truth.
- Portfolio surfaces may classify, coordinate, or record cross-repo work, but they do not override this repository unless this repository explicitly adopts them.
- Shared-core assets under `model-agnostic-workflow-system/` are the reusable authority for portable skills, contracts, templates, validators, provider exports, and workflow routing patterns.
- For non-trivial, cross-repo, governance-related, reusable, prompt/system-prompt, validator, template, skill, or workflow/path-routing work, check existing repo-local and shared-core assets before creating a new surface.

### Entry Sequence

1. When entering from `/home/baum/Schreibtisch/workspace/main_projects`, read the root `README.md` and root `AGENTS.md` first.
2. Read this repository's frontdoors next: `AGENTS.md`, `README.md`, relevant `docs/`, manifests, contracts, validators, tests, and local workflow files.
3. Identify owner, scope, canonical file, expected write targets, dirty/user-made changes, validation path, and next gate before editing.
4. Prefer existing repo-local or shared-core scripts, templates, validators, contracts, and docs over new files.
5. Apply the smallest safe change.
6. Verify by reading changed state and running the relevant local checks.
7. Report results with exact paths, evidence, unresolved gaps, and next gate.

### TTD-first / TDD-inside

For meaningful work, state a compact TTD frame before writing:

- Decision: what must become unambiguously true after the slice.
- Owner / Scope: which repo, surface, file family, or authority plane owns the change.
- Contract: which file, API behavior, UI state, schema, policy, or doc proves the decision.
- Gate / Test: the smallest check that would fail if the decision is false.
- Implementation Slice: the smallest safe change needed to make the gate pass.
- Evidence: the command, output, file, or log that proves the result.
- Next Gate: what remains deliberately not claimed or deferred.

Use TDD inside implementation-bearing slices. TDD tests code behavior; TTD tests whether the development claim is valid. A task is done only when the claimed decision state is locally verifiable with evidence, or when the result is explicitly reported as `partial` or `BLOCKED`.

### Evidence Language

Use exact paths and label claims as:

- `Observed`: directly read from files, commands, repo state, or tool output.
- `Inferred`: reasoned from observed evidence.
- `Recommended`: proposed next action.
- `Applied`: a real write occurred and the path is named.
- `Verified`: applied change was read back or checked with named evidence.
- `BLOCKED`: authority, source, scope, validation, permission, or preservation of existing work is insufficient.

Do not present imported, summarized, compressed, assumed, or loose-doc context as canonical repo truth unless the owning surface has reviewed and promoted it.

### Stop Conditions

Stop and report `BLOCKED` when:

- owner, scope, authority, source, or validation is unclear;
- root, portfolio, shared-core, and repo-local guidance conflict;
- a loose doc, chat summary, archive, or imported source would drive implementation without owning-surface approval;
- required checks or evidence cannot prove the claim;
- an edit would overwrite user or agent work that was not created by the current task.
<!-- workspace-root-sync:agents:end -->
