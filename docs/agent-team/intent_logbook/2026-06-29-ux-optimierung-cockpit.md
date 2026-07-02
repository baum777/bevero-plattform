# Intent Memory — UX-Optimierung Cockpit (Sprint 1 Kern)

- id: ux-opt-cockpit-2026-06-29
- timestamp: 2026-06-29T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-ux-optimierung-cockpit.md`
- status: reviewed

## Core intention

Die im UX/UI Evaluation Report (Juni 2026) am höchsten gewichteten Schwächen entschärfen,
ohne Produktverhalten zu riskieren: konsistentes Action-Feedback, A11y-Grundgerüst,
sprachliche/navigatorische Konsistenz. Ziel des Gesamtkonzepts: Gesamtbewertung von
„Befriedigend" → „Gut".

## Logic followed

Sprint-1-Kern aus `docs/UX_OPTIMIERUNGSKONZEPT_COCKPIT.md` priorisiert nach
„hohe Wirkung × geringes Risiko × selbst-enthalten":
- P2 Toast-Zentralisierung (echte Duplizierung beseitigen)
- P1 Login-UX (a11y-konforme Fehlerführung)
- P4 A11y-Quick-Wins (Skip-Link, focus-visible, sr-only)
- P5 Konsistenz (Alerts-Duplikat, „Mother Concern" → deutsch)

## Design assumptions

- Drei Toast-Implementierungen sollen sich identisch verhalten → ein Hook + eine Oberfläche.
- Login-Fehler bleibt bewusst generisch (kein Feld-Leak), Markierung beider Felder ist akzeptabel.
- `#main-content` als Fokusziel statt zweitem `<main>`, da Pages eigene `<main>` rendern.

## Tradeoffs

- Accepted:
  - items-Toast verliert sein Inline-Badge-Layout zugunsten einer einheitlichen Bottom-Toast.
  - Verwaistes `.bar-refill-toast`-CSS bleibt vorerst stehen.
- Rejected:
  - Vollständiger „Passwort vergessen"-Flow (M1) — braucht Backend/Route, eigener Slice.
  - Toast-Lib (sonner) einführen — unnötige Dependency, eigener Hook genügt.

## Durable memory

- Action-Feedback in Cockpit läuft ab jetzt über `hooks/use-toast.ts` + `app/components/toast.tsx`.
- `next build` ist in dieser Arbeitskopie kein verlässliches Gate (pre-existing Prerender-Bruch auf `main`); `tsc --noEmit` als primäres Gate nutzen.

## Do not reuse blindly

- Das generische Feld-Markieren bei Login NICHT auf Formulare übertragen, wo das fehlerhafte
  Feld bekannt ist — dort gezielt markieren.

## Relation to Rauschenberger OS / Bevero

- location logic: unberührt (Workspace-/Standort-Switch unverändert).
- role/approval logic: unberührt (RBAC-`allowed`-Listen der Nav unverändert, nur Duplikat entfernt).
- inventory/procurement/shift-planning logic: nur UI-Feedback (Toast) der Movements-/Bar-Refill-/Items-Flows vereinheitlicht; keine Buchungslogik geändert.
- external-system boundary: keine.

## Next logic gate

P3 Unsaved-Changes-Guard und M8 Schichtabschluss-Protokollierung berühren echtes Verhalten
(Daten/Persistenz) — nächster Slice mit höherem Evidenzbedarf. Vorab: Build-Prerender-Bruch klären.
