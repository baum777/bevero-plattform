# Phase F LLM Synthesize — Gate-Prep Boundary Addendum

> **Status:** docs-only gate-prep. **Not a spec amendment; not a binding decision.**
> This file is a small, additive boundary addendum that names the Phase E →
> Phase F boundary crisply, prior to the ADR-0025.f proposal in
> `docs/DECISIONS.md` being reviewed and (possibly) accepted. The binding spec
> remains `docs/automation/semi-automated-operations-layer.md`. This addendum
> does NOT edit that file; it does NOT override any existing text; it is the
> durable cross-reference the orchestrator and the future Implementer use to
> prove the boundary was named *before* any code or wiring was written.

---

## 1. Why this file exists

Phase E (Shift Handover Drafts) is functionally complete on disk, live in
Supabase `czinchfegtglmrloxlmh`, and smoke-validated (see
`docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md`,
`verdict: accepted`). The current spec's §Phase F block
(`docs/automation/semi-automated-operations-layer.md` lines 1409-1420) is
intentionally narrow but has two gaps relative to the implementer's gate-prep
mandate:

1. It names a provider ("Claude API") which is not authoritative until a
   budget approval picks a provider or providers. Provider choice is a
   business decision, not a spec decision; the spec must remain
   provider-neutral.
2. It says "Graceful fallback if LLM unavailable" which reads as
   best-effort. Per the spec's own §Agent / LLM Boundary (line 461) and the
   binding AGENTS.md hard guardrails ("no LLM-driven approval, ordering, or
   stock mutation"), the synthesize endpoint must be **fail-closed** until
   both the budget is approved and the runtime is wired with explicit
   config. A "graceful fallback" can mask a misconfigured production and
   silently spend budget; fail-closed is the safe default.

This addendum names the boundary crisply. It does not replace the spec; it
is the cross-reference the ADR-0025.f proposal and the future Implementer
slice use to prove the gate was documented.

## 2. Phase E → Phase F boundary (the hard line)

Phase E is **closed for the current scope** (`verdict: accepted` on the
smoke MSPR; ADR-0025 is `Status: accepted`; the live-DB promotion is
complete per `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`).
The next code-bearing slice is **gated on three preconditions, all of which
must hold before any Phase F implementation begins**:

### 2.1 LLM budget approval

A named LLM budget envelope (monthly cap, per-call cap, per-org cap) must
be approved by the project owner. The approval is recorded in
`docs/DECISIONS.md` as an acceptance-time addendum to ADR-0025.f (or as a
separate budget ADR if the project prefers). The budget envelope is the
runtime gate: when the cap is hit, the synthesize endpoint returns 503
with an explicit "budget exhausted" code (not "feature off" or
"gracefully unavailable").

### 2.2 Spec text evolution

`docs/automation/semi-automated-operations-layer.md` §Phase F must be
amended to:

- (a) Be **provider-neutral** (no "Claude API" reference; the spec names
  the contract, not the vendor).
- (b) Be **fail-closed** (return 503 when budget is exhausted, when the
  LLM provider is unreachable, when the prompt is rejected, or when the
  runtime is not configured; never silently fall back to a hand-written
  template).
- (c) Be **audit-first** (every call logs `requestId`, `draftId`,
  `orgId`, `actorId`, sanitized input hash, provider, model, sanitized
  output, latency, cost in cents, and the result code; logs are append-only
  and not user-visible; per ADR-0021 "no PII in logs").
- (d) Be **cacheable** (the same `(draftId, draft-revision)` pair must
  return the same `synthesizedHandover` until the user explicitly requests
  a refresh; the cache is org-scoped).
- (e) Be **opt-in per call** (the synthesize endpoint is a POST that the
  user explicitly invokes; there is no automatic synthesis on confirm).

The spec amendment is a separate docs-only slice gated on ADR-0025.f
acceptance (it is the spec-evolution evidence the ADR cites in §Cross-
references).

### 2.3 ADR-0025.f acceptance

`docs/DECISIONS.md` ADR-0025.f must be proposed, reviewed by the project
owner, and accepted before any Phase F code-bearing slice begins. The
proposal text is in this commit's `docs/DECISIONS.md` append; the
acceptance addendum will flip the YAML frontmatter `verdict: proposed` to
`verdict: accepted` and bind the spec-evolution text + the budget envelope
+ the runtime choice.

## 3. What Phase F introduces (spec-level only — no runtime here)

Phase F introduces a single new endpoint:

- `POST /shift-handover/draft/:id/synthesize` (manager+ or shift_lead; the
  actor is the same person who can confirm the draft; the synthesize call
  requires an unconfirmed draft owned by the actor; the result is stored
  in `ShiftHandoverDraft.synthesizedHandover` + `synthesizedAt`).

The endpoint's **input** is the current draft's `summary`, `openItems`,
`alerts`, and `notes` (read-only from the actor's perspective; the endpoint
does not mutate any other field).

The endpoint's **output** is `synthesizedHandover` (a `string`, max 4000
chars, sanitized) and `synthesizedAt` (a `Date`). The output is cached
in the draft row.

