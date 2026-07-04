import { describe, expect, test } from "vitest";

import { validateWorkflowStep } from "../../src/sandbox/schemas.js";
import {
  createInitialSandboxState,
  sandboxReducer,
} from "../../src/sandbox/state.js";
import {
  SANDBOX_STORAGE_KEY,
  loadSandboxSession,
  saveSandboxSession,
} from "../../src/sandbox/storage.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("sandbox state", () => {
  test("creates the same isolated seed for every new session", () => {
    const first = createInitialSandboxState();
    const second = createInitialSandboxState();

    expect(first).toEqual(second);
    expect(first.version).toBe(1);
    expect(first.activeWorkflowId).toBeNull();
    expect(first.completedWorkflows).toEqual([]);
    expect(first.timeline).toEqual([]);
    expect(first.inventory["mineralwasser"].locations.hauptlager).toBe(48);
  });

  test("supports start, draft update, step advance, role switch and reset", () => {
    let state = createInitialSandboxState();
    state = sandboxReducer(state, { type: "START_WORKFLOW", workflowId: "transfer" });
    state = sandboxReducer(state, {
      type: "UPDATE_DRAFT",
      workflowId: "transfer",
      patch: { sourceId: "hauptlager", targetId: "bar", itemId: "mineralwasser", quantity: 6 },
    });
    state = sandboxReducer(state, { type: "ADVANCE_STEP", workflowId: "transfer" });
    state = sandboxReducer(state, { type: "SWITCH_DEMO_ROLE", role: "manager" });

    expect(state.activeWorkflowId).toBe("transfer");
    expect(state.drafts.transfer.step).toBe(1);
    expect(state.drafts.transfer.quantity).toBe(6);
    expect(state.demoRole).toBe("manager");
    expect(sandboxReducer(state, { type: "RESET_SESSION" })).toEqual(createInitialSandboxState());
  });

  test("hydrates only a version-one state", () => {
    const state = createInitialSandboxState();
    const hydrated = sandboxReducer(state, {
      type: "HYDRATE",
      state: { ...state, demoRole: "manager" },
    });

    expect(hydrated.demoRole).toBe("manager");
    expect(sandboxReducer(state, { type: "HYDRATE", state: { version: 2 } })).toEqual(state);
  });

  test("completes transfers by changing both locations and appending a timeline entry", () => {
    let state = createInitialSandboxState();
    state = sandboxReducer(state, {
      type: "UPDATE_DRAFT",
      workflowId: "transfer",
      patch: { sourceId: "hauptlager", targetId: "bar", itemId: "mineralwasser", quantity: 6 },
    });
    const beforeTimeline = state.timeline;
    state = sandboxReducer(state, { type: "COMPLETE_WORKFLOW", workflowId: "transfer" });

    expect(state.inventory.mineralwasser.locations.hauptlager).toBe(42);
    expect(state.inventory.mineralwasser.locations.bar).toBe(18);
    expect(state.completedWorkflows).toContain("transfer");
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline).not.toBe(beforeTimeline);
    expect(state.timeline[0].workflowId).toBe("transfer");
  });

  test("applies approved corrections and keeps rejected corrections mutation-free", () => {
    const initial = createInitialSandboxState();
    const prepared = sandboxReducer(initial, {
      type: "UPDATE_DRAFT",
      workflowId: "correction",
      patch: { itemId: "mineralwasser", locationId: "bar", delta: -2, reason: "Bruch", decision: "approved" },
    });
    const approved = sandboxReducer(prepared, {
      type: "COMPLETE_WORKFLOW",
      workflowId: "correction",
    });
    expect(approved.inventory.mineralwasser.locations.bar).toBe(10);

    const rejectedPrepared = sandboxReducer(initial, {
      type: "UPDATE_DRAFT",
      workflowId: "correction",
      patch: { itemId: "mineralwasser", locationId: "bar", delta: -2, reason: "Bruch", decision: "rejected" },
    });
    const rejected = sandboxReducer(rejectedPrepared, {
      type: "COMPLETE_WORKFLOW",
      workflowId: "correction",
    });
    expect(rejected.inventory.mineralwasser.locations.bar).toBe(12);
    expect(rejected.timeline[0].status).toBe("rejected");
  });
});

describe("workflow validation", () => {
  const state = createInitialSandboxState();

  test("rejects the same transfer source and target", () => {
    const result = validateWorkflowStep("transfer", 0, {
      sourceId: "bar",
      targetId: "bar",
      itemId: "mineralwasser",
      quantity: 2,
    }, state);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unterscheiden/i);
  });

  test("rejects a transfer quantity above available stock", () => {
    const result = validateWorkflowStep("transfer", 1, {
      sourceId: "bar",
      targetId: "hauptlager",
      itemId: "mineralwasser",
      quantity: 99,
    }, state);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Bestand/i);
  });

  test("requires a non-zero correction with a reason", () => {
    expect(validateWorkflowStep("correction", 1, {
      itemId: "mineralwasser",
      locationId: "bar",
      delta: 0,
      reason: "",
    }, state).success).toBe(false);
  });

  test("requires every checklist item and both handover signatures", () => {
    const draft = state.drafts.handover;
    expect(validateWorkflowStep("handover", 1, draft, state).success).toBe(false);
    expect(validateWorkflowStep("handover", 2, {
      ...draft,
      checklist: Object.fromEntries(Object.keys(draft.checklist).map((key) => [key, "done"])),
    }, state).success).toBe(false);
  });
});

describe("sandbox session storage", () => {
  test("saves and restores a valid session", () => {
    const storage = memoryStorage();
    const state = { ...createInitialSandboxState(), demoRole: "manager" };

    expect(saveSandboxSession(state, storage)).toEqual({ ok: true, error: null });
    expect(loadSandboxSession(storage)).toEqual({ state, notice: null });
  });

  test("discards corrupt and foreign-version sessions", () => {
    const corrupt = memoryStorage({ [SANDBOX_STORAGE_KEY]: "{" });
    expect(loadSandboxSession(corrupt).notice).toMatch(/zurückgesetzt/i);

    const foreign = memoryStorage({
      [SANDBOX_STORAGE_KEY]: JSON.stringify({ version: 2 }),
    });
    const foreignResult = loadSandboxSession(foreign);
    expect(foreignResult.state).toEqual(createInitialSandboxState());
    expect(foreignResult.notice).toMatch(/Version/i);
  });

  test("reports storage quota failures without throwing", () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
      removeItem: () => undefined,
    };
    expect(saveSandboxSession(createInitialSandboxState(), storage)).toEqual({
      ok: false,
      error: "Der Demo-Stand konnte in diesem Tab nicht gespeichert werden.",
    });
  });
});
