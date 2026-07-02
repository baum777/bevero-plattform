# WORKPLAN — Cockpit Audit Findings
**Repo:** `baum777/warenwirtschaft-gastronovi-workflow`
**Erstellt:** 2026-06-04
**Basis:** Codebase Audit — alle 8 Tabs (Dashboard, Items, Balances, Bar-Refill, Movements, Alerts, Storage, Workspaces)
**Status:** `OPEN`

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| 🔴 P1 | Blocker — vor nächstem Release |
| 🟡 P2 | High — nächster Sprint |
| 🔵 P3 | Normal — Backlog |
| `[DEP]` | Hat Abhängigkeit zu anderem Item |
| `[DONE]` | Abgeschlossen |

---

## P1 — Blocker

---

### WP-001 · categoryForDisplayOrder() aus Frontend entfernen

**Priorität:** 🔴 P1
**Tab:** `inventory/bar-refill`
**Typ:** Bug / Data Integrity

#### Fund

```
apps/cockpit-next/app/(app)/inventory/bar-refill/refill-client.tsx
Zeilen: ~44–58
```

`categoryForDisplayOrder()` mappt `displayOrder`-Nummern hardcoded auf Kategorienamen im Frontend-Client. Sobald Items umgeordnet oder neue Kategorien angelegt werden, bricht das Grouping lautlos — falsche Kategorien ohne Fehlermeldung.

```ts
// PROBLEMATISCH — hardcoded im Client:
if ([1, 2, 3, 4, 5, 6, 7, 8].includes(order)) return "Softdrinks klein";
if ([9, 10, 11, 12, 13, 41, 42].includes(order)) return "Energy & Wasser";
// ...
```

#### Vorgeschlagener Lösungsweg

1. `BarRefillRunItem` DTO um Feld `category: string` erweitern.
2. `bar-refill.service.ts` — beim Aufbau der Run-Items `inventoryItem.category` oder `inventoryItem.barCategory` aus DB-Join befüllen.
3. `inventory.schemas.ts` — Zod-Schema für `BarRefillRunItem` um `category` ergänzen.
4. `refill-client.tsx` — `categoryForDisplayOrder()` und `CATEGORY_ORDER` entfernen; stattdessen `item.category` direkt verwenden.
5. Sortierung der Gruppen: alphabetisch oder über DB-Feld `categoryDisplayOrder` (falls vorhanden).

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `src/modules/inventory/bar-refill.service.ts` | Feature — DB-Join für category |
| `src/modules/inventory/inventory.schemas.ts` | Schema-Erweiterung |
| `src/routes/inventory.route.ts` | DTO-Durchleitung prüfen |
| `apps/cockpit-next/app/(app)/inventory/bar-refill/refill-client.tsx` | Hardcode entfernen |

#### Abhängigkeiten

- Prisma-Schema: `InventoryItem.category` muss befüllt sein → prüfen via `npx prisma db pull --print`
- Keine weiteren WP-Items blockieren dieses.

#### Definition of Done

- [ ] `BarRefillRunItem` DTO enthält `category: string`
- [ ] `refill-client.tsx` enthält keine hardcodierten `displayOrder`-zu-Kategorie-Mappings mehr
- [ ] Gruppen werden korrekt angezeigt wenn Items neu sortiert sind
- [ ] `npm run typecheck` ✅
- [ ] `npm test -- --run` ✅

#### Acceptance Criteria

- Bar-Refill zeigt korrekte Kategorien wenn ein Item von `displayOrder=5` auf `displayOrder=43` verschoben wird
- Bei unbekannter Kategorie wird `"Sonstiges"` als Fallback verwendet, nicht ein leerer Abschnitt
- Kein Compile-Fehler, kein TS-Fehler

#### Rollback

```bash
git revert <commit-sha>
# DTO-Änderung ist additive — kein DB-Schema-Rollback nötig
```

---

### WP-002 · Rollen-Contract dokumentieren und als Shared-Type etablieren

**Priorität:** 🔴 P1
**Tab:** Systemweit (Auth)
**Typ:** Security / Contract

#### Fund

Frontend-Rollen (`OrganizationMember.role`):
```
owner | admin | manager | staff | viewer
```
Backend-Rollen (Fastify `requireActorRole`):
```
admin | shift_lead | staff
```

