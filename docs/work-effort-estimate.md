# Work Effort Estimate

Status: partial, evidence-based rough estimate
Repo: `/home/baum/Schreibtisch/workspace/main_projects/warenwirtschaft_gastronovi-workflow`
Observed range: `2026-05-25 20:33 +02:00` to `2026-06-01 07:21 +02:00`

## Result

Estimated work performed: **35-50 hours**.

Conservative estimate from commit time windows only: **28-43 hours**.

The wider working estimate accounts for effort that is not directly visible in Git:
debugging between commits, test runs, smoke checks, browser/runtime validation,
merge conflict handling, review cycles, and discarded local attempts.

## Evidence Base

Commands used:

```bash
git status --short
git log --all --date=iso-strict --pretty=format:'%H%x09%ad%x09%an%x09%s'
git log --all --numstat --date=iso-strict --pretty=format:'COMMIT%x09%H%x09%ad%x09%an%x09%s'
git diff --stat
git diff --numstat
```

Observed Git facts:

| Metric | Value |
| --- | ---: |
| Commits inspected | 99 |
| Merge commits | 9 |
| First observed commit | `2026-05-25T20:33:07+02:00` |
| Last observed commit | `2026-06-01T07:21:38+02:00` |
| Total insertions from commit numstat | 59,944 |
| Total deletions from commit numstat | 2,674 |
| File touches from commit numstat | 574 |
| Non-generated/lockfile-adjusted insertions | 42,359 |
| Non-generated/lockfile-adjusted deletions | 2,674 |
| Current uncommitted diff | 246 insertions, 14 deletions |

Current uncommitted files at the time of analysis:

```text
src/app.ts
src/modules/auth/actor.ts
src/routes/inventory.route.ts
tests/auth.guard.test.ts
```

## Daily Estimate

Method:

- Commits were grouped by local calendar day.
- Gaps longer than 90 minutes were treated as separate sessions.
- Active time lower bound adds observed short gaps plus roughly 20 minutes per session.
- Active time upper bound adds observed short gaps plus roughly 60 minutes per session.
- This intentionally undercounts research, testing, thinking time, review, and failed attempts.

| Date | Commits | Merge commits | Sessions | Commit span | Conservative active estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05-25 | 3 | 0 | 1 | 1.33 h | 1.7-2.3 h |
| 2026-05-26 | 17 | 3 | 3 | 11.55 h | 5.4-7.4 h |
| 2026-05-27 | 12 | 1 | 1 | 1.97 h | 2.3-3.0 h |
| 2026-05-28 | 14 | 4 | 5 | 18.91 h | 4.0-7.3 h |
| 2026-05-29 | 15 | 1 | 2 | 8.24 h | 4.6-5.9 h |
| 2026-05-30 | 7 | 0 | 3 | 5.96 h | 2.6-4.6 h |
| 2026-05-31 | 26 | 0 | 7 | 21.07 h | 5.0-9.7 h |
| 2026-06-01 | 5 | 0 | 1 | 1.89 h | 2.2-2.9 h |

Conservative active estimate total: **28-43 hours**.

## Work Themes Observed

The commit subjects and touched paths show work across these areas:

| Area | Evidence |
| --- | --- |
| Backend bootstrap and ingestion | initial Fastify/TypeScript service, raw payload ingestion, Prisma setup |
| Inventory domain | items, stock, withdrawals, corrections, purchase orders, review tasks, CSV import/export |
| Web shell and UX | initial web shell, role-based mobile layout, dashboard, command UI, P0 UX stabilization |
| Supabase/Postgres | canonical Supabase docs, Prisma migrations, RLS and `app_user` runtime role handling |
| Auth and profile | Supabase auth profile shell, team/profile schema, auth guard tests |
| Cockpit Next.js migration | Next.js app scaffold, route groups, auth middleware, role context, app shell |
| Cockpit feature wiring | inventory reads, movements, dashboard KPIs, alerts, storage, workspaces, settings |
| Runtime/smoke validation | inventory API smoke, Supabase runtime smoke, browser smoke seed script |
| Governance/docs | AGENTS/README root sync, ADR/decision updates, runtime smoke status docs |

## Interpretation

Observed:

- This was not a single narrow patch. The history shows a full product slice across backend,
  database schema, authorization, frontend surfaces, tests, smoke scripts, docs, and deployment
  compatibility.
- Several days contain dense commit clusters, which usually means implementation plus immediate
  stabilization rather than isolated documentation edits.
- Large generated surfaces exist, especially lockfiles and analysis artifacts. Those were discounted
  from the adjusted line-count signal.

Inferred:

- The commit-window estimate alone is too low for actual work because it excludes local debugging,
  test execution, browser validation, reasoning, and failed/rewritten attempts.
- A fair rough accounting range is **35-50 hours**.
- If billing or formal reporting needs a defensible single number, use **42 hours** as the midpoint.

## Limitations

- Git history proves commit timing and file changes, not exact human working time.
- Chat interactions, command history, test duration, browser work, and discarded changes were not
  fully audited.
- The current uncommitted diff is included as observed current work, but not attributed to a finished
  commit or closed work package.
- The estimate is suitable for rough accounting, planning, or project retrospection. It is not a
  legal timesheet.

## Next Gate

Create a commit-level CSV or Markdown appendix with each commit, changed file count, insertion/deletion
count, theme, and per-commit effort band if a more auditable breakdown is needed.
