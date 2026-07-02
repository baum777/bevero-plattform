# Task: CUBE Source-Conflict Validator (Sub-Phase 3.0-B)

**Working title:** `cube-source-conflict-validator`
**Status:** `ACCEPTED` (ADR-0036 Owner-Acceptance 2026-06-09)
**Owner-ADR:** ADR-0036-B (proposed, Sub-Section von ADR-0036 in `docs/DECISIONS.md`)
**Depends on:** Task 00 (`00-cube-venue-spec-gap.md`), Task 00a (`00a-cube-venue-model-spec.md`), ADR-0022 (Phase B Schema + Read-Endpoints), ADR-0023 (Mutation-Surface), ADR-0021 §3
**Source spec:** User-CUBE-Deepdive vom 2026-06-09, §4 (Source-Konflikte: o.T.-Bar So–Do 19 vs. 20 Uhr, Menüanzahl 2 vs. 3, Möbelschwellen 100 vs. 120)
**Target repo state:** **Keine.** Reine Spec. Implementation-Slice ist `01c-cube-source-conflict-impl.md` (ADR-0029-B).

## Zweck

Diese Spec definiert, wie Bevero mit **Source-Konflikten** umgeht, die aus der CUBE-Website, der Bankettmappe, der Kontaktseite und anderen Quellen entstehen. Sie ist **konzeptionell** — kein Crawler, kein Diff-Daemon, kein LLM. Sie definiert Substrat-Schemata und einen **Manager-Approval-Pfad** über die bestehende Phase-A-Automation-Infrastruktur (ADR-0022/0023).

## Hard-Guardrails

- **Kein Auto-Resolve.** Source-Konflikte werden niemals automatisch aufgelöst (Konsistenz mit ADR-0021 §3, kein LLM, kein deterministischer Last-Write-Wins).
- **Kein LLM-Resolver.** Konflikterkennung und -Auflösung sind deterministisch.
- **Manager-Approval ist der einzige Pfad.** Freigabe über `POST /admin/automation/suggestions/:id/approve` (ADR-0023).
- **Append-only Audit.** Jede Conflict-Detection erzeugt einen immutable `AutomationSuggestion` (ADR-0022). Jede Approve/Reject-Entscheidung erzeugt einen append-only `AutomationDecision` (ADR-0022 + ADR-0023 B-2 Trigger).
- **Read-only URL-Register.** `CUBE_Source.url` ist Konfigurationswert, kein Connector. Es findet **kein** automatischer HTTP-Fetch statt.
- **PII-Sanitization.** `CUBE_SourceField.fieldValue` darf keine PII enthalten. Cockpit-Read zeigt nur Feldnamen + Wert + Confidence-Badge.
- **Multi-Tenant:** CUBE-Source-Konflikte leben im RLS-Scope der CUBE-Organization.
- **No writeback** an externe Systeme (ADR-0002, ADR-0021).

## Entscheidungen

### 1. Source-Versioning-Substrat

CUBE bezieht Daten aus mehreren Quellen, die sich widersprechen können. Diese Quellen werden versioniert gespeichert, damit Konflikte reproduzierbar bleiben.

**`CUBE_Source` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | FK-Constraint auf Org (Multi-Tenant) |
| `name` | `String` | Eindeutiger Slug, z.B. `cube_website`, `cube_bankettmappe_pdf`, `cube_kontaktseite` |
| `displayName` | `String` | z.B. "CUBE Website", "CUBE Bankettmappe" |
| `version` | `Int @default(1)` | Monoton steigend pro `name` |
| `retrievedAt` | `DateTime` | Zeitpunkt der manuellen Eingabe / Review |
| `url` | `String?` | Read-only URL-Register, **kein** Connector. Optional. |
| `payloadHash` | `String?` | SHA-256 der Quelldaten (manuell eingegeben oder gecopy-pastet) |
| `isActive` | `Boolean @default(true)` | Soft-Aktivierung, analog ADR-0009 |
| `enteredBy` | `String?` | User-ID (Manager, der die Daten erfasst hat) |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |
| `deletedAt` | `DateTime?` | Soft-Delete |

`@@unique([organizationId, name, version])`, `@@index([organizationId, isActive])`, `@@index([organizationId, name])`.

