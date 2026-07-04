import React, { useState } from "react";

import { buildShiftHandoverPdf } from "./pdf.js";
import { CHECKLIST_ITEMS, LOCATIONS, SUPPLIERS } from "./seed.js";
import { validateWorkflowStep } from "./schemas.js";
import { SignaturePad } from "./SignaturePad.jsx";
import { WORKFLOW_BY_ID } from "./workflowConfig.js";

function Select({ label, value, onChange, children }) {
  return (
    <label className="sandbox-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="sandbox-field">
      <span>{label}</span>
      <input type="number" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function LocationOptions() {
  return LOCATIONS.map((location) => <option key={location.id} value={location.id}>{location.name}</option>);
}

function ItemOptions({ inventory }) {
  return Object.values(inventory).map((item) => <option key={item.id} value={item.id}>{item.name}</option>);
}

function GoodsReceipt({ draft, dispatch, state }) {
  const patch = (value) => dispatch({ type: "UPDATE_DRAFT", workflowId: "goodsReceipt", patch: value });
  if (draft.step === 0) {
    return (
      <div className="sandbox-form-grid">
        <Select label="Lieferant" value={draft.supplierId} onChange={(supplierId) => patch({ supplierId })}>
          <option value="">Bitte auswählen</option>
          {SUPPLIERS.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.rating}</option>)}
        </Select>
        <Select label="Zielbereich" value={draft.targetId} onChange={(targetId) => patch({ targetId })}>
          <LocationOptions />
        </Select>
      </div>
    );
  }
  if (draft.step === 1) {
    return (
      <div className="sandbox-position-list">
        {draft.positions.map((position, index) => (
          <div className="sandbox-position" key={position.itemId}>
            <div><strong>{state.inventory[position.itemId].name}</strong><small>Erwartet: {position.expected}</small></div>
            <NumberField label="Ist-Menge" value={position.actual} onChange={(actual) => {
              const positions = draft.positions.map((entry, current) => current === index ? { ...entry, actual } : entry);
              patch({ positions });
            }} />
            <label className="sandbox-check"><input type="checkbox" checked={position.checked} onChange={(event) => {
              const positions = draft.positions.map((entry, current) => current === index ? { ...entry, checked: event.target.checked } : entry);
              patch({ positions });
            }} /> geprüft</label>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="sandbox-summary">
      <h3>Demo-Beleg</h3>
      <p>{draft.positions.length} Positionen wurden geprüft. Abweichungen bleiben ausschließlich in dieser Browser-Session.</p>
      <label className="sandbox-field"><span>Optionale Notiz</span><textarea value={draft.note} onChange={(event) => patch({ note: event.target.value })} /></label>
    </div>
  );
}

function Transfer({ draft, dispatch, state }) {
  const patch = (value) => dispatch({ type: "UPDATE_DRAFT", workflowId: "transfer", patch: value });
  if (draft.step === 0) return (
    <div className="sandbox-form-grid">
      <Select label="Quellbereich" value={draft.sourceId} onChange={(sourceId) => patch({ sourceId })}><LocationOptions /></Select>
      <Select label="Zielbereich" value={draft.targetId} onChange={(targetId) => patch({ targetId })}><LocationOptions /></Select>
      <Select label="Artikel" value={draft.itemId} onChange={(itemId) => patch({ itemId })}><ItemOptions inventory={state.inventory} /></Select>
      <NumberField label="Menge" value={draft.quantity} onChange={(quantity) => patch({ quantity })} />
    </div>
  );
  const current = state.inventory[draft.itemId].locations[draft.sourceId];
  return <div className="sandbox-impact"><span>Vorher: {current}</span><strong>Nachher: {current - draft.quantity}</strong><span>Ziel +{draft.quantity}</span></div>;
}

function Refill({ draft, dispatch, state }) {
  const patch = (value) => dispatch({ type: "UPDATE_DRAFT", workflowId: "refill", patch: value });
  if (draft.step === 0) return (
    <div className="sandbox-form-grid">
      <Select label="Zielbereich" value={draft.areaId} onChange={(areaId) => patch({ areaId })}><LocationOptions /></Select>
      <Select label="Artikel" value={draft.itemId} onChange={(itemId) => patch({ itemId })}><ItemOptions inventory={state.inventory} /></Select>
      <NumberField label="Menge" value={draft.quantity} onChange={(quantity) => patch({ quantity })} />
    </div>
  );
  const source = state.inventory[draft.itemId].locations[draft.sourceId];
  const target = state.inventory[draft.itemId].locations[draft.areaId];
  return <div className="sandbox-impact"><span>Lager {source} → {source - draft.quantity}</span><strong>{state.inventory[draft.itemId].name}</strong><span>Ziel {target} → {target + draft.quantity}</span></div>;
}

function Handover({ draft, dispatch }) {
  const [pdfMessage, setPdfMessage] = useState("");
  const patch = (value) => dispatch({ type: "UPDATE_DRAFT", workflowId: "handover", patch: value });
  if (draft.step === 0) return (
    <div className="sandbox-form-grid">
      <Select label="Schichttyp" value={draft.shiftType} onChange={(shiftType) => patch({ shiftType })}>
        <option value="">Bitte auswählen</option><option>Frühschicht</option><option>Mittelschicht</option><option>Nachtschicht</option>
      </Select>
      <Select label="Bereich" value={draft.areaId} onChange={(areaId) => patch({ areaId })}><LocationOptions /></Select>
      <label className="sandbox-field"><span>Abgebende Schicht</span><input value={draft.outgoingName} onChange={(event) => patch({ outgoingName: event.target.value })} /></label>
      <label className="sandbox-field"><span>Übernehmende Schicht</span><input value={draft.incomingName} onChange={(event) => patch({ incomingName: event.target.value })} /></label>
    </div>
  );
  if (draft.step === 1) return (
    <div className="sandbox-checklist">
      {CHECKLIST_ITEMS.map((item) => (
        <fieldset key={item.id}><legend>{item.category}</legend><span>{item.label}</span>
          <div><label><input type="radio" name={item.id} checked={draft.checklist[item.id] === "done"} onChange={() => patch({ checklist: { ...draft.checklist, [item.id]: "done" } })} /> erledigt</label>
          <label><input type="radio" name={item.id} checked={draft.checklist[item.id] === "na"} onChange={() => patch({ checklist: { ...draft.checklist, [item.id]: "na" } })} /> nicht zutreffend</label></div>
        </fieldset>
      ))}
      <label className="sandbox-field"><span>Offene Notiz</span><textarea value={draft.note} onChange={(event) => patch({ note: event.target.value })} /></label>
    </div>
  );
  if (draft.step === 2) return (
    <div className="sandbox-signatures">
      <SignaturePad label="Abgebende Schicht" name={draft.outgoingName} value={draft.outgoingSignature} onChange={(outgoingSignature) => patch({ outgoingSignature })} />
      <SignaturePad label="Übernehmende Schicht" name={draft.incomingName} value={draft.incomingSignature} onChange={(incomingSignature) => patch({ incomingSignature })} />
    </div>
  );
  return (
    <div className="sandbox-summary">
      <h3>Übergabe bereit</h3><p>Beide Demo-Bestätigungen liegen vor. Das PDF enthält keine produktive Freigabe.</p>
      <button type="button" className="sandbox-button sandbox-button--secondary" onClick={async () => {
        const result = await buildShiftHandoverPdf({
          ...draft,
          areaName: LOCATIONS.find((location) => location.id === draft.areaId)?.name,
          checklist: CHECKLIST_ITEMS.map((item) => ({ ...item, status: draft.checklist[item.id] })),
        });
        setPdfMessage(result.error ?? "Demo-PDF wurde erstellt.");
      }}>Demo-PDF herunterladen</button>
      {pdfMessage ? <p role="status">{pdfMessage}</p> : null}
    </div>
  );
}

function Correction({ draft, dispatch, state }) {
  const patch = (value) => dispatch({ type: "UPDATE_DRAFT", workflowId: "correction", patch: value });
  if (draft.step === 0) return (
    <div className="sandbox-form-grid">
      <Select label="Simulierter Vorgang" value={draft.movementId} onChange={(movementId) => patch({ movementId })}><option value="movement-001">Entnahme · Mineralwasser · Bar</option></Select>
      <Select label="Artikel" value={draft.itemId} onChange={(itemId) => patch({ itemId })}><ItemOptions inventory={state.inventory} /></Select>
      <Select label="Bereich" value={draft.locationId} onChange={(locationId) => patch({ locationId })}><LocationOptions /></Select>
    </div>
  );
  if (draft.step === 1) return (
    <div className="sandbox-form-grid"><NumberField label="Korrekturdelta" value={draft.delta} onChange={(delta) => patch({ delta })} />
      <label className="sandbox-field"><span>Pflichtgrund</span><textarea value={draft.reason} onChange={(event) => patch({ reason: event.target.value })} /></label></div>
  );
  if (draft.step === 2) return (
    <div className="sandbox-approval">
      <p>Aktive Demo-Rolle: <strong>{state.demoRole === "manager" ? "Manager" : "Mitarbeiter"}</strong></p>
      {state.demoRole !== "manager" ? (
        <button type="button" className="sandbox-button sandbox-button--secondary" onClick={() => dispatch({ type: "SWITCH_DEMO_ROLE", role: "manager" })}>
          Zur Demo-Manager-Rolle wechseln
        </button>
      ) : null}
      <div className="sandbox-approval__actions">
        <button type="button" disabled={state.demoRole !== "manager"} className="sandbox-button sandbox-button--primary" onClick={() => patch({ decision: "approved" })} aria-disabled={state.demoRole !== "manager"}>
          Genehmigen
        </button>
        <button type="button" disabled={state.demoRole !== "manager"} className="sandbox-button sandbox-button--danger" onClick={() => patch({ decision: "rejected" })} aria-disabled={state.demoRole !== "manager"}>
          Ablehnen
        </button>
      </div>
      {draft.decision ? <p className="sandbox-success">Entscheidung: {draft.decision === "approved" ? "genehmigt" : "abgelehnt"}</p> : null}
    </div>
  );
  return <div className="sandbox-summary"><h3>Entscheidung dokumentiert</h3><p>{draft.decision === "approved" ? "Die Demo-Bestandswirkung wird beim Abschluss angewendet." : "Der Bestand bleibt unverändert."}</p></div>;
}

const PANELS = { goodsReceipt: GoodsReceipt, transfer: Transfer, refill: Refill, handover: Handover, correction: Correction };
const FINAL_LABELS = {
  goodsReceipt: "Demo-Beleg bestätigen",
  transfer: "Umlagerung simulieren",
  refill: "Auffüllung simulieren",
  handover: "Übergabe abschließen",
  correction: "Entscheidung abschließen",
};

export function WorkflowPanel({ state, dispatch }) {
  const [error, setError] = useState("");
  const workflowId = state.activeWorkflowId;
  const workflow = WORKFLOW_BY_ID[workflowId];
  const draft = state.drafts[workflowId];
  const Panel = PANELS[workflowId];
  const finalStep = workflow.steps.length - 1;

  function next() {
    if (workflowId === "correction" && draft.step === 2 && state.demoRole !== "manager") {
      setError("Bitte zuerst zur Demo-Manager-Rolle wechseln.");
      return;
    }
    const validation = validateWorkflowStep(workflowId, draft.step, draft, state);
    if (!validation.success) { setError(validation.error); return; }
    setError("");
    if (draft.step === finalStep) dispatch({ type: "COMPLETE_WORKFLOW", workflowId });
    else dispatch({ type: "ADVANCE_STEP", workflowId });
  }

  return (
    <section className="sandbox-workflow" aria-labelledby="sandbox-workflow-title">
      <header><p className="sandbox-kicker">{workflow.role} · {workflow.duration}</p><h2 id="sandbox-workflow-title">{workflow.name}</h2></header>
      <ol className="sandbox-stepper" aria-label="Fortschritt">{workflow.steps.map((step, index) => <li key={step} className={index === draft.step ? "is-active" : index < draft.step ? "is-done" : ""}><span>{index + 1}</span>{step}</li>)}</ol>
      {error ? <p className="sandbox-alert" role="alert">{error}</p> : null}
      <Panel draft={draft} dispatch={dispatch} state={state} />
      <footer className="sandbox-workflow__actions">
        {draft.step > 0 ? (
          <button type="button" className="sandbox-button sandbox-button--quiet" onClick={() => dispatch({ type: "UPDATE_DRAFT", workflowId, patch: { step: draft.step - 1 } })}>
            Zurück
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="sandbox-button sandbox-button--primary" onClick={next}>
          {draft.step === finalStep ? FINAL_LABELS[workflowId] : "Weiter"}
        </button>
      </footer>
    </section>
  );
}
