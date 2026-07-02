# Gastronovi Adapter — Integration Concept

**Status:** Concept (not implemented)
**Scope:** Phase 1 — read-only POS/PMS event ingestion for Motorworld Inn Böblingen
**Owner:** @orchestrator · **Reviewer:** @reviewer · **Approver:** Operator L3
**Stand:** 2026-06-20
**Bezug:** `docs/ARCHITECTURE.md`, `docs/integrations/foodnotify-outlook.md`, `.env.example`

---

## Source-of-Truth Boundary

This document does not assume a public, freely usable Gastronovi developer API.
Publicly verified sources show Gastronovi as an interface and certified partner ecosystem.
Any direct API access, endpoint contract, HOTAPI mapping, tenant header, bearer token flow,
or writeback behavior must be treated as unverified until confirmed by Gastronovi,
a certified partner, or a signed customer/partner contract.

Allowed Phase-1 ingestion sources:
- official Gastronovi export
- certified partner interface
- contractually approved API access
- manually provided sample payloads for synthetic unit tests

Forbidden:
- reverse engineering
- browser automation/RPA against Gastronovi Office
- scraping private endpoints
- using non-certified integrations in production

---

## 1 · Zweck & Einordnung im OS

Bevero ist im Rauschenberger OS der **Kontext‑ und Operations‑Layer**
über FoodNotify, Gastronovi und Standortrealität.

Gastronovi ist das **führende POS‑System** der Event‑ und Restaurant‑Standorte
(Motorworld Inn Böblingen als Pilot). Bevero liest Gastronovi **nicht**,
um es zu ersetzen, sondern um Gastronovi‑Ereignisse in den OS‑Kontext
zu übersetzen:

- Welche Standorte hatten heute welchen Umsatz?
- Wo entstehen Engpässe vs. FoodNotify‑Rezeptplan?
- Welche Gutschein‑Einlösungen wirken auf den Cost‑of‑Sales?
- Welche Stornierungen / Paymaster‑Buchungen erfordern Operator‑Review?
- Welche Kellner‑/Schicht‑Aktivitäten gehören ins Shift‑Handover?

Das Konzept folgt der in `docs/ARCHITECTURE.md` definierten
**Anti‑Corruption‑Layer‑Architektur** für POS‑Daten.

```
Gastronovi (extern)
    │
    │  Gastronovi API  (REST, Bearer/API-Key, Tenant)
    ▼
┌──────────────────────────────────────────────┐
│ 1. Source Connector (gastronovi-connector)   │
│ 2. Raw Payload Store (RawPayload)            │
│ 3. Normalizer → WorkflowEvent                │
│ 4. Rules Engine                              │
│ 5. Task / Alert / Approval Layer             │
└──────────────────────────────────────────────┘
    │
    ▼
Bevero Cockpit / Workflow / Shift‑Handover
```

---

## 2 · Welche Gastronovi‑Datenquellen werden angebunden?

Auf Basis der identifizierten Gastronovi‑API‑Domänen
(siehe Recherche `/workspace/gastronovi-api-research/index.html`):

| Quelle | Gastronovi‑API | Datenklasse | Risiko (Bevero) |
|---|---|---|---|
| Tagesabschluss / Tagesumsatz | HOTAPI Revenue | Read | **L0** |
| Rechnungspositionen (POS‑Bons) | HOTAPI Receipts | Read | **L0** |
| Paymaster‑Buchungen | HOTAPI Paymaster | Read | **L2** (Evidence) |
| Stornierungen / Korrekturen | HOTAPI Cancellations | Read | **L2** |
| Gutschein‑Einlösungen (e‑guma, BON BON, incert) | Voucher API | Read | **L1** |
| Zahlungen (Adyen‑Terminal) | Adyen Terminal API (via Gastronovi Pay) | Read | **L2** |
| Personal‑Stunden (via HOTAPI) | HOTAPI Staff Hours | Read | **L1** |
| Reservierungen (Reserve with Google Sync) | Reservation Sync | Read | **L0** |
| Standort‑Stammdaten | HOTAPI Master Data | Read | **L0** |
| Lieferando / Uber Eats Bestellungen | Deliverect‑Bridge | Read | **L1** |
| Inventur‑Snapshots (Gastronovi Office) | Internal Module | Read | **L2** |

**Out of Scope (Phase 1):** Schreiben zurück nach Gastronovi. Das OS ist
lesend. Bidirektionale Flows (Phase 3) müssen separat governance‑genehmigt werden.

---

## 3 · ENV‑Erweiterungen (`.env.example`)

Bereits reserviert, jetzt **semantisch dokumentiert**:

