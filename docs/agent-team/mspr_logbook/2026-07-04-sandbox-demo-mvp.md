# MSPR Entry — Bevero Landing Sandbox-Demo MVP

- id: sandbox-demo-mvp-2026-07-04
- timestamp: 2026-07-04
- runId: baum-os session (Sandbox Demo implementation)
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - apps/landing/src/data/sandboxScenarios.js
  - apps/landing/src/components/SandboxDemo.jsx
  - apps/landing/src/components/SandboxScenarioTabs.jsx
  - apps/landing/src/components/SandboxCockpit.jsx
  - apps/landing/src/components/SandboxImpactPanel.jsx
  - apps/landing/src/App.jsx
  - apps/landing/src/styles.css
  - apps/landing/index.html
- pathsOutOfScope:
  - alle bestehenden Sections in App.jsx (Nutzen/Hub/Screens/Pilot/Vertrauen/Vision/IT) — inhaltlich unverändert
  - apps/api, apps/* außer landing
- autonomyTier: 2

## Code Change Context

- Trigger/request: Operator-Auftrag „Bevero Landing — Sandbox Demo MVP" nach Spec A (Architektur) + Spec B (UX/Szenario-Drehbücher).
- Why the change was needed: Die Landing soll den Kern-Claim (Bestand + Bewegung + Übergabe = prüfbarer Tagesworkflow) erlebbar machen — interaktive, rein lokale Sandbox-Section `#demo`.
- Files read:
  - apps/landing/src/App.jsx, styles.css, main.jsx, index.html
  - apps/landing/package.json, .vercel/project.json, tests/screenshot-ownership.test.mjs
  - beide Spezifikationsdokumente (Spec A + Spec B)
- Files changed: siehe pathsInScope (5 neue Dateien, 3 editiert)
- Commands run:
  - `npm run build` → pass (32 Module, dist/index.html 1.06 kB + gebündelte assets)
  - `npm run test:screenshot-ownership` → pass (2 pass / 0 fail)
  - `grep` forbidden APIs (fetch/localStorage/sessionStorage/cookie/WebSocket/import()) in Sandbox-Code → clean
- Validation results:
  - Live-Preview (vite dev): alle 3 Szenarien end-to-end durchgespielt.
  - Szenario A (bar-refill): 3→0 (grün) / 2→1 (neutral, nicht grün) / 0→3 (grün); Log + Checks korrekt.
  - Szenario B (goods-receipt) via Deep-Link `#demo?szenario=wareneingang`: delivery-list + Warnzeile + korrekte Positionen.
  - Szenario C (shift-handover): abgeleitete Metriken für 1× übergeben (3→1 / 0→3 / 0→1, Check „Verantwortlichkeiten zugewiesen") UND 0× übergeben (3→0 / 0→3 / 0→0, Check „Alle Punkte abgeschlossen"); Übergabe-Log dynamisch korrekt; Ehrlichkeits-Zusatzzeile vorhanden.
  - Deep-Link ungültig (`?szenario=quatsch`) → Default bar-refill, kein Console-Error.
  - Desktop ≥960: Grid `220px 607px 280px`, areas `tabs cockpit impact / step / secondary`. Mobile <960: Chips + Stat-Kacheln + Demo-Bar-Kürzung.
  - Dependencies unverändert (nur react/react-dom runtime).

## Memory

- newFindings:
  - Die deployte Landing war die statische `index.html` (Commit „replace pitch page with pilot landing page", 02.07.), NICHT die React-`App.jsx`. `App.jsx` war toter Code (nicht gemountet).
  - Operator-Entscheidung (via Rückfrage): React-Seite live schalten — `index.html` mountet jetzt `#root` + `/src/main.jsx`. Kehrt den Wechsel vom 02.07. bewusst um.
- reusableRules:
  - Jede Nutzenzahl nur über `assumption`-Objekt (`isAssumption:true`) → Badge „Demo-Annahme" wird von der Impact-Komponente erzwungen.
  - Neutrale Metriken (`metric.neutral`) werden nie grün — Ehrlichkeits-Prinzip.
- gotchas:
  - Vite mountet nur, wenn `index.html` ein `#root` + Module-Script hat; die alte statische Seite hatte beides nicht.

## Review

- status: pass
- risks:
  - Live-Schaltung ändert die deployte Landing (statisch → React). Reversibel via git.
  - Fade-out des alten Views ist durch React-Key-Remount vereinfacht (nur Fade-in umgesetzt) — kosmetisch, kein Funktionsbruch.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 4
  - evidenceQuality: 5
  - sideEffects: 3
- nextGate: Owner-Freigabe für Commit/Push + Vercel-Deploy der React-Landing.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-04-sandbox-demo-mvp.md`