The endpoint is **not** a mutation of state beyond the two fields named
above. It is **not** an approval; it is **not** a confirmation; it is
**not** a writeback to FoodNotify / Dynamics 365 / DATEV; it is **not** a
stock-mutation trigger; it is **not** an offline action. It is a
text-generation helper that the user invokes, reviews, and either
discards or saves into the draft for the next shift.

## 4. What this docs-only slice does NOT introduce

This slice introduces zero runtime, zero env variables, zero secrets, zero
provider SDK calls, zero prompt templates, zero test fixtures, zero
endpoints, zero migrations, zero Cockpit changes. Specifically:

- **No** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `BEDROCK_*`, or any other
  provider credential. The spec addendum names the audit fields but does
  not bind a specific secret name; that is the runtime slice's job.
- **No** provider SDK dependency (`openai`, `@anthropic-ai/sdk`, `langchain`,
  etc.) added to `package.json` or `package-lock.json`. The spec addendum
  names the contract; the runtime slice picks the implementation.
- **No** `src/modules/llm/`, `src/lib/llm-runtime.ts`, or any new source
  file. The endpoint shape is named at the spec level only.
- **No** new Prisma migration. The `ShiftHandoverDraft.synthesizedHandover`
  and `ShiftHandoverDraft.synthesizedAt` columns are already present
  (added by the B-1 migration `20260608160000_add_automation_phase_b_tables`).
  Phase F needs no schema change; it only writes to two existing nullable
  columns.
- **No** Cockpit page change. The Cockpit `/shift-handover` localStorage
  page and the new draft page continue to coexist until E-3-future
  decisions per ADR-0025 OQ §5. Neither page is modified by this slice.
- **No** `.env*` file read or write. Per AGENTS.md hard guardrails.
- **No** `npx prisma migrate` runs. Per AGENTS.md hard guardrails.
- **No** service-role credentials in any user-facing path. The synthesize
  endpoint, when implemented, will follow the same actor-from-headers +
  org-id-header pattern as the existing 3 endpoints.

## 5. Coexistence note (carried from ADR-0025 OQ §5)

The Cockpit `/shift-handover` localStorage page (commit `ccf0f50`) and
the new backend-backed draft page continue to coexist. The synthesize
endpoint, when implemented, will be a thin client of the existing draft
API and will be exposed on the new draft page (the localStorage page
does not call the backend and will not be modified). E-3 (Cockpit
integration) is the future slice that decides whether to replace, wrap,
or leave the localStorage page; that decision is orthogonal to Phase F.

## 6. Cross-references

- `docs/automation/semi-automated-operations-layer.md` — the binding spec
  (unchanged by this slice; §Phase F lines 1409-1420 are the spec's
  current text).
- `docs/automation/implementation-plan.md` — §4 Phase F (lines 142-143 in
  the current draft; out-of-scope dirty state under ADR-0029-C.2).
- `docs/DECISIONS.md` — ADR-0025.f (proposed in this commit, appended
  at the end of the file).
- `docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md`
  — Phase E is functionally complete; Phase F is the next gate per the
  §nextGate block.
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`
  — Phase E is promoted to Supabase `czinchfegtglmrloxlmh` (12/12
  verification PASS); Phase F is the next gate.
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` —
  the original Phase E promotion-prep MSPR; §nextGate points to Phase F.
- `AGENTS.md` — the hard guardrails: "no LLM-driven approval, ordering,
  or stock mutation. LLMs are optional, read-only text/classification
  helpers (handover synthesis, note classification, rule
  explanations)." This slice upholds that guardrail by introducing
  zero LLM code; it only names the spec-level boundary.
