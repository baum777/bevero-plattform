"use client";

import { type ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole, type UserRole } from "../../hooks/useRole";
import { useWorkspace } from "../providers/workspace-provider";

type QuickNoteType = "note" | "checklist";
type QuickNoteView = "editor" | "library";

function HomeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ListCheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M11 6h9M11 12h9M11 18h9" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M3.5 6l1.5 1.5L8 4M3.5 18l1.5 1.5L8 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function ExchangeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M4 7h16M6 7v12h12V7M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14 3v6h6M8 13h8M8 17h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

const ALL: UserRole[] = ["owner", "admin", "manager", "staff", "viewer"];

type Tab = {
  key: string;
  label: string;
  href: string;
  icon: () => ReactNode;
  allowed: UserRole[];
};

const MANAGER_UP: UserRole[] = ["owner", "admin", "manager"];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function openQuickNote(detail: { type?: QuickNoteType; view?: QuickNoteView }) {
  window.dispatchEvent(new CustomEvent("bevero:open-quick-note", { detail }));
}

export function BottomNav() {
  const role = useRole();
  const { activeGroupType } = useWorkspace();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const bereichHref = activeGroupType === "kitchen_storage" ? "/kitchen/walk-route" : "/inventory/bar-refill";
  const bereichLabel = activeGroupType === "kitchen_storage" ? "Küche" : "Bar";

  const TABS: Tab[] = [
    { key: "heute", label: "Heute", href: "/heute", icon: HomeIcon, allowed: ALL },
    { key: "bereich", label: bereichLabel, href: bereichHref, icon: ToolIcon, allowed: ALL },
    { key: "schichtplan", label: "Schicht", href: "/schichtplan/heute", icon: ListCheckIcon, allowed: ALL },
    { key: "bewegungen", label: "Bewegungen", href: "/movements", icon: ExchangeIcon, allowed: ALL },
    { key: "freigaben", label: "Freigaben", href: "/freigaben", icon: CheckCircleIcon, allowed: MANAGER_UP }
  ];

  const visibleTabs = TABS.filter((tab) => tab.allowed.includes(role));

  function go(href: string) {
    setSheetOpen(false);
    router.push(href);
  }

  function startQuickNote(type: QuickNoteType = "note") {
    setSheetOpen(false);
    openQuickNote({ type, view: "editor" });
  }

  function openSavedNotes() {
    setSheetOpen(false);
    openQuickNote({ view: "library" });
  }

  return (
    <>
      {sheetOpen ? (
        <button
          aria-label="Schnellaktion schließen"
          className="qa-overlay"
          onClick={() => setSheetOpen(false)}
          type="button"
        />
      ) : null}

      <div aria-hidden={!sheetOpen} className={`qa-sheet${sheetOpen ? " open" : ""}`}>
        <p className="qa-sheet-title">Schnellaktionen</p>
        <button className="qa-sheet-option" onClick={() => startQuickNote("note")} type="button">
          <span className="qa-sheet-option-icon"><NoteIcon /></span>
          Notiz
        </button>
        <button className="qa-sheet-option" onClick={() => startQuickNote("checklist")} type="button">
          <span className="qa-sheet-option-icon"><ListCheckIcon /></span>
          Checkliste
        </button>
        <button className="qa-sheet-option" onClick={openSavedNotes} type="button">
          <span className="qa-sheet-option-icon"><NoteIcon /></span>
          Gespeicherte Notizen
        </button>
        <button className="qa-sheet-option" onClick={() => go("/inventory/withdrawal")} type="button">
          <span className="qa-sheet-option-icon"><ExchangeIcon /></span>
          Verbrauch buchen
        </button>
        <button className="qa-sheet-option" onClick={() => go("/movements?type=goods_receipt")} type="button">
          <span className="qa-sheet-option-icon"><StockIcon /></span>
          Wareneingang erfassen
        </button>
        <button className="qa-sheet-option" onClick={() => go("/shift-handover")} type="button">
          <span className="qa-sheet-option-icon"><NoteIcon /></span>
          Schichtübergabe
        </button>
        <button className="qa-sheet-option" onClick={() => go("/inventory/bar-refill")} type="button">
          <span className="qa-sheet-option-icon"><ListCheckIcon /></span>
          Auffüllliste starten
        </button>
      </div>

      <nav aria-label="Hauptnavigation" className="bottom-nav">
        {visibleTabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);
          return (
            <button
              className={`bottom-nav-tab${active ? " active" : ""}`}
              key={tab.key}
              onClick={() => go(tab.href)}
              type="button"
            >
              <span className="bottom-nav-icon"><Icon /></span>
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}

        <button
          aria-expanded={sheetOpen}
          aria-label="Schnellaktion öffnen"
          className="bottom-nav-plus"
          onClick={() => setSheetOpen((value) => !value)}
          type="button"
        >
          <PlusIcon />
        </button>

        {visibleTabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);
          return (
            <button
              className={`bottom-nav-tab${active ? " active" : ""}`}
              key={tab.key}
              onClick={() => go(tab.href)}
              type="button"
            >
              <span className="bottom-nav-icon"><Icon /></span>
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
