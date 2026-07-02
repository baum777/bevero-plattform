"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../components/ui/button";
import { useUnsavedChanges } from "../../../hooks/use-unsaved-changes";
import {
  SHIFT_HANDOVER_MAX_RECENT_RECORDS,
  SHIFT_HANDOVER_PATCH_DEBOUNCE_MS
} from "../../../lib/types/shift-handover";
import { apiErrorMessage, apiFetch, readApiJson } from "../../../lib/backend/api-fetch";
import { createClient } from "../../../lib/supabase/client";
import type {
  ShiftHandoverDraftPublicDTO,
  ShiftHandoverPatchBody
} from "../../../lib/types/shift-handover";
import { useAuth } from "../../providers/auth-provider";

const STORAGE_KEY = "bevero-shift-handovers";

type Priority = "normal" | "important" | "critical";

type HandoverRecord = {
  confirmedAt: string;
  date: string;
  id: string;
  openPoints: string;
  priority: Priority;
  summary: string;
};

export type ShiftHandoverClientProps = {
  initialDraft: ShiftHandoverDraftPublicDTO | null;
  loadError: string | null;
};

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

function loadRecords(): HandoverRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is HandoverRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as HandoverRecord).id === "string" &&
        typeof (r as HandoverRecord).summary === "string"
    );
  } catch {
    return [];
  }
}

