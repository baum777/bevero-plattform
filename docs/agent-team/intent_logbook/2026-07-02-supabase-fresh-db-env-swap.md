# Intent Memory — Supabase fresh DB: swap client env to new project

- id: 2026-07-02-supabase-fresh-db-env-swap
- timestamp: 2026-07-02T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-02-supabase-fresh-db-env-swap.md`
- status: draft

## Core intention

Operator wants bevero-os pointed at a fresh Supabase project rather than the one previously configured, following Supabase's standard Next.js SSR quickstart.

## Logic followed

Checked whether the quickstart's prescribed artifacts (deps, env vars, client/server/middleware helpers) already existed before creating anything new — they did, nearly verbatim. Only applied the delta: the two `NEXT_PUBLIC_SUPABASE_*` values the operator actually supplied.

## Design assumptions

- The operator's "fresh db" intent is scoped to the client-facing Supabase project identity (URL + publishable key) for this slice, since that's what was provided.
- Server-side DB access (DATABASE_URL/DIRECT_URL/JWT secret) is treated as a separate, not-yet-authorized change because no new values for those were given — inventing them would violate the "never process credentials without real values" safety boundary.

## Tradeoffs

- Accepted:
  - Leaving DATABASE_URL/DIRECT_URL/SUPABASE_JWT_SECRET on the old project rather than guessing or nulling them out, to avoid breaking the app in an unreviewed way.
- Rejected:
  - Scaffolding new Supabase client/server/middleware files from the quickstart snippet — would have duplicated existing, working code in `apps/cockpit/lib/supabase/`.

## Durable memory

- bevero-os's Supabase env resolution lives in `apps/cockpit/lib/supabase/env.ts` (`getSupabaseEnv()`), consumed by `client.ts`, `server.ts`, `middleware.ts`. Any future "swap Supabase project" task only needs to touch `.env`, not this code.
- This repo (`projects/bevero-os`) is a standalone git repo (remote `rauschenberger-os`), not a registered baum-os submodule — treat it as an external-repo scope requiring explicit operator sign-off per session, per `hooks/safety_rules.md` in baum-os root.

## Do not reuse blindly

- Do not assume `.env` is now fully consistent — DATABASE_URL/DIRECT_URL/SUPABASE_JWT_SECRET are stale (old project) until the operator supplies replacements.
- Do not treat this slice as "DB fresh and live" — no migration was run against the new project, no auth smoke test performed.

## Relation to Rauschenberger OS / Bevero

- location logic: not touched in this slice.
- role/approval logic: not touched in this slice.
- inventory/procurement/shift-planning logic: not touched in this slice.
- external-system boundary: Supabase project identity changed at the client/auth boundary only; DB-layer boundary unchanged.

## Next logic gate

Does the operator want the new Supabase project's DATABASE_URL/DIRECT_URL/JWT secret supplied now, and should migrations be (re)run against it before this is considered a complete "fresh db"?
