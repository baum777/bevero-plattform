# MSPR Entry — Bevero-Plattform Vercel Incident Containment

- id: 2026-07-03-bevero-plattform-vercel-incident-containment
- timestamp: 2026-07-03T00:00:00Z
- runId: baum-os-session-2026-07-03-bevero-plattform-vercel-incident-containment
- agentRole: reviewer
- taskType: read_only_audit

## Scope

- layer: deployment_and_docs
- pathsInScope:
  - `README.md`
  - `docs/deployment-vercel.md`
  - `apps/api/.vercel/project.json`
  - `apps/cockpit/.vercel/project.json`
  - `apps/landing/.vercel/project.json`
  - `docs/agent-team/mspr_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
  - `docs/agent-team/intent_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
- pathsOutOfScope:
  - `projects/rauschenberger-os/**` writes
  - deploys, rollbacks, aliases, domains, env writes, project deletes
  - secrets / `.env*` contents
- autonomyTier: 2

## Code Change Context

- Trigger/request: contain and document the post-split Vercel state after the
  accidental Production deployments created in the previous run.
- Why the change was needed: the team needed an exact read-only snapshot of which
  production endpoints exist, whether the root link is still absent, and how the
  new Bevero-Plattform projects differ from the legacy shared projects.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `projects/bevero-plattform/AGENTS.md`
  - `docs/deployment-vercel.md`
  - `apps/api/.vercel/project.json`
  - `apps/cockpit/.vercel/project.json`
  - `apps/landing/.vercel/project.json`
  - `apps/api/package.json`
  - `apps/cockpit/package.json`
  - `apps/landing/package.json`
- Files changed:
  - `docs/agent-team/mspr_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
  - `docs/agent-team/intent_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
- Commands run:
  - `pwd`
  - `git status --short`
  - `find . -maxdepth 4 -name ".vercel" -o -name "vercel.json"`
  - `vercel --version`
  - `vercel --help`
  - `vercel project --help || true`
  - `vercel alias --help || true`
  - `vercel env --help || true`
  - `cat .vercel/project.json 2>/dev/null || echo "root .vercel absent"`
  - `cat apps/api/.vercel/project.json`
  - `cat apps/cockpit/.vercel/project.json`
  - `cat apps/landing/.vercel/project.json`
  - `vercel project inspect` in `apps/api`, `apps/cockpit`, `apps/landing`
  - `vercel env ls` in `apps/api`, `apps/cockpit`, `apps/landing`
  - `vercel alias list` in `apps/api`, `apps/cockpit`, `apps/landing`
  - `vercel ls` in `apps/api`, `apps/cockpit`, `apps/landing`
  - `curl -sS -o /dev/null -w 'api:%{http_code}\n' https://bevero-plattform-api.vercel.app`
  - `curl -sS -o /dev/null -w 'landing:%{http_code}\n' https://bevero-plattform-landing.vercel.app`
  - `curl -sS -o /dev/null -w 'cockpit:%{http_code}\n' https://bevero-plattform-cockpit.vercel.app`
  - `curl -sS -o /dev/null -w 'api-health:%{http_code}\n' https://bevero-plattform-api.vercel.app/health`
  - `git diff --check`
  - `git status --short`
- Validation results:
  - Root `.vercel/` is absent.
  - App links still point to the new Bevero-Plattform projects:
    - `apps/api` → `prj_QEYGXu3hbDyvuCkUX2Sh0uJUQL7M`
    - `apps/cockpit` → `prj_ymfMaXixvk2FaDgQ7Nyd4QSwj28i`
    - `apps/landing` → `prj_94WhlY4UzKh8GcSrAwVXmytHKM6Z`
  - `vercel project inspect` confirms the three new project IDs and shows empty env
    inventories.
  - `vercel alias list` surfaced no custom aliases in the team scope.
  - `vercel ls` shows production and preview deployments already exist for API and
    Landing; Cockpit has preview and production deployments in error state.
  - Passive HTTP probes returned:
    - API production URL: `500`
    - API health endpoint: `500`
    - Landing production URL: `200`
    - Cockpit production URL: `404`
  - `git diff --check` passed.

## Memory

- newFindings:
  - The safe state today is a frozen read-only snapshot: new projects are linked,
    root `.vercel/` is absent, and no new writes were needed.
  - API production is publicly reachable but currently returns `500`, which is a
    visible misconfiguration signal.
  - Landing production is publicly reachable with `200`.
  - Cockpit production is not reachable as a healthy public surface and returns
    `404` on the project URL.
- reusableRules:
  - Use `vercel project inspect` plus `vercel ls` for containment checks; alias
    listing alone is not sufficient to understand production reachability.
  - Prefer passive `curl -I` / status probes over functional checks when the goal is
    incident containment.
  - Keep deployment rules separate from incident records; do not overwrite the SOT
    with execution notes.
- gotchas:
  - The local CLI exposes `alias list` and `env list`; `alias list` did not surface
    the `.vercel.app` production endpoints even though the deployments exist.
  - `vercel deploy` was already proven unsafe as a preview path in the prior run, so
    no deploy command was attempted here.

## Review

- status: partial
- risks:
  - Public API production is still returning `500`.
  - Production deployments already exist for API and Landing and remain frozen.
  - Cockpit has no envs in Vercel and remains blocked by design.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Owner decides whether to accept the current production URLs as frozen,
  or to authorize a separate cleanup plan for alias/deployment remediation.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-03-bevero-plattform-vercel-incident-containment.md`
