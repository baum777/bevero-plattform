# MSPR Entry — Landing Screenshot Ownership

- id: 2026-06-27-landing-screenshot-ownership
- timestamp: 2026-06-27T18:58:50+02:00
- runId: codex-2026-06-27-landing-screenshot-ownership
- agentRole: builder
- taskType: refactor

## Scope

- layer: app_local
- pathsInScope:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/landing/tests/screenshot-ownership.test.mjs`
  - `apps/landing/package.json`
  - `docs/superpowers/plans/2026-06-27-landing-screenshot-ownership.md`
  - this MSPR entry and linked Intent Memory entry
- pathsOutOfScope:
  - `apps/api/*`
  - `apps/cockpit/*`
  - screenshot asset files
  - 3-tab navigation architecture
  - deployment and external communication
- autonomyTier: 2

## Code Change Context

- Trigger/request: Create and implement the approved patch concept that renders each Bevero screenshot once in its owning section.
- Why the change was needed: The landing page used 15 unique screenshot assets through 42 source references across Hero, Workflow, KAM proof, full gallery, Vision and IT. Repetition diluted KAM attention and made future duplication regressions likely.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `docs/agent-team/work_documentation_rule.md`
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/package.json`
- Files changed:
  - `apps/landing/package.json`
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/landing/tests/screenshot-ownership.test.mjs`
  - `docs/superpowers/plans/2026-06-27-landing-screenshot-ownership.md`
  - `docs/agent-team/mspr_logbook/2026-06-27-landing-screenshot-ownership.md`
  - `docs/agent-team/intent_logbook/2026-06-27-landing-screenshot-ownership.md`
- Commands run:
  - `npm --workspace=apps/landing run test:screenshot-ownership` before registry → expected fail (`ERR_MODULE_NOT_FOUND`)
  - `npm --workspace=apps/landing run test:screenshot-ownership` after registry → pass
  - `npm --workspace=apps/landing run build` → pass, 27 modules
  - `git diff --check` → pass
  - `npm run check:work-docs` → pass with limitation: skipped because all new records are still untracked
  - explicit record existence/link/header checks → pass
  - Browser Pilot/Vision/IT screenshot-source accumulation → pass, 13/1/1 and 15 unique total
  - Browser modal open/close → pass; modal treated as transient viewer
  - Browser 416px gate → pass, `scrollWidth === clientWidth === 416`
- Validation results:
  - All 15 screenshot paths exist once in the central registry and nowhere in `App.jsx`.
  - Each registry item has exactly one section owner.
  - KAM proof retains six screens; Workflow one; Mobile three; Details two; Kitchen, Vision and IT one each.
  - Hero contains no product screenshot duplication.
  - CTA and mailto remain unchanged.

## Memory

- newFindings:
  - The former 15 screenshot files had 42 source references.
  - In-app browser semantic locator clicks can time out while coordinate and DOM-node interaction still works.
- reusableRules:
  - Screenshot metadata and section ownership belong in one pure registry with a regression test.
  - A section may reference another screen textually, but must not render a second copy.
- gotchas:
  - Modal enlargement temporarily creates a second DOM image with the same source; it is a transient viewer, not a content placement.
  - `check:work-docs` ignores untracked work until files are staged; before staging, verify new records explicitly and report the limitation.

## Review

- status: pass
- risks:
  - Reduced screenshot density changes the lower-page visual rhythm and requires human visual review before external send.
  - Modal exception must remain explicit if future validators inspect live DOM rather than content ownership.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 4
- nextGate: Human review of the reduced-density landing page, then an explicit commit decision.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-27-landing-screenshot-ownership.md`
