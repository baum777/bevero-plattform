# Landing Screenshot Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every Bevero product screenshot in exactly one owning content section across all three landing-page tabs while preserving all 15 assets, the 3-tab navigation, modal enlargement, KAM framing, CTA and responsive behavior.

**Architecture:** Move screenshot metadata and ownership into a pure JavaScript registry. Content sections request their assigned screenshot IDs from that registry; no section defines image paths locally. The workflow becomes a text-led nine-step sequence with one canonical `Heute` proof image, while Hero and secondary tabs stop repeating screenshots owned elsewhere. Modal enlargement is a transient viewer and is excluded from content-placement uniqueness.

**Tech Stack:** Vite 5, React 18, JavaScript modules, CSS, Node.js built-in test runner, in-app browser validation.

---

### Task 1: Establish the screenshot-ownership contract

**Files:**
- Create: `apps/landing/tests/screenshot-ownership.test.mjs`
- Modify: `apps/landing/package.json`
- Create: `apps/landing/src/screenshotRegistry.js`

- [ ] **Step 1: Write the failing ownership test**

Create a Node test that imports `SCREENSHOTS`, `SECTION_SCREENSHOT_IDS` and `screensFor` from `src/screenshotRegistry.js`. Assert that:

```js
const assignedIds = Object.values(SECTION_SCREENSHOT_IDS).flat();
assert.equal(Object.keys(SCREENSHOTS).length, 15);
assert.equal(new Set(assignedIds).size, assignedIds.length);
assert.deepEqual(new Set(assignedIds), new Set(Object.keys(SCREENSHOTS)));
assert.equal(new Set(Object.values(SCREENSHOTS).map((screen) => screen.src)).size, 15);
```

Also assert the required section counts: KAM 6, workflow 1, mobile 3, details 2, kitchen 1, vision 1, IT 1.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm --workspace=apps/landing run test:screenshot-ownership
```

Expected: FAIL because `src/screenshotRegistry.js` does not exist.

- [ ] **Step 3: Implement the registry**

Define each of the 15 screenshot paths once. Export:

```js
export const SCREENSHOTS = { /* 15 canonical records */ };
export const SECTION_SCREENSHOT_IDS = {
  kam: ["dashboard", "barRefill", "goodsReceipt", "movements", "shiftHandover", "mobileApprovals"],
  workflow: ["today"],
  mobile: ["mobileDashboard", "mobileQuickActions", "mobileBarRefill"],
  details: ["alerts", "inventoryItems"],
  kitchen: ["storage"],
  vision: ["workspaces"],
  it: ["teamRoles"],
};
export const screensFor = (section) => SECTION_SCREENSHOT_IDS[section].map((id) => SCREENSHOTS[id]);
```

- [ ] **Step 4: Run the ownership test and verify GREEN**

Expected: two passing Node tests, no duplicate ID, path or owner.

### Task 2: Refactor content sections to canonical ownership

**Files:**
- Modify: `apps/landing/src/App.jsx`
- Modify: `apps/landing/src/styles.css`

- [ ] **Step 1: Import the registry and remove local screenshot path definitions**

Remove `D`, `M`, duplicated gallery arrays and direct image-path literals from `App.jsx`. Build section data through `screensFor(...)`.

- [ ] **Step 2: Make the Hero explanatory rather than duplicative**

Keep the existing before/after comparison. Remove Dashboard and Mobile-Dashboard screenshot markup from the Hero. Preserve all Hero copy and CTAs.

- [ ] **Step 3: Keep the six KAM screenshots as the primary proof**

Render `screensFor("kam")` directly through a shared `ScreenshotGrid`. Remove the nested duplicate `GalleryGroup` heading.

- [ ] **Step 4: Convert workflow to text-led depth**

Keep all nine steps and navigation. Remove per-step image paths. Render `screensFor("workflow")[0]` once as the canonical `Schichtstart & Heute` proof image; active-step changes update only the step caption.

- [ ] **Step 5: Assign remaining content owners**

- Mobile Betrieb: three mobile screens.
- Weitere Detailansichten: Alerts and Artikelstamm only.
- Küche & Lager: Lagerorte only.
- Vision: Arbeitsbereiche only.
- IT-Vertrauen: Team & Rollen only.

Replace removed repeated images with concise text references; do not add a new large section.

- [ ] **Step 6: Remove dead CSS and preserve responsive layout**

Delete Hero screenshot/phone rules no longer used. Add only the layout rules required for the single workflow proof and single-image Vision/IT sections. Preserve existing design tokens and 416px overflow behavior.

- [ ] **Step 7: Run test and build**

```bash
npm --workspace=apps/landing run test:screenshot-ownership
npm --workspace=apps/landing run build
git diff --check
```

Expected: all pass.

### Task 3: Record governed work-slice evidence

**Files:**
- Create: `docs/agent-team/mspr_logbook/2026-06-27-landing-screenshot-ownership.md`
- Create: `docs/agent-team/intent_logbook/2026-06-27-landing-screenshot-ownership.md`

- [ ] **Step 1: Create Code Change Context**

Record request, owner scope, all files read/changed, RED/GREEN evidence, build results, browser results, risks and next gate.

- [ ] **Step 2: Create Intent Memory**

Record the durable rule: one screenshot has one semantic owner; other sections explain or reference it rather than visually repeating it. Preserve the KAM-first six-screen proof and the transient-modal exception.

- [ ] **Step 3: Run work-documentation validation**

```bash
npm run check:work-docs
```

Expected: PASS with both records detected and no secret patterns.

### Task 4: Validate the complete rendered story

**Files:**
- Verify only; no additional files unless a validation failure requires a scoped fix.

- [ ] **Step 1: Validate source uniqueness**

Run the ownership test and confirm every screenshot path appears once in `screenshotRegistry.js` and nowhere in `App.jsx`.

- [ ] **Step 2: Validate all three tabs**

Open Pilot, Vision and IT tabs. Accumulate screenshot `src` values across their default DOM states. Expected: 15 unique content screenshots and no source assigned to two sections.

- [ ] **Step 3: Validate modal behavior**

Open one KAM screenshot, confirm the correct image/caption appears, close the modal and confirm the owning card remains. Treat modal as a transient viewer, not a second content owner.

- [ ] **Step 4: Validate mobile**

At a measured CSS `clientWidth` of 416px assert:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Also confirm stacked navigation, visible Hero CTA and readable screenshot grids.

- [ ] **Step 5: Validate browser integrity**

Expected: all images load, no console errors, CTA mailto still targets `twim.baum@proton.me` with the three-question body.

- [ ] **Step 6: Final scope check**

Confirm only planned source, test, package, plan and work-documentation files changed. Do not commit or push without a separate operator instruction.
