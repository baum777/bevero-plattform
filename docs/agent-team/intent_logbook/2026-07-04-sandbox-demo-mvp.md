# Intent Memory — Bevero Landing Sandbox-Demo MVP

- id: sandbox-demo-mvp-2026-07-04
- timestamp: 2026-07-04
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-04-sandbox-demo-mvp.md`
- status: reviewed

## Core intention

Den zentralen Bevero-Claim von „erklärbar" zu „erlebbar" bringen: Besucher:innen spielen in ≤120 s einen realistischen Standortmoment (Bar auffüllen / Wareneingang / Schichtübergabe) durch und sehen, wie aus Bestand, Bewegung und Übergabe ein prüfbarer Tagesworkflow mit Auditspur wird — ohne Login, API, Storage oder Tracking.

## Logic followed

- Datengetriebene Architektur: 3 Szenarien deklarativ in `sandboxScenarios.js`; ein `useReducer` steuert `scenarioId/stepIndex/confirmedItems/choices/metrics/playedScenarios`; Views rendern rein aus `step.view`. Neue Szenarien = nur Daten (v1.1-fähig).
- Dramaturgie je Szenario: Problem → Handlung → Beweis (3 Schritte, 1 CTA in Schritt 1, n Teilaktionen + Zähler-CTA in Schritt 2, Checks + Log + Konversionsfrage in Schritt 3).
- Trust-First: persistente Demo-Leiste + `[DEMO]`-Wasserzeichen + „Demo-Annahme"-Badge an jeder Nutzenzahl; kein Kontakt-CTA vor Schritt 3.
- Ehrlichkeits-Prinzip: neutrale Metriken (z. B. offene Übergabepunkte 2→1, offene Punkte in C) werden bewusst NICHT grün gefärbt; Szenario C endet nicht bei „alles grün".

## Design assumptions

- Konfliktregel: Spec B (UX/Copy) schlägt Spec A (Architektur) bei Widersprüchen — z. B. Primär-CTA lebt im Cockpit (A4), nicht in der Aktionsleiste (Spec-A-ASCII zeigte ihn unten).
- `#demo` sitzt direkt nach der Hero, vor `#kurzfassung` (Executive Summary) — „direkt nach Hero" wörtlich genommen; die Spec kannte die Kurzfassung-Section nicht.
- Metrik `openItems`/`openHandoverItems` ist per Definition neutral markiert — auch im Vollauflösungsfall (→0) nicht grün, um die Metrik nie zu „feiern".

## Tradeoffs

- Accepted:
  - View-Übergang: nur Fade-in (React-Key-Remount) statt echtem Fade-out→Fade-in. Genügt C2 visuell, spart Komplexität.
  - Live-Tick in Schritt 2 nur für `confirmedMovements` (empfohlene Variante); andere after-Werte erst bei ADVANCE — hält „nachher nie vor Aktion".
  - Hero: „Demo starten" als einziger Primär-CTA; „ROI-Hebel verstehen" auf sekundär zurückgestuft (Demo ist die neue Leitaktion).
- Rejected:
  - Zurück-Navigation aus Schritt 3 (müsste effects rückabwickeln) → stattdessen Zurücksetzen + Nochmal abspielen (v1-Entscheidung der Spec gefolgt).
  - localStorage für Fortschritt → bewusst nur React-State (kein Storage).

## Durable memory

- Die produktive Landing ist ab dieser Slice die React-App (`index.html` mountet `#root` + `/src/main.jsx`). Die frühere statische Seite liegt in der git-Historie (Commit 4202398).
- Alle sichtbaren Zahlen sind Demo-Annahmen — niemals als gemessener ROI darstellen.
- `npm run build` + Live-Preview sind die Abnahme (kein RTL/Jest, da „keine neuen Deps").

## Do not reuse blindly

- Die Metrik-Neutralitäts-Flags sind szenariospezifisch; beim Anlegen neuer Szenarien bewusst entscheiden, welche Werte „grün" (echter Nutzen) vs. „neutral" (nur sichtbar) sind.
- Der Hero-CTA-Umbau (ROI → sekundär) ist eine bewusste Landing-Entscheidung, kein generisches Muster.

## Relation to Rauschenberger OS / Bevero

- location logic: Standortlogik ist sichtbar gemacht (Quell-Lager bei Auffüllung, Ziel-Lager beim Einbuchen, Verantwortlichkeit bei Übergabe) — der Unterschied zwischen Einkaufsliste und Bevero.
- role/approval logic: Sandbox schreibt nie produktiv; „kein Writeback" ist zentrale Trust-Aussage.
- inventory/procurement/shift-planning logic: die 3 Szenarien spiegeln Bestand (Bar), Wareneingang (Beschaffung) und Schichtübergabe (Ops-Kontinuität).
- external-system boundary: null Netzwerk-Requests aus der Sandbox — Planungs-/POS-Systeme bleiben führend, hier nur Demo-Daten.

## Next logic gate

Owner-Freigabe für Commit/Push + Vercel-Deploy. Danach Kandidat v1.1: 4. Szenario „Abweichung freigeben" (nur Daten + ggf. 1 View-Typ).
