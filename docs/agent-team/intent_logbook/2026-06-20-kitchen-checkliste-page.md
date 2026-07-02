# Intent Memory — Kitchen Checkliste Page

- id: 2026-06-20-kitchen-checkliste-page
- timestamp: 2026-06-20T09:50:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-kitchen-checkliste-page.md`
- status: reviewed

## Core intention

Eine eigenständige, sofort nutzbare Küchen-Checklisten-Page bereitstellen, die Küchenmitarbeiter strukturiert durch die Schicht führt (Öffnung → Betrieb → Schließung) — ohne Backend-Abhängigkeit, sofort offline-fähig.

## Logic followed

- Die App nutzt durchgängig localStorage für schichtbezogene Ephemer-Daten (Quick Notes, Bar Refill Run). Gleiches Pattern für Checkliste gewählt, damit kein Backend-Risiko entsteht und die Page immer funktioniert, auch wenn die API down ist.
- Template-basiert statt DB-konfigurierbar — spart Komplexität für den initialen Use Case. Küchenpunkte sind operational stabil (HACCP-Standards).
- Workspace-Kontext (`kitchen_storage`) ist die richtige Home für diese Page — der Nav-Link erscheint nur bei aktivem Küchen-Workspace.

## Design assumptions

- Checklisten-Inhalte sind HACCP-orientiert und ändern sich selten.
- Tagesbasierter Key (`bevero-kitchen-checkliste:<date>`) ist ausreichend — Reset zu Schichtbeginn durch einfaches Neuladen des nächsten Tages.
- Der FAB (Quick-Note) bleibt parallel nutzbar für Ad-hoc-Listen.

## Tradeoffs

- Accepted:
  - localStorage statt DB — kein Backend nötig, funktioniert offline, kein Migrations-Aufwand
  - Hartkodiertes Template statt konfigurierbarer Liste — weniger Komplexität im MVP
- Rejected:
  - Eigene API-Route für Checklisten-Persistenz — zu großer Scope für diese Anfrage
  - Supabase-Integration — würde Auth + Schema-Migration erfordern

## Durable memory

- `kitchenNavGroups` in `app-shell.tsx` ist der einzige Ort für Küchen-Nav-Einträge — dort eintragen, wenn eine neue Küchen-Page entsteht.
- localStorage-Keys müssen `bevero-` Prefix haben (Konsistenz im App-Namespace).
- `.next`-Korruption durch doppelte Dev-Server-Prozesse: Bei unerklärlichen 500ern im Dev-Modus zuerst `.next` löschen und neu starten.

## Do not reuse blindly

- Das Template ist für `motorworld-boeblingen` angepasst. Für andere Locations ggf. andere Checklisten-Punkte relevant.
- `mounted`-Guard vor localStorage-Zugriff ist nötig wegen SSR (Next.js) — nicht entfernen.

## Relation to Rauschenberger OS / Bevero

- location logic: Page ist workspace-gated (`kitchen_storage`) — kein Zugriff aus Bar-Workspace
- role/approval logic: Sichtbar für `ALL` Rollen im Küchen-Workspace (auch Staff)
- inventory/procurement/shift-planning logic: Ergänzt den Schichtabschluss-Flow — Checkliste vor dem Signoff abarbeiten
- external-system boundary: Keine externe Abhängigkeit

## Next logic gate

Soll die Checkliste nach Abschluss als Operational Note gespeichert werden (API-Integration)? Oder reicht der lokale State für den MVP?
