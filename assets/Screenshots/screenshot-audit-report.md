# Screenshot Audit Report

## Ziel

- URL oder Page: `http://localhost:3001` — Fokus: Küchen Checkliste / Schichtabschluss (Branch `feat/kitchen-phase-g-issues-signoff`)
- Startpunkt: `/sign-in` → `/dashboard` → `/schichtplan/abschluss` (Workspace: Küche & Lager)
- Login durchgeführt: Ja (`admin@lokal.de`)
- Datum/Uhrzeit: 2026-06-20

---

## Erfasste Tabs

| Nr. | Tab | URL | Screenshot |
|---:|---|---|---|
| 1 | Dashboard | `/dashboard` | [01-dashboard.png](01-tabs/01-dashboard.png) |
| 2 | Schichtabschluss — Küche & Lager | `/schichtplan/abschluss` | [02-schichtabschluss-kueche.png](01-tabs/02-schichtabschluss-kueche.png) |
| 3 | Meine Aufgaben | `/schichtplan/heute` | [03-schichtplan-heute.png](01-tabs/03-schichtplan-heute.png) |
| 4 | Mängel | `/schichtplan/maengel` | [04-schichtplan-maengel.png](01-tabs/04-schichtplan-maengel.png) — compile blocker removed; fresh authenticated screenshot pending |
| 5 | Walk-Route | `/kitchen/walk-route` | [05-kitchen-walk-route.png](01-tabs/05-kitchen-walk-route.png) — compile blocker removed; fresh authenticated screenshot pending |
| 6 | Schicht-Übersicht | `/schichtplan/uebersicht` | [06-schichtplan-uebersicht.png](01-tabs/06-schichtplan-uebersicht.png) |

---

## CTA-Flows

### Schichtabschluss (Küche & Lager)

Die Hauptseite zeigt zwei Cards:

**Card: Tagesstatus** — reine Anzeige, kein CTA (Aufgaben: 0, Erledigt: 0, Offen: 0, Mängel: 0)

**Card: Abschluss**

| Tab | CTA | Risiko | Status | Screenshots |
|---|---|---|---|---|
| Schichtabschluss | Workspace-Switcher „Küche & Lager" | navigational | documented | [01-loaded.png](02-cta-flows/schichtabschluss__kueche__01-loaded.png) |
| Schichtabschluss | Textfeld „Zusammenfassung (optional)" | form | documented | [02-before.png](02-cta-flows/schichtabschluss__kueche__02-zusammenfassung-before.png), [03-filled.png](02-cta-flows/schichtabschluss__kueche__03-zusammenfassung-filled.png) |
| Schichtabschluss | Button „Schicht abschließen" (disabled) | destructive | skipped-risk | Button deaktiviert — keine Aufgaben für heute |

### Schnellnotiz / Küchen-Checkliste (FAB)

Der FAB „Schnellnotiz öffnen" ist auf allen Seiten sichtbar und enthält die Checklisten-Funktion als Typ „Liste".

| Tab | CTA | Risiko | Status | Screenshots |
|---|---|---|---|---|
| Schichtabschluss | FAB „Schnellnotiz öffnen" | safe | documented | [01-opened.png](02-cta-flows/schnellnotiz__01-opened.png) |
| Schnellnotiz-Dialog | Typ-Toggle „Liste" (Checkliste) | safe | documented | [02-liste-type-selected.png](02-cta-flows/schnellnotiz__02-liste-type-selected.png) |
| Schnellnotiz-Dialog | Texteingabe + „Punkt hinzufügen" | form | documented | [03-checkliste-mit-punkt.png](02-cta-flows/schnellnotiz__03-checkliste-mit-punkt.png) |
| Schnellnotiz-Dialog | „Abhaken" (Punkt erledigen) | safe | documented | [04-punkt-abgehakt.png](02-cta-flows/schnellnotiz__04-punkt-abgehakt.png) |
| Schnellnotiz-Dialog | „Speichern" | form | documented | [05-gespeichert.png](02-cta-flows/schnellnotiz__05-gespeichert.png) |
| Schnellnotiz (gespeichert) | FAB mit Badge „1 Notizen" | safe | documented | [06-gespeicherte-notizen-view.png](02-cta-flows/schnellnotiz__06-gespeicherte-notizen-view.png) |
| Schnellnotiz | „Gespeicherte Notizen anzeigen" | safe | documented | [07-gespeicherte-liste.png](02-cta-flows/schnellnotiz__07-gespeicherte-liste.png) |

