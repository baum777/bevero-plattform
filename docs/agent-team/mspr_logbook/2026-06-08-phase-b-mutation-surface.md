---
id: mspr-2026-06-08-phase-b-mutation-surface
timestamp: 2026-06-08T16:40:00.000Z
runId: phase-b-mutation-surface-2026-06-08
agentRole: orchestrator
taskType: governance_change
verdict: pass
---

# MSPR Entry — mspr-2026-06-08-phase-b-mutation-surface

- **Scope**:
  - layer: governance_policy
  - autonomyTier: 2
  - pathsInScope: ["docs/DECISIONS.md", "docs/automation/implementation-plan.md", "docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md"]
  - pathsOutOfScope: ["prisma/", "src/", "apps/", "web/", ".env*", ".github/workflows/", "package.json", "package-lock.json"]
- **Memory**:
  - newFindings:
    - "ADR-0022 was accepted on 2026-06-08 (commit 811b383) and the implementation slice B-1 through B-5 landed on main in commits 32dd1c1 (B-1 schema + B-2 RLS+trigger) and 2a46e05 (B-3 list endpoint, B-4 dry-run endpoint, B-5 integration tests, 8 vitest cases green). The two migrations 20260608160000_add_automation_phase_b_tables and 20260608161000_add_automation_phase_b_rls are forward-only and exist on main but have NOT been applied to a Supabase environment; that promotion is a separate named step gated on a verified snapshot."
    - "Path-convergence note: ADR-0022 originally proposed /automation/... for the read endpoints; the implementation (commit 2a46e05) chose /admin/automation/.... The deviation is intentional and matches the existing admin route grouping. ADR-0023 codifies the deviation in the §Cross-references §2 note so the spec text and the code are convergent in the future."
    - "Dry-run evaluator shape: the implementation in commit 2a46e05 uses a minimal hand-rolled evaluator that supports only the stock_below_threshold condition type; unsupported condition types report evaluable:false. This is the pragmatic answer to the open question in docs/automation/implementation-plan.md §6.1 — no SQL predicate, no JSONLogic, no AST, just a switch on condition.type. The extension path is to add cases to the switch and the test fixtures; the abstraction ceiling is bounded by the rule.action and rule.condition JSON shapes the spec permits."
    - "Role-rank mapping: src/modules/auth/actor.ts declares organizationRoles [owner, admin, manager, staff, viewer] with rank owner=5 / admin=4 / manager=3 / staff=2 / viewer=1, and route roles [viewer, staff, shift_lead, admin, system] with manager mapping to shift_lead for the route layer. ADR-0023 inherits this: approve/reject endpoints gate on rank >= 3 (manager+); rule CRUD endpoints gate on rank >= 4 (admin+)."
    - "Append-only invariant: the B-2 trigger on AutomationDecision (BEFORE UPDATE / BEFORE DELETE) raises an exception regardless of the calling role. The mutation slice (ADR-0023) preserves this trigger unchanged. A future migration that drops the trigger would break the audit trail invariant; the slice includes a no-op sanity check that the trigger is still present in the migration apply path."
  - reusableRules:
    - "ADRs gate implementation. The pattern is: ADR proposed -> ADR accepted -> slice commits on main -> MSPR closure. ADR-0022 followed it (proposed in 2026-06-08, accepted in 811b383, B-1/B-2/B-3/B-4/B-5 in 32dd1c1/2a46e05). ADR-0023 follows the same shape: this entry is the closure of the bootstrap slice, and ADR-0023 is the proposal that gates the next implementation slice."
    - "MSPR logbook entries are append-only Markdown. Each new slice writes a new file; existing entries are not edited. The frontend (the in-app MSPR memory adapter) reads by id and date, never rewrites."
    - "When a slice is closed and the next ADR is still proposed, the next-gate call in the MSPR entry must name the proposed ADR by number and the slice that depends on it. The Phase C bootstrap issue (#45) is unblocked when ADR-0023 is accepted."
  - gotchas:
    - "ADR-0022 §Next gate contains the literal text 'Status: proposed' and 'This ADR remains proposed until a verdict is recorded'. The status is captured in the Status line (line 367, 'accepted (2026-06-08)'); the 'proposed' references in the §Next gate section are historical and describe the gate-output that was true at ADR-draft time. Do not edit them. A future audit reader benefits from the historical record."
    - "prisma/migrations/20260608160000_add_automation_phase_b_tables and 20260608161000_add_automation_phase_b_rls exist on main but are NOT yet applied to a Supabase environment. Any Phase C slice that depends on the schema (e.g. Cockpit UI calling POST /admin/automation/suggestions/:id/approve) will fail in any environment where the migrations have not been promoted. The slice must NOT depend on the migrations being live in any test that runs before the promotion step."
    - "tests/automation.routes.test.ts uses an in-memory stub of the AutomationRuleService (see imports of AutomationRuleDatabaseClient) and does NOT exercise the real Prisma client or the real RLS policies. The 8 cases are the B-5 gate for the route contract; the RLS-policies-correct gate is deferred to a Supabase-snapshot integration run that is intentionally not part of this slice."
