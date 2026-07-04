# MSPR Entry — VVT/RoPA (Art. 30) aus Dateninventar ableiten

- id: 2026-07-04-vvt-processing-inventory
- timestamp: 2026-07-04T00:30:00Z
- runId: bevero-o3-privacy-package
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/privacy/vvt-processing-inventory.md
  - docs/privacy/README.md (Index-Update)
- pathsOutOfScope:
  - apps/** (kein Code, keine Migration, keine .env)
  - jede Vertrags-/Rechtsfinalisierung (Owner)
- autonomyTier: 1

## Code Change Context

- Trigger/request: Next Step nach Privacy-Paket — VVT/RoPA aus dem O3-Dateninventar
  ableiten (Art. 30 DSGVO), als strukturiertes Processing Inventory.
- Why the change was needed: Art. 30 verlangt ein Verzeichnis der
  Verarbeitungstätigkeiten. Bevero hat eine Doppelrolle (Auftragsverarbeiter für
  Kundendaten, Verantwortlicher für Outreach) → beides zu erfassen.
- Files read:
  - docs/privacy/* (bestehendes Paket)
  - apps/api/prisma/schema.prisma (Datenkategorien pro Tätigkeit)
  - docs/sales-kit/outreach-readiness.md (Register B / Outreach)
- Files changed:
  - docs/privacy/vvt-processing-inventory.md (neu)
  - docs/privacy/README.md (Index + „noch offen" aktualisiert)
- Commands run:
  - `npm run check:work-docs` → pass (siehe Validation)
- Validation results:
  - Work-docs-Check grün.
  - Jede Verarbeitungstätigkeit mit Schema-Belegquelle; Fristen/Drittland als
    `offen`/„zu bestätigen" markiert (kein Overclaiming).

## Memory

- newFindings:
  - Bevero ist nicht nur Auftragsverarbeiter: Outreach/Vertrieb (`docs/sales-kit/`)
    macht Bevero zum Verantwortlichen → eigenes Register B (Art. 30 Abs. 1).
  - A4 Schichtplanung/-erfassung ist die kritischste Tätigkeit (§26 BDSG,
    Leistungsbezug) → DSFA/DPIA-Trigger (Pr-B8).
- reusableRules:
  - VVT-Einträge immer mit Schema-Belegquelle und explizitem Frist-/Drittland-Status;
    vorgeschlagene Fristen nur als unverbindlicher, Owner-zu-bestätigender Hinweis.
- gotchas:
  - Register-Kopf (Firmierung, Datenschutzkontakt) bleibt Platzhalter — Pr-B4
    (Datenschutzkontakt) ist noch offen.

## Review

- status: pass
- risks:
  - Verzeichnis ist Entwurf; Rechtsgrundlagen (v. a. Outreach), Fristen und
    Drittlandtransfer sind Owner-/Rechtsschritte.
  - Register B schmal; ggf. „Eigene Nutzerverwaltung" (B3) zu ergänzen.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Owner finalisiert Fristen/Rechtsgrundlagen; danach P-B4
  (Export/Löschung) und P-B5 (Backup/PITR).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-04-vvt-processing-inventory.md`
