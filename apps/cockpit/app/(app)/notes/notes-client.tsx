"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { apiErrorMessage, apiFetch } from "../../../lib/backend/api-fetch";
import { createClient } from "../../../lib/supabase/client";
import type { OperationalNoteRow } from "../../../lib/supabase/queries/operational-notes";

type NotesClientProps = {
  canManage: boolean;
  currentPriority: OperationalNoteRow["priority"] | null;
  currentStatus: OperationalNoteRow["status"];
  notes: OperationalNoteRow[];
  organizationId: string;
  total: number;
};

const STATUS_LABELS: Record<OperationalNoteRow["status"], string> = {
  open: "Offen",
  resolved: "Erledigt",
  archived: "Archiviert",
};

const PRIORITY_LABELS: Record<OperationalNoteRow["priority"], string> = {
  normal: "Normal",
  important: "Wichtig",
  critical: "Kritisch",
};

const NOTE_TYPE_LABELS: Record<OperationalNoteRow["noteType"], string> = {
  general: "Allgemein",
  stock_issue: "Bestandsproblem",
  delivery_issue: "Lieferproblem",
  handover: "Übergabe",
  maintenance: "Wartung",
  incident: "Vorfall",
  refill_context: "Auffüllkontext",
};

const VISIBILITY_LABELS: Record<OperationalNoteRow["visibility"], string> = {
  private: "Privat",
  team: "Team",
  manager_only: "Manager",
};

const STATUS_OPTIONS: OperationalNoteRow["status"][] = ["open", "resolved", "archived"];
const PRIORITY_OPTIONS: OperationalNoteRow["priority"][] = ["normal", "important", "critical"];

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

function priorityVariant(
  p: OperationalNoteRow["priority"]
): "critical" | "warning" | "neutral" {
  if (p === "critical") return "critical";
  if (p === "important") return "warning";
  return "neutral";
}

function statusVariant(
  s: OperationalNoteRow["status"]
): "ok" | "warning" | "neutral" {
  if (s === "open") return "warning";
  if (s === "resolved") return "ok";
  return "neutral";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(parsed)
  );
}

