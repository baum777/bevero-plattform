# Bevero Landing — Strukturindex

Stand: 2026-06-27 · Audit-Snapshot · read-only
Pfad: `projects/rauschenberger-os/apps/landing/`

## Überblick

Statische Single-Page-App in **Vite 5 + React 18 + plain CSS** (ca. 2422 Zeilen `styles.css`). Kein Router — Tab-Wechsel und Modal über `useState`. Zielgruppe: Key Account der Rauschenberger Gruppe, interne IT, Management. Ton: defensiv ("eigeninitiativ entwickelter Pilot", "kein offizielles Rauschenberger-Projekt").

Vercel-Projekt: `landing` (`prj_Yxi8zycTxkwOGp7ZSKBdlS66dAlX`)
Build-Output: `dist/` (statisch)

## Quell-Layout

```
apps/landing/
├── index.html                # SEO-Meta, OG-Tags, lädt /src/main.jsx
├── vercel.json               # SPA-Rewrite: /* → /index.html
├── package.json              # Vite 5, React 18.2, react-dom 18.2
├── src/
│   ├── main.jsx              # createRoot + StrictMode
│   ├── App.jsx               # Top-Level + 3 Tabs + Modal + Stepper
│   ├── screenshotRegistry.js # 14 Screens → 6 Sections (kanonisch)
│   └── styles.css            # komplettes Styling, kein CSS-Framework
├── public/
│   ├── bevero-pitch.mp4      # Video (registriert, nicht eingebunden)
│   ├── images/bevero/
│   │   ├── desktop/          # 11 PNGs (01-dashboard … 21-settings-team)
│   │   └── mobile/           # 4 PNGs (mobile-approvals, …)
│   └── screenshots/          # ältere Sammlung (nicht von Registry referenziert)
└── tests/
    └── screenshot-ownership.test.mjs
```

## Tab-Hierarchie

Drei Top-Level-Tabs, Reihenfolge entspricht Pitch-Logik (jetzt → wachsend → IT-safe).

| # | Label | Komponente | Datei | Default |
|---|---|---|---|---|
| 1 | **Pilot & Webapp heute** | `WebappTab` | `App.jsx:355` | ✓ |
| 2 | **Vision: Pilot zum Standortmodell** | `VisionTab` | `App.jsx:541` | |
| 3 | **Grenzen & IT-Vertrauen** | `ITTab` | `App.jsx:590` | |

Tab-Switch scrollt zu Top (`App.jsx:643`).

## Tab 1 — Pilot & Webapp heute

Vertikaler Single-Page-Flow, 10 Sektionen, jeweils mit Anker-ID.

| # | Sektion | Anker | Inhalt |
|---|---|---|---|
| 1 | Hero `hero2` | — | H1 *"Vom Standortbetrieb zur verlässlichen Key-Account-Ausführung"*, Lead, 3 CTAs, Vorher/Nachher-Badge-Pair |
| 2 | KamSection `kam-section` | `#key-account` | "Fünf Pilot-Hypothesen" — 3 primäre (Warenfluss, Schichtübergabe, Event-Readiness) + 2 strategische (KAM-Risikoblick, Standortvergleich) |
| 3 | KAM-Screens Gallery | `#kam-screens` | 6 kuratierte Screens — jeder beantwortet eine operative Frage (Dashboard, Auffüllliste Bar, Wareneingang, Bewegungen, Schichtübergabe, Mobile Freigabe) |
| 4 | Ist-Zustand `istzustand` | `#ist-zustand` | 5 Verlust-Hypothesen + `ProcessFlow` (Before/After, je 5 Knoten) |
| 5 | Workflow Stepper `workflow-section` | `#workflow` | 9-Schritt-Tagesablauf-Tab (interne Tablist): Überblick → Schichtstart → Auffüllliste → Schnellerfassung → Mobile Auffüllung → Wareneingang → Bewegungen → Freigaben → Schichtübergabe |
| 6 | Mobile Betrieb `mobile-section` | `#mobile-betrieb` | Horizontaler Phone-Strip mit 3 Mobile-Screens (Übersicht, Schnellaktionen, Auffüllung) |
| 7 | Weitere Detailansichten `screens-section--more` | `#screens` | 2 Screens: Alerts, Artikelstamm |
| 8 | Küche & Lager `kueche-section` | `#kueche` | `KücheTree` (Küche vs. Bar/Service mit Children-Listen) + Storage-Screenshot |
| 9 | TrustSection `trust-section` | `#grenzen` | 3-Spalten-Grid: "Heute sichtbar" / "Noch nicht behauptet" / "Gesucht" |
| 10 | CTA `cta2` | `#naechster-schritt` | Mailto `twim.baum@proton.me` mit vorformulierter 3-Fragen-Mail + Tab-Switch zu IT |

