"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "../../providers/workspace-provider";
import { DecisionMetricCard } from "../../components/ui/decision-metric-card";
import { InlineError } from "../../components/ui/inline-error";
import { createClient } from "../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../lib/backend/api-fetch";
import { useAuth } from "../../providers/auth-provider";

import type { ShiftHandoverDraftPublicDTO } from "../../../lib/types/shift-handover";

type ShiftCommandClientProps = {
  draft: ShiftHandoverDraftPublicDTO | null;
  fehlbestandCount: number;
  openTaskCount: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

export function ShiftCommandClient({ draft, fehlbestandCount, openTaskCount }: ShiftCommandClientProps) {
  const router = useRouter();
  const { organizationId } = useAuth();
  const { activeGroupType } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullHandover, setShowFullHandover] = useState(false);

  async function handleStart() {
    setConfirming(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Keine Session.");

      await apiFetch("/shift-handover/draft/confirm", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: {}
      });

      const target = activeGroupType === "kitchen_storage" ? "/kitchen/walk-route" : "/inventory/bar-refill";
      router.push(target);
    } catch (err) {
      setError(apiErrorMessage(err, "Unbekannter Fehler."));
      setConfirming(false);
    }
  }

  const today = new Date().toISOString();
  const handoverNote = draft?.notes ?? draft?.synthesizedHandover ?? null;

  return (
    <div className="page-wrap heute-page">
      <header className="page-header">
        <h1 className="page-title">Schichtstart</h1>
        <p className="page-desc">{formatDate(today)}</p>
      </header>

      {draft ? (
        <div className="surface card heute-shift-card">
          <p className="heute-shift-card__meta">
            Letzte Übergabe: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString("de-DE") : "–"}
          </p>
        </div>
      ) : null}

      <div className="heute-metrics">
        <DecisionMetricCard
          href="/inventory/balances"
          label="Fehlbestand"
          severity={fehlbestandCount > 0 ? "critical" : "ok"}
          value={fehlbestandCount}
        />
        <DecisionMetricCard
          href="/alerts"
          label="Offene Freigaben"
          severity={openTaskCount > 0 ? "warning" : "ok"}
          value={openTaskCount}
        />
      </div>

      {handoverNote ? (
        <div className="surface card heute-handover-card">
          <h2 className="card-title">Übergabe</h2>
          <p className={`heute-handover-text${showFullHandover ? "" : " heute-handover-text--truncated"}`}>
            {handoverNote}
          </p>
          {handoverNote.length > 200 ? (
            <button
              className="btn btn-ghost"
              onClick={() => setShowFullHandover((v) => !v)}
              type="button"
            >
              {showFullHandover ? "Weniger anzeigen" : "Volltext lesen"}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <InlineError message={error} onRetry={handleStart} /> : null}

      <div className="heute-sticky-bar">
        <p className="heute-trust-copy">Alle Änderungen werden protokolliert.</p>
        <button
          className="btn btn-primary btn-lg"
          disabled={confirming}
          onClick={handleStart}
          type="button"
        >
          {confirming ? "Startet…" : "Schicht starten"}
        </button>
      </div>
    </div>
  );
}