---

## Abgebrochene oder übersprungene CTAs

| Tab | CTA | Grund |
|---|---|---|
| Schichtabschluss | „Schicht abschließen" | Button disabled (keine Aufgaben); außerdem destruktive Finalaktion — skipped-risk |
| Schnellnotiz-Dialog | „Operativ" (Speichervariante) | Identische Speicheraktion wie „Speichern" — skipped-risk |

---

## Küchen-Navigation (Workspace: Küche & Lager)

Nach Workspace-Wechsel werden in der Sidebar eingeblendet:

**Küche & Lager**
- Walk-Route (`/kitchen/walk-route`) — compile blocker removed; fresh authenticated screenshot pending
- Artikel (`/inventory/items`)
- Bestände (`/inventory/balances`)
- Warenbewegungen (`/movements`)
- Wareneingang (`/inventory/goods-receipt`)
- Lagerorte (`/storage`)

**Schichtplanung**
- Meine Aufgaben (`/schichtplan/heute`)
- Schicht-Übersicht (`/schichtplan/uebersicht`)
- Mängel (`/schichtplan/maengel`) — compile blocker removed; fresh authenticated screenshot pending
- Schichtabschluss (`/schichtplan/abschluss`) — Hauptfokus
- Import (`/schichtplan/import`)
- Matrix (`/schichtplan/matrix`)

---

## Beobachtungen

- **Ursache der 500s:** Der neue Küchen-Checklisten-Client deklarierte `TEMPLATE` mit einer falsch geklammerten Intersection-/Array-Type. Dadurch scheiterte die Cockpit-Kompilierung und die beiden während des Audits aufgerufenen Routen lieferten 500, obwohl ihre eigenen Server-Datenpfade Fehler sicher behandeln.
- **Behebung:** Commit `7177d4d` klammert die Intersection vor dem Array-Suffix. `next typegen && tsc --noEmit` läuft auf dem aktuellen Branch erfolgreich.
- **Route-Status:** Der gemeinsame Compiler-Blocker für `/schichtplan/maengel` und `/kitchen/walk-route` ist entfernt. Eine frische authentifizierte Browser-Aufnahme ist noch erforderlich, weil der lokale Next-Dev-Server in der aktuellen Validierungsumgebung sofort ohne Logausgabe beendet wurde.
- **Checkliste ist keine eigene Route:** Die Küchen-Checkliste ist im Quick-Note FAB als Typ „Liste" integriert, nicht als separate Seite unter `/checklists`
- **Button „Schicht abschließen" dauerhaft disabled:** Keine Aufgaben im System für heute; Test mit befüllten Schichtdaten nötig
- **Workspace-Switcher doppelt:** Dropdown erscheint in Sidebar (Desktop) und Mobile-Header — bei Playwright-Interaktionen Sidebar-Referenz (`e50`) verwenden
- **FAB-Badge:** Nach Speichern einer Checklisten-Notiz zeigt der FAB korrekt „1 Notizen" an

### Zusammenfassung

| Kategorie | Anzahl |
|---|---|
| Erfasste Tabs | 6 |
| Dokumentierte CTAs | 8 |
| Übersprungene CTAs (skipped-risk) | 2 |
| Initial nicht erreichbare Seiten (500) | 2 |
| Routen mit ausstehender Browser-Nachprüfung | 2 |
