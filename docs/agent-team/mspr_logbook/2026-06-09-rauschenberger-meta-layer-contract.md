# MSPR — Rauschenberger Meta-Layer Phase A Contract (Task 10 / ADR-0055)

**Date:** 2026-06-09
**Task:** 10 — `rauschenberger-meta-layer-contract`
**ADR:** ADR-0055 (proposed)
**Agent role:** Orchestrator + Builder (single-session)
**Branch:** `phase-b-multistandort`

---

## Scope executed

| Artefakt | Aktion | Ergebnis |
|---|---|---|
| `docs/architecture/rauschenberger-meta-layer.md` | new | ~510 Zeilen — vollständige Meta-Layer-Architektur inkl. Hierarchy, Organization, BusinessUnit, EventConcept, ExternalCatalogEntry, Inquiry, InquiryRoutingRule, Cross-Reference-Map, Anti-Things, resolved OQs |
| `docs/architecture/inquiry-routing.md` | new | ~220 Zeilen — Inquiry-Generalisierung, BU-Routing-Algorithmus (deterministisch, kein LLM), Status-Workflow, PII-Contract, Migration-Strategy `EventInquiry → Inquiry` |
| `docs/DECISIONS.md` | edit | ADR-0055-Block (Status: proposed) angehängt nach ADR-0054 |
| `docs/agent-team/agent_teamplan.md` | edit | WS-007-Zeile eingefügt |
| `docs/agent-team/mspr_logbook/2026-06-09-rauschenberger-meta-layer-contract.md` | new | dieses Dokument |

---

## Gate verification

```
git diff --stat → nur docs/ Änderungen ✓ (verifiziert nach Commit)
prisma validate → unverändert grün ✓
npm run typecheck → unverändert grün ✓
vitest → 606/606 unverändert grün ✓
```

---

## Key decisions documented

1. `Organization` als neues Top-Level-Modell (nicht Brand-Elevation) — semantisch distinkt.
2. `BusinessUnit` als Tabelle (nicht Enum) — BU-Liste ist erweiterbar.
3. `EventConcept` unter `Organization` (nicht BU) — cross-brand Formate.
4. `ExternalCatalogEntry` parallel zu `Location` (nicht Sub-Typ) — keine Inventory-Infrastruktur für Partner.
5. `Inquiry` als neue Tabelle — `EventInquiry` deprecated, nicht dropped, bis Phase 5.4.
6. `InquiryRoutingRule` als DB-Tabelle — admin-managed, kein Deploy für Regel-Updates.
7. PII-Sanitization vor allen öffentlichen Endpoints (ADR-0021 §5).
8. Kein LLM, kein Auto-Routing — ADR-0021 §3 gilt absolut.

---

## Next gate

Owner nimmt ADR-0055 an → Task 11 (ADR-0056) startet:
- `prisma/schema.prisma` Erweiterung: Organization + BusinessUnit + EventConcept + ExternalCatalogEntry + Inquiry + InquiryRoutingRule + 3 Enums
- 2 Migrations (schema + RLS)
- Seed
- Services + Routes + Tests (14 vitest cases)
- `vitest` Ziel: 606 + 16 = 622

---

## Open follow-ups (not in this slice)

- ADR-0061: Inquiry Mutation Surface (Status-Workflow, RoutingRule-Edit)
- ADR-0062: PII Vollzugriff für zugewiesene Manager (`GET /admin/inquiries/:id/full`)
- Phase 5.4: `EventInquiry → Inquiry` Migration + DB-View
- Phase 5.5: Hard FK `Brand.organizationId`, `EventInquiry` drop
