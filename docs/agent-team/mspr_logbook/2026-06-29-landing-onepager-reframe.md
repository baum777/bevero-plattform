# MSPR Entry — Landing Page Onepager Reframe

- id: 2026-06-29-landing-onepager-reframe
- timestamp: 2026-06-29T01:41:30+02:00
- runId: codex-2026-06-29-landing-onepager-reframe
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `docs/agent-team/mspr_logbook/2026-06-29-landing-onepager-reframe.md`
  - `docs/agent-team/intent_logbook/2026-06-29-landing-onepager-reframe.md`
- pathsOutOfScope:
  - `apps/cockpit/*`, `apps/api/*`
  - `apps/landing/src/screenshotRegistry.js` and screenshot assets
  - external systems, deployments, secrets and customer data
  - `apps/landing.zip` (pre-existing untracked artifact)
- autonomyTier: 2

## Code Change Context

- Trigger/request: Complete the previously started replacement of the landing page's tab navigation with a linear KAM-oriented onepager.
- Why the change was needed: The prior tab structure split the product, vision and IT argument across separate views. The onepager presents benefit, hub logic, proof screens, pilot metrics, trust boundaries, vision and IT controls as one continuous evidence path.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/landing/package.json`
  - `apps/landing/tests/screenshot-ownership.test.mjs`
  - `docs/agent-team/work_documentation_rule.md`
  - `docs/agent-team/templates/code_change_context.md`
  - `docs/agent-team/templates/intent_memory_entry.md`
  - `docs/agent-team/mspr_logbook/2026-06-26-landing-kam-onboarding.md`
  - `docs/agent-team/intent_logbook/2026-06-26-landing-kam-onboarding.md`
- Files changed:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `docs/agent-team/mspr_logbook/2026-06-29-landing-onepager-reframe.md`
  - `docs/agent-team/intent_logbook/2026-06-29-landing-onepager-reframe.md`
- Commands run:
  - `git status --short` → pass
  - `git diff --check` → pass
  - `npm --prefix apps/landing run build` → pass
  - `npm --prefix apps/landing run test:screenshot-ownership` → pass (1 test, 0 failures)
  - `npm run check:work-docs` → pass with limitation (untracked entries were not inspected; checker reported `nothing to check`)
  - local Vite render at `http://127.0.0.1:5173/` → pass (desktop DOM and visual inspection)
  - screenshot modal open and Escape-close check → pass (1 dialog opened, 0 after Escape, no browser console errors)
- Validation results:
  - Vite production build completed with 27 transformed modules and no errors.
  - Onepager uses existing screenshot registry ownership instead of mock paths or duplicated screenshot metadata.
  - Interactive proof cards are native buttons; the modal supports Escape, initial close-button focus and focus return.
  - Desktop render confirmed the hero, anchor navigation and hub diagram; automated mobile viewport switching was unavailable.
  - No shared-core change is required: the implementation is presentation logic specific to the landing app.

## Memory

- newFindings:
  - The landing app's `typecheck` script is a no-op; the Vite production build is the relevant compile gate.
  - The six KAM proof screens can be resolved directly through `screensFor("kam")`.
- reusableRules:
  - Keep screenshot ownership in `screenshotRegistry.js`; landing sections should consume registry groups rather than hard-code asset paths.
  - Preserve explicit trust boundaries around rollouts, writeback, ordering and ROI claims.
- gotchas:
  - A static onepager does not need loading, empty or error states, but its modal still needs keyboard and focus handling.
  - The untracked `apps/landing.zip` predates this slice and must remain untouched.

## Review

- status: pass
- risks:
  - Mobile breakpoints were code-reviewed but not rendered because the embedded browser did not expose viewport resizing.
  - The mail target and external-facing German copy require owner confirmation before distribution.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Review the rendered onepager at mobile and desktop widths, then confirm the external contact inbox.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-landing-onepager-reframe.md`