Zwei divergente Systeme ohne gemeinsames Contract-Dokument oder Typ-File. Mapping ist implizit. Fehler in Rollenzuordnung sind zur Laufzeit nicht sichtbar.

Fundstellen:
```
src/routes/inventory.route.ts           → adminOnlyRoles, leadRoles, operationalRoles
apps/cockpit-next/app/(app)/...         → hasRole(["owner","admin","manager","staff"])
apps/cockpit-next/app/(app)/inventory/bar-refill/refill-client.tsx  → hasRole(["owner","admin","manager","staff"])
```

#### Vorgeschlagener Lösungsweg

1. `docs/ROLES_CONTRACT.md` anlegen mit vollständiger Mapping-Tabelle.
2. Optional: `src/modules/auth/roles.ts` — Enum/Const für Backend-Rollen.
3. Optional: `apps/cockpit-next/lib/roles.ts` — Enum/Const für Frontend-Rollen + Mapping-Funktion `toBackendRole()`.
4. Alle `hasRole(["..."])` und `requireActorRole(["..."])` Aufrufe gegen die Konstanten refactorn.

#### Docs-Template für `docs/ROLES_CONTRACT.md`

```markdown
# Rollen-Contract

## Frontend-Rollen (OrganizationMember.role)
| Rolle   | Beschreibung               |
|---------|----------------------------|
| owner   | Voller Zugriff             |
| admin   | Voller Zugriff ohne Owner  |
| manager | Operativer Lead            |
| staff   | Operativer Zugriff         |
| viewer  | Lesend                     |

## Backend-Rollen (Actor.role)
| Rolle       | Maps from Frontend     |
|-------------|------------------------|
| admin       | owner, admin           |
| shift_lead  | manager                |
| staff       | staff                  |
| (kein Match)| viewer                 |

## Mapping-Funktion
...
```

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `docs/ROLES_CONTRACT.md` | Neu |
| `src/modules/auth/roles.ts` | Neu (optional) |
| `apps/cockpit-next/lib/roles.ts` | Neu (optional) |
| Alle `hasRole()`-Aufrufe | Refactor auf Konstanten |

#### Abhängigkeiten

- Keine. Kann isoliert umgesetzt werden.

#### Definition of Done

- [ ] `docs/ROLES_CONTRACT.md` existiert und ist vollständig
- [ ] Mapping Frontend → Backend eindeutig dokumentiert
- [ ] Mindestens ein shared Roles-Const etabliert (docs reicht für P1)
- [ ] `npm run typecheck` ✅

#### Acceptance Criteria

- Neuer Entwickler kann in < 2 min verstehen welche Frontend-Rolle welchen Backend-Zugriff hat
- Kein `hasRole(["owner","admin","manager"])` ohne Verweis auf Contract

#### Rollback

Docs-Only — kein funktionaler Rollback nötig.

---

### WP-003 · ErrorState "Erneut versuchen" funktional machen

**Priorität:** 🔴 P1
**Tab:** `inventory/balances`, `storage`
**Typ:** Bug / UX

#### Fund

```
apps/cockpit-next/app/(app)/inventory/balances/page.tsx  → Zeile ~26
apps/cockpit-next/app/(app)/storage/page.tsx             → Zeile ~46
```

```tsx
// AKTUELL — Button hat keinen Effect:
<ErrorState
  action={<Button variant="outline">Erneut versuchen</Button>}
  ...
/>
```

`<Button>` ohne `onClick` oder `type="submit"` ist totes UI. Server Components können nicht einfach reloaden — braucht Client-Wrapper oder `router.refresh()`.

#### Vorgeschlagener Lösungsweg

**Option A (minimal):** Dediziertes Client Component `<RetryButton>`:

```tsx
// apps/cockpit-next/app/components/ui/retry-button.tsx
"use client";
import { useRouter } from "next/navigation";
import { Button } from "./button";

export function RetryButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.refresh()}>
      Erneut versuchen
    </Button>
  );
}
```

Dann in `balances/page.tsx` und `storage/page.tsx`:
```tsx
import { RetryButton } from "../../../components/ui/retry-button";
// ...
action={<RetryButton />}
```