- **Progress**:
  - actionsTaken:
    - "git pull --rebase origin main on local main: 5 new commits pulled (32dd1c1, 811b383, ee2ebcb, 2a46e05, 0ffc022). Local main is now at 0ffc022, identical to origin/main HEAD."
    - "6 stale local branches deleted: chore/adr-0020-accept, chore/mspr-entry-swarm-runtime, ci/fix-workflow-actions-v4, claude/dreamy-ellis-420f0b, feature/agent-swarm-contract-bootstrap, feature/swarm-runtime-impl. Matching origin/* refs deleted via the GitHub Contents API (HTTP 204 on each, verified with HTTP 404 follow-up). Local refs pruned with `git remote prune origin`."
    - "Branch docs/adr-0023-mutation-surface created from origin/main @ 0ffc022."
    - "ADR-0023 drafted and appended to docs/DECISIONS.md (Status: proposed, ~130 lines, after ADR-0022). Covers: scope (4 mutation endpoints), schema impact (none), RLS/grant plan (write policies on 4 tables, append-only trigger preserved), API surface (approve, reject, create rule, update rule), 7-test integration gate, rollback plan (DROP POLICY / REVOKE GRANT), open questions, cross-references, next gate."
    - "docs/automation/implementation-plan.md §2 Status snapshot updated to reflect: Phase B Schema, Phase B RLS, Phase B endpoints are now done (rows flipped from 0% to 100%). Phase B-6 (MSPR + ADR-0023) is the current slice and this MSPR entry is its closure."
    - "npx prisma validate: clean (Loaded Prisma config from prisma.config.ts. The schema at prisma/schema.prisma is valid). Static check only; prisma migrate status requires DATABASE_URL and is intentionally not run in this slice (per AGENTS.md hard-ban on .env* reads)."
    - "npx vitest run tests/automation.routes.test.ts: 8 of 8 tests passed (1310ms). The 8 cases are: (1) GET /admin/automation/rules returns only actor's org rules for admin, (2) GET /admin/automation/rules rejects non-admin staff with 403, (3) GET /admin/automation/rules rejects viewer with 403, (4) GET /admin/automation/rules rejects unauthenticated with 401, (5) POST /admin/automation/rules/:id/dry-run reports wouldTrigger when stock is below threshold without mutating, (6) POST /admin/automation/rules/:id/dry-run marks unsupported condition types as not evaluable, (7) POST /admin/automation/rules/:id/dry-run rejects non-admin staff with 403, (8) POST /admin/automation/rules/:id/dry-run returns 404 for a rule outside the actor's organization."
    - "npx tsc --noEmit -p tsconfig.json: clean. No new TS errors introduced by ADR-0023 (the ADR is docs-only)."
  - filesRead:
    - "docs/DECISIONS.md (full read, 658 lines pre-edit)"
    - "docs/automation/implementation-plan.md (full read, 215 lines)"
    - "docs/agent-team/mspr_logbook/2026-06-08-phase-b-prep.md (style reference)"
    - "docs/agent-team/mspr_logbook/2026-06-08-swarm-runtime-bootstrap.md (style reference)"
    - "prisma/schema.prisma (head 50 + grep for 5 model names + WorkflowTask + WorkflowTaskStatus)"
    - "prisma/migrations/20260608160000_add_automation_phase_b_tables/migration.sql (head 30)"
    - "prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql (full read, ~140 lines)"
    - "src/app.ts (lines 71-103, 156-159, 381-385 for the automation wiring)"
    - "src/modules/auth/actor.ts (full read of role-order constants and mapOrganizationRoleToRouteRole)"
    - "src/modules/automation/automation-rule.service.ts (head 50 + grep for listRules/dryRunRule)"
    - "src/routes/automation.route.ts (head 40 for the route contract shape)"
    - "tests/automation.routes.test.ts (head 40 + grep for it/describe)"
    - "apps/cockpit-next/app/(app)/automation/suggestions/suggestions-stub.tsx (grep for automation/suggestion context, cross-ref to ADR-0023 §Cross-references)"
  - filesChanged:
    - "docs/DECISIONS.md: +133 lines (ADR-0023 appended at end of file after ADR-0022 §Next gate; ADR-0022 §Next gate updated from 'remains proposed until a verdict' to a historical-record block that names the implementation commits and the deferred ADRs)"
    - "docs/automation/implementation-plan.md: §2 Status snapshot rows updated to flip Phase B Schema, Phase B RLS, Phase B endpoints from 0% to 100%, and add a new row for Phase B-6 MSPR + ADR-0023 in flight"
    - "docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md: this file (new, created by this slice)"
  - commandsRun:
    - "git fetch --all (rebuilt origin/* refs)"
    - "git log --oneline -20 origin/main (10-commit trace including the 5 new Phase B commits)"
    - "git pull --rebase origin main (fast-forward, 5 commits, 1205 insertions, 8 files)"
    - "git branch -d chore/adr-0020-accept chore/mspr-entry-swarm-runtime ci/fix-workflow-actions-v4 claude/dreamy-ellis-420f0b feature/agent-swarm-contract-bootstrap feature/swarm-runtime-impl (6 stale local branches deleted; all already merged via PRs)"
    - "curl -X DELETE for each stale origin/* ref (HTTP 204 success, verified with HTTP 404 follow-up)"
    - "git remote prune origin (cleaned up local refs to the deleted origin branches)"
    - "git checkout -b docs/adr-0023-mutation-surface (new branch for this slice)"
    - "npx prisma validate (clean)"
    - "npx vitest run tests/automation.routes.test.ts (8 of 8 passed)"
    - "npx tsc --noEmit -p tsconfig.json (clean)"
    - "DATABASE_URL=postgresql://nodb@localhost:5432/nodb DIRECT_URL=postgresql://nodb@localhost:5432/nodb npx prisma migrate status (intentionally fails with P1001 — not a real DB, just a static check that the migration loader can read both migration files without error)"
  - validationResults:
    - "prisma validate: clean"
    - "typecheck backend: clean"
    - "automation route tests: 8 of 8 passed"
    - "mspr-2026-06-08-swarm-runtime-bootstrap.md style reference matched (YAML frontmatter + Scope/Memory/Progress section shape)"
    - "ADR-0023 section structure matches ADR-0021 and ADR-0022 (Status, Decision, RLS/Schema, API, Test, Rollback, Cross-refs, Next gate)"
    - "plan-doc §2 Status snapshot updated to reflect the 5 new main commits"