function saveRecords(records: HandoverRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, SHIFT_HANDOVER_MAX_RECENT_RECORDS)));
  } catch {
    // storage quota or private mode
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

const PRIORITY_LABELS: Record<Priority, string> = {
  normal: "Normal",
  important: "Wichtig",
  critical: "Kritisch"
};

const PRIORITY_CLASS: Record<Priority, string> = {
  normal: "sh-badge sh-badge-normal",
  important: "sh-badge sh-badge-important",
  critical: "sh-badge sh-badge-critical"
};

type Status = "idle" | "saving" | "saved" | "error" | "throttled" | "confirming" | "confirmed";

export function ShiftHandoverClient({ initialDraft, loadError }: ShiftHandoverClientProps) {
  const { organizationId } = useAuth();
  const [records, setRecords] = useState<HandoverRecord[]>([]);
  const [view, setView] = useState<"form" | "history">("form");
  const [priority, setPriority] = useState<Priority>("normal");
  const [draft, setDraft] = useState<ShiftHandoverDraftPublicDTO | null>(initialDraft);
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [status, setStatus] = useState<Status>(initialDraft ? "idle" : loadError ? "error" : "idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(loadError);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(Boolean(initialDraft?.confirmedAt));

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedBodyRef = useRef<ShiftHandoverPatchBody>({
    summary: initialDraft?.summary ?? "",
    notes: initialDraft?.notes ?? ""
  });
  const savedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedBannerTimerRef.current) clearTimeout(savedBannerTimerRef.current);
    };
  }, []);

  const scheduleAutosave = useCallback(
    (next: { summary: string; notes: string; priority: Priority }) => {
      if (isReadOnly) return;

      const body: ShiftHandoverPatchBody = {
        summary: next.summary,
        notes: next.notes
      };

      if (
        body.summary === lastSavedBodyRef.current.summary &&
        body.notes === lastSavedBodyRef.current.notes
      ) {
        return;
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void persistPatch(body);
      }, SHIFT_HANDOVER_PATCH_DEBOUNCE_MS);
    },
    [isReadOnly]
  );

  const persistPatch = useCallback(
    async (body: ShiftHandoverPatchBody): Promise<void> => {
      if (!draft) {
        setStatus("error");
        setStatusMessage("Kein Entwurf zum Speichern vorhanden.");
        return;
      }
      setStatus("saving");
      setStatusMessage(null);

      try {
        const token = await readAccessToken();
        const response = await apiFetch("/shift-handover/draft", {
          method: "PATCH",
          accessToken: token,
          organizationId,
          requireOrganization: true,
          throwOnError: false,
          body
        });

        if (response.status === 429) {
          setStatus("throttled");
          setStatusMessage("Autosave-Throttle aktiv – bitte einen Moment warten.");
          return;
        }

        if (response.status === 409) {
          setStatus("error");
          setStatusMessage("Entwurf wurde bereits bestätigt und ist nicht mehr editierbar.");
          setIsReadOnly(true);
          return;
        }

        if (response.status === 404) {
          setStatus("error");
          setStatusMessage("Kein offener Entwurf gefunden. Bitte Seite neu laden.");
          return;
        }

        if (!response.ok) {
          setStatus("error");
          setStatusMessage(`Speichern fehlgeschlagen (HTTP ${response.status}).`);
          return;
        }

        const payload = (await readApiJson(response).catch(() => null)) as
          | { draft?: ShiftHandoverDraftPublicDTO }
          | null;
        if (payload?.draft) {
          setDraft(payload.draft);
        }
        lastSavedBodyRef.current = body;
        setStatus("saved");
        setStatusMessage("Entwurf gespeichert");
        if (savedBannerTimerRef.current) clearTimeout(savedBannerTimerRef.current);
        savedBannerTimerRef.current = setTimeout(() => {
          setStatus((prev) => (prev === "saved" ? "idle" : prev));
          setStatusMessage(null);
        }, 3_000);
      } catch (error) {
        setStatus("error");
        setStatusMessage(apiErrorMessage(error, "Unbekannter Fehler."));
      }
    },
    [draft, organizationId]
  );

  const handleSummaryChange = useCallback(
    (value: string) => {
      setSummary(value);
      scheduleAutosave({ summary: value, notes, priority });
    },
    [notes, priority, scheduleAutosave]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      scheduleAutosave({ summary, notes: value, priority });
    },
    [priority, scheduleAutosave]
  );

  const handlePriorityChange = useCallback((next: Priority) => {
    setPriority(next);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!draft) return;
    setStatus("confirming");
    setStatusMessage(null);

    try {
      const token = await readAccessToken();
      const response = await apiFetch(
        `/shift-handover/draft/${encodeURIComponent(draft.id)}/confirm`,
        {
          method: "POST",
          accessToken: token,
          organizationId,
          requireOrganization: true,
          throwOnError: false,
          body: {}
        }
      );

      if (response.status === 403) {
        setStatus("error");
        setStatusMessage("Nur Manager+ kann eine Übergabe bestätigen.");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setStatusMessage(`Bestätigung fehlgeschlagen (HTTP ${response.status}).`);
        return;
      }

      const payload = (await readApiJson(response).catch(() => null)) as
        | { draft?: ShiftHandoverDraftPublicDTO; archiveId?: string }
        | null;
      const confirmedAt = payload?.draft?.confirmedAt ?? new Date().toISOString();

      const historyRecord: HandoverRecord = {
        id: draft.id,
        date: draft.date,
        confirmedAt,
        summary: summary.trim() || "(keine Zusammenfassung)",
        openPoints: notes.trim(),
        priority
      };
      const nextRecords = [historyRecord, ...records].slice(0, SHIFT_HANDOVER_MAX_RECENT_RECORDS);
      setRecords(nextRecords);
      saveRecords(nextRecords);

      if (payload?.draft) {
        setDraft(payload.draft);
      }
      setIsReadOnly(true);
      setStatus("confirmed");
      setStatusMessage("Übergabe bestätigt");
    } catch (error) {
      setStatus("error");
      setStatusMessage(apiErrorMessage(error, "Unbekannter Fehler."));
    }
  }, [draft, notes, organizationId, priority, records, summary]);

  const handleDelete = useCallback((id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRecords(next);
      return next;
    });
  }, []);

  const canConfirm = useMemo(
    () => Boolean(draft) && !isReadOnly && summary.trim().length > 0,
    [draft, isReadOnly, summary]
  );

  const isDirty =
    !isReadOnly &&
    (summary !== (lastSavedBodyRef.current.summary ?? "") ||
      notes !== (lastSavedBodyRef.current.notes ?? ""));

  useUnsavedChanges(isDirty);

  return (
    <div className="sh-root">
      <div className="sh-tabs">
        <button
          className={`sh-tab${view === "form" ? " active" : ""}`}
          onClick={() => setView("form")}
          type="button"
        >
          Aktueller Entwurf
        </button>
        <button
          className={`sh-tab${view === "history" ? " active" : ""}`}
          onClick={() => setView("history")}
          type="button"
        >
          Verlauf ({records.length})
        </button>
      </div>

      {view === "form" && (
        <div className="sh-form">
          {statusMessage && (
            <div
              className={`sh-banner sh-banner-${status === "error" ? "error" : status === "throttled" ? "warn" : "info"}`}
              role="status"
            >
              {statusMessage}
            </div>
          )}

          <div>
            <label className="wd-label" htmlFor="sh-summary">
              Was war los?
            </label>
            <textarea
              autoFocus
              className="wd-textarea sh-summary-area"
              disabled={isReadOnly}
              id="sh-summary"
              onChange={(e) => handleSummaryChange(e.target.value)}
              placeholder="Kurze Zusammenfassung der Schicht — Besonderheiten, Vorkommnisse, Lieferungen…"
              rows={4}
              value={summary}
            />
          </div>

          <div>
            <label className="wd-label" htmlFor="sh-notes">
              Offene Punkte für die nächste Schicht
            </label>
            <textarea
              className="wd-textarea"
              disabled={isReadOnly}
              id="sh-notes"
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="z.B. Lieferung erwartet, Kühlschrank prüfen, Rückruf bei Meier…"
              rows={3}
              value={notes}
            />
          </div>

          <div>
            <p className="wd-label">Priorität (nur lokal, backend-hinweis)</p>
            <div className="sh-priority-group">
              {(["normal", "important", "critical"] as Priority[]).map((p) => (
                <button
                  className={`sh-priority-btn${priority === p ? " selected" : ` sh-priority-${p}`}`}
                  disabled={isReadOnly}
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  type="button"
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="sh-actions">
            <Button
              disabled={!canConfirm || status === "confirming"}
              onClick={handleConfirm}
              variant="primary"
            >
              {status === "confirming" ? "Bestätige…" : "Übergabe bestätigen"}
            </Button>
            {isReadOnly && (
              <span className="sh-readonly-hint">
                Dieser Entwurf ist bereits bestätigt (Backend-Read-Only).
              </span>
            )}
          </div>
        </div>
      )}

      {view === "history" && (
        <div className="sh-history">
          {records.length === 0 ? (
            <p className="sh-empty">Noch keine Übergaben gespeichert.</p>
          ) : (
            records.map((record) => (
              <div className="sh-card" key={record.id}>
                <div className="sh-card-header">
                  <span className="sh-card-date">
                    {formatDate(record.confirmedAt)} · {record.date}
                  </span>
                  <span className={PRIORITY_CLASS[record.priority]}>
                    {PRIORITY_LABELS[record.priority]}
                  </span>
                  <button
                    aria-label="Eintrag löschen"
                    className="sh-card-delete"
                    onClick={() => handleDelete(record.id)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <p className="sh-card-summary">{record.summary}</p>
                {record.openPoints && (
                  <div className="sh-card-open">
                    <span className="sh-card-open-label">Offene Punkte</span>
                    <p className="sh-card-open-text">{record.openPoints}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
