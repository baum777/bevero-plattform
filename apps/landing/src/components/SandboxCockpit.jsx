import React from "react";

// A4 — Mini-Cockpit + A7 — Abschluss-Panel (ersetzt den View-Bereich in Schritt 3).
// Ein Primär-CTA pro Schritt. In Schritt 1/2 lebt er unten im Cockpit; in Schritt 3
// ist der Primär-CTA „Diesen Ablauf als Pilot prüfen" Teil des Abschluss-Panels.

const BADGE_TONE = {
  "kritisch": "red",
  "ok": "green",
  "nicht sichtbar": "amber",
  "verfügbar": "green",
  "Prio hoch": "red",
  "Prio mittel": "amber",
  "erledigt": "green",
  "übergeben": "blue",
};

function StatusBadge({ label, prefix }) {
  const text = prefix ? `${prefix} ${label}` : label;
  const tone = BADGE_TONE[text] ?? BADGE_TONE[label] ?? "neutral";
  return <span className={`sandbox-badge sandbox-badge--${tone}`}>{text}</span>;
}

function formatDiff(actual, target) {
  const diff = actual - target;
  if (diff === 0) return "0";
  return diff < 0 ? `−${Math.abs(diff)}` : `+${diff}`;
}

function confirmedCount(confirmedItems) {
  return Object.values(confirmedItems).filter(Boolean).length;
}

