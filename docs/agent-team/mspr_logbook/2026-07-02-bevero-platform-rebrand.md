# MSPR Entry — Bevero-os → Bevero-platform rebrand (package + identity naming)

- id: 2026-07-02-bevero-platform-rebrand
- timestamp: 2026-07-02T12:00:00Z
- runId: baum-os-session-2026-07-02-bevero-rebrand
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: package_local
- pathsInScope:
  - package.json
  - apps/api/package.json
  - apps/cockpit/package.json
  - apps/landing/package.json
  - package-lock.json
  - OS.md
  - README.md
  - BEVERO.md
  - IDENTITY.md
  - docs/productization/bevero-product-identity-v0.md
  - docs/productization/bevero-database-boundary-v0.md
  - docs/productization/bevero-demo-data-policy-v0.md
  - apps/landing/index.html
  - apps/landing/src/App.jsx
- pathsOutOfScope:
  - Vercel project names/config
  - Git remote / GitHub repo naming
  - Domains/DNS
  - docs/agent-team/*_logbook/* (historical, untouched)
  - Prisma enums/migrations, database, Supabase, .env, secrets
  - Phase 4b-2/4b-3 productization work
- autonomyTier: 1

## Code Change Context

- Trigger/request: Operator renamed the repo directory `projects/bevero-os` →
  `projects/bevero-plattform` (whitelabeled clone of rauschenberger-os) and
  requested the internal package/identity naming be aligned: technical platform
  name `bevero-platform`, public product name "Bevero Ops", brand "Bevero"
  unchanged, plus named feature modules (Bevero Cockpit / Audit Trail /
  Handover / Connect).
- Why the change was needed: package.json / package names and identity docs
  still said `bevero-os` / `@bevero-os/*`, inconsistent with the renamed
  directory and the new public product naming decision.
- Files read:
  - package.json, apps/{api,cockpit,landing}/package.json
  - OS.md, README.md, BEVERO.md, IDENTITY.md
  - docs/productization/bevero-product-identity-v0.md
  - docs/productization/bevero-database-boundary-v0.md
  - docs/productization/bevero-demo-data-policy-v0.md
  - apps/landing/index.html, apps/landing/src/App.jsx
  - CLAUDE.md, docs/agent-team/templates/*
- Files changed:
  - package.json (name: bevero-os → bevero-platform)
  - apps/api/package.json (@bevero-os/api → @bevero-platform/api)
  - apps/cockpit/package.json (@bevero-os/cockpit → @bevero-platform/cockpit)
  - apps/landing/package.json (@bevero-os/landing → @bevero-platform/landing)
  - package-lock.json (regenerated via npm install)
  - OS.md (code-identity callout, tree root label, app annotations)
  - docs/productization/bevero-database-boundary-v0.md (planned DB names
    bevero-os-dev/staging/production → bevero-platform-dev/staging/production;
    not yet live per Phase 4b-2 boundary)
  - docs/productization/bevero-product-identity-v0.md (Package Identity update,
    new "Public Product Naming" section, approved vocabulary += "Bevero Ops",
    Future Follow-Ups package-scope-rename item marked done)
  - docs/productization/bevero-demo-data-policy-v0.md (Package Identity update)
  - IDENTITY.md (additive note: public product name "Bevero Ops"; system
    field and authority chain unchanged, per L4 gate)
  - BEVERO.md, README.md (additive "public product name: Bevero Ops" line)
  - apps/landing/index.html (title/og:title/description now lead with
    "Bevero Ops")
  - apps/landing/src/App.jsx (mailto subject line text only: "Bevero" →
    "Bevero Ops"; hero/nav visual copy intentionally NOT touched — no
    browser verification available in this session, avoided layout risk)
- Commands run:
  - `npm install` → pass
  - `npm run typecheck` → pass
  - `npm --workspace=apps/api run build` → pass
  - `npm --workspace=apps/cockpit run build` → pass
  - `npm --workspace=apps/landing run build` → pass
  - `grep -RIn "bevero-os|@bevero-os" package.json apps/*/package.json package-lock.json OS.md README.md BEVERO.md IDENTITY.md docs/productization apps/landing/src` → pass (remaining hits are explicitly marked historical "renamed from" notes)
  - `npm run check:work-docs` → not_run at time of code edits, run after this entry is added

## Memory

- newFindings:
  - No internal code imports use `@bevero-os/*` as a module specifier — the
    workspace rename was purely cosmetic/package-metadata, zero build risk.
  - Vercel project links (`apps/*/.vercel/project.json`) are keyed by
    projectId/orgId, not local folder or package name — renaming the local
    directory/package did not and will not break existing deploy routing by
    itself.
  - This repo currently has no git remote at all (`git remote -v` empty) —
    "repo rename" in the GitHub sense does not yet apply; only local
    package/doc naming was in scope for this slice.
- reusableRules:
  - When neutralizing/renaming package identity in a monorepo, grep for the
    old scope as an import specifier first (not just package.json occurrences)
    before assuming the rename is purely mechanical.
- gotchas:
  - `docs/productization/bevero-product-identity-v0.md` and
    `bevero-demo-data-policy-v0.md` intentionally keep the string `bevero-os`
    in "renamed from X" historical sentences — do not grep-and-replace those
    away in a future slice; they are the documented history of this change.

## Review

- status: approval_required
- risks:
  - `IDENTITY.md` is L4 per its own authority chain (`Autoritätskette`).
    Change here was additive-only (no rewrite of Existenzgrund/governance
    content), executed under explicit operator instruction, but formal
    operator sign-off on this specific entry is still recommended per the
    repo's own gate.
  - `apps/landing/src/App.jsx` hero/nav visual copy still says plain
    "Bevero" / "Operativer Hub" — not yet aligned to "Bevero Ops" in the
    rendered UI. Deferred pending visual verification (dev server / browser
    check), not done blind in this slice.
  - No git remote exists for this repo yet; baum-os-root `.gitmodules` no
    longer references it at all (separate commit, out of this slice).
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 0
- nextGate: Operator review of IDENTITY.md additive line; decide whether/when
  to extend "Bevero Ops" naming into apps/landing/src/App.jsx visual copy
  with a real browser check.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-02-bevero-platform-rebrand.md`