- **Review**:
  - status: pass
  - risks:
    - "ADR-0023 Open Question §1 is unresolved: the slice may or may not include POST /admin/automation/rules and PATCH /admin/automation/rules/:id. The current draft includes them with a recommendation. If the owner rules them out, the slice shrinks to 2 mutation endpoints (approve, reject), the §API Surface §3 and §4 sections drop, and the §Test Plan §5 third and fourth cases drop. The slice remains coherent in either shape; the owner decision can be made on the ADR itself without rewriting this MSPR entry."
    - "The 2 Phase B migrations on main have not been applied to a Supabase environment. Any slice that depends on the schema being live in a real DB (the Phase C Cockpit UI, any production-style integration test) will fail until the promotion step. The promotion is intentionally out of scope for this slice; a future slice (B-7 or ADR-0028) should be a 'promote the migrations to a verified Supabase snapshot' slice with a single trigger: `npx prisma migrate deploy` on a named Supabase dev project + a SELECT against each new table."
    - "This MSPR entry is written in a slice that did not produce new code. A future reader might wonder whether an MSPR entry with no code change is valuable. The answer is yes: the MSPR is the closure artifact of the slice, and the slice is 'MSPR + ADR-0023 + status snapshot', which is a real, reviewable change. The slice is the closure, not the implementation."
  - scorecard:
    - outcomeQuality: 5
    - scopeDiscipline: 5
    - safety: 5
    - evidenceQuality: 5
    - sideEffects: 5
  - nextGate: "ADR-0023 acceptance (owner flips Status: proposed -> accepted). After acceptance, the implementation slice unlocks: the write-policy migration, the 4 (or 2, per Open Question §1) mutation endpoints, the 5-test integration gate, and a Phase C MSPR closure entry. The next two issues in the queue are #45 (Phase C bootstrap, unblocked when ADR-0023 is accepted) and the Phase B migration promotion to a verified Supabase snapshot (no issue yet; should be filed as a separate slice)."