### Workflow-Stepper (Sub-Tab)

9 Schritte aus `workflowSteps` (`App.jsx:27-37`). Sub-Tablist mit `role="tablist"`, Progress-Anzeige `n/9`, Prev/Next-Buttons. Aktiver Tab rendert dasselbe `WORKFLOW_SCREEN = today`-Bild für alle Schritte plus Caption-Text.

## Tab 2 — Vision: Pilot zum Standortmodell

| Sektion | Inhalt |
|---|---|
| `vision-hero` | H1 *"Vom Pilot zum Standortmodell"*, Lead |
| `vision-phases` | 3 Phasen-Karten: Phase 1 *Sichtbarer Tagesworkflow* → Phase 2 *Automatisierung & Integration* → Phase 3 *Multi-Standort & Managementsicht* |
| `vision-screens` | Workspaces-Screenshot + Cross-Reference zurück auf Tab 1 (KAM-Schnellverständnis) |

## Tab 3 — Grenzen & IT-Vertrauen

| Sektion | Inhalt |
|---|---|
| `it-hero` | H1 *"Kontrollierbar für interne IT"*, Lead |
| `it-cards-section` | 5 IT-Trust-Karten: bestehende Systeme führend / Rollen & Rechte / auditierbare Bewegungen / pilotierbar statt Big Bang / saubere technische Grenze |
| `it-screens` | Team-&-Rollen-Screenshot + Cross-Reference zurück auf Tab 1 |

## Screenshot-Registry

`src/screenshotRegistry.js` ist kanonische Quelle für alle Bilder.

**Sections-Mapping** (`SECTION_SCREENSHOT_IDS`):

| Section | Screens |
|---|---|
| `kam` | dashboard, barRefill, goodsReceipt, movements, shiftHandover, mobileApprovals (6) |
| `workflow` | today (1) |
| `mobile` | mobileDashboard, mobileQuickActions, mobileBarRefill (3) |
| `details` | alerts, inventoryItems (2) |
| `kitchen` | storage (1) |
| `vision` | workspaces (1) |
| `it` | teamRoles (1) |

**Bewusstes Sharing**: `workflow`-Screen (today) wird in Tab 1 für alle 9 Stepper-Schritte wiederverwendet; andere Screens sind eindeutig ihrer fachlichen Sektion zugeordnet. Verhindert Doppelung, schwächt aber visuelle Story im Stepper.

## Interaktion

| Element | Mechanik |
|---|---|
| Tab-Switch Top-Level | `setActiveTab` + `scrollTo({top:0})` |
| Workflow-Sub-Stepper | `setActive(i)` + Progress `n/9`, keyboard-über Buttons, ARIA `role="tab"` |
| Screenshot-Modal | `setModalScreen(screen)`, Klick auf Card-Button öffnet, Backdrop/Klick-X schließt |
| Mobile-Strip | horizontaler Overflow-Scroll, keine Slider-Logik |
| CTA `twim.baum@proton.me` | `mailto:` mit vorausgefülltem Subject + Body (3-Fragen-Template) |
| Deep-Links | `#key-account`, `#kam-screens`, `#ist-zustand`, `#workflow`, `#mobile-betrieb`, `#screens`, `#kueche`, `#grenzen`, `#naechster-schritt` — funktionieren nur client-side (SPA-Rewrite) |

