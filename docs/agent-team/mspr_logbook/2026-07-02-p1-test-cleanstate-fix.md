# MSPR — P1 test cleanstate fix

- date: 2026-07-02
- slice: p1-test-cleanstate-fix
- risk: L1
- scope: `apps/api/tests/mobile-nav-quick-notes-contract.test.ts`, `apps/cockpit/app/(app)/movements/movements-client.tsx`, `docs/productization/spec-pack/`, report output

## Request / context

Resolve the reported red mobile navigation / quick-notes contract test, inspect the untracked spec-pack path, avoid DB/RLS/deploy work, and produce `p1-test-cleanstate-fix-report.md`.

## Files read

- `AGENTS.md`
- `README.md`
- `docs/agent-team/work_documentation_rule.md`
- `apps/api/package.json`
- `apps/api/tests/mobile-nav-quick-notes-contract.test.ts`
- `apps/cockpit/app/(app)/movements/movements-client.tsx`
- `p1-test-cleanstate-fix-report.md`

## Files changed

- `p1-test-cleanstate-fix-report.md`
- `docs/agent-team/mspr_logbook/2026-07-02-p1-test-cleanstate-fix.md`
- `docs/agent-team/intent_logbook/2026-07-02-p1-test-cleanstate-fix.md`

No product or test source file was changed.

## Commands run

```bash
git status --short
git diff -- apps/api/tests/mobile-nav-quick-notes-contract.test.ts apps/cockpit/app/'(app)'/movements/movements-client.tsx
git ls-files apps/api/tests/mobile-nav-quick-notes-contract.test.ts apps/cockpit/app/'(app)'/movements/movements-client.tsx
find docs/productization/spec-pack -maxdepth 2 -type f
cd apps/api && npm run test -- --run tests/mobile-nav-quick-notes-contract.test.ts
rg -n "useSearchParams|searchParams\??\s*\.\s*get\s*\(\s*[\"']type[\"']\s*\)|isMovementType|setMovementType" ...
```

## Validation result

Targeted Vitest passed:

```text
Test Files  1 passed (1)
Tests  11 passed (11)
```

## Risks / review verdict

- Verdict: pass for targeted P1 scope.
- Risk: `docs/productization/spec-pack/` remains untracked and needs owner decision.
- No `.env`, DB, migration, RLS, or deployment action was performed.

## Next gate

Owner decides whether and how `docs/productization/spec-pack/` should be tracked.