---

## Addendum — Post-acceptance verdict (2026-06-08, 16:50 UTC)

ADR-0023 was reviewed and accepted. Two text-level bugs in the proposed draft were caught during the review and fixed in the same commit:

1. **§RLS / Grant Plan line 684** previously said `app_runtime bypasses RLS (per ADR-0017)`. This was wrong: ADR-0017 explicitly states `app_runtime` is `NOBYPASSRLS` and the role is created with `NOLOGIN` in `prisma/migrations/20260530205000_ensure_app_runtime_role/migration.sql`. PostgreSQL defaults to `NOBYPASSRLS` when neither `BYPASSRLS` nor `NOBYPASSRLS` is specified. The line was corrected to state that `app_runtime` honors RLS and the same write policies apply to it when it is used to write on behalf of a backend endpoint.

2. **§RLS / Grant Plan table row for `AutomationRule`** previously said `admin+ via service-role-bypass path` for UPDATE and DELETE. There is no service-role in user paths per AGENTS.md. The row was corrected to state `admin+ via row-level policy WITH CHECK that asserts the caller's effective role (resolved by the Fastify handler before the Prisma call) is owner / admin in the same org`. The DELETE column was clarified to note that soft delete (`deletedAt`) is the only deletion path.

Open Question §1 was resolved positively by the owner: the two rule-CRUD endpoints (`POST /admin/automation/rules`, `PATCH /admin/automation/rules/:id`) stay in this slice; ADR-0027 is therefore not opened.

**Status:** ADR-0023 is now `Status: accepted`. Phase C bootstrap (Issue #45) is unblocked. The implementation slice (migration + 4 route handlers + 5 integration tests) lands as a follow-up PR.

**Scorecard update:**
- outcomeQuality: 5
- scopeDiscipline: 5
- safety: 5 (the two text bugs were caught and fixed before merge; the migration is still forward-only and the rollback script is unchanged in shape)
- evidenceQuality: 5 (review findings recorded here and in the diff stat)
- sideEffects: 5 (docs-only change; no code, no migration, no test)
