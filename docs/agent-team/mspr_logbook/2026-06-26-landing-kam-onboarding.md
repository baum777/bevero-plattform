# MSPR Entry — Landing Page KAM-Onboarding Reframe

- id: 2026-06-26-landing-kam-onboarding
- timestamp: 2026-06-26T22:10:00+02:00
- runId: claude-baumos-2026-06-26-landing-kam-onboarding
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
- pathsOutOfScope:
  - `apps/cockpit/*`, `apps/api/*` (no runtime/product code touched)
  - component architecture / 3-tab navigation skeleton (kept intact)
  - existing Ist-Zustand, Workflow-Stepper, Vision, IT sections (logic unchanged)
  - `.env*`, secrets, customer data
  - external systems (FoodNotify, Gastronovi, DATEV, Dynamics)
- autonomyTier: 2

## Code Change Context

- Trigger/request: Reframe the Bevero landing page from a product/IT/operations demo into a Key-Account-Manager onboarding briefing for Alexander Tann (Key Account Director, Rauschenberger). Operator-approved scope: "Patch + Nav-Relabeling" — no full design/architecture rewrite, only App.jsx + styles.css.
- Why the change was needed: The page positioned Bevero as an operative webapp. A KAM first needs to understand relevance to customer promises, location quality, event readiness, escalation and repeatability — and be invited to give an honest assessment, not a sign-off.
- Files read:
  - `CLAUDE.md`, `README.md`, `AGENTS.md`, `IDENTITY.md`
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `apps/landing/package.json`
  - `apps/landing/public/screenshots/` (asset inventory)
  - `docs/agent-team/work_documentation_rule.md`
  - `docs/agent-team/templates/code_change_context.md`
  - `docs/agent-team/templates/intent_memory_entry.md`
  - `docs/agent-team/mspr_logbook/2026-06-26-cockpit-api-transport.md` (format reference)
- Files changed:
  - `apps/landing/src/App.jsx`
  - `apps/landing/src/styles.css`
  - `docs/agent-team/mspr_logbook/2026-06-26-landing-kam-onboarding.md`
  - `docs/agent-team/intent_logbook/2026-06-26-landing-kam-onboarding.md`
- Commands run:
  - `npm run build` (apps/landing) → pass (26 modules, no errors)
  - duplicate-id grep over `src/App.jsx` → pass (no duplicates)
  - bundle grep for new classes + copy in `dist/assets/*` → pass
  - `git -C ... status --short -- apps/landing/src/` → pass (only the two source files dirty)
- Validation results:
  - Hero (Paket A): eyebrow, H1, lead, CTAs reframed to KAM relevance; anchors `#key-account`, `#kam-screens`, `#naechster-schritt`.
  - New KamSection (Paket B): 5 crucial points framed as automation hypotheses from publicly visible Rauschenberger structure — 3 primary (green) + 2 strategic (orange) + visibility pull-quote. No claimed internal problems.
  - Curated 6-screen gallery (Paket C) added before full gallery; full gallery demoted to "Weitere Ansichten".
  - TrustSection (Paket D): "Heute sichtbar / Noch nicht behauptet / Gesucht" 3-column honesty block before CTA.
  - CTA (Paket E): "ehrliche Einschätzung, keine Freigabe" + mailto subject "Bevero — kurze Einschätzung aus KAM-Sicht".
  - Nav relabel: tab labels "Pilot & Webapp heute" / "Grenzen & IT-Vertrauen"; navCta "Einschätzung geben".
  - Design tokens reused (--green/--orange/--blue/--border/--green-soft); responsive collapse added at 860px/600px for new grids.

## Memory

- newFindings:
  - `GalleryGroup` renders its own `<section id={group.id}>`; wrapping a curated group in an outer `<section>` with the same id creates a duplicate DOM id. Use a distinct group id (here: `kam-gallery` inside section `kam-screens`).
  - Landing is a standalone Vite+React app (`apps/landing`, version 2.0.0); `typecheck` is a no-op echo, so `build` is the real gate.
  - All 6 curated screens reuse already-referenced desktop/mobile image paths — no new assets required.
- reusableRules:
  - For KAM-facing copy in this repo: frame operational fields as hypotheses ("könnte ansetzen"), never as asserted Rauschenberger problems.
  - New landing sections should reuse the eyebrow / section-head / section-lead pattern and the existing color tokens rather than introducing new palette values.
- gotchas:
  - The Claude Preview MCP resolves `.claude/launch.json` at the workspace root (baum-os), not the app dir — using it would write outside the intended repo scope. Prefer `npm run build` + bundle grep, or repo-root Playwright, for landing evidence.
  - `dist/` is gitignored; rebuilding does not dirty tracked files.

## Review

- status: pass
- risks:
  - Visual layout verified via green build + bundle grep and (post-commit) repo-root Playwright screenshot, not via manual cross-browser QA.
  - Copy is German marketing-facing and addresses a real external KAM contact; wording should get a human read before any external send.
  - `pilot@bevero.de` mailto target is a placeholder carried over from the prior CTA — confirm the correct inbox before distribution.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Human copy review of the KAM section + confirm the contact inbox; optionally deploy a preview to Vercel for Tann.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-26-landing-kam-onboarding.md`
