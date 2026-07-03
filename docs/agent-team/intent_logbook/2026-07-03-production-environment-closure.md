# Intent Memory — Bevero Production Environment Closure

- id: 2026-07-03-production-environment-closure
- timestamp: 2026-07-03T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-production-environment-closure.md`
- status: reviewed

## Core intention

Close the incident through evidence and explicit Owner gates, not through feature
work or an unreviewed Production configuration change.

## Logic followed

Environment identity is a five-part contract: runtime DB URL, direct DB URL,
Auth verifier, public Supabase URL, and browser-safe public key. Presence alone
does not prove that the parts belong to one project. Deployment role and recovery
posture are independent closure gates.

## Design assumptions

- `czinch...` and `ienws...` retain the roles documented by the canonical DB boundary.
- Encrypted Vercel values are treated as unknown when the read-only tooling cannot
  return a verifiable project binding.

## Tradeoffs

- Accepted:
  - Keep result `partial` and Feature Work blocked despite locally coherent subsets.
- Rejected:
  - Guess the Production target from filenames, old smoke evidence, or Vercel
    variable presence.
  - Open dashboard manually when prior evidence shows it can write.

## Durable memory

- Root and app-local env files serve different execution contexts and can drift.
- A Vercel env update is not active-runtime evidence until a separately approved
  deployment and smoke test prove it.
- Backup/PITR must never be marked pass merely because its absence is documented.

## Do not reuse blindly

- Do not assume Bevero Development is Bevero Production.
- Do not treat a legacy `anon` key and a publishable key as interchangeable without
  naming the compatibility decision and checking the consuming code.
- Do not reuse the 2026-07-02 smoke as read-only evidence for the current deployment.

## Relation to Rauschenberger OS / Bevero

- location logic: no change.
- role/approval logic: Owner approval required for Production env/deploy and risk acceptance.
- inventory/procurement/shift-planning logic: no feature or flow activation.
- external-system boundary: Rauschenberger Production remains foreign and write-blocked.

## Next logic gate

Which Supabase project role is the intended target of `bevero-api` and `bevero-ui`
Production, and will the Owner provide recovery coverage or sign a time-bounded P0
risk acceptance?
