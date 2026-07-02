---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
revision: rework-v2
---

# Intent — Gastronovi Source Connector

## Produktlogik

Bevero ist der Kontext- und Operations-Layer der Rauschenberger Gruppe. Gastronovi ist das führende POS-System der Event- und Restaurantstandorte (Pilot: Motorworld Inn Böblingen). Dieser Connector erlaubt Bevero, Gastronovi-Ereignisse zu **lesen** — ohne Gastronovi zu ersetzen oder zurückzuschreiben.

Phase 1 implementiert drei Ereignistypen als synthetisch getestete Schemas:
- `daily.close` — Tagesumsatz-Snapshot (Basis für Cockpit-KPIs)
- `receipt.created` — Einzelbon (Basis für Live-Lagebild)
- `paymaster.posted` — Großbuchung (triggert L2-Operator-Review)

**Wichtig:** Payload-Feldnamen, Endpunkte und Auth-Schema sind synthetische Annahmen. Bestätigung durch offiziellen Gastronovi-Export, zertifizierten Partner oder Vertragsgrundlage ist vor Production-Betrieb zwingend.

## Architekturentscheidungen

### Anti-Corruption-Layer

Per `docs/ARCHITECTURE.md`: Connector → Raw Payload Store → Normalizer → WorkflowEvent. Dieser Slice implementiert ausschließlich Schicht 1. Der Connector macht keine Geschäftsentscheidungen.

### Standalone Config — kein `process.exit`

`parseGastronoviConfig()` wirft `GastronoviConfigError` (nie `process.exit`). Exit-Verhalten gehört zum Server-Bootstrap, nicht zur Connector-Bibliothek. Das macht die Config testbar ohne Prozess-Terminierung.

### Hash-basierte Idempotenz

`hasMatchingPayloadHash(rawPayload, payload)` importiert `calculatePayloadHash` aus dem bestehenden `raw-payloads/payload-hash.ts` (sha256 + stable-stringify, key-sorted). Die Duplicate-Entscheidung und der DB-Lookup gehören zur `IngestionService`-Schicht — der Connector liefert nur den Hash-Vergleich.

### TLS-Fingerprint: ehrlicher Status

`tlsFingerprintStatus: "not_implemented" | "disabled"` statt einem "ok"-Claim. Aktives Certificate Pinning ist Scope von Slice #2+.

### Injizierter Transport

`TransportFn` ist injizierbar — keine echten Netzwerkaufrufe in Tests, keine zusätzlichen Dependencies.

### Source-of-Truth Boundary

In `docs/integrations/gastronovi.md` explizit dokumentiert: Gastronovi ist ein Interface/Partner-Ökosystem, kein frei dokumentiertes Public API. Alle Endpunkt-Annahmen im Code sind Platzhalter.

## Governance-Implikation

| Aspekt | Entscheidung |
|---|---|
| Risikostufe | L1 — Code only, kein Production-Effekt |
| `GASTRONOVI_ENABLED` default | `false` — Connector ist ab Werk deaktiviert |
| Production-Freigabe | Operator: `GASTRONOVI_ENABLED=true` (L3) erst nach Partner-Bestätigung |
| Secrets | `apiKey`, `cardPan`, `customerEmail`, `authorization`, `x-api-key` werden immer redacted |
| Tenant-Allowlist | Default: `[tenantId]` (single-tenant safe); erweiterbar via ENV |

## Was ein zukünftiger Leser lernen soll

1. **Keine unbelegten API-Fakten**: Endpunkt-Pfade (`/daily-close/`, `/receipts/`, `/paymaster/`) und Auth-Schema (Bearer) sind Platzhalter — nicht Gastronovi-offizielle Endpunkte.

2. **Config wirft, nicht exitiert**: `GastronoviConfigError` erlaubt testbares Fehlerverhalten. Server-Code fängt und exitiert nach eigenem Ermessen.

3. **Idempotenz gehört dem IngestionService**: `hasMatchingPayloadHash` ist ein reiner Vergleichs-Helper. DB-Lookup, Persistierung und Duplicate-Entscheidung liegen in der Ingestion-Schicht (Slice #2+).

4. **Coverage ist Reviewer-Aufgabe**: `@vitest/coverage-v8` fehlt als devDependency. Vor Phase-1-Freigabe nachholen.

## Nächste Schritte (Slice #2)

- Gastronovi Partner/Vertrag bestätigen → Endpunkte + Auth-Schema konkretisieren
- `@vitest/coverage-v8` als devDependency
- `/integrations/gastronovi/sync/run` Endpunkt
- Normalizer für die 3 Phase-1-Events
- Scheduled Polling (Vercel Cron)
