import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  DEFAULT_SCENARIO_ID,
  SANDBOX_SECTION,
  sandboxScenarios,
  scenarioById,
  scenarioByParam,
} from "../data/sandboxScenarios.js";
import SandboxScenarioTabs from "./SandboxScenarioTabs.jsx";
import SandboxCockpit from "./SandboxCockpit.jsx";
import SandboxImpactPanel from "./SandboxImpactPanel.jsx";

const LAST_STEP = 2;

function initScenarioState(id, playedScenarios) {
  const scenario = scenarioById(id) ?? scenarioById(DEFAULT_SCENARIO_ID);
  return {
    scenarioId: scenario.id,
    stepIndex: 0,
    confirmedItems: {},
    choices: {},
    metrics: { ...scenario.metricsBefore },
    playedScenarios,
  };
}

function confirmedCount(confirmedItems) {
  return Object.values(confirmedItems).filter(Boolean).length;
}

function itemCountForStep(step) {
  if (step.requiresAllConfirmed) return step.viewData.items.length;
  if (step.requiresAllChoices) return step.viewData.cards.length;
  return 0;
}

export function canAdvanceFrom(scenario, state) {
  const step = scenario.steps[state.stepIndex];
  if (state.stepIndex >= LAST_STEP) return false;
  if (step.requiresAllConfirmed) {
    return confirmedCount(state.confirmedItems) === step.viewData.items.length;
  }
  if (step.requiresAllChoices) {
    return Object.keys(state.choices).length === step.viewData.cards.length;
  }
  return true;
}

function applyEffects(metrics, effects) {
  const next = { ...metrics };
  for (const { metric, to } of effects) next[metric] = to;
  return next;
}

function deriveHandoverMetrics(metrics, choices) {
  const handoverCount = Object.values(choices).filter((v) => v === "handover").length;
  return {
    ...metrics,
    openItems: handoverCount,
    documentedItems: 3,
    assignedResponsibility: handoverCount,
  };
}

function reducer(state, action) {
  const scenario = scenarioById(state.scenarioId);

  switch (action.type) {
    case "SELECT_SCENARIO": {
      if (!scenarioById(action.id)) return state;
      return initScenarioState(action.id, state.playedScenarios);
    }

    case "RESET":
      return initScenarioState(state.scenarioId, state.playedScenarios);

    case "TOGGLE_ITEM": {
      const step = scenario.steps[state.stepIndex];
      if (!step.requiresAllConfirmed) return state;
      const confirmedItems = { ...state.confirmedItems, [action.key]: !state.confirmedItems[action.key] };
      let metrics = state.metrics;
      if (step.tickMetric) {
        const before = scenario.metricsBefore[step.tickMetric] ?? 0;
        metrics = { ...state.metrics, [step.tickMetric]: before + confirmedCount(confirmedItems) };
      }
      return { ...state, confirmedItems, metrics };
    }

    case "SET_CHOICE": {
      const step = scenario.steps[state.stepIndex];
      if (!step.requiresAllChoices) return state;
      return { ...state, choices: { ...state.choices, [action.key]: action.value } };
    }

    case "ADVANCE": {
      // Guard: idempotent — nur gültig für den aktuellen Schritt (Spec C3).
      if (!canAdvanceFrom(scenario, state)) return state;
      const step = scenario.steps[state.stepIndex];
      let metrics = state.metrics;
      if (scenario.derived && step.requiresAllChoices) {
        metrics = deriveHandoverMetrics(state.metrics, state.choices);
      } else if (step.effects && step.effects.length) {
        metrics = applyEffects(state.metrics, step.effects);
      }
      const stepIndex = state.stepIndex + 1;
      let playedScenarios = state.playedScenarios;
      if (stepIndex === LAST_STEP && !playedScenarios.includes(state.scenarioId)) {
        playedScenarios = [...playedScenarios, state.scenarioId];
      }
      return { ...state, stepIndex, metrics, playedScenarios };
    }

    default:
      return state;
  }
}

// Deep-Link `#demo?szenario=bar|wareneingang|uebergabe` → Start-Szenario (Spec A §2.4).
function readDeepLinkScenarioId() {
  if (typeof window === "undefined") return DEFAULT_SCENARIO_ID;
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return DEFAULT_SCENARIO_ID;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const param = params.get("szenario");
  const scenario = param ? scenarioByParam(param) : null;
  return scenario ? scenario.id : DEFAULT_SCENARIO_ID; // ungültig → Default, kein Fehler
}

