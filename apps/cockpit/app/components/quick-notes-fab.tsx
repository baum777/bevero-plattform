"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers/auth-provider";
import { apiErrorMessage, apiFetch } from "../../lib/backend/api-fetch";
import { createClient } from "../../lib/supabase/client";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { ConfirmDangerDialog } from "./ui/confirm-dialog";

const STORAGE_KEY = "bevero-quick-notes";
const MAX_NOTES = 20;
const OPEN_QUICK_NOTE_EVENT = "bevero:open-quick-note";

type NoteType = "note" | "checklist";
type PanelView = "editor" | "library";

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

type QuickNote = {
  id: string;
  type: NoteType;
  text: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  route?: string;
  context?: string;
};

type LegacyQuickNote = {
  id?: unknown;
  type?: unknown;
  mode?: unknown;
  text?: unknown;
  content?: unknown;
  items?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  route?: unknown;
  context?: unknown;
};

type OpenQuickNoteDetail = {
  type?: NoteType;
  view?: PanelView;
};

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mini markdown — input is escaped first, so only the tags we add below can
// reach the DOM (no <script>, no href, no raw HTML).
function renderMiniMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
}

function asNoteType(value: unknown): NoteType | null {
  return value === "checklist" || value === "note" ? value : null;
}

function normalizeChecklistItem(value: unknown): ChecklistItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { id?: unknown; text?: unknown; checked?: unknown };
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    text: typeof raw.text === "string" ? raw.text : "",
    checked: raw.checked === true
  };
}

function normalizeNote(value: unknown): QuickNote | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as LegacyQuickNote;
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const type = asNoteType(raw.type) ?? asNoteType(raw.mode);
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : null;
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (!id || !type || !createdAt || !updatedAt) return null;
  return {
    id,
    type,
    text: typeof raw.text === "string" ? raw.text : typeof raw.content === "string" ? raw.content : "",
    items: rawItems.map(normalizeChecklistItem).filter((item): item is ChecklistItem => Boolean(item)),
    createdAt,
    updatedAt,
    route: typeof raw.route === "string" ? raw.route : undefined,
    context: typeof raw.context === "string" ? raw.context : undefined
  };
}

function loadNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeNote).filter((note): note is QuickNote => Boolean(note))
      : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: QuickNote[]): QuickNote[] {
  const trimmed = notes
    .slice()
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-MAX_NOTES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage failures (quota / private mode).
  }
  return trimmed;
}

function formatDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
}

