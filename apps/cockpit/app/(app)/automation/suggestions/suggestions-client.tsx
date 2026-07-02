"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";
import type {
  AutomationEvidence,
  AutomationSuggestionRow,
} from "../../../../lib/supabase/queries/automation-suggestions";
import { createClient } from "../../../../lib/supabase/client";

type SuggestionsClientProps = {
  canApprove: boolean;
  currentStatus: AutomationSuggestionRow["status"];
  currentType: AutomationSuggestionRow["type"] | null;
  organizationId: string;
  suggestions: AutomationSuggestionRow[];
  total: number;
};

const STATUS_LABELS: Record<AutomationSuggestionRow["status"], string> = {
  open: "Offen",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
  superseded: "Ersetzt",
};

const SEVERITY_LABELS: Record<AutomationSuggestionRow["severity"], string> = {
  info: "Info",
  warning: "Warnung",
  critical: "Kritisch",
};

const TYPE_LABELS: Record<string, string> = {
  refill: "Refill",
  receipt_alert: "Wareneingang offen",
  consumption_anomaly: "Verbrauchsanomalie",
  alert_consolidation: "Alert-Bündelung",
  custom: "Custom",
};

const REJECTION_PRESETS = [
  "Bereits erledigt",
  "Event / Sonderfall",
  "Falscher Bestand",
  "Nicht relevant",
  "Anderer Grund",
];

const STATUS_OPTIONS: AutomationSuggestionRow["status"][] = [
  "open",
  "approved",
  "rejected",
  "expired",
  "superseded",
];

const TYPE_OPTIONS: string[] = [
  "refill",
  "receipt_alert",
  "consumption_anomaly",
  "alert_consolidation",
  "custom",
];

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

function statusVariant(
  status: AutomationSuggestionRow["status"]
): "critical" | "info" | "neutral" | "ok" | "warning" {
  if (status === "open") return "warning";
  if (status === "approved") return "ok";
  if (status === "rejected") return "critical";
  return "neutral";
}

function severityVariant(
  severity: AutomationSuggestionRow["severity"]
): "critical" | "warning" | "neutral" {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "neutral";
}

const EVIDENCE_SOURCE_LABELS: Record<AutomationEvidence["source"], string> = {
  movement_history: "Bewegungshistorie",
  inventory_balance: "Bestandssaldo",
  bar_refill_run: "Auffüllrunde",
  goods_receipt: "Wareneingang",
  shift_handover: "Schichtübergabe",
  operational_note: "Operative Notiz",
  review_task: "Review Task",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(parsed));
}