**Option B:** Ganze Page als Client Component + eigener fetch-State. Aufwändiger, nur wenn Balances/Storage sowieso interaktiv werden sollen (→ WP-008).

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/app/components/ui/retry-button.tsx` | Neu |
| `apps/cockpit-next/app/(app)/inventory/balances/page.tsx` | RetryButton einbinden |
| `apps/cockpit-next/app/(app)/storage/page.tsx` | RetryButton einbinden |

#### Abhängigkeiten

- Keine.

#### Definition of Done

- [ ] Klick auf "Erneut versuchen" triggert `router.refresh()`
- [ ] Seite lädt neu ohne manuelles Browser-Reload
- [ ] Kein TS-Fehler, kein Lint-Fehler

#### Acceptance Criteria

- Nach simuliertem DB-Fehler: Button klicken → Seite versucht erneut zu laden
- Button ist in beiden ErrorState-Instanzen funktional (Balances + Storage)

#### Rollback

```bash
git revert <commit-sha>
# Rein additive Änderung — kein Risiko
```

---

## P2 — High Priority

---

### WP-004 · Dashboard KPI-Cards: Deeplinks zu gefilterten Zielseiten

**Priorität:** 🟡 P2
**Tab:** `dashboard`
**Typ:** Feature / UX
**Abhängigkeit:** `[DEP WP-003]` — ErrorState auf Zielseiten muss vorher funktionieren

#### Fund

```
apps/cockpit-next/app/(app)/dashboard/page.tsx
```

Alle 5 KPI-Cards sind rein dekorative Blöcke ohne Navigation. Nutzer sehen "12 kritische Artikel" aber müssen manuell zu Balances navigieren.

#### Vorgeschlagener Lösungsweg

`<Card>` um `<Link href="...">` wrappen oder `onClick` mit `router.push()`.

| KPI-Card | Ziel |
|----------|------|
| Kritische Artikel | `/inventory/balances` |
| Artikelbestand | `/inventory/items` |
| Standorte | `/storage` |
| Alerts offen | `/alerts?status=open` |
| Alerts gelöst | `/alerts?status=resolved` |
| Hotspot-Row | `/movements?itemId=<id>` (optional, WP-007) |

```tsx
// dashboard/page.tsx — Beispiel
import Link from "next/link";
// ...
<Link href="/inventory/balances" className="card-link-wrap">
  <Card>...</Card>
</Link>
```

Alternativ: `Card` um eine `href`-Prop erweitern wenn Karten-Wrapper nicht geändert werden soll.

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/app/(app)/dashboard/page.tsx` | Link-Wrapping |
| `apps/cockpit-next/app/components/ui/card.tsx` | Optional: href-Prop |
| `apps/cockpit-next/app/globals.css` | Optional: hover-Cursor für Card-Link |

#### Definition of Done

- [ ] Alle 5 KPI-Cards navigieren zu sinnvoller Zielseite
- [ ] Hotspot-Tabellen-Rows sind mindestens klickbar (Navigiert zu Balances)
- [ ] Hover-Cursor zeigt Pointer auf klickbaren Cards

#### Acceptance Criteria

- Click auf "Kritische Artikel" → `/inventory/balances`
- Click auf "Alerts offen" → `/alerts?status=open` mit vorgefilterter Ansicht
- Kein JS-Fehler, kein broken Link

---

### WP-005 · Movements: Confirm-Dialog für irreversible Buchungen

**Priorität:** 🟡 P2
**Tab:** `movements`
**Typ:** Safety / UX

#### Fund

```
apps/cockpit-next/app/(app)/movements/movements-client.tsx
```

`withdrawal`-Buchungen sind irreversibel (Bestandsabgang). Kein Bestätigungsdialog. Im Schichtbetrieb (Stress, Zeitdruck) führt das zu Fehlbuchungen.

#### Vorgeschlagener Lösungsweg

Confirm-Step im bestehenden 2-Screen-Flow (select → confirm) erweitern um Summary-Card vor dem finalen POST:

```
Screen 1: select  →  Screen 2: confirm (bestehend)  →  Screen 3: summary+confirm (neu)
```