```env
# === Gastronovi Connector (Phase 1, read-only) ===
GASTRONOVI_API_BASE_URL="https://api.gastronovi.com/v1"
GASTRONOVI_API_KEY="replace_me"          # from Gastronovi Backoffice
GASTRONOVI_TENANT_ID="motorworld-inn-boeblingen"
GASTRONOVI_ENABLED="false"               # safe default: connector off
GASTRONOVI_POLL_INTERVAL_SECONDS="900"   # 15 min, default per ARCHITECTURE.md
GASTRONOVI_LOOKBACK_DAYS="7"             # initial backfill window
GASTRONOVI_RATE_LIMIT_RPS="2"            # conservative; Gastronovi has soft limits
GASTRONOVI_DRY_RUN="true"                # default ON in dev/staging

# Scope per brand/location
GASTRONOVI_SCOPE_MOTORWORLD_INN="true"
GASTRONOVI_SCOPE_CUBE="false"            # Phase 3

# Anti-spoofing & validation
GASTRONOVI_TENANT_ALLOWLIST="motorworld-inn-boeblingen,rauschenberger-cube"
GASTRONOVI_TLS_FINGERPRINT_REQUIRED="true"

# Alerting
GASTRONOVI_SYNC_FAILURE_ALERT_EMAIL="ops@example.com"
```

Alle Werte gehen ausschließlich in Backend‑Secrets. Niemals in
`NEXT_PUBLIC_*` oder Cockpit‑Client‑Code.

---

## 4 · Datenmodell (Prisma‑Erweiterung)

Wiederverwendung der existierenden Models aus
`apps/api/prisma/schema.prisma`:

