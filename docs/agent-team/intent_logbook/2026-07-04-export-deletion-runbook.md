# Intent Memory — Export-/Lösch-/Retention-Runbook (P-B4)

- id: 2026-07-04-export-deletion-runbook
- timestamp: 2026-07-04T01:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-04-export-deletion-runbook.md`
- status: draft

## Core intention

Betroffenenrechte (Auskunft, Export, Löschung) für den Pilot handhabbar machen —
als ehrliches manuelles Runbook statt eines vorgetäuschten Automatik-Features. Und
die im VVT offenen Retention-Fristen mit einem bestätigungsfähigen Vorschlag
schließen.

## Logic followed

Export ist read-only und damit sicher; Löschung ist schreibend und damit
guard-/freigabepflichtig. Entscheidend war, die reale Löschsemantik aus dem Schema
zu verifizieren statt anzunehmen: Prisma-`onDelete` greift nur bei echten FKs. Da
zentrale Handlungs-IDs (`actorUserId`, `authorUserId`, `receivedById` …) reine
Strings ohne FK sind, ist ein Cascade-Delete keine vollständige Löschung — die
Orphan-IDs müssen anonymisiert werden. `ShiftSessionEvent.actor` = Restrict kann
den Delete sogar blockieren.

## Design assumptions

- Pilot arbeitet manuell (Seed/kleine Datenmengen) → Runbook statt Feature genügt.
- Deaktivierung (`isActive=false`) ist der bevorzugte reversible Default.
- Backup-Löschung wird nur zugesagt, wenn ein Backup-Fenster belegt ist (P-B5).

## Tradeoffs

- Accepted:
  - Manueller Prozess statt Self-Service-Export — für Pilot ausreichend, ehrlich.
  - Orphan-ID-Anonymisierung als expliziter Zusatzschritt statt „Cascade reicht".
- Rejected:
  - Ausführbereite `DELETE`-Kommandos — nur Templates hinter Guard/Freigabe.
  - Zusage „vollständige Löschung inkl. Backups" — solange P-B5 offen ist.

## Durable memory

- `export-deletion-runbook.md` ist der kanonische P-B4-Prozess.
- Vollständige Personenlöschung braucht 3 Schritte: Restrict auflösen
  (ShiftSessionEvent) → Orphan-IDs anonymisieren → Auth/Profil löschen → verifizieren.
- Retention-Fristen-Vorschläge stehen hier; nach Owner-Bestätigung ins VVT.

## Do not reuse blindly

- onDelete-Map gilt zum Schema-Stand 2026-07-04; bei Schemaänderung neu prüfen.
- Kein Löschschritt ohne DB-Guard + Owner-Freigabe; nie gegen fremdes
  Produktionsprojekt.

## Relation to Rauschenberger OS / Bevero

- location logic: Restrict auf `Location.brand`/`LocationInventoryConfig.inventoryItem`
  beeinflusst Org-Löschreihenfolge.
- role/approval logic: Löschung ist L3 (Owner-Freigabe).
- inventory/procurement/shift-planning logic: Orphan-IDs v. a. in Movement/Notiz/
  Schicht/Einkauf.
- external-system boundary: Backup/PITR (Supabase) offen (P-B5).

## Next logic gate

Owner bestätigt Retention-Fristen (VVT finalisieren) und entscheidet Backup/PITR
(P-B5). Danach ist der dokumentarische Pilot-Blocker-Satz weitgehend geschlossen.