Alternativ: shadcn `<Dialog>` als Overlay auf Screen 2 für withdrawal-Typ.

Summary zeigt:
- Artikelname + Menge + Einheit
- Aktueller Bestand → neuer Bestand (Prognose)
- Lagerort
- "Bestätigen" (Primary) + "Zurück" (Secondary)

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/app/(app)/movements/movements-client.tsx` | Screen-3-State + Dialog |
| `apps/cockpit-next/app/components/ui/` | ggf. Dialog-Komponente (shadcn) |

#### Definition of Done

- [ ] Withdrawal-Buchung erfordert explizite Bestätigung in zusätzlichem Schritt
- [ ] Zusammenfassung zeigt Artikel, Menge, prognostizierten neuen Bestand
- [ ] "Zurück" kehrt zu Screen 2 zurück ohne Datenverlust
- [ ] Andere Buchungstypen (goods_receipt, correction, transfer) optional: gleiche Behandlung

#### Acceptance Criteria

- Withdrawal ohne Bestätigungsschritt ist nicht buchbar
- "Zurück" navigiert zurück ohne Fehlerzustand
- Prognostizierter neuer Bestand: `currentStock - quantity` (vereinfacht, ohne Concurrent-Updates)

---

### WP-006 · Balances: Differenz-Spalte mit Color-Coding

**Priorität:** 🟡 P2
**Tab:** `inventory/balances`
**Typ:** UX / Operabilität

#### Fund

```
apps/cockpit-next/app/(app)/inventory/balances/page.tsx  → Differenz-Spalte
```

`difference`-Wert wird als rohe Zahl dargestellt. Negativ (Unterbestand) und positiv (Überbestand) sind visuell identisch.

#### Vorgeschlagener Lösungsweg

```tsx
// Differenz-Badge-Logik:
function diffVariant(diff: number | null) {
  if (diff === null) return "neutral";
  if (diff < 0) return "critical";
  if (diff === 0) return "ok";
  return "warning"; // Überbestand: optional warning
}

// In der Tabelle:
<td>
  {row.difference !== null ? (
    <Badge variant={diffVariant(row.difference)}>
      {row.difference > 0 ? "+" : ""}{row.difference}
    </Badge>
  ) : "—"}
</td>
```

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/app/(app)/inventory/balances/page.tsx` | Badge-Logik |

#### Definition of Done

- [ ] Negative Differenz → Badge `critical` (rot)
- [ ] Differenz = 0 → Badge `ok` (grün)
- [ ] Positive Differenz → Badge `warning` oder neutral (konfigurierbar)
- [ ] `null`-Differenz → `"—"` ohne Badge

#### Acceptance Criteria

- Tabellenansicht mit gemischten Differenzwerten ist auf einen Blick scanbar
- Keine visuellen Fehler bei `null`, `0`, negativen oder großen positiven Werten

---

### WP-007 · Movements: Deeplink-Einsprung mit `?itemId=` Parameter

**Priorität:** 🟡 P2
**Tab:** `movements`
**Typ:** Feature / UX
**Abhängigkeit:** `[DEP WP-004]` — Dashboard-Hotspot-CTA braucht diesen Link

#### Fund

```
apps/cockpit-next/app/(app)/movements/movements-client.tsx
```

Kein URL-Parameter-Support. Navigation von Dashboard-Hotspot "Artikel buchen" → Movements würde Item-Selektion erfordern, aber derzeit kein Pre-Fill möglich.

#### Vorgeschlagener Lösungsweg

