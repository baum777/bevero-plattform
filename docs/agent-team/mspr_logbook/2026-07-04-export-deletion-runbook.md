# MSPR Entry — Export-/Lösch-/Retention-Runbook (P-B4)

- id: 2026-07-04-export-deletion-runbook
- timestamp: 2026-07-04T01:00:00Z
- runId: bevero-o3-privacy-package
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/privacy/export-deletion-runbook.md
  - docs/privacy/README.md (Index-Update)
- pathsOutOfScope:
  - apps/** (kein Code, keine Migration, keine .env)
  - jede reale DB-Operation (Löschung/Export) — nur beschrieben, nicht ausgeführt
- autonomyTier: 1

## Code Change Context

- Trigger/request: Next Step P-B4 — manuelles Export-/Lösch-Runbook bauen; löst
  zugleich die offenen Retention-Fristen des VVT.
- Why the change was needed: Betroffenenrechte (Art. 15/17/20) waren technisch
  nicht abbildbar dokumentiert; Löschung/Export als Pilot-Blocker offen.
- Files read:
  - apps/api/prisma/schema.prisma (onDelete-Semantik + Plain-String-User-Felder,
    per grep verifiziert)
  - docs/productization/bevero-database-boundary-v0.md (DB-Guard/Boundary)
  - docs/productization/bevero-production-environment-closure.md (Backup/Split-Brain)
  - docs/privacy/vvt-processing-inventory.md (Frist-Bezug)
- Files changed:
  - docs/privacy/export-deletion-runbook.md (neu)
  - docs/privacy/README.md (Index + „noch offen" aktualisiert)
- Commands run:
  - `grep onDelete/plain-string user fields` → verifiziert Cascade/Restrict/Orphan
  - `npm run check:work-docs` → pass
- Validation results:
  - Cascade-Map aus echtem Schema abgeleitet, nicht angenommen.
  - Zwei Löschungs-Gotchas belegt: `ShiftSessionEvent.actor` = Restrict; zahlreiche
    Plain-String-User-Referenzen ohne FK (Orphan-ID).

## Memory

- newFindings:
  - `ShiftSessionEvent.actor` `onDelete: Restrict` blockiert Hard-Delete eines
    UserProfile mit Schicht-Events.
  - `InventoryMovement.actorUserId`, `OperationalNote.authorUserId`,
    `GoodsReceipt.receivedById`, `PurchaseOrder.createdById`,
    `InventoryCorrectionRequest.requestedById/reviewedById`,
    `ShiftHandoverDraft.shiftLeadId` u. a. sind Plain-Strings ohne FK → Löschung
    per Cascade unvollständig; Orphan-ID muss anonymisiert werden.
  - Auth-User-Delete cascadet UserProfile (`authUserId` FK), lässt Orphan-IDs aber
    stehen → pseudonym, nicht anonym.
- reusableRules:
  - Vor Löschungs-Aussagen immer die konkrete onDelete-Semantik prüfen; Cascade ≠
    vollständige Löschung, wenn Plain-String-User-Felder existieren.
  - Löschung = schreibend → DB-Guard + Owner-Freigabe; nie gegen fremdes
    `czinchfegtglmrloxlmh`.
- gotchas:
  - Backup-Löschung nicht zusagbar, solange P-B5 (Backup/PITR) offen ist.

## Review

- status: pass
- risks:
  - Runbook beschreibt, führt nichts aus. Reale Löschung hängt an DB-Guard,
    Owner-Freigabe und ungelöstem Split-Brain (P0).
  - Retention-Fristen sind Vorschläge; erst nach Owner-Bestätigung verbindlich.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Owner bestätigt Retention-Fristen (→ VVT finalisieren) und entscheidet
  P-B5 (Backup/PITR).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-04-export-deletion-runbook.md`
