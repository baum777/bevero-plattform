# Intent Memory — Rauschenberger OS Repo Context Refresh

- id: 2026-06-29-repo-context-refresh
- timestamp: 2026-06-29T07:09:34+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-repo-context-refresh.md`
- status: reviewed

## Core intention

Establish verified repo truth in `context/` so that stale 2026-06-18/19 state stops misdirecting OS sessions, and surface the governance drift discovered during the audit as explicit, actionable open loops rather than silent assumptions.

## Logic followed

- Orientierung vor Handlung: refresh context before touching code, apps, or deployment.
- Verify before claim: every metric written into `context/` is backed by a named command; unverifiable historical claims are downgraded or removed, not repeated.
- Label provenance: keep `Observed` vs `Inferred` separate, and never present a doc metric as fact without a reproducible source.
- Resolve, don't re-log: the 2026-06-28 `rauschenberger-os.vercel.app` 404 was explained via the deployment SOT instead of opened as a new mystery.
- Scope discipline: document hygiene problems, do not fix them inside an orientation slice.

## Design assumptions

- `rg`/`glob`/`git` over the working tree reflect committed-plus-working state accurately for counting purposes.
- Deploy live status cannot be verified without Vercel API access and was therefore explicitly marked unverified, not guessed.
- The two `context/` files are L1 self-review working surfaces, not governance-truth files (`IDENTITY.md`/`OS.md` remain authoritative).

## Tradeoffs

- Accepted:
  - Documenting hygiene findings instead of fixing them, to keep the slice small and inside the chosen task ("refresh context").
  - Flagging the 101-vs-124 route discrepancy rather than silently picking one number.
- Rejected:
  - Quoting the README "21.169 test lines" figure — no test files exist locally, so the number is not reproducible.
  - Editing `IDENTITY.md`, `OS.md`, `AGENTS.md`, `governance/*`, or any app code — out of scope and above this slice's autonomy tier.

## Durable memory

- Verified baseline (2026-06-29): 21 modules · 89 Prisma models · 52 enums · 65 migrations · 101 route handlers (`app.method(` pattern).
- Root must stay free of `.vercel/project.json`; if it reappears, a stray `rauschenberger-os` project was re-created and the SOT is being violated.
- `rauschenberger-os.vercel.app` is NOT a canonical alias — canonical targets are `bevero-api`, `bevero-ui`, and `landing` only.
- KORREKTUR: Tests sind vorhanden (85 `*.test.ts`, 22.842 Zeilen, `apps/api/tests/`). Erste glob-basierte Behauptung "keine Tests" war ein false-negative des glob-Tools — in diesem Repo `find`/`git ls-tree` für Datei-Behauptungen nutzen, nicht `glob`. Suite-Lauf (grün/rot) bleibt offen.

## Do not reuse blindly

- The 101 route count is bound to the `app.(get|post|put|patch|delete)(` registration pattern; a different routing style changes it. Always re-state the pattern.
- Module/model/migration counts drift fast (78→89 models in ~10 days); re-verify before quoting in a new session.
- The "no test files" finding reflects this working tree at this commit; do not generalize to "the repo has no tests" without checking history/branches.

## Relation to Rauschenberger OS / Bevero

- location logic: Bevero brands/locations table unchanged (Motorworld Inn Böblingen pilot; CUBE planned).
- role/approval logic: `approval-matrix.md` defines role `operator` but names no person — the L3 pilot gate remains unstaffed, which is the real blocker for the采购 pilot.
- inventory/procurement/shift-planning logic: not touched; automation models exist in schema while the Phase A spec still calls them proposed — a spec/schema reconciliation is owed.
- external-system boundary: Vercel deployment is governed by `docs/deployment-vercel.md` (three canonical projects only); FoodNotify / Dynamics / DATEV remain leading systems and were not approached.

## Next logic gate

What is the smallest safe hygiene slice, and does removing the local `.vercel/` (plus deleting the stray Vercel project) precede or follow staffing the L3 operator role for the采购 pilot?
