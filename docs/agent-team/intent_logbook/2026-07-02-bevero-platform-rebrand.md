# Intent Memory — Bevero-os → Bevero-platform rebrand (package + identity naming)

- id: 2026-07-02-bevero-platform-rebrand
- timestamp: 2026-07-02T12:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-02-bevero-platform-rebrand.md`
- status: reviewed

## Core intention

Align the technical package identity and public product naming with a
directory rename the operator already performed (`bevero-os` → `bevero-plattform`),
without silently expanding scope into infra/deploy/domain changes the
operator did not ask for in this slice.

## Logic followed

Bevero's own productization identity doc already distinguishes brand
("Bevero") from technical package identity, and explicitly gates
package-scope-rename and repo/Vercel-name-rename as separate, later work.
This slice executes exactly the package-scope-rename gate (now unblocked
by explicit operator instruction) and adds one more naming layer on top:
a public product name ("Bevero Ops") distinct from both the brand and the
technical package name, plus named feature modules (Cockpit / Audit Trail
/ Handover / Connect) mapped onto existing or planned functionality rather
than new apps.

## Design assumptions

- "Bevero" = brand/company level (IDENTITY.md `identity.system`, unchanged).
- "Bevero Ops" = public-facing product name for the same platform.
- "Bevero Cockpit" = the existing `apps/cockpit` app, just consistently named.
- "Bevero Audit Trail" / "Bevero Handover" = feature names for use cases that
  already exist conceptually in the product-identity doc (Audit Trail,
  Schichtübergabe) — not new apps or repos.
- "Bevero Connect" = a feature name reserved for the not-yet-built
  integration/connector layer (POS/ERP connectors already named in the
  approved vocabulary) — naming only, no new code.

## Tradeoffs

- Accepted:
  - Left `apps/landing/src/App.jsx` hero/nav visual narrative ("Bevero",
    "Operativer Hub") untouched, only changing plain-text (mailto subject),
    to avoid shipping an unverified layout/CSS change to a live investor
    landing page without a browser check.
  - Did not touch Vercel project names, git remote, or domains — those are
    external-service actions gated separately by the operator and by this
    repo's own productization doc ("would break deploy routing").
- Rejected:
  - Rewriting IDENTITY.md's Existenzgrund/governance sections to introduce
    "Bevero Ops" as if it replaced "Bevero" — rejected because IDENTITY.md
    is L4 and the operator explicitly asked for an additive-only change with
    `identity.system: Bevero` unchanged.

## Durable memory

- This repo (`projects/bevero-plattform`) has no git remote as of
  2026-07-02. Any future "repo rename" work must first decide whether/where
  it gets a GitHub remote before submodule registration in baum-os root is
  possible (tracked in baum-os `priorities/daily.md`).
- Vercel deploy routing for `apps/api`, `apps/cockpit`, `apps/landing` is
  tied to `projectId`/`orgId` in each app's `.vercel/project.json`, not to
  local folder or package names — the local rename already performed by the
  operator did not break deploys by itself.
- `docs/productization/bevero-product-identity-v0.md` is the source of
  truth for identity naming; it now documents the public-product-naming
  layer (Bevero / Bevero Ops / bevero-platform / module names) as a single
  YAML block — future naming questions should extend that block, not
  re-derive naming ad hoc elsewhere.

## Do not reuse blindly

- Do not assume "Bevero Ops", "Bevero Audit Trail", "Bevero Handover",
  "Bevero Connect" are separate deployable apps — as of this entry they are
  naming only. Building them out as distinct apps/repos is unrelated future
  work requiring its own scoping.
- Do not grep-and-replace the remaining `bevero-os` strings in
  `bevero-product-identity-v0.md` / `bevero-demo-data-policy-v0.md` — they
  are intentional historical "renamed from" markers documenting this change.

## Relation to Rauschenberger OS / Bevero

- location logic: unaffected by this slice.
- role/approval logic: unaffected; IDENTITY.md L0–L4 levels unchanged.
- inventory/procurement/shift-planning logic: unaffected (naming-only slice).
- external-system boundary: unaffected; no Vercel/domain/remote changes made.

## Next logic gate

Does the operator want `apps/landing/src/App.jsx` visual copy (hero, nav
brand, "Operativer Hub" framing) updated to reference "Bevero Ops" in the
rendered UI, and if so, in a session where the dev server can be run and
the result checked in a browser before shipping?