function routeLabel(route?: string) {
  if (!route || route === "/") return "Cockpit";
  if (route.includes("/inventory/balances")) return "Bestände";
  if (route.includes("/inventory/bar-refill")) return "Auffüllliste";
  if (route.includes("/movements")) return "Bewegungen";
  if (route.includes("/dashboard")) return "Dashboard";
  return route.replace(/^\//, "");
}

function noteSummary(note: QuickNote) {
  if (note.type === "checklist") {
    const firstItem = note.items.find((item) => item.text.trim())?.text.trim();
    return firstItem ?? "Leere Checkliste";
  }
  return note.text.trim() || "Leere Notiz";
}

// ── Icons ────────────────────────────────────────────────────────────────────

function NoteTypeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14 3v6h6M8 13h8M8 17h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ChecklistTypeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 19h16M9 10h6M9 14h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M12 20h9" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M12 20h9" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickNotesFab() {
  const pathname = usePathname() ?? "/";
  const { organizationId } = useAuth();
  const [open, setOpen] = useState(false);
  const [opNoteLoading, setOpNoteLoading] = useState(false);
  const [opNoteSuccess, setOpNoteSuccess] = useState(false);
  const [opNoteError, setOpNoteError] = useState<string | null>(null);
  const [panelView, setPanelView] = useState<PanelView>("editor");
  const [type, setType] = useState<NoteType>("note");
  const [preview, setPreview] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<QuickNote[]>([]);
  const [expandedNoteIds, setExpandedNoteIds] = useState<string[]>([]);
  const [badgeCount, setBadgeCount] = useState(0);

  const isDirty = useMemo(
    () => open && panelView === "editor" && (text.trim() !== "" || items.some((i) => i.text.trim() !== "")),
    [open, panelView, text, items]
  );
  const { showDiscardDialog, guardAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);

  // Sync badge count on mount and after every save/delete
  useEffect(() => {
    setBadgeCount(loadNotes().length);
  }, []);

  const resetDraft = useCallback((nextType: NoteType = "note") => {
    setCurrentId(null);
    setType(nextType);
    setText("");
    setItems(nextType === "checklist" ? [{ id: uid(), text: "", checked: false }] : []);
    setPreview(false);
  }, []);

  const openSavedNote = useCallback((note: QuickNote) => {
    setCurrentId(note.id);
    setType(note.type);
    setText(note.text);
    setItems(note.type === "checklist" && note.items.length === 0 ? [{ id: uid(), text: "", checked: false }] : note.items);
    setPreview(false);
  }, []);

  const openPanel = useCallback(
    (preferredType?: NoteType) => {
      const notes = loadNotes();
      setSavedNotes(notes);
      setBadgeCount(notes.length);
      setPanelView("editor");
      const lastNote = notes[notes.length - 1];
      if (preferredType) {
        resetDraft(preferredType);
      } else if (lastNote) {
        openSavedNote(lastNote);
      } else {
        resetDraft("note");
      }
      setOpen(true);
    },
    [openSavedNote, resetDraft]
  );

  const openLibraryPanel = useCallback(() => {
    const notes = loadNotes();
    const lastNote = notes[notes.length - 1];
    setSavedNotes(notes);
    setBadgeCount(notes.length);
    setExpandedNoteIds(lastNote ? [lastNote.id] : []);
    setPanelView("library");
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onOpenQuickNote(event: Event) {
      const detail = (event as CustomEvent<OpenQuickNoteDetail>).detail;
      if (detail?.view === "library") { openLibraryPanel(); return; }
      const requestedType = asNoteType(detail?.type) ?? "note";
      openPanel(requestedType);
    }
    window.addEventListener(OPEN_QUICK_NOTE_EVENT, onOpenQuickNote);
    return () => window.removeEventListener(OPEN_QUICK_NOTE_EVENT, onOpenQuickNote);
  }, [openLibraryPanel, openPanel]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") guardAction(closePanel);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, guardAction, closePanel]);

  function selectType(nextType: NoteType) {
    setType(nextType);
    setPreview(false);
    if (nextType === "checklist" && items.length === 0) {
      setItems([{ id: uid(), text: "", checked: false }]);
    }
  }

  function persist() {
    const now = new Date().toISOString();
    const notes = loadNotes();
    const existingIndex = currentId ? notes.findIndex((note) => note.id === currentId) : -1;
    const normalizedItems = type === "checklist" ? items : [];
    const routeContext = pathname.replace(/^\//, "") || "cockpit";
    const nextNote: QuickNote =
      existingIndex >= 0
        ? { ...notes[existingIndex], type, text, items: normalizedItems, updatedAt: now, route: pathname, context: routeContext }
        : { id: uid(), type, text, items: normalizedItems, createdAt: now, updatedAt: now, route: pathname, context: routeContext };
    if (existingIndex >= 0) notes[existingIndex] = nextNote;
    else notes.push(nextNote);
    const saved = saveNotes(notes);
    setSavedNotes(saved);
    setBadgeCount(saved.length);
    setCurrentId(nextNote.id);
    setOpen(false);
  }

  function discardDraft() {
    resetDraft(type);
    setOpen(false);
  }

  async function saveAsOperativeNote() {
    const body = type === "note" ? text.trim() : items.map((i) => `- ${i.text}`).join("\n");
    if (!body || !organizationId) return;
    setOpNoteLoading(true);
    setOpNoteError(null);
    setOpNoteSuccess(false);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Keine aktive Session gefunden.");
      await apiFetch("/operational-notes", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: { body, visibility: "team", noteType: "general", priority: "normal" },
      });
      setOpNoteSuccess(true);
      setTimeout(() => setOpNoteSuccess(false), 3000);
    } catch (err) {
      setOpNoteError(apiErrorMessage(err, "Fehler beim Speichern."));
    } finally {
      setOpNoteLoading(false);
    }
  }

  function deleteNote(id: string) {
    const nextNotes = saveNotes(loadNotes().filter((note) => note.id !== id));
    setSavedNotes(nextNotes);
    setBadgeCount(nextNotes.length);
    setExpandedNoteIds((current) => current.filter((noteId) => noteId !== id));
    if (currentId === id) resetDraft(type);
  }

  function editSavedNote(note: QuickNote) {
    openSavedNote(note);
    setPanelView("editor");
  }

  function toggleSavedNote(id: string) {
    setExpandedNoteIds((current) =>
      current.includes(id) ? current.filter((noteId) => noteId !== id) : [...current, id]
    );
  }

  function addItem() {
    setItems((current) => [...current, { id: uid(), text: "", checked: false }]);
  }

  function updateItemText(id: string, nextText: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, text: nextText } : item)));
  }

  function toggleItem(id: string) {
    setItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
        .sort((a, b) => Number(a.checked) - Number(b.checked))
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <>
      {/* FAB with optional badge */}
      <button aria-label="Schnellnotiz öffnen" className="qn-fab" onClick={() => openPanel("note")} type="button">
        <PenIcon />
        {badgeCount > 0 ? (
          <span aria-label={`${badgeCount} Notizen`} className="qn-fab-badge">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      <ConfirmDangerDialog
        cancelLabel="Weiter bearbeiten"
        confirmLabel="Verwerfen"
        description="Du hast ungespeicherte Änderungen. Wenn du schließt, gehen sie verloren."
        onCancel={cancelDiscard}
        onConfirm={confirmDiscard}
        open={showDiscardDialog}
        title="Änderungen verwerfen?"
      />

      {open ? (
        <div className="qn-overlay" role="presentation">
          <button aria-label="Schnellnotiz schließen" className="qn-overlay-backdrop" onClick={() => guardAction(closePanel)} type="button" />

          <div aria-modal="true" className="qn-panel" role="dialog">
            {/* ── Header ── */}
            <div className="qn-panel-head">
              {/* Left: type pills (only in editor view) */}
              <div className="qn-head-left">
                {panelView === "editor" ? (
                  <div className="qn-type-pills" role="group" aria-label="Notiztyp">
                    <button
                      aria-pressed={type === "note"}
                      className={`qn-type-pill${type === "note" ? " active" : ""}`}
                      onClick={() => selectType("note")}
                      title="Notiz"
                      type="button"
                    >
                      <NoteTypeIcon />
                      <span>Notiz</span>
                    </button>
                    <button
                      aria-pressed={type === "checklist"}
                      className={`qn-type-pill${type === "checklist" ? " active" : ""}`}
                      onClick={() => selectType("checklist")}
                      title="Checkliste"
                      type="button"
                    >
                      <ChecklistTypeIcon />
                      <span>Liste</span>
                    </button>
                  </div>
                ) : (
                  <span className="qn-head-title">
                    <LibraryIcon />
                    Notizen
                    {savedNotes.length > 0 ? (
                      <span className="qn-head-count">{savedNotes.length}</span>
                    ) : null}
                  </span>
                )}
              </div>

              {/* Right: view toggle + close */}
              <div className="qn-head-right">
                <button
                  aria-label={panelView === "editor" ? "Gespeicherte Notizen anzeigen" : "Neuen Editor öffnen"}
                  className={`qn-icon-btn${panelView === "library" ? " active" : ""}`}
                  onClick={panelView === "editor" ? openLibraryPanel : () => { resetDraft(); setPanelView("editor"); }}
                  title={panelView === "editor" ? "Notizen-Bibliothek" : "Neuer Editor"}
                  type="button"
                >
                  {panelView === "editor" ? <LibraryIcon /> : <NoteTypeIcon />}
                </button>
                <button aria-label="Schließen" className="qn-icon-btn" onClick={() => guardAction(closePanel)} type="button">
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* ── Editor ── */}
            {panelView === "editor" ? (
              <>
                <div className="qn-body">
                  {type === "note" ? (
                    <div className="qn-note">
                      {preview ? (
                        <div
                          className="qn-preview"
                          // Input is HTML-escaped before mini-markdown runs — see renderMiniMarkdown.
                          dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(text) }}
                        />
                      ) : (
                        <textarea
                          autoFocus
                          className="qn-textarea"
                          onChange={(event) => setText(event.target.value)}
                          placeholder="Notiz… **fett**, *kursiv*, # Titel, - Punkt"
                          value={text}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="qn-checklist">
                      {items.map((item, idx) => (
                        <div className={`qn-check-row${item.checked ? " done" : ""}`} key={item.id}>
                          <button
                            aria-label={item.checked ? "Abhaken aufheben" : "Abhaken"}
                            className={`qn-check-box${item.checked ? " checked" : ""}`}
                            onClick={() => toggleItem(item.id)}
                            type="button"
                          >
                            {item.checked ? (
                              <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            ) : null}
                          </button>
                          <input
                            autoFocus={idx === items.length - 1 && items.length > 1}
                            className="qn-check-input"
                            onChange={(event) => updateItemText(item.id, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") { event.preventDefault(); addItem(); }
                            }}
                            placeholder="Punkt…"
                            value={item.text}
                          />
                          <button
                            aria-label="Punkt löschen"
                            className="qn-icon-btn qn-icon-btn--sm"
                            onClick={() => removeItem(item.id)}
                            type="button"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                      <button className="qn-add-item" onClick={addItem} type="button">
                        <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                        Punkt hinzufügen
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="qn-panel-foot">
                  {type === "checklist" && items.length > 0 ? (
                    <span className="qn-foot-meta">
                      {checkedCount}/{items.length} erledigt
                    </span>
                  ) : null}
                  <div className="qn-foot-actions">
                    {type === "note" ? (
                      <button
                        aria-label={preview ? "Bearbeiten" : "Vorschau"}
                        className="qn-icon-btn"
                        onClick={() => setPreview((v) => !v)}
                        title={preview ? "Bearbeiten" : "Vorschau"}
                        type="button"
                      >
                        {preview ? <EditIcon /> : <EyeIcon />}
                      </button>
                    ) : null}
                    <button className="qn-btn-discard" onClick={discardDraft} title="Verwerfen" type="button">
                      <CloseIcon />
                    </button>
                    <button className="qn-btn-save" onClick={persist} type="button">
                      <SaveIcon />
                      Speichern
                    </button>
                    {organizationId ? (
                      <button
                        className="qn-btn-save"
                        disabled={opNoteLoading}
                        onClick={() => void saveAsOperativeNote()}
                        style={{ background: "var(--color-warning, #d97706)", color: "#fff" }}
                        title="Als operative Teamnotiz speichern (auditierbar)"
                        type="button"
                      >
                        <SaveIcon />
                        {opNoteLoading ? "…" : opNoteSuccess ? "✓ Gespeichert" : "Operativ"}
                      </button>
                    ) : null}
                  </div>
                  {opNoteError ? (
                    <p style={{ color: "var(--color-critical, #dc2626)", fontSize: "0.75rem", marginTop: "0.25rem" }} role="alert">
                      {opNoteError}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              /* ── Library ── */
              <section aria-label="Gespeicherte lokale Notizen" className="qn-library">
                {savedNotes.length > 0 ? (
                  savedNotes
                    .slice()
                    .reverse()
                    .map((note) => {
                      const expanded = expandedNoteIds.includes(note.id);
                      const doneRatio =
                        note.type === "checklist" && note.items.length > 0
                          ? `${note.items.filter((i) => i.checked).length}/${note.items.length}`
                          : null;
                      return (
                        <article className={`qn-note-card${expanded ? " open" : ""}`} key={note.id}>
                          <div className="qn-note-card-head">
                            <button
                              aria-expanded={expanded}
                              className="qn-note-card-toggle"
                              onClick={() => toggleSavedNote(note.id)}
                              type="button"
                            >
                              <span className="qn-note-card-type-icon">
                                {note.type === "checklist" ? <ChecklistTypeIcon /> : <NoteTypeIcon />}
                              </span>
                              <span className="qn-note-card-info">
                                <span className="qn-note-card-title">{noteSummary(note)}</span>
                                <span className="qn-note-card-meta">
                                  {routeLabel(note.route)} · {formatDate(note.updatedAt)}
                                  {doneRatio ? <span className="qn-note-card-ratio"> · {doneRatio} ✓</span> : null}
                                </span>
                              </span>
                            </button>
                            <div className="qn-note-card-actions">
                              <button
                                aria-label="Bearbeiten"
                                className="qn-icon-btn qn-icon-btn--sm"
                                onClick={() => editSavedNote(note)}
                                title="Bearbeiten"
                                type="button"
                              >
                                <EditIcon />
                              </button>
                              <button
                                aria-label="Löschen"
                                className="qn-icon-btn qn-icon-btn--sm qn-saved-delete"
                                onClick={() => deleteNote(note.id)}
                                title="Löschen"
                                type="button"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                          {expanded ? (
                            <div className="qn-note-card-body">
                              {note.type === "checklist" ? (
                                <ul className="qn-note-card-checklist">
                                  {note.items.length > 0 ? (
                                    note.items.map((item) => (
                                      <li className={item.checked ? "done" : ""} key={item.id}>
                                        <span className="qn-note-card-check">
                                          {item.checked ? (
                                            <svg fill="none" height="10" viewBox="0 0 12 12" width="10">
                                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                            </svg>
                                          ) : null}
                                        </span>
                                        {item.text.trim() || "Leerer Punkt"}
                                      </li>
                                    ))
                                  ) : (
                                    <li>Keine Punkte gespeichert.</li>
                                  )}
                                </ul>
                              ) : note.text.trim() ? (
                                <div
                                  className="qn-note-card-preview"
                                  dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(note.text) }}
                                />
                              ) : (
                                <p className="qn-note-card-empty">Keine Inhalte gespeichert.</p>
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                ) : (
                  <div className="qn-library-empty">
                    <NoteTypeIcon />
                    <strong>Noch keine Notizen</strong>
                    <p>Erstelle eine Notiz oder Checkliste — sie erscheint dann hier.</p>
                    <button className="qn-btn-save" onClick={() => { resetDraft("note"); setPanelView("editor"); }} type="button">
                      <SaveIcon />
                      Neue Notiz
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