```tsx
// movements/page.tsx — searchParams lesen
const itemId = (await searchParams)?.itemId;

// An MovementsClient weitergeben:
<MovementsClient items={items} locations={...} preSelectedItemId={itemId} />

// In MovementsClient:
// useEffect: wenn preSelectedItemId, setSelectedItem(items.find(i => i.id === preSelectedItemId))
```

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/app/(app)/movements/page.tsx` | searchParams lesen |
| `apps/cockpit-next/app/(app)/movements/movements-client.tsx` | preSelectedItemId Prop |

#### Definition of Done

- [ ] `/movements?itemId=<uuid>` öffnet Movements mit vorausgewähltem Artikel
- [ ] Ohne `itemId` verhält sich die Seite exakt wie bisher

#### Acceptance Criteria

- Dashboard-Hotspot-Row (nach WP-004) kann mit `?itemId=` verlinken
- Kein JS-Fehler wenn `itemId` nicht im items-Array gefunden wird

---

### WP-008 · Alerts: Static Enum-Listen für Severity + Status Filter

**Priorität:** 🟡 P2
**Tab:** `alerts`
**Typ:** Stability / UX

#### Fund

```
apps/cockpit-next/app/(app)/alerts/page.tsx  → Zeilen ~40-42
```

```ts
const severities = Array.from(new Set(result.data.map((row) => row.severity))).sort();
const statuses = Array.from(new Set(result.data.map((row) => row.status))).sort();
```

Filter-Optionen werden aus Live-Daten generiert. Bei leerem Ergebnis (z.B. alle Alerts resolved) verschwinden die Filter-Dropdowns — kein "all"-Reset mehr möglich.

Gleiches Problem in `storage/page.tsx` für `type`-Filter.

#### Vorgeschlagener Lösungsweg

```ts
// lib/constants/review-tasks.ts
export const ALERT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const ALERT_STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;

// lib/constants/storage.ts
export const STORAGE_TYPES = ["bar", "kitchen", "cellar", "external"] as const;
// → aus DB-Enum oder AGENTS.md ableiten
```

In `alerts/page.tsx` und `storage/page.tsx` die `Array.from(new Set(...))` durch Konstanten ersetzen.

#### Betroffene Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `apps/cockpit-next/lib/constants/review-tasks.ts` | Neu |
| `apps/cockpit-next/lib/constants/storage.ts` | Neu |
| `apps/cockpit-next/app/(app)/alerts/page.tsx` | Konstanten einbinden |
| `apps/cockpit-next/app/(app)/storage/page.tsx` | Konstanten einbinden |

#### Definition of Done

- [ ] Filter-Optionen sind auch bei leerem Datensatz sichtbar
- [ ] Konstanten stimmen mit Prisma-Schema-Enums überein
- [ ] `npm run typecheck` ✅

#### Acceptance Criteria

- Alerts-Seite ohne Daten zeigt trotzdem vollständige Filter-Dropdowns
- Neuer Enum-Wert in DB → Konstante manuell nachtragen (kein Auto-Generate nötig für P2)

---

## P3 — Backlog

---

### WP-009 · Workspaces: workspaceName statt workspaceId als Card-Titel

**Priorität:** 🔵 P3
**Tab:** `workspaces`
**Typ:** UX / Data

#### Fund

```
apps/cockpit-next/app/(app)/workspaces/page.tsx  → h2 zeigt workspace.workspaceId
```

`workspaceId` ist eine technische UUID. Für Nutzer nicht lesbar.

#### Vorgeschlagener Lösungsweg

`listWorkspaceSummariesForCurrentUser()` um `workspaceName`-Feld erweitern (JOIN auf Workspace-Tabelle). Anzeige: `workspace.workspaceName ?? workspace.workspaceId`.

#### Definition of Done

- [ ] Card-Titel zeigt menschenlesbaren Namen wenn vorhanden
- [ ] Fallback auf `workspaceId` wenn kein Name

---

### WP-010 · Inventory/Items: Create-Button in Toolbar (nicht nur EmptyState)

**Priorität:** 🔵 P3
**Tab:** `inventory/items`
**Typ:** UX

#### Fund

```
apps/cockpit-next/app/(app)/inventory/items/page.tsx  → EmptyState action
```

"Artikel erstellen" erscheint nur wenn keine Artikel vorhanden sind.

#### Vorgeschlagener Lösungsweg

Button in `toolbar-row` mit `RoleGate` (allowed: `["owner","admin","manager"]`) ergänzen.

```tsx
<div className="toolbar-row">
  {/* existing form */}
  <RoleGate allowed={["owner","admin","manager"]}>
    <Button variant="primary">Artikel erstellen</Button>
  </RoleGate>
