"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VarianceChip } from "../../components/ui/variance-chip";
import { EvidenceDrawer } from "../../components/ui/evidence-drawer";
import { InlineError } from "../../components/ui/inline-error";
import { EmptyState } from "../../components/ui/empty-state";
import { createClient } from "../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../lib/backend/api-fetch";
import { useAuth } from "../../providers/auth-provider";

import type { CorrectionRequestListItem } from "../../../lib/types/correction-requests";

type FreigabenClientProps = {
  initialRequests: CorrectionRequestListItem[];
};

function varianceLevelFromDelta(delta: number): "ok" | "check" | "critical" {
  if (delta === 0) return "ok";
  if (Math.abs(delta) <= 2) return "check";
  return "critical";
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    consumption_not_booked: "Verbrauch nicht gebucht",
    delivery_missing: "Lieferung fehlt",
    spoilage: "Verderb / Schwund",
    other: "Sonstiges"
  };
  return map[reason] ?? reason;
}

export function FreigabenClient({ initialRequests }: FreigabenClientProps) {
  const router = useRouter();
  const { organizationId } = useAuth();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState<string | null>(initialRequests[0]?.id ?? null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const expectedQuantity = selected?.expectedQuantity ?? null;
  const countedQuantity = selected?.countedQuantity ?? null;
  const expectedFallback = selected ? expectedQuantity ?? 0 : 0;
  const countedFallback = selected ? countedQuantity ?? selected.expectedDelta : 0;

  async function doAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    setActionError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Keine Session.");

      await apiFetch(`/admin/correction-requests/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true
      });

      setRequests((prev) => prev.filter((r) => r.id !== id));
      const remaining = requests.filter((r) => r.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
      router.refresh();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Unbekannter Fehler."));
    } finally {
      setActioning(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="page-wrap">
        <EmptyState
          description="Alle Korrekturen wurden bereits bearbeitet."
          title="Keine offenen Freigaben"
        />
      </div>
    );
  }

  return (
    <div className="page-wrap freigaben-page">
      <header className="page-header">
        <h1 className="page-title">Freigaben</h1>
        <p className="page-desc">{requests.length} offen</p>
      </header>

      <div className="freigaben-layout">
        <aside className="freigaben-list surface">
          {requests.map((r) => {
            const level = varianceLevelFromDelta(r.expectedDelta);
            return (
              <button
                className={`freigaben-list-item${r.id === selectedId ? " freigaben-list-item--active" : ""}`}
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                type="button"
              >
                <VarianceChip level={level} delta={r.expectedDelta} unit={r.unit} />
                <span className="freigaben-list-item__name">{r.inventoryItemName}</span>
                <time className="freigaben-list-item__time" dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleDateString("de-DE")}
                </time>
              </button>
            );
          })}
        </aside>

        <main className="freigaben-detail surface card">
          {selected ? (
            <>
              <h2 className="freigaben-detail__title">{selected.inventoryItemName}</h2>
              {selected.storageLocationName ? (
                <p className="freigaben-detail__location">{selected.storageLocationName}</p>
              ) : null}

              <dl className="freigaben-detail__meta">
                <div>
                  <dt>Differenz</dt>
                  <dd>
                    <VarianceChip
                      level={varianceLevelFromDelta(selected.expectedDelta)}
                      delta={selected.expectedDelta}
                      unit={selected.unit}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Grund</dt>
                  <dd>{reasonLabel(selected.reason)}</dd>
                </div>
                <div>
                  <dt>Quelle</dt>
                  <dd>{selected.sourceLabel ?? "Walk-Route"}</dd>
                </div>
                <div>
                  <dt>Eingereicht</dt>
                  <dd>
                    {(selected.submittedAt ?? selected.createdAt)
                      ? new Date(selected.submittedAt ?? selected.createdAt).toLocaleString("de-DE")
                      : "—"}
                  </dd>
                </div>
                {selected.note ? (
                  <div>
                    <dt>Notiz</dt>
                    <dd>{selected.note}</dd>
                  </div>
                ) : null}
              </dl>

              {actionError ? <InlineError message={actionError} /> : null}

              <div className="freigaben-detail__actions">
                <button
                  className="btn btn-primary"
                  disabled={actioning === selected.id}
                  onClick={() => doAction(selected.id, "approve")}
                  type="button"
                >
                  {actioning === selected.id ? "…" : "Freigeben"}
                </button>
                <button
                  className="btn btn-danger"
                  disabled={actioning === selected.id}
                  onClick={() => doAction(selected.id, "reject")}
                  type="button"
                >
                  Ablehnen
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setEvidenceOpen(true)}
                  type="button"
                >
                  Nachweise ansehen
                </button>
              </div>

              <EvidenceDrawer
                counted={countedFallback}
                expected={expectedFallback}
                onClose={() => setEvidenceOpen(false)}
                open={evidenceOpen}
                reason={reasonLabel(selected.reason)}
                sourceLabel={selected.sourceLabel ?? "Walk-Route"}
                submittedAt={selected.submittedAt ?? selected.createdAt}
                submittedBy={selected.requestedById}
                title={`Nachweis: ${selected.inventoryItemName}`}
                unit={selected.unit}
              />
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
