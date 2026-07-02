# Intent Memory — Bevero Database Target Guardrail

- id: 2026-07-02-database-target-guardrail
- timestamp: 2026-07-02T12:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-02-database-target-guardrail.md`
- status: reviewed

## Core Intention

Make database target ambiguity fail closed before Prisma can execute a migration
or other risk-bearing command. A connection string is an execution capability,
not proof that its target is appropriate.

## Logic Followed

- Derive only the Supabase project ref from direct-host or pooler-user URL shape.
- Never print connection strings, usernames, passwords, tokens, or query values.
- Require `DIRECT_URL` and `DATABASE_URL` to identify the same target.
- Match the derived ref against a small, explicit target-role registry.
- Require declared role and expected ref for remote targets.
- Require a separate exact token for Production guard verification.
- Treat a passed guard as target verification, not standing approval to migrate.
- Protect both recommended package scripts and direct risky Prisma CLI usage.

## Decisions And Tradeoffs

- Accepted layered enforcement over wrapper-only enforcement because wrappers can
  be bypassed with direct `npx prisma` commands.
- Added only a deploy wrapper; did not add convenient reset/push/seed scripts.
- Classified `ienwshemokpsjwkedmyp` as Development only after explicit owner confirmation.
- Kept Production technically verifiable with an explicit token, while governance
  still requires a separate owner-approved operation gate.
- Did not repair the unrelated UI contract test failure.

## Durable Memory

- `czinchfegtglmrloxlmh` is Warenwirtschaft/Pilot Production.
- `ienwshemokpsjwkedmyp` is Bevero Development and belongs to `bevero-plattform`.
- Prisma prefers `DIRECT_URL` over `DATABASE_URL` in this repo.
- A client-side Supabase project swap does not update Prisma/server targeting.
- Future DB-bearing work must prove ref, role, expected target, and evidence before execution.

## Do Not Reuse Blindly

- The Production approval token is not permission to execute a migration.
- Adding a new Supabase project requires an explicit role decision and test update.
- A unit-tested guard does not replace live policy/count/log/smoke verification.
- Do not infer that Development is schema-ready merely because its ref is known.

## Next Logic Gate

Complete Production policy/count/constraint/log/Advisor/read-only-smoke evidence;
until then only guardrail/documentation work is allowed.
