# MSPR Entry — Bevero-Plattform Vercel Split

- id: 2026-07-03-bevero-plattform-vercel-split
- timestamp: 2026-07-03T00:00:00Z
- runId: baum-os-session-2026-07-03-bevero-plattform-vercel-split
- agentRole: reviewer
- taskType: implementation-bearing + validation

## Scope

- layer: deployment_and_docs
- pathsInScope:
  - `README.md`
  - `apps/api/README.md`
  - `apps/cockpit/README.md`
  - `apps/cockpit/next.config.mjs`
  - `apps/landing/index.md`
  - `docs/deployment-vercel.md`
  - `docs/agent-team/mspr_logbook/2026-07-03-bevero-plattform-vercel-split.md`
  - `docs/agent-team/intent_logbook/2026-07-03-bevero-plattform-vercel-split.md`
- pathsOutOfScope:
  - `projects/rauschenberger-os/**` writes
  - production domain/alias changes by design
  - deletion of legacy Vercel projects by design
  - secrets / `.env*` contents
- autonomyTier: 3

## Code Change Context

- Trigger/request: split `bevero-plattform/apps/*` away from legacy `rauschenberger-os`
  Vercel projects, create new Bevero-Plattform project targets, remove the Cockpit
  fallback to `bevero-api`, and update deployment documentation.
- Why the change was needed: the repo still pointed at legacy Vercel projects and
  the Cockpit rewrite path could silently fall back to the old shared API project.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `projects/bevero-plattform/AGENTS.md`
  - `projects/bevero-plattform/README.md`
  - `apps/cockpit/next.config.mjs`
  - `docs/deployment-vercel.md`
  - `apps/api/package.json`
  - `apps/cockpit/package.json`
  - `apps/landing/package.json`
  - `apps/api/README.md`
  - `apps/cockpit/README.md`
  - `apps/landing/index.md`
  - `docs/agent-team/work_documentation_rule.md`
- Files changed:
  - `README.md`
  - `apps/api/README.md`
  - `apps/cockpit/README.md`
  - `apps/cockpit/next.config.mjs`
  - `apps/landing/index.md`
  - `docs/deployment-vercel.md`
- Commands run:
  - `pwd`
  - `git status --short`
  - `find . -maxdepth 4 -name ".vercel" -o -name "vercel.json"`
  - `vercel --version`
  - `vercel --help`
  - `vercel project --help || true`
  - `vercel project list --scope forgedfromwood`
  - `vercel project add bevero-plattform-api --scope forgedfromwood`
  - `vercel project add bevero-plattform-cockpit --scope forgedfromwood`
  - `vercel project add bevero-plattform-landing --scope forgedfromwood`
  - `vercel link --yes --scope forgedfromwood --project bevero-plattform-api`
  - `vercel project inspect`
  - `vercel link --yes --scope forgedfromwood --project bevero-plattform-cockpit`
  - `vercel project inspect`
  - `vercel link --yes --scope forgedfromwood --project bevero-plattform-landing`
  - `vercel project inspect`
  - `vercel env ls` for api, cockpit, landing
  - `vercel deploy` for api, cockpit, landing
  - `git diff --check`
  - `npm --workspace=apps/cockpit run build`
  - `npm --workspace=apps/api run build`
  - `npm --workspace=apps/landing run build`
  - `git diff --stat`
  - `git diff -- apps/cockpit/next.config.mjs docs/deployment-vercel.md`
  - `git status --short`
- Validation results:
  - `git diff --check` passed.
  - Local `apps/api` build passed.
  - Local `apps/landing` build passed.
  - Local `apps/cockpit` build passed because `.env.local` provided the API URL.
  - `vercel env ls` showed no env vars on the three new projects.
  - New Vercel projects were created and linked with distinct IDs:
    - `bevero-plattform-api` → `prj_QEYGXu3hbDyvuCkUX2Sh0uJUQL7M`
    - `bevero-plattform-cockpit` → `prj_ymfMaXixvk2FaDgQ7Nyd4QSwj28i`
    - `bevero-plattform-landing` → `prj_94WhlY4UzKh8GcSrAwVXmytHKM6Z`
  - Root `.vercel/` was removed locally before relinking.
  - Correct preview deploys completed with the safe `vercel` command:
    - API preview: `https://bevero-plattform-cxhay3u9d-forgedfromwood.vercel.app`
      (`readyState: READY`, `target: null`)
    - Landing preview: `https://bevero-plattform-landing-qnhxzr21u-forgedfromwood.vercel.app`
      (`readyState: READY`, `target: null`)
    - Cockpit preview: `readyState: ERROR`, build failed closed with
      `BEVERO_API_BASE_URL is required for Bevero Cockpit deploys.`
  - Earlier `vercel deploy` invocations from this workspace produced unintended
    production deployments and aliases for API and Landing; those side effects
    remain an open issue outside the preview verification path.

## Memory

- newFindings:
  - On this CLI/version, `vercel deploy` from the linked app directory resolved to
    a production-targeted deployment and alias, not a harmless preview.
  - The safe preview path in this workspace is `vercel`, not `vercel deploy`.
  - `apps/cockpit/next.config.mjs` now fails closed if `BEVERO_API_BASE_URL` is
    absent, but local `.env.local` can still satisfy the build.
  - The new Vercel projects are separate from the legacy `bevero-api` / `bevero-ui`
    projects by project ID.
- reusableRules:
  - Do not keep a fallback to legacy API URLs when a deploy target is meant to be
    isolated.
  - Use explicit project creation + explicit app-directory linking when separating
    monorepo deploy targets.
  - Treat `vercel deploy` semantics as version-sensitive; verify the exact CLI
    behavior before calling it the first time in a new workspace.
- gotchas:
  - `vercel env ls` can be empty even when a local `.env.local` makes `next build`
    succeed.
  - `vercel project inspect` showed `Root Directory = "."` after linking from the
    app directory; repo-relative ownership is still the app path.
  - The workspace already contained unrelated dirty files in `docs/productization/spec-pack/`.

## Review

- status: partial
- risks:
  - Two unintended production deployments were created while attempting the
    requested preview deploys.
  - Cockpit preview build failed as expected on Vercel because no environment
    variable was set there.
  - The new Vercel projects currently have no env vars configured.
- scorecard:
  - outcomeQuality: 3
  - scopeDiscipline: 3
  - safety: 2
  - evidenceQuality: 4
  - sideEffects: 2
- nextGate: Owner decides how to handle the unintended production deployments,
  whether to set new env vars, and whether to rerun the deployment flow with a
  preview-safe command path.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-03-bevero-plattform-vercel-split.md`
