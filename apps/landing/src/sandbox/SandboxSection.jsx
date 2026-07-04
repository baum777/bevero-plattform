import React, { useEffect, useReducer, useRef, useState } from "react";

import { createInitialSandboxState, sandboxReducer } from "./state.js";
import { loadSandboxSession, saveSandboxSession } from "./storage.js";
import { WorkflowPanel } from "./WorkflowPanel.jsx";
import { WORKFLOW_BY_ID, WORKFLOWS } from "./workflowConfig.js";
import "./sandbox.css";

function CockpitPreview({ state }) {
  return (
    <section className="sandbox-cockpit" aria-labelledby="sandbox-cockpit-title">
      <div className="sandbox-cockpit__head">
        <p className="sandbox-kicker">Session-Status</p>
        <h2 id="sandbox-cockpit-title">Demo-Cockpit</h2>
      </div>
      <div className="sandbox-cockpit__stats">
        <div className="sandbox-stat">
          <span className="sandbox-stat__value">{state.completedWorkflows.length}/5</span>
          <span className="sandbox-stat__label">Abgeschlossen</span>
        </div>
        <div className="sandbox-stat">
          <span className="sandbox-stat__value">{state.timeline.length}</span>
          <span className="sandbox-stat__label">Aktionen</span>
        </div>
        <div className="sandbox-stat">
          <span className="sandbox-stat__value">{state.demoRole === "manager" ? "Manager" : "Mitarbeiter"}</span>
          <span className="sandbox-stat__label">Rolle</span>
        </div>
      </div>
      <div className="sandbox-cockpit__timeline">
        <h3>Aktivitäts-Verlauf</h3>
        {state.timeline.length ? (
          <ol>
            {state.timeline.map((entry) => (
              <li key={entry.id}>
                <strong>{WORKFLOW_BY_ID[entry.workflowId].name}</strong>
                <span>{entry.status}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>Noch keine Demo-Aktionen.</p>
        )}
      </div>
    </section>
  );
}

function Dashboard({ state, startWorkflow }) {
  return (
    <section className="sandbox-dashboard" aria-labelledby="sandbox-dashboard-title">
      <div className="sandbox-dashboard__head">
        <div>
          <p className="sandbox-kicker">Workflow-Auswahl</p>
          <h2 id="sandbox-dashboard-title">Verfügbare Workflows</h2>
        </div>
        <strong>{state.completedWorkflows.length} von 5 abgeschlossen</strong>
      </div>
      <div className="sandbox-progress" aria-label={`${state.completedWorkflows.length} von 5 abgeschlossen`}>
        <span style={{ width: `${state.completedWorkflows.length * 20}%` }} />
      </div>
      <div className="sandbox-dashboard__grid">
        {WORKFLOWS.map((workflow) => (
          <button
            type="button"
            key={workflow.id}
            onClick={() => startWorkflow(workflow.id)}
            aria-label={`${workflow.name} Workflow ${state.completedWorkflows.includes(workflow.id) ? "(Erledigt)" : "(Starten)"}`}
          >
            <span>{state.completedWorkflows.includes(workflow.id) ? "Erledigt" : "Starten"}</span>
            <strong>{workflow.name}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SandboxSection() {
  const loadedRef = useRef(null);
  if (!loadedRef.current) loadedRef.current = loadSandboxSession();
  const [state, dispatch] = useReducer(sandboxReducer, loadedRef.current.state ?? createInitialSandboxState());
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(loadedRef.current.notice);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const result = saveSandboxSession(state);
    if (!result.ok) setNotice(result.error);
  }, [state]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    if (!open && dialog?.open) dialog.close();
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    
    const handleTab = (event) => {
      if (event.key !== "Tab") return;
      
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [open]);

  function startWorkflow(workflowId, trigger) {
    triggerRef.current = trigger ?? triggerRef.current;
    dispatch({ type: "START_WORKFLOW", workflowId });
    setOpen(true);
  }

  function requestClose() {
    const draft = state.activeWorkflowId ? state.drafts[state.activeWorkflowId] : null;
    if (draft?.step > 0 && !window.confirm("Demo-Fortschritt für diese Session behalten und schließen?")) return;
    setOpen(false);
    triggerRef.current?.focus?.();
  }

  function reset() {
    if (!window.confirm("Lokalen Demo-Stand in diesem Tab zurücksetzen?")) return;
    const activeWorkflowId = state.activeWorkflowId;
    dispatch({ type: "RESET_SESSION" });
    if (activeWorkflowId) dispatch({ type: "START_WORKFLOW", workflowId: activeWorkflowId });
    setNotice("Der lokale Demo-Stand wurde zurückgesetzt.");
  }

  return (
    <section id="sandbox" className="sandbox-section section-anchor container">
      <div className="sandbox-intro"><div><p className="eyebrow">Interaktive Produktdemo</p><h2 className="section-title">Fünf Abläufe. Ein kontrollierter Demo-Stand.</h2><p className="section-lead">Erleben Sie Warenfluss, Übergabe und Freigabe direkt im Browser – ohne Login, Backend oder produktive Buchung.</p></div><div className="sandbox-boundary"><strong>100 % lokal</strong><span>Keine Daten verlassen diesen Tab.</span></div></div>
      {notice ? <p className="sandbox-notice" role="status">{notice}</p> : null}
      <div className="sandbox-card-grid">
        {WORKFLOWS.map((workflow, index) => (
          <article className={`sandbox-card ${index === 3 ? "sandbox-card--featured" : ""}`} key={workflow.id}>
            <div><span className="sandbox-card__index">0{index + 1}</span><span>{workflow.duration}</span></div>
            <h3>{workflow.name}</h3><p>{workflow.purpose}</p><small>{workflow.role}</small>
            <button type="button" className="sandbox-button sandbox-button--secondary" aria-label={`${workflow.name} Demo starten`} onClick={(event) => startWorkflow(workflow.id, event.currentTarget)}>Demo starten</button>
          </article>
        ))}
      </div>

      <dialog ref={dialogRef} className="sandbox-dialog" onCancel={(event) => { event.preventDefault(); requestClose(); }} onClose={() => setOpen(false)}>
        <div className="sandbox-dialog__shell">
          <header className="sandbox-toolbar"><div><span className="sandbox-demo-badge">DEMO</span><span>keine produktive Buchung/Freigabe</span></div><div><button type="button" className="sandbox-button sandbox-button--quiet" onClick={reset}>Demo zurücksetzen</button><button type="button" className="sandbox-close" aria-label="Sandbox schließen" onClick={requestClose}>×</button></div></header>
          <main className="sandbox-dialog__content">
            {state.activeWorkflowId ? (
              <WorkflowPanel state={state} dispatch={dispatch} />
            ) : (
              <div className="sandbox-layout-grid">
                <CockpitPreview state={state} />
                <Dashboard state={state} startWorkflow={startWorkflow} />
              </div>
            )}
          </main>
          <footer className="sandbox-dialog__footer"><span>Fiktive Daten · Session-only</span><span>Keine API · keine Supabase-Verbindung</span></footer>
        </div>
      </dialog>
    </section>
  );
}