export default function SandboxDemo() {
  const [state, rawDispatch] = useReducer(reducer, undefined, () =>
    initScenarioState(readDeepLinkScenarioId(), []),
  );
  const [pulseId, setPulseId] = useState(null);

  const scenario = scenarioById(state.scenarioId);
  const step = scenario.steps[state.stepIndex];
  const canAdvance = canAdvanceFrom(scenario, state);

  const stepHeadingRef = useRef(null);
  const tabRefs = useRef({});
  const focusStepOnUpdate = useRef(false);

  const registerTabRef = useCallback((id, el) => {
    if (el) tabRefs.current[id] = el;
    else delete tabRefs.current[id];
  }, []);

  // Fokus nach jedem Schrittwechsel/Szenariowechsel auf die Schritt-Überschrift (A6).
  // Nicht beim ersten Mount — sonst würde die Seite ungefragt zur Demo springen.
  useEffect(() => {
    if (focusStepOnUpdate.current) {
      focusStepOnUpdate.current = false;
      stepHeadingRef.current?.focus();
    }
  }, [state.stepIndex, state.scenarioId]);

  const dispatch = useCallback((action) => {
    if (action.type === "ADVANCE" || action.type === "RESET" || action.type === "SELECT_SCENARIO") {
      focusStepOnUpdate.current = true;
    }
    rawDispatch(action);
  }, []);

  const handleSelect = useCallback(
    (id) => {
      if (id === state.scenarioId) return; // Klick auf aktive Karte: keine Aktion (Spec A3)
      dispatch({ type: "SELECT_SCENARIO", id });
    },
    [dispatch, state.scenarioId],
  );

  // A7 „Anderes Szenario": Fokus auf Tabs, nächstes unbespieltes Szenario 1× pulsen.
  const handleOtherScenario = useCallback(() => {
    const next =
      sandboxScenarios.find(
        (s) => s.id !== state.scenarioId && !state.playedScenarios.includes(s.id),
      ) ?? sandboxScenarios.find((s) => s.id !== state.scenarioId);
    if (!next) return;
    tabRefs.current[next.id]?.focus();
    setPulseId(next.id);
  }, [state.scenarioId, state.playedScenarios]);

  const { demoBar } = SANDBOX_SECTION;

  return (
    <section id="demo" className="section-anchor sandbox-section" aria-labelledby="sandbox-title">
      <div className="container sandbox-container">
        {/* A2 — Section-Kopf */}
        <div className="section-head sandbox-head">
          <p className="eyebrow">{SANDBOX_SECTION.eyebrow}</p>
          <h2 id="sandbox-title" className="section-title">
            {SANDBOX_SECTION.h2}
          </h2>
          <p className="section-lead">{SANDBOX_SECTION.subcopy}</p>
          <p className="sandbox-meta">
            <span aria-hidden="true">⏱ </span>
            {SANDBOX_SECTION.meta}
          </p>
        </div>

        <div className="sandbox-card">
          {/* A1 — Demo-Leiste (nie schließbar, immer sichtbar) */}
          <p className="sandbox-demobar">
            <span className="sandbox-pulse" aria-hidden="true" />
            <strong>{demoBar.label}</strong>
            <span className="sandbox-demobar-attrs sandbox-demobar-attrs--full">{demoBar.full}</span>
            <span className="sandbox-demobar-attrs sandbox-demobar-attrs--medium">{demoBar.medium}</span>
            <span className="sandbox-demobar-attrs sandbox-demobar-attrs--minimal">{demoBar.minimal}</span>
          </p>

          <div className="sandbox-grid">
            <SandboxScenarioTabs
              scenarios={sandboxScenarios}
              activeId={state.scenarioId}
              stepIndex={state.stepIndex}
              playedScenarios={state.playedScenarios}
              pulseId={pulseId}
              onSelect={handleSelect}
              onPulseEnd={() => setPulseId(null)}
              registerTabRef={registerTabRef}
            />

            {/* A6 — Schritt-Anzeige (Fokus-Ziel) */}
            <div className="sandbox-stepbar" aria-live="off">
              <h3
                className="sandbox-step-title"
                ref={stepHeadingRef}
                tabIndex={-1}
                id="sandbox-step-title"
              >
                Schritt {state.stepIndex + 1}/3 · {step.title}
              </h3>
              <span className="sandbox-visually-hidden">Schritt {state.stepIndex + 1} von 3</span>
              <span className="sandbox-dots" aria-hidden="true">
                {scenario.steps.map((s, i) => (
                  <span key={s.id} className={`sandbox-dot ${i <= state.stepIndex ? "is-on" : ""}`} />
                ))}
              </span>
            </div>

            <SandboxCockpit
              scenario={scenario}
              step={step}
              stepIndex={state.stepIndex}
              confirmedItems={state.confirmedItems}
              choices={state.choices}
              canAdvance={canAdvance}
              onToggle={(key) => dispatch({ type: "TOGGLE_ITEM", key })}
              onChoice={(key, value) => dispatch({ type: "SET_CHOICE", key, value })}
              onAdvance={() => dispatch({ type: "ADVANCE" })}
              onReplay={() => dispatch({ type: "RESET" })}
              onOtherScenario={handleOtherScenario}
            />

            <SandboxImpactPanel
              scenario={scenario}
              metrics={state.metrics}
              stepIndex={state.stepIndex}
            />

            {/* A6 — Sekundär-Aktionen (Primär-CTA lebt im Cockpit) */}
            <div className="sandbox-secondary">
              <button
                type="button"
                className="sandbox-ghost-btn"
                onClick={() => dispatch({ type: "RESET" })}
                disabled={state.stepIndex === 0}
                aria-label="Szenario zurücksetzen"
              >
                ↺ Zurücksetzen
              </button>
              <a className="sandbox-textlink" href="#pilot">
                Pilot-Messpunkte ansehen →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
