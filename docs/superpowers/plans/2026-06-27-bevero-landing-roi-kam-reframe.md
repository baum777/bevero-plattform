# Bevero Landing ROI/KAM Reframe Implementation Plan

## Addendum — Database and adapter status

- Verify repository evidence before strengthening technical claims.
- State the site-coupled database and integrated FoodNotify/Gastronovi adapter logic in Hero, ROI, Gaps, Trust, IT and CTA.
- Preserve the distinction between implemented adapter logic and productive partner connectivity, writeback, ordering or rollout.
- Extend the content gate to the four-question KAM mail body and explicit non-claims.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the existing Bevero landing page around an honest, measurable operational-hub and ROI narrative for Key Account without changing architecture, dependencies, assets or screenshot ownership.

**Architecture:** Keep the three-tab React structure and all 15 canonical screenshot owners. Add two content sections (`#roi`, `#messpunkte`) using existing card/grid patterns, transform the current KAM hypotheses into operational gaps, and update Hero, Trust, Vision, IT and CTA copy. A source-level Node test protects the required content, order and hard boundaries before browser validation.

**Tech Stack:** Vite 5, React 18, plain CSS, Node.js built-in test runner, in-app browser.

---

### Task 1: Establish ROI/KAM content gates

**Files:**
- Create: `apps/landing/tests/roi-kam-content.test.mjs`
- Read: `apps/landing/src/App.jsx`
- Read: `apps/landing/src/screenshotRegistry.js`

- [ ] Write a Node test that reads both source files and asserts the new Hero H1, `#roi`, `#messpunkte`, Gap title, Trust boundaries, CTA title/subject/body and six ROI-oriented screenshot questions.
- [ ] Assert `#roi` appears before `#kam-screens` and `#messpunkte` appears after `#kam-screens` but before `#workflow`.
- [ ] Assert the page explicitly says existing systems remain leading, Bevero is no replacement, there is no automatic writeback, no guaranteed ROI and no official Rauschenberger project.
- [ ] Run `node --test apps/landing/tests/roi-kam-content.test.mjs` and verify RED because required copy/sections are absent.

### Task 2: Reframe the Pilot tab

**Files:**
- Modify: `apps/landing/src/App.jsx`
- Modify: `apps/landing/src/styles.css`

- [ ] Replace Hero eyebrow, H1, two-paragraph lead, three CTAs and before/after comparison with the approved operational-hub language.
- [ ] Add `RoiSection` directly after Hero with five ROI cards and a non-guaranteed ROI formula.
- [ ] Transform `KamSection` into five operational Gap cards while retaining the component location and card design language.
- [ ] Rename the KAM screenshot section and use the registry descriptions as ROI/decision questions.
- [ ] Reframe the friction section as cost-generating operational friction.
- [ ] Add `MeasurementSection` after KAM screens with six pilot metrics and diagnostic questions.
- [ ] Update Trust columns and final CTA, including the approved mail subject/body and IT/Vision secondary buttons.
- [ ] Add only the CSS required for ROI, Gap, Measurement and button behavior; reuse existing tokens and responsive breakpoints.

### Task 3: Reframe supporting tabs and screenshot questions

**Files:**
- Modify: `apps/landing/src/App.jsx`
- Modify: `apps/landing/src/screenshotRegistry.js`

- [ ] Replace Vision H1, lead and three phase descriptions with pilot-to-hub and measurable-value framing.
- [ ] Replace IT lead and card set with system-leadership, no-writeback, roles, audit and pilotability boundaries.
- [ ] Update only the six KAM-owned screenshot `desc` values; preserve all screenshot IDs, paths and owners.
- [ ] Run screenshot ownership and ROI/KAM content tests; expected GREEN.

### Task 4: Record governed evidence

**Files:**
- Create: `docs/agent-team/mspr_logbook/2026-06-27-bevero-landing-roi-kam-reframe.md`
- Create: `docs/agent-team/intent_logbook/2026-06-27-bevero-landing-roi-kam-reframe.md`

- [ ] Record scope, RED/GREEN evidence, changed files, build/browser results, hard claim boundaries and next gate.
- [ ] Record durable intent: Bevero complements leading systems and makes operational hub value measurable without guaranteed ROI claims.

### Task 5: Verify the rendered page

**Files:**
- Verify only; do not modify `apps/landing/index.md`, backend, cockpit, package metadata, assets or deployment files.

- [ ] Run both Node tests, `npm --workspace=apps/landing run build` and `git diff --check`.
- [ ] Open all three tabs and confirm required headings/copy, 15/15 unique screenshots and unchanged owners.
- [ ] Open and close one screenshot modal.
- [ ] At measured CSS width 416px assert `scrollWidth === clientWidth`, readable ROI/metric cards and visible Hero CTA.
- [ ] Confirm mailto recipient, new subject and three approved questions; confirm zero broken images and zero console errors.
- [ ] Confirm the pre-existing untracked `apps/landing/index.md` remains unchanged and outside the patch.
