# MSPR Entry — Supabase fresh DB: swap client env to new project

- id: 2026-07-02-supabase-fresh-db-env-swap
- timestamp: 2026-07-02T00:00:00Z
- runId: baum-os-session-2026-07-02
- agentRole: builder
- taskType: infra_db_change

## Scope

- layer: infra_database
- pathsInScope:
  - .env
- pathsOutOfScope:
  - apps/cockpit/lib/supabase/**
  - apps/cockpit/package.json
- autonomyTier: 3

## Code Change Context

- Trigger/request: Operator requested "setup fresh db" for bevero-os, providing new Supabase project URL + publishable key, following the Supabase Next.js SSR quickstart (install deps, env vars, client/server/middleware helpers).
- Why the change was needed: Point the app at a new (fresh) Supabase project instead of the previously configured one.
- Files read:
  - .env
  - apps/cockpit/package.json
  - apps/cockpit/lib/supabase/server.ts
  - apps/cockpit/lib/supabase/client.ts
  - apps/cockpit/lib/supabase/middleware.ts
  - apps/cockpit/lib/supabase/env.ts
- Files changed:
  - .env (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY updated to new project `ienwshemokpsjwkedmyp`)
- Commands run:
  - (none — no install needed, deps already present)
- Validation results:
  - Confirmed `@supabase/ssr` and `@supabase/supabase-js` already present in `apps/cockpit/package.json`.
  - Confirmed `apps/cockpit/lib/supabase/{server,client,middleware,env}.ts` already implement the same pattern the operator's quickstart instructions asked for (createServerClient/createBrowserClient reading `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). No new files created.
  - Did NOT run the app or execute a live Supabase query against the new project — not verified end-to-end.

## Memory

- newFindings:
  - bevero-os already has a complete Supabase SSR client setup under `apps/cockpit/lib/supabase/`; the operator's generic quickstart instructions were redundant with existing code.
- reusableRules:
  - Before scaffolding Supabase client/server/middleware files from a generic quickstart, check `apps/cockpit/lib/supabase/` first — it likely already exists.
- gotchas:
  - `.env` still has `DATABASE_URL`, `DIRECT_URL`, and `SUPABASE_JWT_SECRET` pointing at the OLD project (`czinchfegtglmrloxlmh`). Only the client-facing `NEXT_PUBLIC_*` vars were updated because those were the only new values the operator supplied. Direct DB access (migrations, Prisma, JWT verification) will still hit the old project until these are updated with real values from the new project.

## Review

- status: approval_required
- risks:
  - DATABASE_URL/DIRECT_URL/SUPABASE_JWT_SECRET mismatch with the new NEXT_PUBLIC_SUPABASE_URL — app is now in a split-brain state between two Supabase projects until the operator supplies the remaining credentials.
  - No live validation performed (no dev server run, no query executed against new project).
- scorecard:
  - outcomeQuality: 3
  - scopeDiscipline: 4
  - safety: 4
  - evidenceQuality: 2
  - sideEffects: 3
- nextGate: Operator must supply DATABASE_URL/DIRECT_URL/SUPABASE_JWT_SECRET for the new project (ienwshemokpsjwkedmyp) before this is a coherent "fresh db" setup; then run migrations against the new project and smoke-test auth.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-02-supabase-fresh-db-env-swap.md`