**`CUBE_SourceField` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `sourceId` | `String` | FK auf `CUBE_Source.id` |
| `fieldKey` | `String` | z.B. `ot_bar_sunday_thursday_hours`, `group_dinner_menu_count`, `furniture_threshold` |
| `fieldValue` | `String` | Aktueller Wert aus dieser Quelle |
| `confidence` | `String` (oder Enum) | `confirmed`, `conflict_detected`, `requires_manager_confirmation` |
| `discoveredAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

`@@index([sourceId, fieldKey])`, `@@index([confidence])`, `@@index([fieldKey])`.

**Beispiel-Seed (verbatim aus Deepdive §4, Stand 2026-06-09, `isActive: false`):**

```text
cube_website (v1):
  ot_bar_sunday_thursday_hours:  "10:00-19:00"
  group_dinner_menu_count:       "two_menus"
  furniture_threshold:           "included_until_100"

cube_kontaktseite (v1):
  ot_bar_sunday_thursday_hours:  "10:00-20:00"
  group_dinner_menu_count:       "three_menus"

cube_bankettmappe_pdf (v1):
  furniture_threshold:           "additional_from_120"
  exclusive_rental_min_guests:   "70"
  seated_menu_max:               "170"
  standing_reception_max:        "250"
```

**Open Question 1 (Architektur):** Soll `CUBE_Source`/`CUBE_SourceField` brand-übergreifend (`public`-Schema) oder CUBE-spezifisch sein? **Empfehlung:** brand-übergreifend, weil auch Motorworld Inn Quellversionierung brauchen wird. Schema: `public`.

### 2. Conflict-Detection (konzeptionell, kein Auto-Daemon)

Konflikte entstehen, wenn mehrere `CUBE_SourceField`-Zeilen mit demselben `fieldKey` und unterschiedlichen `fieldValue` in derselben `organizationId` aktiv sind. **Wichtig:** Detection ist **konzeptionell** spezifiziert, **nicht** als automatischer Daemon implementiert. Cockpit-Read-Endpoint vergleicht und listet; Manager markiert `confidence = "conflict_detected"`.

**`CUBE_Conflict` (Substrat, neu, optional):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | Multi-Tenant |
| `fieldKey` | `String` | z.B. `ot_bar_sunday_thursday_hours` |
| `sourceIds` | `String[]` | Liste der kollidierenden `CUBE_Source.id`s |
| `detectedAt` | `DateTime @default(now())` | |
| `resolvedAt` | `DateTime?` | Wann Manager freigegeben hat |
| `resolvedBySuggestionId` | `String?` | Link zum `AutomationSuggestion` (siehe §3) |
| `winningFieldValue` | `String?` | Nach Manager-Approval; null bis dahin |

`@@index([organizationId, fieldKey])`, `@@index([resolvedAt])`.

**Open Question 2 (Architektur):** Wird `CUBE_Conflict` als eigenes Substrat benötigt, oder reicht die Kombination `CUBE_SourceField.confidence = "conflict_detected"` + `AutomationSuggestion.metadata.conflict = true`? **Empfehlung:** `CUBE_Conflict` als eigenes Substrat, weil Cockpit schnelle List-View braucht (kein Full-Table-Scan auf `CUBE_SourceField`). Erweiterungs-Slice möglich.

### 3. Manager-Approval-Pfad via ADR-0022/0023

Source-Konflikte sind **keine** `InventoryMovement`-auslösenden Events. Sie sind Konfigurationsänderungen, die Manager-Freigabe brauchen. Daher:

**Schritt 1: Detection → AutomationSuggestion**

Beim Erstellen oder Aktualisieren einer `CUBE_Conflict`-Zeile erzeugt der Cockpit-Read-Endpoint (oder ein Admin-Trigger-Endpoint im Implementation-Slice) **eine** `AutomationSuggestion`:

- `ruleId: null` (kein Rule-Firing, manuelle Detection)
- `type: "custom"`
- `title`: z.B. "Source-Konflikt: o.T. Bar So–Do-Zeiten"
- `detail`: Liste der kollidierenden `fieldValue`s mit `sourceId`-Verweisen
- `metadata.conflict: true`
- `metadata.conflictId: <CUBE_Conflict.id>`
- `metadata.fieldKey: "ot_bar_sunday_thursday_hours"`
- `relatedItemIds: []` (keine `InventoryItem`-Beziehung)
- `status: "open"`
- `expiresAt: null` (kein Auto-Expire)

**Schritt 2: Manager sichtet Cockpit-View**

Cockpit zeigt unter "Source-Konflikte" (eigener Tab, Folge-Task analog Task 08):

- Liste aller `AutomationSuggestion` mit `metadata.conflict = true`
- Pro Eintrag: `fieldKey`, kollidierende `fieldValue`s mit Source-Versions, "Approve" / "Reject" Buttons
- Approve: öffnet Dropdown "Gewählter Wert: ..." mit den Source-Optionen

**Schritt 3: Approve via bestehender Route**

`POST /admin/automation/suggestions/:id/approve` (ADR-0023) wird wiederverwendet.

- Body: `{ "reason": "Quelle X ist aktueller", "winningFieldValue": "10:00-20:00", "clientRequestId": "..." }`
- 200: bestehender Response, plus Custom-Logic: setze `CUBE_Conflict.winningFieldValue`, `CUBE_Conflict.resolvedAt`, `CUBE_Conflict.resolvedBySuggestionId`. Markiere alle betroffenen `CUBE_SourceField` mit `confidence = "confirmed"` für den gewählten Wert.
- Side effect: **kein** `InventoryMovement`, **kein** `WorkflowTask` (Konsistenz mit ADR-0021 §3 — Suggestions sind immutable, Decisions sind append-only).

**Schritt 4: Reject via bestehender Route**

`POST /admin/automation/suggestions/:id/reject` (ADR-0023):

- Body: `{ "reason": "Konflikt bleibt offen, externe Klärung nötig" }`
- 200: setze `CUBE_Conflict.resolvedAt = null` (bleibt offen), keine Status-Änderung an `CUBE_SourceField`.

**Hard-Guardrail:** Die bestehenden Mutations-Routen aus ADR-0023 werden **nicht** verändert. Sie werden **wiederverwendet**. Der `winningFieldValue` wird als optionales Custom-Field im Approval-Body transportiert; Backend prüft `metadata.conflict = true` und führt die `CUBE_Conflict`-Update-Logik aus.

**Open Question 3 (Architektur):** Soll der Approval-Body um `winningFieldValue` erweitert werden (was eine ADR-0023-Erweiterung wäre), oder soll die Source-Conflict-Logik ein **eigenes** Mutation-Endpoint-Paar bekommen (`POST /admin/cube/conflicts/:id/resolve`)? **Empfehlung:** Eigenes Endpoint-Paar. Begründung: ADR-0023-Body ist generisch und soll es bleiben. Source-Conflict-spezifische Logik (CUBE_Conflict-Update, CUBE_SourceField-Confidence-Update) gehört semantisch zu `/admin/cube/conflicts/...`. Implementation-Slice ADR-0029-B öffnet diese Endpoints.

### 4. Cockpit-View (Out-of-Scope, aber als Folge-Task geplant)

Cockpit-View für Source-Conflict-Review ist **eigener Folge-Task** (analog Task 08):

- `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/source-conflicts/page.tsx`
- Hook-Integration: `useSourceConflicts()`, `useResolveConflict()`
- Read-only Liste, Approve/Reject-Buttons, PII-sanitized (kein `fieldValue` mit PII)
- 2 vitest-Snapshot-Tests (analog Task 08)

**Hard-Guardrail:** Konflikt-View zeigt **keine** PII, **keine** URLs von Drittanbietern (außer `cube-restaurant.de`), **keine** rohen PDF-Extraktionen. Nur Feldnamen + Werte + Source-Versionen.

### 5. Out-of-Scope

- **PDF-Ingest der Bankettmappe.** Architektur-Beschluss fehlt. Manuelle Eingabe über Cockpit-Form (analog Inventory-Items). Folge-ADR.
- **Crawl-/Diff-Engine.** Kein automatischer Web-Crawler. Kein periodischer Diff-Daemon. Detection ist Cockpit-initiiert.
- **LLM-Resolver.** ADR-0021 §3 verbietet.
- **Multi-Source-Merge.** Keine automatische Konfliktauflösung über mehrere Quellen.
- **Audit-Log-Export.** ADR-0021 §3 "no PII in `WorkflowEvent.dataJson`" gilt analog für `AutomationSuggestion.detail` und `AutomationDecision.notes` — Sanitization läuft vor Export, nicht zwingend vor Persist.
- **Auto-Notification an Manager.** Konflikte werden **nicht** automatisch gepingt. Manager checkt Cockpit.

## Beispiel-Workflow (End-to-End)

```text
1. Manager öffnet CUBE-Source-Editor (eigener Cockpit-Tab, Folge-Task).
2. Trägt neue Quelle ein: cube_website v2, ot_bar_sunday_thursday_hours = "10:00-19:00".
3. Backend erkennt: gleicher fieldKey, anderer fieldValue als cube_kontaktseite v1 ("10:00-20:00").
4. Erzeugt CUBE_Conflict-Zeile + AutomationSuggestion (type: "custom", metadata.conflict: true).
5. Cockpit Source-Conflict-Tab zeigt Eintrag mit beiden Werten + Source-Links.
6. Manager liest: "Website ist neuer" → klickt Approve, wählt "10:00-20:00" (Kontaktseite).
7. POST /admin/cube/conflicts/:id/resolve → CUBE_Conflict.winningFieldValue = "10:00-20:00",
   CUBE_SourceField.confidence für Kontaktseite-Eintrag = "confirmed",
   AutomationDecision (approved) wird appended.
