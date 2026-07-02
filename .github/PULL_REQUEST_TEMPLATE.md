# Pull Request

## Summary

<!-- One paragraph: what does this PR do and why? -->

## Type

<!-- Pick exactly one. Delete the rest. -->

- [ ] `docs` — Markdown / ADR / spec / readme only
- [ ] `code` — runtime, schema, migration, CI, or dependency change
- [ ] `governance` — AGENTS.md, ADR, swarm policy, or authority-order change
- [ ] `ci` / `infra` — Vercel, Supabase, deployment, secrets

## Authority & Scope

Read and follow the authority order in
[`AGENTS.md` → Active Specs & Authority](../AGENTS.md#active-specs--authority)
before opening this PR. The full chain is:

1. `docs/DECISIONS.md` (accepted ADRs are binding)
2. `docs/automation/semi-automated-operations-layer.md` (Phase A spec)
3. `docs/VISION.md` (strategic intent, working paper)
4. `docs/agent-team/*` (collaboration contract)
5. `README.md` and `AGENTS.md` (entry / routing)
6. Loose docs, chat summaries, MSPR packets — **not authority**

If two sources above conflict, this PR must either:

- escalate the conflict in a new ADR, or
- update the relevant spec and reference the change here.

### Authorities cited in this PR

<!-- List the doc paths whose decisions this PR rests on. If none, say 'none'. -->

- [ ]
- [ ]

### ADRs touched

<!-- Add new ADR-NNN entries here, or check 'no ADR change'. -->

- [ ] No ADR change
- [ ] New ADR (number, title): \_\_\_\_\_
- [ ] Existing ADR updated (number, title): \_\_\_\_\_
- [ ] Existing ADR superseded (number, superseder): \_\_\_\_\_

> Numbering is linear. The next available ADR slot is the highest
> existing one plus one. Do not collide.

## MSPR Logbook

A swarm-governed PR — i.e., one that crosses
`apps/`, `prisma/`, `src/`, `api/`, `apps/cockpit-next/app/`,
`.github/workflows/`, `.env*`, or any production-touching surface
— must reference the MSPR entry that records this slice.

- [ ] No MSPR entry needed (docs-only or trivial fix)
- [ ] MSPR entry: `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md`

## Change Surface

### Files added

<!-- One path per line. -->

### Files modified

<!-- One path per line. -->

### Files removed

<!-- One path per line. -->

## Guardrails Check

Tick every line that applies. If a box does not apply, write `n/a`
next to it. Do not leave boxes blank.

- [ ] Did not write to `prisma/schema.prisma` or run a migration
      unless an accepted ADR explicitly authorizes it.
- [ ] Did not add or change any `.env*` file.
- [ ] Did not read, print, or log any secret, service-role key,
      or production credential.
- [ ] Did not touch `web/` (frozen per `web/FROZEN.md`).
- [ ] Did not add an external npm dependency without an
      ADR that names it.
- [ ] Did not write to `InventoryStockSnapshot` directly;
      stock changes go through `InventoryMovement`.
- [ ] Did not push mutations to FoodNotify, Microsoft Dynamics
      365, DATEV, or central Rauschenberger systems.
      Bevero reads only.
- [ ] Did not use an LLM to decide approval, ordering, or
      stock mutation. LLM is opt-in, read-only.
- [ ] Did not place a service-role credential in a user-facing
      request path. RLS stays authoritative.

If any box is unchecked and **does** apply, this PR is
out-of-policy. Stop and revise.

## TTD Frame

For non-trivial slices, state the TTD (Test-The-Decision) frame
inline. For trivial changes, write "n/a — trivial".

- **Decision:** the single sentence that must become unambiguously
  true after this slice.
- **Owner / Scope:** which repo surface owns the change.
- **Contract:** which file, route, schema, or doc proves the
  decision.
- **Gate / Test:** the smallest check that would fail if the
  decision is false.
- **Implementation Slice:** the smallest safe change.
- **Evidence:** the command, output, file, or log that proves
  the result.
- **Next Gate:** what remains deliberately not claimed or
  deferred.

## Validation

Tick the boxes for every check you actually ran. Do not claim
checks you did not run.

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm test -- --run`
- [ ] `npm run smoke:inventory-api` (only if DB-touching)
- [ ] `npm run smoke:supabase` (only if Cockpit-touching)
- [ ] `npx prisma validate` (only if `prisma/` touched)
- [ ] Local manual smoke of changed Cockpit route
- [ ] Other: \_\_\_\_\_

## Evidence

<!-- Paste exact paths, commands, or output snippets. Do not paste
     secrets, PII, or large payloads. -->

## Risks & Follow-ups

<!-- What is intentionally NOT in this PR? What is the next gate? -->

## Reviewer Notes

<!-- Anything the reviewer should pay particular attention to. -->