| Existierendes Model | Verwendung im Gastronovi‑Adapter |
|---|---|
| `SyncRun` | Pro Connector‑Run: Status, started/finished, Items found/imported/duplicate/failed |
| `RawPayload` | Roh‑JSON von Gastronovi (redacted), idempotent über `payloadHash` |
| `WorkflowEvent` | Normalisiertes Ereignis (z.B. `pos.receipt.created`, `pos.paymaster.posted`) |
| `WorkflowTask` | Operator‑Aufgaben aus Rules Engine (z.B. „Paymaster > 500€ review") |
| `ExternalSystemLink` | Mapping `Location ↔ Gastronovi Tenant` |
| `ReservationConnector` | Wiederverwendbar für HOTAPI‑Reservierungs‑Sync |
| `OrganizationMember`, `LocationMember` | Scope‑Berechtigungen auf Connector‑Daten |

**Neu hinzuzufügen** (siehe `docs/integrations/gastronovi-schema.patch.md`):

```prisma
model GastronoviConnection {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  brand           String
  locationId      String
  location        Location @relation(fields: [locationId], references: [id])
  apiKeySecretRef String   // reference to secret manager, never the key itself
  enabled         Boolean  @default(false)
  pollIntervalSec Int      @default(900)
  lastSyncRunId   String?
  lastSyncAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model GastronoviEventType {
  id          String  @id @default(cuid())
  code        String  @unique         // e.g. "pos.receipt.created"
  category    String                  // revenue | refund | paymaster | voucher | staff | reservation
  riskLevel   Int                     // 0..4 mapping L0..L4
  enabled     Boolean @default(true)
  description String?
}
```

Die `GastronoviEventType`‑Tabelle macht die **Risk‑Klassifikation
konfigurierbar** statt hardcoded — das passt zu eurer
`governance/approval-matrix.md`.

---

## 5 · Modul‑Struktur (Vorschlag `apps/api/src/modules/gastronovi/`)

Spiegelt das Ingestion‑Pattern aus `foodnotify-outlook.md`:

```
modules/gastronovi/
├── gastronovi-connector.ts        # Source Connector (HTTP, Auth, Pagination)
├── gastronovi-client.ts           # Typed REST Client (Zod-validated)
├── gastronovi.normalizer.ts       # Gastronovi → internal WorkflowEvent
├── gastronovi.poller.ts           # Scheduled polling, idempotent
├── gastronovi.service.ts          # Orchestriert Connector + Normalizer + Store
├── gastronovi.types.ts            # Zod Schemas für externe Payloads
├── gastronovi.test.ts             # Vitest unit tests (synthetic fixtures)
├── gastronovi.routes.ts           # Admin/Operator Endpoints
└── gastronovi.config.ts           # ENV-Binding + Validation
```

Routen (analog zu FoodNotify `/integrations/foodnotify/email-import/run`):

| Methode | Pfad | Zweck | Risk |
|---|---|---|---|
| `POST` | `/integrations/gastronovi/sync/run` | Manueller Sync‑Trigger | L1 |
| `GET` | `/integrations/gastronovi/connections` | Liste aktiver Connections | L0 |
| `PATCH` | `/integrations/gastronovi/connections/:id` | Connection togglen | L3 |
| `GET` | `/integrations/gastronovi/events?since=…` | WorkflowEvent‑Liste | L0 |
| `POST` | `/integrations/gastronovi/events/:id/ack` | Operator‑Acknowledge | L2 |
| `GET` | `/integrations/gastronovi/health` | Connector Health | L0 |
| `GET` | `/integrations/gastronovi/raw-payloads/:id` | Rohdaten inspizieren (redacted) | L2 |

Alle Routen gehen durch die existierende **RBAC‑Middleware** im Cockpit.

---

## 6 · Normalisierung: Gastronovi → WorkflowEvent

Beispiel‑Mapping für Phase 1:

| Gastronovi‑Ereignis | WorkflowEvent.code | Risk | Downstream |
|---|---|---|---|
| Tagesabschluss `daily.close` | `gastronovi.daily.close` | L0 | Lagebild, KPI‑Refresh |
| Einzelbon `receipt.created` | `gastronovi.receipt.created` | L0 | Cockpit Live‑Stream |
| Storno `receipt.cancelled` | `gastronovi.receipt.cancelled` | L2 | Review‑Task |
| Paymaster‑Buchung > 500€ | `gastronovi.paymaster.posted` | L2 | Operator‑Task + Evidence |
| Gutschein eingelöst | `gastronovi.voucher.redeemed` | L1 | Cost‑of‑Sales‑Adjust |
| Adyen‑Payment fehlgeschlagen | `gastronovi.payment.failed` | L2 | Alert |
| Reservierung | `gastronovi.reservation.created` | L0 | Standort‑Auslastung |
| Inventur‑Abweichung | `gastronovi.inventory.variance` | L2 | Inventory‑Correction |
| Kellner‑Stunden | `gastronovi.staff.hours` | L1 | Shift‑Planning |
| Lieferando‑Order | `gastronovi.delivery.order` | L1 | Operational‑Note |
| Connector‑Fehler | `gastronovi.sync.failed` | L1 | Admin‑Task |

Idempotency‑Key (gemäß `docs/ARCHITECTURE.md`):

```
gastronovi + <entityType> + <externalId> + <businessDate> + <eventType>
```

---

## 7 · Cockpit‑UI‑Erweiterungen

Vorschlag für neue Seiten unter `apps/cockpit/app/`:

```
app/
├── integrations/
│   └── gastronovi/
│       ├── page.tsx                       # Connection‑Übersicht (L0)
│       ├── events/page.tsx                # Event‑Stream (L0)
│       ├── events/[id]/page.tsx           # Event‑Detail + Evidence (L1)
│       ├── connections/page.tsx           # Connection‑Setup (L3)
│       └── health/page.tsx                # Sync‑Health Dashboard (L0)
└── inventory/
    └── reconciliation/page.tsx            # Gastronovi ↔ FoodNotify Abgleich
```

Wiederverwendung der existierenden Cockpit‑Komponenten:
`<WorkflowEventCard>`, `<RawPayloadViewer>` (redacted), `<SyncHealthBadge>`,
`<RiskBadge>` (L0–L4 Farb‑Mapping).

---

## 8 · Sicherheits‑ & Governance‑Regeln

### Sicherheit

- `GASTRONOVI_API_KEY` **niemals** im Cockpit, in Logs oder in
  `RawPayload.content` (Backend‑seitig redacted).
- Tenant‑ID in `X-Gastronovi-Tenant` Header **und** `TenantAllowlist`‑Check
  serverseitig, kein Client‑Trust.
- Alle `RawPayload`‑Einträge mit `redactedFields: ["apiKey","cardPan","customerEmail"]`.
- Verbindung nur via TLS 1.2+ mit Pin auf `api.gastronovi.com` Zertifikat
  (in Production).
- Outbound Rate‑Limit: max 2 RPS, Backoff bei 429, Circuit‑Breaker bei 3× Fail.

### Governance

| Aktion | Level | Begründung |
|---|---|---|
| Connector **lesen** (Sync‑Run, Events, Health) | **L0** | Kein externer Effekt |
| Manueller Sync‑Trigger | **L1** | Self‑Review reicht |
| Operator‑Acknowledge Paymaster‑Task | **L2** | Evidence + Audit |
| Connection **toggeln / API‑Key rotieren** | **L3** | Externer Effekt auf Production‑POS |
| Bidirektionale Writes zurück nach Gastronovi | **L4** | Produktiv‑Daten verändern |

Regel: **Unklare Klassifikation → eine Stufe höher** (siehe `IDENTITY.md`).

---

## 9 · Use Cases mit direktem Bevero‑Nutzen

| # | Use Case | Trigger | Downstream |
|---|---|---|---|
| **G‑1** | Tagesumsatz Live‑Lagebild | `daily.close` | Cockpit Dashboard, KPI‑Refresh |
| **G‑2** | Paymaster‑Review bei Großbuchungen | `paymaster.posted > 500€` | Operator‑Task (L2) |
| **G‑3** | FoodNotify ↔ Gastronovi Inventur‑Abgleich | `inventory.variance` | Reconciliation‑Seite |
| **G‑4** | Gutschein‑Cost‑Tracking | `voucher.redeemed` | Cost‑of‑Sales‑Update |
| **G‑5** | Storno‑Analyse & Schwellwert‑Alert | `receipt.cancelled` | Rules Engine → Task |
| **G‑6** | Schicht‑Handover Synthese | `staff.hours` + OperationalNote | Shift‑Handover Draft |
| **G‑7** | Lieferando‑Bestellungen Live | `delivery.order` | OperationalNote Auto‑Draft |
| **G‑8** | Reservierungs‑Auslastung pro Brand | `reservation.created` | Location KPI |
| **G‑9** | Payment‑Failure‑Alert | `payment.failed` | Slack‑Webhook + Cockpit Alert |
| **G‑10** | Connector‑Self‑Healing | `sync.failed` × 3 | Retry‑Job + Operator‑Ping |

---

## 10 · Rollout‑Plan (3 Phasen, je 1 Sprint)

### Phase 1 — Read‑Only Pilot (Sprint 1, Ziel 4 Wochen)
- Connector + Normalizer für: `daily.close`, `receipt.created`, `paymaster.posted`
- 1 Tenant: `motorworld-inn-boeblingen`
- Cockpit‑Seite: `integrations/gastronovi/page.tsx` + `events/`
- Dry‑Run ON in Production bis 7 Tage stabil
- Manuelle Trigger via `/integrations/gastronovi/sync/run`
- Test‑Coverage: ≥80% der Connector‑/Normalizer‑Pfade mit synthetic fixtures

### Phase 2 — Erweiterte Events + CUBE (Sprint 2)
- Voucher, Cancellation, Staff Hours
- 2. Tenant: `rauschenberger-cube` (CUBE‑Brand)
- Scheduled Polling (statt nur manuell)
- Reconciliation‑Seite (Gastronovi ↔ FoodNotify)

### Phase 3 — Bidirektional + Automation (Sprint 3+)
- Governance‑Approval L4 für Writes zurück
- Schreiben in Gastronovi nur für definierte Use Cases (z.B. Storno‑Korrektur)
- Deliverect‑Bridge‑Anbindung
- ML‑gestützte Anomalie‑Erkennung auf Event‑Stream

**Definition of Done je Phase:**
- Alle Events in `GastronoviEventType` klassifiziert
- RBAC + RLS auf neuen Tabellen aktiv
- `docs/agent-team/mspr_logbook/` und `docs/agent-team/intent_logbook/` Einträge
- Operator‑Walkthrough mit Motorworld‑Standortleitung

---

## 11 · Offene Entscheidungen

| # | Frage | Default v1 | Phase |
|---|---|---|---|
| D‑1 | Ingestion‑Mode: Polling vs. Webhook | **Polling 15 min** | 1 |
| D‑2 | Welche 3 zuerst? | daily.close, receipt.created, paymaster.posted | 1 |
| D‑3 | Cockpit‑Read‑Only vs. Bidirektional | **Read‑Only** | 1 |
| D‑4 | Polling‑Worker: Vercel Cron vs. eigener Worker | **Vercel Cron** (Serverless) | 1 |
| D‑5 | Multi‑Tenant‑Strategy | 1 Connection pro Brand/Location | 1 |
| D‑6 | Alerter‑Channel | E‑Mail + Cockpit (Slack Phase 2) | 1 |
| D‑7 | Daten‑Retention RawPayload | 90 Tage (Compliance) | 1 |
| D‑8 | Mapping Gastronovi `productGroup` ↔ FoodNotify `article` | Phase 2 | 2 |

---

## 12 · Verweise

- `docs/ARCHITECTURE.md` — Anti‑Corruption‑Layer‑Prinzip
- `docs/integrations/foodnotify-outlook.md` — Vorlage dieses Konzepts
- `IDENTITY.md` — Risikostufen L0–L4
- `governance/approval-matrix.md` — Freigabe‑Pfade
- `apps/api/src/modules/ingestion/` — bestehendes Ingestion‑Pattern
- `apps/api/src/modules/raw-payloads/` — Raw‑Payload‑Store
- `apps/api/prisma/schema.prisma` — Modelle `SyncRun`, `RawPayload`, `WorkflowEvent`
- `.env.example` — bereits reservierte `GASTRONOVI_*` Variablen
- Externe Recherche: `/workspace/gastronovi-api-research/index.html`
