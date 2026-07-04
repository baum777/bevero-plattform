import { createDrafts, INVENTORY_SEED, SANDBOX_VERSION } from "./seed.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createInitialSandboxState() {
  return {
    version: SANDBOX_VERSION,
    activeWorkflowId: null,
    demoRole: "staff",
    drafts: createDrafts(),
    inventory: clone(INVENTORY_SEED),
    completedWorkflows: [],
    timeline: [],
  };
}

function updateStock(inventory, itemId, locationId, delta) {
  const item = inventory[itemId];
  if (!item || !(locationId in item.locations)) return inventory;
  return {
    ...inventory,
    [itemId]: {
      ...item,
      locations: {
        ...item.locations,
        [locationId]: item.locations[locationId] + delta,
      },
    },
  };
}

function completeInventory(state, workflowId, draft) {
  let inventory = state.inventory;

  if (workflowId === "goodsReceipt") {
    for (const position of draft.positions) {
      inventory = updateStock(inventory, position.itemId, draft.targetId, Number(position.actual));
    }
  }
  if (workflowId === "transfer") {
    inventory = updateStock(inventory, draft.itemId, draft.sourceId, -Number(draft.quantity));
    inventory = updateStock(inventory, draft.itemId, draft.targetId, Number(draft.quantity));
  }
  if (workflowId === "refill") {
    inventory = updateStock(inventory, draft.itemId, draft.sourceId, -Number(draft.quantity));
    inventory = updateStock(inventory, draft.itemId, draft.areaId, Number(draft.quantity));
  }
  if (workflowId === "correction" && draft.decision === "approved") {
    inventory = updateStock(inventory, draft.itemId, draft.locationId, Number(draft.delta));
  }
  return inventory;
}

function completionStatus(workflowId, draft) {
  if (workflowId === "correction") return draft.decision;
  return "completed";
}

export function sandboxReducer(state, action) {
  switch (action.type) {
    case "START_WORKFLOW":
      return { ...state, activeWorkflowId: action.workflowId };
    case "UPDATE_DRAFT":
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.workflowId]: { ...state.drafts[action.workflowId], ...action.patch },
        },
      };
    case "ADVANCE_STEP": {
      const draft = state.drafts[action.workflowId];
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.workflowId]: { ...draft, step: draft.step + 1 },
        },
      };
    }
    case "SWITCH_DEMO_ROLE":
      return { ...state, demoRole: action.role };
    case "COMPLETE_WORKFLOW": {
      const draft = state.drafts[action.workflowId];
      const status = completionStatus(action.workflowId, draft);
      return {
        ...state,
        activeWorkflowId: null,
        inventory: completeInventory(state, action.workflowId, draft),
        completedWorkflows: state.completedWorkflows.includes(action.workflowId)
          ? state.completedWorkflows
          : [...state.completedWorkflows, action.workflowId],
        timeline: [
          ...state.timeline,
          {
            id: `${action.workflowId}-${state.timeline.length + 1}`,
            workflowId: action.workflowId,
            status,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "HYDRATE":
      return action.state?.version === SANDBOX_VERSION ? action.state : state;
    case "RESET_SESSION":
      return createInitialSandboxState();
    default:
      return state;
  }
}
