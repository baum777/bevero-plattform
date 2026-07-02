# Intent Memory — Work Documentation CI Gate

- id: 2026-06-20-work-documentation-ci-gate
- timestamp: 2026-06-20T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-work-documentation-ci-gate.md`
- status: reviewed

## Core intention

Move the work-slice documentation rule from pure convention to lightweight machine enforcement. The rule should be checkable by anyone (locally and in CI) without requiring trust in agent memory or contributor diligence alone.

## Logic followed

The gate is deliberately kept minimal: it checks presence of documentation entries and absence of obvious secrets. Quality review — whether entries are meaningful, honest, and complete — remains a human and Reviewer responsibility. Overloading a CI script with content-quality checks would produce fragile heuristics and false positives.

## Design assumptions

- Contributors will write substantive entries if the format is clear and the gate only blocks on absence, not on content.
- A parallel CI job (separate from `ci.yml`) is the right placement — it does not slow down the main typecheck/test pipeline.
- The `BASE_SHA` env var pattern (standard in GitHub Actions for PR comparisons) is the right interface for CI; local fallback via `git status` is sufficient for daily use.

## Tradeoffs

- Accepted:
  - Presence check only, not content quality. Keeps the gate fast and non-fragile.
  - Secret detection via patterns, not AST or structured parsing. Good enough for documentation files; too coarse for source code (which this script does not scan).
  - A contributor can bypass the gate by writing an empty MSPR entry. Acceptable — this is a cultural norm enforced by Reviewer, not a security control.
- Rejected:
  - Blocking the existing `ci.yml` job on documentation check: adds latency to every push and conflates two concerns.
  - Content-quality scoring in CI: would require LLM-in-the-loop or complex heuristics; out of scope.

## Durable memory

- Secret patterns for DATABASE_URL must allow dummy local URLs (`postgresql://user@localhost`) used in Prisma static migration checks. The pattern `://user:password@non-localhost` is the correct boundary.
- The `check:work-docs` npm script and `scripts/check-work-documentation.mjs` are the canonical local check command for this rule. Keep them in sync with the rule itself.

## Do not reuse blindly

- This script is not a security scanner. Do not extend it to scan application source code for secrets — that is a different tool (e.g., `git-secrets`, `trufflehog`).
- The presence-only check works because the repo has an active Reviewer role. In a repo with no review process, presence checks alone are insufficient.

## Relation to Rauschenberger OS / Bevero

- location logic: repo-wide governance; no location-specific logic.
- role/approval logic: L1 (docs/scripts only; no app code, no production impact).
- inventory/procurement/shift-planning logic: not affected.
- external-system boundary: GitHub Actions reads the repo and runs the check; no external API calls.

## Next logic gate

Optional: require that PR descriptions contain the MSPR and Intent entry paths as named strings. This would prevent reuse of old entries as a workaround. Only worth adding if contributors start gaming the presence check.
