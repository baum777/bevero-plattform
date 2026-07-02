"use client";

import { useCallback, useEffect, useState } from "react";
import { RouteProgress } from "../../../components/ui/route-progress";
import { CountStepper } from "../../../components/ui/count-stepper";
import { VarianceChip } from "../../../components/ui/variance-chip";
import { CorrectionReasonSelect } from "../../../components/ui/correction-reason-select";
import { PendingApprovalBanner } from "../../../components/ui/pending-approval-banner";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";
import { useAuth } from "../../../providers/auth-provider";

import type { CorrectionReason } from "../../../components/ui/correction-reason-select";
import type { StockByLocationEntry, WalkRouteState } from "../../../../lib/types/walk-route";

function walkRouteCacheKey(date: string, workspaceGroupId: string): string {
  return `bevero-walk-route:${date}:${workspaceGroupId}`;
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function getVarianceLevel(delta: number): "ok" | "check" | "critical" {
  if (delta === 0) return "ok";
  if (Math.abs(delta) <= 2) return "check";
  return "critical";
}

type EscalationDrawerState = {
  inventoryItemId: string;
  itemName: string;
  expected: number;
  counted: number;
  unit: string;
  reason: CorrectionReason | "";
  note: string;
  submitting: boolean;
  error: string | null;
  submittedAt: string | null;
};

type WalkRouteClientProps = {
  locations: StockByLocationEntry[];
  workspaceGroupId: string;
};

export function WalkRouteClient({ locations, workspaceGroupId }: WalkRouteClientProps) {
  const { organizationId } = useAuth();
  const cacheKey = walkRouteCacheKey(today(), workspaceGroupId);
  const total = locations.length;

  const [state, setState] = useState<WalkRouteState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(cacheKey);
        if (saved) return JSON.parse(saved) as WalkRouteState;
      } catch {
        // ignore
      }
    }
    return { locationIndex: 0, counts: {}, paused: false, startedAt: new Date().toISOString() };
  });

  const [escalation, setEscalation] = useState<EscalationDrawerState | null>(null);
  const [pendingBanners, setPendingBanners] = useState<Record<string, string>>({});

  const persistState = useCallback((next: WalkRouteState) => {
    setState(next);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {
      // quota / private-mode
    }
  }, [cacheKey]);

  const location = locations[state.locationIndex] ?? null;

  function getCount(inventoryItemId: string, defaultStock: number): number {
    return state.counts[inventoryItemId] ?? defaultStock;
  }

  function setCount(inventoryItemId: string, value: number) {
    persistState({ ...state, counts: { ...state.counts, [inventoryItemId]: value } });
  }

  function goNext() {
    if (state.locationIndex < total - 1) {
      persistState({ ...state, locationIndex: state.locationIndex + 1 });
    }
  }

  function goPrev() {
    if (state.locationIndex > 0) {
      persistState({ ...state, locationIndex: state.locationIndex - 1 });
    }
  }

  function openEscalation(itemId: string, name: string, expected: number, counted: number, unit: string) {
    setEscalation({
      inventoryItemId: itemId,
      itemName: name,
      expected,
      counted,
      unit,
      reason: "",
      note: "",
      submitting: false,
      error: null,
      submittedAt: null
    });
  }

  async function submitEscalation() {
    if (!escalation || !escalation.reason) return;
    setEscalation((e) => e ? { ...e, submitting: true, error: null } : null);

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Keine Session.");

      const delta = escalation.counted - escalation.expected;

      await apiFetch("/correction-requests", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: {
          inventoryItemId: escalation.inventoryItemId,
          expectedDelta: delta,
          unit: escalation.unit,
          reason: escalation.reason,
          storageLocationId: location?.id,
          note: escalation.note || undefined,
          expectedQuantity: escalation.expected,
          countedQuantity: escalation.counted,
          sourceLabel: "Walk-Route"
        }
      });

      const submittedAt = new Date().toISOString();
      setPendingBanners((b) => ({ ...b, [escalation.inventoryItemId]: submittedAt }));
      setEscalation(null);
    } catch (err) {
      setEscalation((e) =>
        e ? { ...e, submitting: false, error: apiErrorMessage(err, "Fehler.") } : null
      );
    }
  }

  if (total === 0) {
    return (
      <div className="page-wrap">
        <EmptyState
          description="Keine Lagerorte für diesen Bereich gefunden."
          title="Keine Lagerorte"
        />
      </div>
    );
  }

  return (
    <div className="page-wrap walk-route-page">
      <RouteProgress current={state.locationIndex + 1} total={total} />

      {location ? (
        <>
          <header className="walk-route-location-header">
            <h1 className="page-title">{location.name}</h1>
            <div className="walk-route-badges">
              {location.temperatureZone ? (
                <span className="badge badge-info">{location.temperatureZone}</span>
              ) : null}
              {location.isTransferPoint ? (
                <span className="badge badge-neutral">Umschlag</span>
              ) : null}
            </div>
          </header>

          <ul className="walk-route-items">
            {location.items.map((item) => {
              const counted = getCount(item.inventoryItemId, item.currentStock);
              const delta = counted - item.currentStock;
              const level = getVarianceLevel(delta);
              const pending = pendingBanners[item.inventoryItemId];

              return (
                <li className="walk-route-item surface card" key={item.inventoryItemId}>
                  <div className="walk-route-item__header">
                    <span className="walk-route-item__name">{item.name}</span>
                    <span className="walk-route-item__unit">{item.unit}</span>
                  </div>
                  <p className="walk-route-item__expected">Erwartet: {item.currentStock} {item.unit}</p>
                  <CountStepper
                    label={`${item.name} zählen`}
                    onChange={(v) => setCount(item.inventoryItemId, v)}
                    value={counted}
                  />
                  <VarianceChip delta={delta} level={level} unit={item.unit} />

                  {pending ? (
                    <PendingApprovalBanner submittedAt={pending} />
                  ) : level === "critical" ? (
                    <button
                      className="btn btn-outline btn-sm walk-route-item__escalate"
                      onClick={() => openEscalation(item.inventoryItemId, item.name, item.currentStock, counted, item.unit)}
                      type="button"
                    >
                      Abweichung melden
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="walk-route-sticky-bar">
            <button
              className="btn btn-ghost"
              disabled={state.locationIndex === 0}
              onClick={goPrev}
              type="button"
            >
              ← Zurück
            </button>
            <button className="btn btn-ghost" onClick={() => persistState({ ...state, paused: true })} type="button">
              Pausieren
            </button>
            <button
              className="btn btn-primary"
              disabled={state.locationIndex >= total - 1}
              onClick={goNext}
              type="button"
            >
              Weiter →
            </button>
          </div>
        </>
      ) : null}

      {escalation ? (
        <div className="drawer-backdrop" onClick={() => setEscalation(null)} role="dialog" aria-modal="true">
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <strong>Abweichung melden: {escalation.itemName}</strong>
              <button aria-label="Schließen" className="btn btn-ghost btn-sm" onClick={() => setEscalation(null)} type="button">✕</button>
            </div>
            <p className="escalation-summary">
              Erwartet: {escalation.expected} · Gezählt: {escalation.counted} · Differenz: {escalation.counted - escalation.expected} {escalation.unit}
            </p>
            <CorrectionReasonSelect
              onChange={(v) => setEscalation((e) => e ? { ...e, reason: v } : null)}
              required
              value={escalation.reason}
            />
            <div className="field">
              <label className="field__label" htmlFor="escalation-note">Notiz (optional)</label>
              <textarea
                className="field__textarea"
                id="escalation-note"
                onChange={(e) => setEscalation((prev) => prev ? { ...prev, note: e.target.value } : null)}
                rows={3}
                value={escalation.note}
              />
            </div>
            {escalation.error ? <InlineError message={escalation.error} /> : null}
            <button
              className="btn btn-primary"
              disabled={!escalation.reason || escalation.submitting}
              onClick={submitEscalation}
              type="button"
            >
              {escalation.submitting ? "Sendet…" : "An Manager senden"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