export function NotesClient({
  canManage,
  currentPriority,
  currentStatus,
  notes,
  organizationId,
  total,
}: NotesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createBody, setCreateBody] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createPriority, setCreatePriority] =
    useState<OperationalNoteRow["priority"]>("normal");
  const [createVisibility, setCreateVisibility] =
    useState<OperationalNoteRow["visibility"]>("team");
  const [createNoteType, setCreateNoteType] =
    useState<OperationalNoteRow["noteType"]>("general");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const visibleNotes = notes.filter((n) => !removedIds.has(n.id));

  function buildHref(status: string, priority: string | null): string {
    const p = new URLSearchParams();
    p.set("status", status);
    if (priority) p.set("priority", priority);
    return `/notes?${p.toString()}`;
  }

  async function runAction(noteId: string, action: "resolve" | "archive"): Promise<void> {
    setActionLoading(`${action}:${noteId}`);
    setActionError(null);
    try {
      const token = await readAccessToken();
      await apiFetch(`/operational-notes/${noteId}/${action}`, {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
      });
      setRemovedIds((prev) => new Set([...prev, noteId]));
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError(apiErrorMessage(err, "Aktion fehlgeschlagen."));
    } finally {
      setActionLoading(null);
    }
  }

  async function submitCreate(): Promise<void> {
    if (!createBody.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const token = await readAccessToken();
      await apiFetch("/operational-notes", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: {
          title: createTitle.trim() || undefined,
          body: createBody.trim(),
          priority: createPriority,
          visibility: createVisibility,
          noteType: createNoteType,
        },
      });
      setCreateBody("");
      setCreateTitle("");
      setCreatePriority("normal");
      setCreateVisibility("team");
      setCreateNoteType("general");
      setShowCreateForm(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setCreateError(apiErrorMessage(err, "Notiz konnte nicht gespeichert werden."));
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="state-stack">
      {/* Toolbar */}
      <section className="surface-card">
        <h3 className="surface-card-title">Filter</h3>
        <div className="toolbar-row storage-toolbar" role="group" aria-label="Filter">
          <label className="toolbar-input" htmlFor="filter-status">
            Status
            <select
              id="filter-status"
              value={currentStatus}
              onChange={(e) => router.push(buildHref(e.target.value, currentPriority))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-input" htmlFor="filter-priority">
            Priorität
            <select
              id="filter-priority"
              value={currentPriority ?? ""}
              onChange={(e) => router.push(buildHref(currentStatus, e.target.value || null))}
            >
              <option value="">Alle</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <Link className="state-link" href="/notes">
            Zurücksetzen
          </Link>
        </div>
        <p className="state-desc">
          {`${total} Notiz${total === 1 ? "" : "en"} insgesamt`}
        </p>
        <div className="state-action-row">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            {showCreateForm ? "Abbrechen" : "+ Operative Notiz"}
          </Button>
        </div>
      </section>

      {/* Create form */}
      {showCreateForm ? (
        <section className="surface-card" aria-label="Neue operative Notiz">
          <h3 className="surface-card-title">Neue operative Notiz</h3>
          <div className="toolbar-row storage-toolbar" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
            <label className="toolbar-input" htmlFor="create-title">
              Titel (optional)
              <input
                id="create-title"
                maxLength={200}
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Kurzer Titel…"
              />
            </label>
            <label className="toolbar-input" htmlFor="create-body">
              Notiz *
              <textarea
                id="create-body"
                rows={4}
                maxLength={5000}
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                placeholder="Was ist passiert? Was muss das Team wissen?"
              />
            </label>
            <div className="toolbar-row storage-toolbar">
              <label className="toolbar-input" htmlFor="create-priority">
                Priorität
                <select
                  id="create-priority"
                  value={createPriority}
                  onChange={(e) =>
                    setCreatePriority(e.target.value as OperationalNoteRow["priority"])
                  }
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toolbar-input" htmlFor="create-visibility">
                Sichtbarkeit
                <select
                  id="create-visibility"
                  value={createVisibility}
                  onChange={(e) =>
                    setCreateVisibility(e.target.value as OperationalNoteRow["visibility"])
                  }
                >
                  <option value="team">Team</option>
                  <option value="manager_only">Manager</option>
                  <option value="private">Privat</option>
                </select>
              </label>
              <label className="toolbar-input" htmlFor="create-notetype">
                Typ
                <select
                  id="create-notetype"
                  value={createNoteType}
                  onChange={(e) =>
                    setCreateNoteType(e.target.value as OperationalNoteRow["noteType"])
                  }
                >
                  {(Object.keys(NOTE_TYPE_LABELS) as OperationalNoteRow["noteType"][]).map((t) => (
                    <option key={t} value={t}>
                      {NOTE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {createError ? (
              <p className="field-help" role="alert">
                {createError}
              </p>
            ) : null}
            <div className="state-action-row">
              <Button
                variant="primary"
                loading={createLoading}
                disabled={createLoading || !createBody.trim()}
                onClick={() => void submitCreate()}
              >
                Speichern
              </Button>
              <Button
                variant="ghost"
                disabled={createLoading}
                onClick={() => setShowCreateForm(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {actionError ? (
        <p className="field-help" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* Notes list */}
      {visibleNotes.length === 0 ? (
        <p className="state-desc">
          {removedIds.size > 0
            ? "Alle Notizen in dieser Ansicht wurden gerade bearbeitet. Seite neu laden für aktuellen Stand."
            : `Keine ${STATUS_LABELS[currentStatus].toLowerCase()} Notizen${currentPriority ? ` mit Priorität „${PRIORITY_LABELS[currentPriority]}"` : ""}.`}
        </p>
      ) : (
        <div className="state-list">
          {visibleNotes.map((note) => (
            <article className="surface-card" key={note.id}>
              <header className="card-row">
                <div>
                  <h3 className="surface-card-title">
                    {note.title ?? note.body.slice(0, 80) + (note.body.length > 80 ? "…" : "")}
                  </h3>
                  <p className="state-desc">
                    {`${NOTE_TYPE_LABELS[note.noteType]} · ${VISIBILITY_LABELS[note.visibility]} · ${formatDate(note.createdAt)}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge variant={priorityVariant(note.priority)}>
                    {PRIORITY_LABELS[note.priority]}
                  </Badge>
                  <Badge variant={statusVariant(note.status)}>
                    {STATUS_LABELS[note.status]}
                  </Badge>
                </div>
              </header>
              {note.title ? <p className="state-desc">{note.body}</p> : null}
              {note.resolvedAt ? (
                <p className="state-desc">
                  {`Erledigt: ${formatDate(note.resolvedAt)}`}
                </p>
              ) : null}
              <div className="state-action-row">
                {note.status === "open" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isPending || actionLoading !== null}
                    loading={actionLoading === `resolve:${note.id}`}
                    onClick={() => void runAction(note.id, "resolve")}
                  >
                    Erledigen
                  </Button>
                ) : null}
                {note.status !== "archived" && canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || actionLoading !== null}
                    loading={actionLoading === `archive:${note.id}`}
                    onClick={() => void runAction(note.id, "archive")}
                  >
                    Archivieren
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