/* ─── View: stock-table ─────────────────────────────────────────────── */
function StockTable({ viewData }) {
  return (
    <div className="sandbox-view">
      <table className="sandbox-table">
        <thead>
          <tr>
            {viewData.columns.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viewData.rows.map((row) => {
            const critical = row.status === "kritisch";
            return (
              <tr key={row.name} className={critical ? "is-critical" : "is-ok"}>
                <th scope="row" data-label="Artikel">
                  {row.name}
                </th>
                <td data-label="Soll">{row.target}</td>
                <td data-label="Ist">{row.actual}</td>
                <td data-label="Differenz" className={critical ? "is-strong" : ""}>
                  {formatDiff(row.actual, row.target)}
                </td>
                <td data-label="Status">
                  <StatusBadge label={row.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {viewData.footnote ? <p className="sandbox-view-foot">{viewData.footnote}</p> : null}
    </div>
  );
}

/* ─── View: delivery-list ───────────────────────────────────────────── */
function DeliveryList({ viewData }) {
  return (
    <div className="sandbox-view">
      <p className="sandbox-delivery-head">{viewData.deliveryHead}</p>
      <table className="sandbox-table">
        <thead>
          <tr>
            {viewData.columns.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viewData.rows.map((row) => (
            <tr key={row.name}>
              <th scope="row" data-label="Position">
                {row.name}
              </th>
              <td data-label="Menge">{row.qty}</td>
              <td data-label="Status">
                <StatusBadge label={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {viewData.warning ? (
        <p className="sandbox-view-warning">
          <span aria-hidden="true">⚠ </span>
          {viewData.warning}
        </p>
      ) : null}
    </div>
  );
}

/* ─── View: refill-checklist / booking-confirm (Toggle-Karten) ──────── */
function ConfirmChecklist({ viewData, confirmedItems, onToggle }) {
  return (
    <div className="sandbox-view">
      <p className="sandbox-view-title">{viewData.title}</p>
      <ul className="sandbox-cardlist">
        {viewData.items.map((item) => {
          const confirmed = Boolean(confirmedItems[item.key]);
          return (
            <li key={item.key} className={`sandbox-item ${confirmed ? "is-confirmed" : ""}`}>
              <div className="sandbox-item-main">
                <div className="sandbox-item-head">
                  <span className="sandbox-item-name">{item.name}</span>
                  {viewData.badgeBefore ? (
                    <StatusBadge label={confirmed ? viewData.badgeAfter : viewData.badgeBefore} />
                  ) : null}
                </div>
                {item.qty ? (
                  <span className="sandbox-item-sub">
                    {item.qty} · {item.source}
                  </span>
                ) : null}
                {item.target ? <span className="sandbox-item-sub">{item.target}</span> : null}
                {item.note ? (
                  <span className="sandbox-item-note">
                    <span aria-hidden="true">⚠ </span>
                    {item.note}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className={`sandbox-toggle ${confirmed ? "is-on" : ""}`}
                aria-pressed={confirmed}
                onClick={() => onToggle(item.key)}
              >
                {confirmed ? `✓ ${viewData.confirmedLabel}` : viewData.confirmLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── View: handover-board ──────────────────────────────────────────── */
function HandoverBoard({ viewData }) {
  return (
    <div className="sandbox-view">
      <ul className="sandbox-cardlist">
        {viewData.cards.map((card) => (
          <li key={card.key} className="sandbox-board-card">
            <div className="sandbox-board-top">
              <StatusBadge label={`Prio ${card.prio}`} />
              <span className="sandbox-board-resp">{card.responsibility}</span>
            </div>
            <p className="sandbox-board-text">{card.text}</p>
            <p className="sandbox-board-meta">{card.meta}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── View: handover-resolve (Segmented Choice pro Karte) ───────────── */
function HandoverResolve({ viewData, choices, onChoice }) {
  return (
    <div className="sandbox-view">
      <p className="sandbox-view-title">{viewData.title}</p>
      <ul className="sandbox-cardlist">
        {viewData.cards.map((card) => {
          const choice = choices[card.key];
          return (
            <li key={card.key} className="sandbox-resolve-card">
              <div className="sandbox-resolve-head">
                <span className="sandbox-item-name">{card.text}</span>
                <StatusBadge label={`Prio ${card.prio}`} />
              </div>
              {viewData.question ? <p className="sandbox-resolve-q">{viewData.question}</p> : null}
              <div
                className="sandbox-segmented"
                role="radiogroup"
                aria-label={`Umgang mit: ${card.text}`}
              >
                {viewData.options.map((opt) => {
                  const selected = choice === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`sandbox-seg ${selected ? "is-selected" : ""}`}
                      onClick={() => onChoice(card.key, opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {choice ? (
                <p className="sandbox-resolve-consequence">{card.consequences[choice]}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── View: result-summary / A7 ─────────────────────────────────────── */
function buildResult(scenario, step, choices) {
  const vd = step.viewData;
  if (!scenario.derived) {
    return { checks: vd.checks, logLabel: vd.logLabel, log: vd.log, extraNote: null };
  }
  const cards = scenario.steps[1].viewData.cards;
  const anyHandover = cards.some((c) => choices[c.key] === "handover");
  const allDone = cards.every((c) => choices[c.key] === "done");
  const checks = [...vd.baseChecks];
  if (anyHandover) checks.push(vd.checkAnyHandover);
  else if (allDone) checks.push(vd.checkAllDone);

  const log = cards.map((card, i) => {
    const choice = choices[card.key];
    const text =
      choice === "handover"
        ? `${card.logLabel} → Nachtschicht · ${card.responsibility}`
        : `${card.logLabel} → ${card.logDone}`;
    return { time: vd.logTimes[i], text };
  });
  return { checks, logLabel: vd.logLabel, log, extraNote: vd.extraNote };
}

function ResultSummary({ scenario, step, choices, onReplay, onOtherScenario }) {
  const { checks, logLabel, log, extraNote } = buildResult(scenario, step, choices);
  return (
    <div className="sandbox-view sandbox-result">
      <ul className="sandbox-checks" aria-label="Ergebnis der Aktion">
        {checks.map((check, i) => (
          <li key={check} className="sandbox-check" style={{ "--i": i }}>
            <span className="sandbox-check-mark" aria-hidden="true">
              ✓
            </span>
            {check}
          </li>
        ))}
      </ul>

      <div className="sandbox-log">
        <p className="sandbox-log-label">{logLabel}</p>
        {log.map((line) => (
          <p key={line.text} className="sandbox-log-line">
            <span className="sandbox-log-time">{line.time}</span>
            <span>{line.text}</span>
          </p>
        ))}
      </div>

      {extraNote ? <p className="sandbox-result-note">{extraNote}</p> : null}

      <hr className="sandbox-divider" />

      <h3 className="sandbox-result-q">Passt dieser Ablauf zu Ihrem Standort?</h3>
      <div className="sandbox-result-cta">
        <a className="btn btn-primary" href="#einschaetzung">
          Diesen Ablauf als Pilot prüfen →
        </a>
        <div className="sandbox-result-secondary">
          <button type="button" className="sandbox-ghost-btn" onClick={onReplay}>
            ↻ Nochmal abspielen
          </button>
          <button type="button" className="sandbox-ghost-btn" onClick={onOtherScenario}>
            Anderes Szenario ▸
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Cockpit-Rahmen ────────────────────────────────────────────────── */
export default function SandboxCockpit({
  scenario,
  step,
  stepIndex,
  confirmedItems,
  choices,
  canAdvance,
  onToggle,
  onChoice,
  onAdvance,
  onReplay,
  onOtherScenario,
}) {
  const isResult = step.view === "result-summary";
  const total = step.requiresAllConfirmed
    ? step.viewData.items.length
    : step.requiresAllChoices
    ? step.viewData.cards.length
    : 0;
  const done = step.requiresAllConfirmed
    ? confirmedCount(confirmedItems)
    : step.requiresAllChoices
    ? Object.keys(choices).length
    : 0;
  const showCounter = total > 0 && !canAdvance;
  const ctaLabel = showCounter ? `${step.cta} (${done}/${total})` : step.cta;

  function renderView() {
    switch (step.view) {
      case "stock-table":
        return <StockTable viewData={step.viewData} />;
      case "delivery-list":
        return <DeliveryList viewData={step.viewData} />;
      case "refill-checklist":
      case "booking-confirm":
        return (
          <ConfirmChecklist viewData={step.viewData} confirmedItems={confirmedItems} onToggle={onToggle} />
        );
      case "handover-board":
        return <HandoverBoard viewData={step.viewData} />;
      case "handover-resolve":
        return <HandoverResolve viewData={step.viewData} choices={choices} onChoice={onChoice} />;
      case "result-summary":
        return (
          <ResultSummary
            scenario={scenario}
            step={step}
            choices={choices}
            onReplay={onReplay}
            onOtherScenario={onOtherScenario}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div
      className="sandbox-cockpit"
      role="tabpanel"
      id="sandbox-cockpit-panel"
      aria-labelledby={`sandbox-tab-${scenario.id}`}
    >
      <div className="sandbox-cockpit-head">
        <span className="sandbox-cockpit-context">
          Restaurant Adler · {scenario.area}
        </span>
        <span className="sandbox-watermark" aria-hidden="true">
          [DEMO]
        </span>
      </div>

      <div className="sandbox-cockpit-body" key={`${scenario.id}-${stepIndex}`}>
        {renderView()}
      </div>

      {!isResult ? (
        <div className="sandbox-cockpit-cta">
          <button
            type="button"
            className="btn btn-primary sandbox-primary"
            onClick={onAdvance}
            aria-disabled={!canAdvance}
            data-disabled={!canAdvance}
          >
            {ctaLabel}
          </button>
          {total > 0 && !canAdvance ? (
            <p className="sandbox-cta-hint">
              {step.requiresAllChoices
                ? "Entscheide alle Punkte, um fortzufahren."
                : "Bestätige alle Positionen, um fortzufahren."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
