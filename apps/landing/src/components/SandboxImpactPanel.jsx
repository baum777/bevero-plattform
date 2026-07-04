import React, { useEffect, useRef, useState } from "react";

// A5 — Wirkungsbox. Übersetzt jede Aktion in die Sprache der Pilot-Messpunkte.
// Regeln: Nachher-Werte nie vor der Aktion versprechen; neutrale Werte NICHT grün;
// jede Nutzenzahl trägt das Badge „Demo-Annahme" (aus isAssumption erzwungen).

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Count-up rein visuell (400 ms). Der accessible Wert steht sofort final im DOM
// (visually-hidden Zeile), daher ist die Animation aria-hidden.
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) {
      setDisplay(to);
      return undefined;
    }
    if (prefersReducedMotion()) {
      setDisplay(to);
      return undefined;
    }
    const duration = 400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span>{display}</span>;
}

export default function SandboxImpactPanel({ scenario, metrics, stepIndex }) {
  const { assumption } = scenario;
  const isResult = stepIndex === 2;
  const isStart = stepIndex === 0;

  return (
    <div
      className="sandbox-impact"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Wirkung"
    >
      <p className="sandbox-impact-label" aria-hidden="true">
        Wirkung
      </p>

      <div className="sandbox-impact-metrics">
        {scenario.metrics.map((metric) => {
          const before = scenario.metricsBefore[metric.key];
          const current = metrics[metric.key];
          const improved = isResult && !metric.neutral && current !== before;
          return (
            <div
              key={metric.key}
              className={`sandbox-metric ${improved ? "is-improved" : ""} ${
                isStart ? "is-start" : ""
              }`}
            >
              <span className="sandbox-metric-label">
                <span className="sandbox-metric-label--full">{metric.label}</span>
                <span className="sandbox-metric-label--short">{metric.short}</span>
              </span>
              <span className="sandbox-metric-values" aria-hidden="true">
                <span className="sandbox-metric-before">{before}</span>
                <span className="sandbox-metric-arrow">→</span>
                <span className="sandbox-metric-after">
                  <AnimatedNumber value={current} />
                </span>
              </span>
              <span className="sandbox-visually-hidden">
                {metric.label}: vorher {before}, jetzt {current}
              </span>
            </div>
          );
        })}
      </div>

      <hr className="sandbox-divider" />

      <div className={`sandbox-assumption ${isResult ? "is-active" : "is-pending"}`}>
        {isResult ? (
          <p className="sandbox-assumption-line">
            <span aria-hidden="true">ⓘ </span>
            {assumption.label}: {assumption.value}{" "}
            <span
              className="sandbox-assumption-badge"
              title="Demo-Annahme — kein gemessener Wert"
              aria-label="Demo-Annahme — kein gemessener Wert"
            >
              Demo-Annahme
            </span>
          </p>
        ) : (
          <p className="sandbox-assumption-line sandbox-assumption-line--pending">
            <span aria-hidden="true">ⓘ </span>
            {assumption.label} — wird nach Aktion sichtbar
          </p>
        )}
      </div>

      <a className="sandbox-textlink" href="#pilot">
        Passt zu den Pilot-Messpunkten →
      </a>
    </div>
  );
}
