# MSPR Entry — Rauschenberger OS Repo Context Refresh

- id: 2026-06-29-repo-context-refresh
- timestamp: 2026-06-29T07:09:34+02:00
- runId: baumos-2026-06-29-repo-context-refresh
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - `context/current-state.md`
  - `context/priorities.md`
  - `docs/agent-team/mspr_logbook/2026-06-29-repo-context-refresh.md`
  - `docs/agent-team/intent_logbook/2026-06-29-repo-context-refresh.md`
- pathsOutOfScope:
  - `IDENTITY.md`, `OS.md`, `AGENTS.md` (L3/L4 / role surfaces)
  - `apps/*`, `prisma/*`, `.github/*`, `.env*` (no code/runtime/config)
  - `governance/*` (read only, not edited)
  - Vercel project state (no API access; deletion not performed)
- autonomyTier: 1

## Code Change Context

- Trigger/request: `/start repo rauschenberger-os` → user selected "repo kontext refreshen". Refresh the two `context/` files to verified truth before any further OS work.
- Why the change was needed: `context/current-state.md` (2026-06-19) and `context/priorities.md` (2026-06-18) were ~10 days stale; module/model/migration counts in README and current-state disagreed; an unresolved production-alias 404 loop from 2026-06-28 needed placement.
- Files read:
  - `IDENTITY.md`, `OS.md`, `AGENTS.md`, `README.md`, `MIGRATION.md`
  - `context/current-state.md`, `context/priorities.md`
  - `governance/approval-matrix.md`
  - `docs/deployment-vercel.md`
  - `apps/api/package.json`, `.gitignore`, `.vercel/project.json`, `.vercel/README.txt`
  - `apps/api/AGENTS.md` (automation spec)
  - `docs/agent-team/work_documentation_rule.md` + both templates
- Files changed:
  - `context/current-state.md` — Kennzahlen verified table, new Housekeeping block, spec tension, resolved 404 loop
  - `context/priorities.md` — updated focus, new Repo-Hygiene list, milestones
  - `docs/agent-team/mspr_logbook/2026-06-29-repo-context-refresh.md` (this file)
  - `docs/agent-team/intent_logbook/2026-06-29-repo-context-refresh.md`
- Commands run:
  - `ls apps/api/src/modules/` → pass (21 modules)
  - `grep -c "^model " apps/api/prisma/schema.prisma` → pass (89)
  - `grep -c "^enum " apps/api/prisma/schema.prisma` → pass (52)
  - `ls apps/api/prisma/migrations/ | wc -l` → pass (65)
  - `rg --no-filename '\bapp\.(get|post|put|patch|delete)\(' apps/api/src | wc -l` → pass (101)
  - `find apps/api/tests -name '*.test.ts'` → 85 files, 22.842 Zeilen (KORREKTUR: früherer `glob apps/api/**/*.test.ts` lieferte fälschlich "empty" — glob false-negative; `find`/`git ls-tree` autoritativ)
  - `git status --short --branch`, `git branch -r`, `git log --oneline -5` → pass (main clean except 3 untracked .zip)
- Validation results:
  - Numbers read back into `current-state.md` match the command outputs exactly (21 / 89 / 52 / 65 / 101).
  - Both refreshed files re-read after write; internal cross-references consistent.
  - Route count 101 vs README 124 explicitly flagged as methodological discrepancy, not silently overwritten.
  - Test-Suiten verifiziert: 85 `*.test.ts` / 22.842 Zeilen unter `apps/api/tests/`, `vitest.config.ts` vorhanden (README-Wert 21.169 leicht veraltet). Suite-Lauf (grün/rot) bleibt offen.

## Memory

- newFindings:
  - Root `.vercel/project.json` re-exists, linking a NEW stray project `rauschenberger-os` (`prj_Z60vyyeyLELjW90udDE9Zh7KHfY`) — directly contradicting `docs/deployment-vercel.md` (2026-06-18 SOT: root must have no `.vercel/project.json`). Different from the stale project id already listed for deletion in the SOT.
  - This stray root project owns the `rauschenberger-os.vercel.app` alias → resolves the 2026-06-28 404 loop (it was never canonical and should not exist).
  - `.vercel/` is correctly gitignored (`.gitignore:23`), so the conflict is local hygiene + a stray project in the Vercel account, not a committed secret leak.
  - KORREKTUR: Vitest-Tests sind vorhanden — 85 `*.test.ts` / 22.842 Zeilen unter `apps/api/tests/`, `vitest.config.ts` existiert. Erster glob-Check war ein false-negative; in diesem Repo ist `find`/`git ls-tree` für Datei-Behauptungen autoritativ, glob nicht.
  - Automation models (`AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`) already exist in `schema.prisma`, while `apps/api/AGENTS.md` still labels them "proposed, not yet migrated".
  - ~30 remote branches, dual `origin/main` + `origin/master`.
- reusableRules:
  - Before quoting any repo metric in OS context, verify with `rg`/`glob`; do not propagate README numbers unchecked.
  - Cross-reference deployment mysteries against `docs/deployment-vercel.md` before logging a new "404" open loop.
- gotchas:
  - Route count is pattern-sensitive: `app.(get|post|put|patch|delete)(` yields 101; a different registration style (e.g. `fastify.route`) would change the number. State the pattern when quoting.
  - glob-Tool lieferte für `apps/api/tests` false-negatives (behauptete "keine Tests"); `find`/`git ls-tree` bestätigen 85 Dateien. Bei Dateizähl-Behauptungen in diesem Repo `find`/`git ls-tree` nutzen, nicht `glob`.

## Review

- status: pass
- risks:
  - Production-alias live status for `bevero-api` + `bevero-ui` NOT verified this session (no Vercel API access); SOT said `target: null` on 2026-06-18. Re-verify before any deploy claim.
  - Hygiene items (root `.vercel/`, stale branches, stray Vercel project, missing tests) are documented but NOT fixed — they remain open and could block L2+ work.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Decide hygiene slice ordering. Smallest safe step — remove local `.vercel/` (requires operator OK, file deletion per safety rules); Vercel project deletion is L3 (operator action in dashboard).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-repo-context-refresh.md`
