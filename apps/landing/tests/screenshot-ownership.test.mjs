import assert from "node:assert/strict";
import test from "node:test";

import {
  SCREENSHOTS,
  SECTION_SCREENSHOT_IDS,
  screensFor,
} from "../src/screenshotRegistry.js";

test("each screenshot has exactly one section owner", () => {
  const screenshotIds = Object.keys(SCREENSHOTS);
  const assignedIds = Object.values(SECTION_SCREENSHOT_IDS).flat();

  assert.equal(screenshotIds.length, 15);
  assert.equal(new Set(assignedIds).size, assignedIds.length);
  assert.deepEqual(new Set(assignedIds), new Set(screenshotIds));

  for (const [section, ids] of Object.entries(SECTION_SCREENSHOT_IDS)) {
    for (const id of ids) {
      assert.equal(SCREENSHOTS[id].owner, section);
    }
  }
});

test("section assignments preserve the approved screenshot distribution", () => {
  assert.equal(screensFor("kam").length, 6);
  assert.equal(screensFor("workflow").length, 1);
  assert.equal(screensFor("mobile").length, 3);
  assert.equal(screensFor("details").length, 2);
  assert.equal(screensFor("kitchen").length, 1);
  assert.equal(screensFor("vision").length, 1);
  assert.equal(screensFor("it").length, 1);

  const paths = Object.values(SCREENSHOTS).map((screen) => screen.src);
  assert.equal(new Set(paths).size, paths.length);
});
