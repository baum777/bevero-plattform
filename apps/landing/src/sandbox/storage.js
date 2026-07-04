import { createInitialSandboxState } from "./state.js";
import { SANDBOX_VERSION } from "./seed.js";

export const SANDBOX_STORAGE_KEY = `bevero-sandbox:v${SANDBOX_VERSION}`;

function browserStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function loadSandboxSession(storage = browserStorage()) {
  const fallback = createInitialSandboxState();
  if (!storage) return { state: fallback, notice: null };
  try {
    const raw = storage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return { state: fallback, notice: null };
    const state = JSON.parse(raw);
    if (state?.version !== SANDBOX_VERSION) {
      storage.removeItem(SANDBOX_STORAGE_KEY);
      return { state: fallback, notice: "Die Demo-Version hat sich geändert und wurde zurückgesetzt." };
    }
    return { state, notice: null };
  } catch {
    storage.removeItem?.(SANDBOX_STORAGE_KEY);
    return { state: fallback, notice: "Der beschädigte Demo-Stand wurde zurückgesetzt." };
  }
}

export function saveSandboxSession(state, storage = browserStorage()) {
  if (!storage) return { ok: true, error: null };
  try {
    storage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(state));
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: "Der Demo-Stand konnte in diesem Tab nicht gespeichert werden.",
    };
  }
}
