# Intent Memory — Bevero-Plattform Vercel Split

- id: 2026-07-03-bevero-plattform-vercel-split
- timestamp: 2026-07-03T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-bevero-plattform-vercel-split.md`
- status: partial

## Core intention

Separate Bevero-Plattform deployment ownership from legacy `rauschenberger-os`
Vercel projects and make the Cockpit API boundary explicit instead of relying on
a shared-project fallback.

## Logic followed

The Bevero-Plattform apps should each have their own Vercel project, linked from
the app directory, with deployment docs that treat the repo root as an unsafe
context. Cockpit must not silently retreat to the old `bevero-api` surface when
`BEVERO_API_BASE_URL` is absent.

## Design assumptions

- The new Bevero-Plattform project names are the authoritative targets:
  `bevero-plattform-api`, `bevero-plattform-cockpit`, `bevero-plattform-landing`.
- Legacy Vercel projects remain intact and are not to be repurposed.
- A local `.env.local` is acceptable for developer builds, but Vercel production
  and preview environments must still carry explicit values.

## Tradeoffs

- Accepted:
  - Keep the cockpit rewrite fail-closed rather than preserving a silent fallback.
  - Update deployment docs and app READMEs together so the repo does not keep two
    competing deployment stories.
- Rejected:
  - Reusing the legacy shared `bevero-api` / `bevero-ui` projects.
  - Editing `rauschenberger-os` to clean up the boundary from the wrong side.
  - Pretending that a preview command succeeded when the CLI actually created a
    production deployment.

## Durable memory

- Vercel project identity is not just the project name; the project ID and linked
  directory matter for isolation.
- Preview-first workflows must be verified against the exact local CLI behavior.
- A missing env in Vercel is a real boundary signal even if local development still
  succeeds via `.env.local`.

## Do not reuse blindly

- Do not assume `vercel deploy` is preview-safe in this CLI version.
- Do not assume `apps/cockpit` can infer its API target from an old production URL.
- Do not use the old shared project names as shorthand for Bevero-Plattform.

## Relation to Rauschenberger OS / Bevero

- Bevero-Plattform is now separated by project identity from the legacy
  `rauschenberger-os` deployment surface.
- The legacy `bevero-api` and `bevero-ui` projects are historical neighbors, not
  deployment backends for this repo.
- The cockpit API boundary is now explicit and documentation-backed.

## Next logic gate

Whether the unintended production deployments are accepted as-is for now, or
whether the owner wants a separate cleanup plan before any further Vercel work.
