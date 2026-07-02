# MSPR Entry — Kitchen Checkliste Page

- id: 2026-06-20-kitchen-checkliste-page
- timestamp: 2026-06-20T09:50:00Z
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - apps/cockpit/app/(app)/kitchen/checkliste/page.tsx (neu)
  - apps/cockpit/app/(app)/kitchen/checkliste/checkliste-client.tsx (neu)
  - apps/cockpit/app/components/app-shell.tsx (nav-link hinzugefügt)
- pathsOutOfScope:
  - apps/api/
  - Supabase-Schema
- autonomyTier: 1

## Code Change Context

- Trigger/request: User bat, eine dedizierte Küchen-Checklisten-Page zu erstellen und die beim Audit als defekt markierten Seiten zu fixen.
- Why the change was needed:
  - Die Küchen-Checkliste war nur im Quick-Note FAB als Typ „Liste" zugänglich — keine eigenständige Route.
  - Die beim Audit markierten 500-Fehler auf `/schichtplan/maengel` und `/kitchen/walk-route` stellten sich als Artefakt einer `.next`-Build-Korruption heraus (zwei gleichzeitige Next.js-Prozesse), nicht als Code-Bugs. Kein Fix an diesen Dateien nötig.
- Files read:
  - apps/cockpit/app/components/app-shell.tsx
  - apps/cockpit/app/components/page-scaffold.tsx
  - apps/cockpit/app/components/ui/card.tsx
  - apps/cockpit/app/components/ui/button.tsx
  - apps/cockpit/app/components/ui/badge.tsx
  - apps/cockpit/app/components/quick-notes-fab.tsx
  - apps/cockpit/app/(app)/schichtplan/maengel/maengel-client.tsx
  - apps/cockpit/app/(app)/kitchen/walk-route/walk-route-client.tsx
- Files changed:
  - apps/cockpit/app/(app)/kitchen/checkliste/page.tsx (erstellt)
  - apps/cockpit/app/(app)/kitchen/checkliste/checkliste-client.tsx (erstellt)
  - apps/cockpit/app/components/app-shell.tsx (Zeile 92: Checkliste-Link in kitchenNavGroups)
- Commands run:
  - `curl http://localhost:3001/schichtplan/maengel` → pass (rendert MaengelClient korrekt)
  - Playwright-Navigation zu `/kitchen/checkliste` → pass
  - Checkbox-Toggle → pass (Counter 0/21 → 1/21)
- Validation results:
  - Page lädt unter `/kitchen/checkliste`
  - Nav-Link „Checkliste" erscheint in Küche & Lager Sidebar
  - 3 Sektionen (Öffnung 8, Laufender Betrieb 6, Schließung 7 = 21 Punkte)
  - State-Toggle + localStorage-Persistenz funktionieren
  - Badge zeigt korrekten Fortschritt pro Sektion und gesamt

## Memory

- newFindings:
  - Die 500-Fehler auf Mängel und Walk-Route waren `.next`-Korruption, kein echter Bug — beim nächsten unerklärlichen 500 zuerst `.next` prüfen
  - `kitchenNavGroups` in `app-shell.tsx` ist der einzige Ort für Küchen-Nav-Links
- reusableRules:
  - localStorage-Key-Muster: `bevero-<feature>:<date>` — konsistent mit `bevero-quick-notes`, `bevero-bar-refill-run`
  - `buildInitialSections()` + `loadSections(date)` / `saveSections(date, ...)` ist das Standard-Pattern für tagesbasierte lokale State-Persistenz
- gotchas:
  - Zwei gleichzeitige `npm run dev`-Prozesse im selben `.next`-Ordner korrumpieren das Build — immer erst den Port prüfen und nur einen Prozess laufen lassen

## Review

- status: pass
- risks:
  - Checklisten-Inhalte sind hartkodiert (Template) — keine DB-Anbindung. Für Produktiv-Einsatz ggf. konfigurierbar machen.
  - `localStorage` ist gerätespezifisch — kein Sync über Geräte hinweg.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: User-Review; optional: Backend-Persistenz der Checkliste, z.B. als Operational Note nach Abschluss

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-20-kitchen-checkliste-page.md`