export function SuggestionsClient({
  canApprove,
  currentStatus,
  currentType,
  organizationId,
  suggestions,
  total
}: SuggestionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSuggestion, setSelectedSuggestion] = useState<AutomationSuggestionRow | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showEvidence, setShowEvidence] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !removedIds.has(suggestion.id)),
    [suggestions, removedIds]
  );

  const visibleSelected = useMemo(() => {
    if (!selectedSuggestion) return null;
    if (removedIds.has(selectedSuggestion.id)) return null;
    return selectedSuggestion;
  }, [selectedSuggestion, removedIds]);

  function buildHrefWithStatus(status: string, type: string | null): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const query = params.toString();
    return query ? `/automation/suggestions?${query}` : "/automation/suggestions";
  }

  async function runAction(
    suggestion: AutomationSuggestionRow,
    action: "approve" | "reject"
  ): Promise<void> {
    setActionLoading(action);
    setActionError(null);

    try {
      const token = await readAccessToken();
      await apiFetch(
        `/admin/automation/suggestions/${suggestion.id}/${action}`,
        {
          method: "POST",
          accessToken: token,
          organizationId,
          requireOrganization: true,
          body: {
            reason: reason.trim() || undefined
          }
        }
      );

      setReason("");
      setRemovedIds((current) => {
        const next = new Set(current);
        next.add(suggestion.id);
        return next;
      });
      setSelectedSuggestion(null);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setActionError(apiErrorMessage(error, "Aktion fehlgeschlagen."));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="state-stack">
      <section className="surface-card">
        <h3 className="surface-card-title">Filter</h3>
        <div className="toolbar-row storage-toolbar" role="group" aria-label="Filter">
          <label className="toolbar-input" htmlFor="filter-status">
            Status
            <select
              id="filter-status"
              onChange={(event) => {
                const next = event.target.value;
                router.push(buildHrefWithStatus(next, currentType));
              }}
              value={currentStatus}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-input" htmlFor="filter-type">
            Typ
            <select
              id="filter-type"
              onChange={(event) => {
                const next = event.target.value || null;
                router.push(buildHrefWithStatus(currentStatus, next));
              }}
              value={currentType ?? ""}
            >
              <option value="">Alle</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {TYPE_LABELS[option] ?? option}
                </option>
              ))}
            </select>
          </label>
          <Link className="state-link" href="/automation/suggestions">
            Zurücksetzen
          </Link>
        </div>
        <p className="state-desc">
          {`${total} Vorschlag${total === 1 ? "" : "e"} insgesamt${currentType ? ` (Typ: ${TYPE_LABELS[currentType] ?? currentType})` : ""}`}
        </p>
      </section>

      {visibleSuggestions.length === 0 ? (
        <p className="state-desc">
          {removedIds.size > 0
            ? "Alle Vorschläge in dieser Ansicht wurden gerade freigegeben oder abgelehnt. Lade die Seite neu, um den aktuellen Stand zu sehen."
            : "Keine Vorschläge in dieser Ansicht."}
        </p>
      ) : (
        <div className="state-list">
          {visibleSuggestions.map((suggestion) => (
            <article className="surface-card" key={suggestion.id}>
              <header className="card-row">
                <div>
                  <h3 className="surface-card-title">{suggestion.title}</h3>
                  <p className="state-desc">
                    {`${TYPE_LABELS[suggestion.type] ?? suggestion.type} · erstellt ${formatDate(suggestion.createdAt)}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge variant={severityVariant(suggestion.severity)}>
                    {SEVERITY_LABELS[suggestion.severity]}
                  </Badge>
                  <Badge variant={statusVariant(suggestion.status)}>
                    {STATUS_LABELS[suggestion.status]}
                  </Badge>
                </div>
              </header>
              <p className="state-desc">{suggestion.detail}</p>
              {suggestion.explanation ? (
                <details style={{ marginTop: "0.5rem" }}>
                  <summary className="state-link" style={{ cursor: "pointer", fontWeight: 500 }}>
                    Warum dieser Vorschlag?
                  </summary>
                  <p className="state-desc" style={{ marginTop: "0.375rem", whiteSpace: "pre-line" }}>
                    {suggestion.explanation}
                  </p>
                </details>
              ) : null}
              {Array.isArray(suggestion.evidence) && suggestion.evidence.length > 0 ? (
                <details
                  open={showEvidence === suggestion.id}
                  onToggle={(e) =>
                    setShowEvidence(
                      (e.target as HTMLDetailsElement).open ? suggestion.id : null
                    )
                  }
                  style={{ marginTop: "0.5rem" }}
                >
                  <summary className="state-link" style={{ cursor: "pointer", fontWeight: 500 }}>
                    {`Evidenz (${suggestion.evidence.length} Datenpunkte)`}
                  </summary>
                  <dl className="state-list" style={{ marginTop: "0.375rem" }}>
                    {suggestion.evidence.map((ev, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <dt style={{ fontWeight: 500, minWidth: "10rem" }}>
                          {ev.label}
                          <span className="state-desc" style={{ display: "block", fontWeight: 400 }}>
                            {EVIDENCE_SOURCE_LABELS[ev.source] ?? ev.source}
                          </span>
                        </dt>
                        <dd>{ev.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
              <div className="state-action-row">
                <Button
                  disabled={isPending}
                  onClick={() => {
                    setSelectedSuggestion(suggestion);
                    setActionError(null);
                    setReason("");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Details
                </Button>
                {suggestion.status === "open" && canApprove ? (
                  <>
                    <Button
                      disabled={isPending || actionLoading !== null}
                      loading={actionLoading === "approve" && visibleSelected?.id === suggestion.id}
                      onClick={() => {
                        void runAction(suggestion, "approve");
                      }}
                      size="sm"
                      variant="primary"
                    >
                      Freigeben
                    </Button>
                    <Button
                      disabled={isPending || actionLoading !== null}
                      loading={actionLoading === "reject" && visibleSelected?.id === suggestion.id}
                      onClick={() => {
                        void runAction(suggestion, "reject");
                      }}
                      size="sm"
                      variant="danger"
                    >
                      Ablehnen
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {visibleSelected ? (
        <div
          aria-labelledby="suggestion-detail-title"
          aria-modal="true"
          className="state-panel"
          role="dialog"
        >
          <h3 className="surface-card-title" id="suggestion-detail-title">
            Vorschlag-Detail
          </h3>
          {/* ── Explainability ── */}
          {visibleSelected.explanation ? (
            <div className="surface-card" style={{ background: "var(--surface-secondary, #f8f9fa)", marginBottom: "0.75rem" }}>
              <h4 className="surface-card-title" style={{ fontSize: "0.875rem" }}>Warum dieser Vorschlag?</h4>
              <p className="state-desc" style={{ whiteSpace: "pre-line" }}>{visibleSelected.explanation}</p>
            </div>
          ) : null}

          {/* ── Evidence ── */}
          {Array.isArray(visibleSelected.evidence) && visibleSelected.evidence.length > 0 ? (
            <div className="surface-card" style={{ background: "var(--surface-secondary, #f8f9fa)", marginBottom: "0.75rem" }}>
              <h4 className="surface-card-title" style={{ fontSize: "0.875rem" }}>Evidenz</h4>
              <dl className="state-list">
                {visibleSelected.evidence.map((ev, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.25rem 0" }}>
                    <dt style={{ fontWeight: 500, minWidth: "10rem" }}>
                      {ev.label}
                      <span className="state-desc" style={{ display: "block", fontWeight: 400, fontSize: "0.75rem" }}>
                        {EVIDENCE_SOURCE_LABELS[ev.source] ?? ev.source}
                      </span>
                    </dt>
                    <dd style={{ fontFamily: "var(--font-mono, monospace)" }}>{ev.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <dl className="state-list">
            <dt>Titel</dt>
            <dd>{visibleSelected.title}</dd>
            <dt>Detail</dt>
            <dd>{visibleSelected.detail}</dd>
            <dt>Schwere</dt>
            <dd>
              <Badge variant={severityVariant(visibleSelected.severity)}>
                {SEVERITY_LABELS[visibleSelected.severity]}
              </Badge>
            </dd>
            <dt>Typ</dt>
            <dd>{TYPE_LABELS[visibleSelected.type] ?? visibleSelected.type}</dd>
            <dt>Status</dt>
            <dd>
              <Badge variant={statusVariant(visibleSelected.status)}>
                {STATUS_LABELS[visibleSelected.status]}
              </Badge>
            </dd>
            <dt>Erstellt</dt>
            <dd>{formatDate(visibleSelected.createdAt)}</dd>
            <dt>Läuft ab</dt>
            <dd>{formatDate(visibleSelected.expiresAt)}</dd>
            {visibleSelected.relatedItemIds.length > 0 ? (
              <>
                <dt>Bezugs-Items</dt>
                <dd>{visibleSelected.relatedItemIds.join(", ")}</dd>
              </>
            ) : null}
            {visibleSelected.status === "approved" ? (
              <>
                <dt>Freigegeben von</dt>
                <dd>{visibleSelected.approvedBy ?? "—"}</dd>
                <dt>Freigegeben am</dt>
                <dd>{formatDate(visibleSelected.approvedAt)}</dd>
              </>
            ) : null}
            {visibleSelected.status === "rejected" ? (
              <>
                <dt>Abgelehnt von</dt>
                <dd>{visibleSelected.rejectedBy ?? "—"}</dd>
                <dt>Abgelehnt am</dt>
                <dd>{formatDate(visibleSelected.rejectedAt)}</dd>
                <dt>Grund</dt>
                <dd>{visibleSelected.rejectionReason ?? "—"}</dd>
              </>
            ) : null}
          </dl>

          {visibleSelected.status === "open" && canApprove ? (
            <div className="toolbar-row storage-toolbar" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    className="state-link"
                    onClick={() => setReason(preset)}
                    style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", border: "1px solid var(--border)", borderRadius: "4px", background: reason === preset ? "var(--surface-active, #e5e7eb)" : "transparent", cursor: "pointer" }}
                    type="button"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label className="toolbar-input" htmlFor="action-reason">
                Begründung (Pflicht bei Ablehnung, optional bei Freigabe)
                <textarea
                  id="action-reason"
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  value={reason}
                />
              </label>
              <div className="state-action-row">
                <Button
                  disabled={isPending || actionLoading !== null}
                  loading={actionLoading === "approve"}
                  onClick={() => {
                    void runAction(visibleSelected, "approve");
                  }}
                  variant="primary"
                >
                  Genehmigen
                </Button>
                <Button
                  disabled={isPending || actionLoading !== null || reason.trim().length === 0}
                  loading={actionLoading === "reject"}
                  onClick={() => {
                    void runAction(visibleSelected, "reject");
                  }}
                  variant="danger"
                >
                  Ablehnen
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => {
                    setSelectedSuggestion(null);
                    setActionError(null);
                    setReason("");
                  }}
                  variant="outline"
                >
                  Schließen
                </Button>
              </div>
              {actionError ? (
                <p className="field-help" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="state-action-row">
            <Button
              disabled={isPending}
              onClick={() => {
                setSelectedSuggestion(null);
                setActionError(null);
                setReason("");
              }}
              variant="ghost"
            >
              Schließen
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
