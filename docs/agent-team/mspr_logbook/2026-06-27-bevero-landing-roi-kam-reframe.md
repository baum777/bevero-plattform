# MSPR Entry — Bevero Landing ROI/KAM Reframe

- id: 2026-06-27-bevero-landing-roi-kam-reframe
- timestamp: 2026-06-27T19:31:12+02:00
- runId: codex-2026-06-27-bevero-landing-roi-kam-reframe
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/landing/tests/roi-kam-content.test.mjs`
  - `docs/superpowers/plans/2026-06-27-bevero-landing-roi-kam-reframe.md`
  - this MSPR entry and linked Intent Memory entry
- pathsOutOfScope:
  - backend, Cockpit, API and Supabase
  - deployment configuration and dependencies
  - screenshot assets and the 3-tab architecture
  - `apps/landing/index.md` (pre-existing user audit snapshot)
- autonomyTier: 2

## Code Change Context

- Trigger/request: Reframe the existing Bevero landing page around KAM relevance, economic utility, system-complement positioning and pilot measurement without an architecture rewrite. A follow-up addendum required the existing site database and adapter implementation to be stated more directly.
- Why the change was needed: The product proof existed, but the page did not explain early enough how an operational hub can reduce measurable friction without replacing FoodNotify or Gastronovi. The first patch also understated locally evidenced technical implementation as if it were only a future concept.
- Files read:
  - workspace and repo `AGENTS.md` / `README.md` frontdoors
  - `docs/agent-team/work_documentation_rule.md`
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/modules/gastronovi/gastronovi-connector.ts`
  - `apps/api/src/modules/gastronovi/index.ts`
  - `apps/api/src/modules/procurement/foodnotify-parser.ts`
  - `apps/api/src/modules/procurement/procurement-ingest.service.ts`
  - `apps/cockpit/lib/backend/procurement-orders.ts`
  - `docs/agent-team/mspr_logbook/2026-06-20-gastronovi-connector.md`
  - existing landing tests and prior work records
- Files changed:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/src/screenshotRegistry.js`
  - `apps/landing/tests/roi-kam-content.test.mjs`
  - `docs/superpowers/plans/2026-06-27-bevero-landing-roi-kam-reframe.md`
  - this MSPR entry and linked Intent Memory entry
- Commands run:
  - `node --test tests/roi-kam-content.test.mjs` before implementation → expected fail
  - `node --test tests/roi-kam-content.test.mjs` after implementation → pass
  - addendum RED run → expected fail for missing database, adapter and four-question CTA claims
  - addendum GREEN run → pass
  - `node --test tests/screenshot-ownership.test.mjs` → pass
  - `npm run build` in `apps/landing` → pass, 27 modules
  - Playwright against local Vite server at desktop and 416 px → pass
  - Playwright rerun after database/adapter addendum → blocked by local tool usage limit before Dev Server start
  - `git diff --check` → pass
- Validation results:
  - Hero, ROI, Gap and pilot measurement narrative render before workflow depth.
  - Hero, Trust and IT now distinguish implemented site/database and adapter logic from unverified productive external connectivity.
  - Pilot, Vision and IT tabs open; screenshot modal opens and closes.
  - 416 px gate: `scrollWidth === clientWidth === 416`.
  - Mailto uses `twim.baum@proton.me`, the approved subject and all three questions.
  - Pilot/Vision/IT render 13/1/1 images; all lazy-loaded images resolve; no console errors.
  - The first browser result predates the addendum copy expansion; the final addendum build is verified, but its rendered 416 px state remains unrerun.

## Memory

- newFindings:
  - ROI framing can be added without changing the screenshot ownership model or tab architecture.
  - Gastronovi connector code is present and tested, but its endpoint paths and contract remain explicitly unconfirmed; landing copy must say integrated adapter logic, not live productive Gastronovi connection.
- reusableRules:
  - Express ROI as pilot-checkable friction metrics, not promised savings.
  - Position Bevero as an execution hub while incumbent systems remain leading.
- gotchas:
  - Lazy-loaded lower-page images must be scrolled into view before treating `naturalWidth === 0` as a broken asset.

## Review

- status: pass
- risks:
  - Copy density above the first screenshot increased and still benefits from final human send review.
  - "Adapterlogik integriert" describes repository implementation, not confirmed partner connectivity or active production synchronization.
  - Browser validation of the final addendum copy is pending because the required local server launch was rejected by the tool usage limit.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 4
- nextGate: Human KAM read-through of the first three minutes; commit only on explicit owner request.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-27-bevero-landing-roi-kam-reframe.md`