</div>
```

#### Definition of Done

- [ ] Create-Button in Toolbar, unabhängig von Datenlage sichtbar
- [ ] RoleGate korrekt: staff/viewer sehen keinen Button

---

### WP-011 · Movements History: actorUserId zu displayName auflösen

**Priorität:** 🔵 P3
**Tab:** `movements`
**Typ:** Data Quality / UX

#### Fund

```
apps/cockpit-next/app/(app)/movements/movements-client.tsx
→ MovementRow.actorUserId — roh in Tabelle angezeigt
```

#### Vorgeschlagener Lösungsweg

`listMovements`-Query in Supabase-Queries erweitern: JOIN auf `UserProfile` (falls vorhanden) oder `auth.users`. `actorDisplayName: string | null` zum `MovementRow`-Typ hinzufügen.

Anzeige: `row.actorDisplayName ?? row.actorUserId.slice(0, 8)`

#### Definition of Done

- [ ] Movements History zeigt DisplayName oder Email statt UUID
- [ ] Fallback auf UUID-Prefix wenn kein DisplayName

---

### WP-012 · Storage: Stale-Snapshot-Warning

**Priorität:** 🔵 P3
**Tab:** `storage`
**Typ:** Operational Safety

#### Fund

`lastSnapshotAt` wird angezeigt, aber kein visuelles Warning wenn Snapshot veraltet ist (z.B. > 7 Tage).

#### Vorgeschlagener Lösungsweg

```ts
function isStale(lastSnapshotAt: string | null, thresholdDays = 7): boolean {
  if (!lastSnapshotAt) return true;
  const diff = Date.now() - Date.parse(lastSnapshotAt);
  return diff > thresholdDays * 24 * 60 * 60 * 1000;
}
```

`lastSnapshotAt`-Zelle: Badge `warning` wenn stale, Badge `ok` wenn aktuell.

#### Definition of Done

- [ ] Lagerorte ohne Snapshot oder mit veraltetem Snapshot sind visuell markiert
- [ ] Threshold konfigurierbar (Default: 7 Tage)

---

## Abhängigkeits-Graph

```
WP-003 (RetryButton)
  └── WP-004 (Dashboard Deeplinks) erwartet funktionierende Zielseiten

WP-004 (Dashboard Deeplinks)
  └── WP-007 (Movements ?itemId) — Hotspot-CTA benötigt Deeplink-Target

WP-001 (categoryForDisplayOrder)
  └── Unabhängig — kann sofort umgesetzt werden

WP-002 (Rollen-Contract)
  └── Unabhängig — blockiert keine anderen Items, aber Basis für zukünftige Auth-Arbeit

WP-005, WP-006, WP-008, WP-009–012
  └── Alle unabhängig voneinander
```

---

## Sprint-Vorschlag

### Sprint 1 — Stabilitäts-Sprint (Ziel: P1 cleared)
- WP-001 categoryForDisplayOrder
- WP-002 Rollen-Contract Docs
- WP-003 RetryButton

**Estimated:** ~1–2 Tage

### Sprint 2 — UX-Sprint (Ziel: operativer Mehrwert)
- WP-004 Dashboard Deeplinks
- WP-006 Balances Color-Coding
- WP-008 Static Enum-Listen
- WP-005 Movements Confirm-Dialog

**Estimated:** ~2–3 Tage

### Sprint 3 — Backlog-Sprint
- WP-007 ?itemId Deeplink
- WP-009 workspaceName
- WP-010 Create-Button in Toolbar
- WP-011 actorUserId → displayName
- WP-012 Stale-Snapshot-Warning

**Estimated:** ~1–2 Tage

---

## Abschluss-Checkliste pro Item

```
- [ ] Fund im Code verifiziert (Datei + Zeile angegeben)
- [ ] Lösungsweg reviewed (kein Big-Rewrite)
- [ ] Betroffene Dateien vollständig gelistet
- [ ] Änderung lokal getestet (typecheck + test run)
- [ ] DoD erfüllt
- [ ] Acceptance Criteria manuell verifiziert
- [ ] Kein neuer TS-Fehler eingeführt
- [ ] WORKPLAN-Status auf [DONE] gesetzt
```

---

*Dokument-Owner: baum777 · Auto-generiert aus Codebase-Audit 2026-06-04*
*Nächste Review: nach Sprint 1 Abschluss*