## Persona-Triage

| Tab | Persona | Hauptfrage |
|---|---|---|
| 1 | Key Account / Entscheider | "Ist die operative Sicht relevant für meine Standorte?" |
| 2 | Management / Vision | "Wohin kann der Pilot wachsen?" |
| 3 | Interne IT / Governance | "Bleiben meine Systeme führend? Ist es auditierbar?" |

Cross-References in Tab 2/3 verweisen explizit zurück auf Tab 1 → verhindert Screen-Redundanz und hält den Pitch-Pfad linear.

## Inhaltliche Konstanten

| Konstante | Wert | Quelle |
|---|---|---|
| Kontakt-Mail | `twim.baum@proton.me` | `App.jsx:5` |
| KAM-Mailto-Subject | "Bevero — kurze Einschätzung aus KAM-Sicht" | `App.jsx:6` |
| KAM-Mailto-Body | 3-Fragen-Template | `App.jsx:7-16` |
| Primäre KAM-Punkte | 3 Karten (Warenfluss, Schichtübergabe, Event-Readiness) | `App.jsx:70-74` |
| Strategische KAM-Punkte | 2 Karten (KAM-Risikoblick, Standortvergleich) | `App.jsx:75-78` |
| Vision-Phasen | 3 (Sichtbar → Automatisierung → Multi-Standort) | `App.jsx:40-56` |
| IT-Trust-Karten | 5 (bestehende Systeme, Rollen, Audit, Pilotierbar, techn. Grenze) | `App.jsx:59-65` |
| Trust-Spalten | 3 (Heute / Noch nicht behauptet / Gesucht) | `App.jsx:81-85` |
| Workflow-Schritte | 9 (Überblick → Schichtübergabe) | `App.jsx:27-37` |
| ProcessFlow | 5 Knoten je Spalte (Before/After) | `App.jsx:89-90` |

## Beobachtungen / Lücken

- **Workflow-Stepper-Bilder**: alle 9 Steps rendern dasselbe `today`-Bild (`App.jsx:19`). Caption-Texte versprechen mehr Vielfalt als visuell geliefert wird.
- **Tab 2/3 dünn**: nur 1 Screenshot + 3/5 Cards. Intentionale Vertiefungs-Gate, aber der Pitch-Pfad bleibt in Tab 1.
- **CTA-Bridge fehlt**: Tab 1 CTA bietet nur Switch zu IT-Tab (`cta2-btn--ghost`), kein Verweis auf Vision-Tab.
- **`bevero-pitch.mp4`**: in `public/` vorhanden, aber nirgends eingebunden.
- **Sprache**: durchgehend Deutsch, kein i18n-Hook.
- **Ältere Screenshots** unter `public/screenshots/` (23 Files) sind von Registry nicht referenziert — potenzielle Altlast oder Reserve.
- **SPA-Rewrite**: Deep-Links via Hash-Anchor funktionieren nur, wenn JS geladen ist.

## Verifikation

- `App.jsx` Komponentenbaum vollständig gelesen (702 LOC).
- `screenshotRegistry.js` Section-Mapping geprüft — alle 6 Sections + 14 Screens konsistent.
- Dateibestand in `public/images/bevero/` gezählt: 11 desktop + 4 mobile, alle von Registry referenziert (kein 404-Risiko).
- `package.json` Stack-Angaben verifiziert (Vite 5, React 18.2).
- `vercel.json` SPA-Rewrite bestätigt.

## Reuse-Hinweis

Diese Datei dient als Orientierungs-Index für künftige Edits am Landing. Vor jedem nicht-trivialen Eingriff: Work-Slice-Doku (`docs/agent-team/mspr_logbook/` + `intent_logbook/`) gemäß `AGENTS.md:35-42` pflegen.
