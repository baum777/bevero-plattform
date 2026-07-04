import React, { useRef } from "react";

// A3 — Szenario-Auswahl.
// Desktop: vertikale Karten links. Mobile (<960px, CSS): horizontale Chips.
// Manuelles Aktivierungsmodell: Pfeiltasten bewegen den Fokus, Enter/Space aktiviert
// (Auto-Select bei Fokus wäre riskant, weil ein Wechsel den State zurücksetzt).
export default function SandboxScenarioTabs({
  scenarios,
  activeId,
  stepIndex,
  playedScenarios,
  pulseId,
  onSelect,
  onPulseEnd,
  registerTabRef,
}) {
  const localRefs = useRef([]);

  const focusTab = (index) => {
    const clamped = (index + scenarios.length) % scenarios.length;
    localRefs.current[clamped]?.focus();
  };

  const handleKeyDown = (event, index) => {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        focusTab(index - 1);
        break;
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        focusTab(index + 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(scenarios.length - 1);
        break;
      default:
        break;
    }
  };

  function badgeFor(scenario) {
    if (playedScenarios.includes(scenario.id)) return { text: "✓", label: "abgeschlossen" };
    if (scenario.id === activeId) return { text: `${stepIndex + 1}/3`, label: `Schritt ${stepIndex + 1} von 3` };
    return null;
  }

  return (
    <div
      className="sandbox-tabs"
      role="tablist"
      aria-label="Szenario wählen"
      aria-orientation="vertical"
    >
      <p className="sandbox-tabs-label" aria-hidden="true">
        Szenario wählen
      </p>
      {scenarios.map((scenario, index) => {
        const isActive = scenario.id === activeId;
        const badge = badgeFor(scenario);
        return (
          <button
            key={scenario.id}
            id={`sandbox-tab-${scenario.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="sandbox-cockpit-panel"
            tabIndex={isActive ? 0 : -1}
            ref={(el) => {
              localRefs.current[index] = el;
              registerTabRef(scenario.id, el);
            }}
            className={`sandbox-tab ${isActive ? "is-active" : ""} ${
              pulseId === scenario.id ? "is-pulse" : ""
            }`}
            onClick={() => onSelect(scenario.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onAnimationEnd={() => {
              if (pulseId === scenario.id) onPulseEnd();
            }}
          >
            <span className="sandbox-tab-icon" aria-hidden="true">
              {scenario.icon}
            </span>
            <span className="sandbox-tab-body">
              <span className="sandbox-tab-title">{scenario.navLabel}</span>
              <span className="sandbox-tab-entry">{scenario.entryLine}</span>
            </span>
            {badge ? (
              <span className="sandbox-tab-badge">
                <span aria-hidden="true">{badge.text}</span>
                <span className="sandbox-visually-hidden">{badge.label}</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
