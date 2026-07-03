# Intent Memory — Bevero-Plattform Vercel Incident Containment

- id: 2026-07-03-bevero-plattform-vercel-incident-containment
- timestamp: 2026-07-03T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
- status: partial

## Core intention

Freeze the post-split Vercel state, confirm what is publicly reachable, and avoid
any action that could mutate production aliases, deployments, or env boundaries.

## Logic followed

Incident containment means proving the current state with read-only evidence:
root link absent, app links correct, env inventories empty, deployments listed,
and passive HTTP probes showing the actual public status of the production URLs.

## Design assumptions

- The accidental production deployments from the previous run remain frozen until
  the owner explicitly chooses a cleanup or acceptance path.
- `bevero-plattform-api`, `bevero-plattform-cockpit`, and
  `bevero-plattform-landing` are the canonical Bevero-Plattform projects.
- No new secret-bearing or production-mutating state should be introduced during
  containment work.

## Tradeoffs

- Accepted:
  - Leave the current production URLs alone for now and document them precisely.
  - Use passive probes to classify risk instead of trying to "fix" anything from
    the containment pass.
- Rejected:
  - Rolling back or deleting deployments without separate Owner GO.
  - Changing aliases/domains just to make the inventory look cleaner.
  - Reusing legacy `bevero-api` / `bevero-ui` as a shortcut back to green.

## Durable memory

- `vercel alias list` may not surface the automatic `.vercel.app` production
  endpoints in the way a human expects, so deployment inventory must include both
  `vercel ls` and passive URL probes.
- A `500` on the public API is a boundary signal, not a reason to mutate the live
  project during containment.
- A `404` on the Cockpit `.vercel.app` URL is consistent with a blocked or missing
  production surface and does not justify a deploy write in this slice.

## Do not reuse blindly

- Do not use `vercel deploy` as a preview shortcut in this workspace.
- Do not treat an empty env list as proof that the endpoint is safe or ready.
- Do not infer alias state solely from the alias list output.

## Relation to Rauschenberger OS / Bevero

- The containment work keeps Bevero-Plattform isolated from the legacy
  `rauschenberger-os` Vercel projects.
- No writes were made to `rauschenberger-os`.
- The legacy shared projects remain historical references only.

## Next logic gate

Owner decision on the frozen production URLs: accept as-is, or authorize a
separate alias/deployment cleanup operation.