8. Cockpit zeigt: "Konflikt gelöst, Quelle cube_kontaktseite v1 ist maßgeblich".
9. Nächster Cockpit-Read (z.B. Service-Slot-Dashboard aus Task 08) zeigt o.T.-Bar-Zeiten
   gemäß winningFieldValue.
```

## Bindings

- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime`)
- ADR-0021 (Phase A Hard-Guardrails: kein LLM, kein Auto-Resolve, kein Writeback, kein Service-Role in User-Path)
- ADR-0022 (Phase B Schema + Read-Endpoints)
- ADR-0023 (Mutation-Surface: Approve/Reject)
- ADR-0030 (Profile-Discriminator)
- ADR-0034 (Substrate: OperationalUnit) — *Stand 2026-06-09: bleibt ADR-0034*
- ADR-0048 (Substrate: EventInquiry) — *Stand 2026-06-09 renumbered: war ADR-0035*
- Task 00 (`00-cube-venue-spec-gap.md`)
- Task 00a (`00a-cube-venue-model-spec.md`)
- Task 08 (`08-cockpit-cube-service-slot-dashboard.md`)

## Gate (Definition of Done)

- Diese Datei existiert mit `Status: OPEN`.
- Owner-Acceptance von ADR-0036-B (Sub-Section von ADR-0036).
- 4 Entscheidungs-Sections dokumentiert (Source-Versioning, Conflict-Detection, Manager-Approval-Pfad, Cockpit-View-Out-of-Scope).
- 3 Open Questions dokumentiert.
- Beispiel-Workflow ist konkret beschrieben.
- Kein Code, kein Schema, keine Migration geschrieben.

## Next gate

ADR-0029-B Implementation-Slice (`01c-cube-source-conflict-impl.md`) mit:

- Migration `prisma/migrations/<ts>_add_cube_source_conflict/migration.sql` (3 Substrate: `CUBE_Source`, `CUBE_SourceField`, `CUBE_Conflict`)
- RLS-Plan analog ADR-0022 B-2: org-scoped SELECT, app_runtime/insert, manager+ UPDATE auf `CUBE_Conflict` (kein DELETE — append-only)
- 2 Read-Endpoints: `GET /admin/cube/sources`, `GET /admin/cube/conflicts`
- 1 Mutation-Endpoint-Paar: `POST /admin/cube/conflicts/:id/resolve` mit Body `{ "winningFieldValue": "...", "reason": "...", "clientRequestId": "..." }` (200/403/404/409/422 wie ADR-0023)
- 7 Vitest-Cases (CRUD, RLS, Conflict-Detection, Manager-Approval, PII-Sanitization, Append-only)
- 10-Query Supabase-Promotion-Script
- MSPR-Logbook-Eintrag `2026-06-09-cube-source-conflict-impl.md`
