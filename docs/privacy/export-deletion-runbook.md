# Export-, Lösch- und Retention-Runbook (P-B4)

**Stand:** 2026-07-04 · **Status:** `draft` — manuelles Pilot-Runbook, **kein**
automatisiertes Feature. Schließt **P-B4** (Export/Löschung) und liefert die
Retention-Fristen für das VVT (`vvt-processing-inventory.md`).

> ⚠️ Vorlage. Kein Nachweis rechtlicher Vollständigkeit, keine Rechtsberatung.
> **Sicherheitsrahmen:** Export ist read-only. **Löschung ist eine schreibende
> DB-Operation** → nur über den DB-Target-Guard und mit expliziter Owner-Freigabe;
> gegen das fremde Produktionsprojekt `czinchfegtglmrloxlmh` (rauschenberger-os)
> **blockiert**. Solange das Production-Split-Brain (P0) offen ist, ist keine
> reale Kundendaten-Löschung in Produktion ausführbar. Fristen unten sind
> **Vorschläge „zu bestätigen"**.

---

## 0. Vor jeder Operation

- Zielprüfung: `npm run db:verify-target` muss grün sein (Boundary:
  `docs/productization/bevero-database-boundary-v0.md`).
- Schreibende Schritte (Löschung) zusätzlich: Owner-Freigabe + Evidence-Record
  (Projekt-Ref, Rolle, Kommando-Klasse, Ergebnis — **ohne Secrets/Rohdaten**).
- Immer **count-first**: erst zählen (`SELECT count(*)`), dann in einer
  Transaktion handeln, dann verifizieren.
- Keine Kundenrohzeilen, keine Connection-Strings, keine Tokens in Evidence/Logs.

---

## 1. Export — Auskunft (Art. 15) & Portabilität (Art. 20)

> Alles read-only. `:auth_uid` = Supabase-Auth-UUID der Person; `:org_id` =
> `Organization.id` / `organizationId`.

### 1a. Einzelperson-Export

Betroffenendaten liegen an zwei ID-Typen: dem **Profil** (über `authUserId`) und
verstreuten **Handlungs-IDs** (die Auth-UUID in `actorUserId`/`authorUserId` etc.).

Mindestumfang (read-only SELECTs, org-gescoped wo möglich):

| Datenbereich | Tabelle(n) | Filter |
|---|---|---|
| Profil | `UserProfile` | `authUserId = :auth_uid` |
| Mitgliedschaften/Rollen | `OrganizationMember`, `TeamMember`, `WorkspaceMember`, `WorkspaceGroupMember` | `userId = :auth_uid` / `profileId = <profile.id>` |
| Einladungen | `TeamInvite`, `OrganizationInvite` | `email = <email>` |
| Warenbewegungen | `InventoryMovement` | `actorUserId = :auth_uid` |
| Wareneingang / Einkauf | `GoodsReceipt` (`receivedById`), `PurchaseOrder` (`createdById`) | `= :auth_uid` |
| Korrekturen | `InventoryCorrectionRequest` | `requestedById = :auth_uid` OR `reviewedById = :auth_uid` |
| Schicht | `ShiftAssignment`, `ShiftSession`, `ShiftSessionEvent`, `ShiftSignoff`, `ShiftHandoverDraft` | userId/`actorUserId`/`shiftLeadId`/`signedByUserId` = :auth_uid |
| Aufgaben | `TaskInstance`, `TaskComment`, `TaskIssue` | userId/`createdByUserId`/`reportedByUserId` = :auth_uid |
| Notizen | `OperationalNote` (`authorUserId`), `OperationalNoteAuditEvent` (`actorUserId`) | `= :auth_uid` |
| Automatisierung | `AutomationDecision` (`actor`) | `= :auth_uid` |

- Ausgabe: strukturiertes JSON pro Bereich; Übergabe über sicheren Kanal.
- Evidence: nur Bereichs-/Zeilenzahlen, kein Roh-Dump.

### 1b. Voll-Export einer Organisation (Pilot-Ende / Portabilität)

- Alle Tabellen mit `organizationId` gefiltert auf `:org_id` als JSON/CSV.
- Tabellen ohne `organizationId` (z. B. `WorkflowTask`) über ihre Bezugsobjekte
  einschließen oder als „global/nicht org-spezifisch" ausweisen.
- Übergabe + Bestätigung dokumentieren.

---

## 2. Löschung (Art. 17)

> ⚠️ Schreibend. Guard + Owner-Freigabe + Transaktion + Verifikation zwingend.
> Illustrative SQL-Skizzen sind **Templates**, keine ausführbereiten Kommandos.

### 2a. Option Deaktivierung (reversibel, bevorzugt im Pilot)

- `UserProfile.isActive = false` (bzw. Mitgliedschaft entziehen). Kein Datenverlust,
  Zugriff gesperrt. Für „Einschränkung" (Art. 18) und temporäre Fälle geeignet.

### 2b. Hard-Delete einer Person — reale Semantik (verifiziert)

**Kaskaden greifen nur bei echten Foreign Keys.** Beim Löschen von `AuthUser`
(→ `UserProfile` via `onDelete: Cascade`) passiert Folgendes:

| Verhalten | Betroffene Relationen |
|---|---|
| **Cascade** (mitgelöscht) | `TeamMember`, `ShiftAssignment` (user), `ShiftSession` (user), `TaskInstance` (user), `TaskComment`, `TaskIssue` (reportedBy), `ShiftSignoff` |
| **SetNull** (entkoppelt) | `ShiftSession.startedBy/endedBy`, `TaskInstance.completedBy/verifiedBy`, `TaskIssue.resolvedBy` |
| **Restrict** ⚠️ (blockiert Löschung!) | `ShiftSessionEvent.actor` — solange Schicht-Events der Person existieren, schlägt der Delete fehl |
| **Kein FK → Orphan-ID bleibt** | `InventoryMovement.actorUserId`, `OperationalNote.authorUserId`, `OperationalNoteAuditEvent.actorUserId`, `GoodsReceipt.receivedById`, `PurchaseOrder.createdById`, `InventoryCorrectionRequest.requestedById/reviewedById`, `BarRefillRun.createdBy`, `ShiftHandoverDraft.shiftLeadId`, `ShiftPlanImport.uploadedByUserId`, `OrganizationInvite.invitedByUserId`, `ArticleMapping.createdBy`, `AutomationRule.createdBy`, `AutomationSuggestion.approvedBy/rejectedBy` |

**Konsequenz:** Ein reiner Auth-User-Delete ist **keine vollständige Löschung**.
Nötige Zusatzschritte, in Reihenfolge, in **einer Transaktion**:

1. **Restrict auflösen:** `ShiftSessionEvent` der Person behandeln (löschen oder
   Session cascaden lassen), sonst blockiert der Delete.
2. **Orphan-IDs behandeln** — pro Feld eine dokumentierte Entscheidung:
   - **Anonymisieren** (empfohlen): Wert auf einen neutralen Marker setzen
     (z. B. `'deleted-user'`), Betriebshistorie bleibt, Personenbezug entfällt.
   - **oder Löschen** der Bewegungszeile (wenn betrieblich vertretbar).
   - Reine Auth-UUID ohne Rückreferenz ist **pseudonym**, nicht anonym → nicht als
     „gelöscht" darstellen, solange sie in Klartext steht.
3. **Profil/Auth löschen:** `AuthUser` (cascadet `UserProfile` + FK-Kinder).
4. **Verifizieren:** Zähl-Queries auf allen o. g. Feldern = 0 personenbezogene
   Treffer; Ergebnis in Evidence (nur Zahlen).

### 2c. Löschung einer Organisation / eines Pilotkunden

1. Optional Voll-Export (§1b) als „Rückgabe" vor Löschung.
2. Reihenfolge: abhängige Org-Daten → `OrganizationMember` → orphan-ID-Anonymisierung
   (org-gescoped) → Org-Objekte. `onDelete: Restrict` auf `Location.brand`,
   `LocationInventoryConfig.inventoryItem` beachten (Reihenfolge!).
3. Zählen → Transaktion → Verifikation → Evidence.

### 2d. Backups nach Löschung (bekannte Lücke)

- Löschung in der Live-DB entfernt Daten **nicht sofort aus Backups/PITR**. Diese
  verschwinden erst nach Ablauf des Backup-Fensters.
- **Aktuell offen (P-B5):** Backup/PITR ist nicht belegt („no visible backups").
  Ohne bekanntes Backup-Fenster kann keine Backup-Löschfrist zugesagt werden.
- Betroffenen gegenüber: nur zusagen, was belegt ist — Live-Löschung ja,
  Backup-Rotation als Frist erst nach P-B5.

---

## 3. Retention-Fristen (Vorschlag → Owner zu bestätigen)

> Löst die `offen`-Fristen im VVT auf, **sobald bestätigt**. Bis dahin unverbindlich.

| Datenkategorie (VVT) | Vorschlag Frist | Begründung / Anker |
|---|---|---|
| Konto/Profil (A1) | bis Vertragsende + 30 Tage Löschlauf | Zugriff endet mit Vertrag |
| Einladungen `TeamInvite`/`OrganizationInvite` (A1) | Löschung 30 Tage nach `expiresAt`/`revokedAt` | kein Zweck nach Ablauf (Pr-B3) |
| Warenbewegung/Einkauf (A2/A3) | betrieblich; Personenbezug (`actorUserId`) nach ‹X› Monaten anonymisieren | Datenminimierung |
| Schicht (A4) ⚠️ | **eng** — z. B. Ist-Zeiten/Deltas nach ‹Wochen/Monaten› anonymisieren | §26 BDSG, Leistungsbezug; DSFA Pr-B8 |
| Freitext/Notizen (A5) | mit Bezugsobjekt; Freitext bei Löschung mit-entfernen | Art.-9-Rest-Risiko |
| Roh-Mail-Import (A7, inaktiv) | `rawText`/`rawHtml` kürzen/nicht speichern | vor Reaktivierung entscheiden |
| Outreach-Leads (B1) | Löschung/Wiedervorlage bei Nichtzustandekommen nach ‹6–12 Monaten› | berechtigtes Interesse endet |

Nach Bestätigung: Werte in `vvt-processing-inventory.md` (Spalte „Frist-Vorschlag")
übernehmen und „offen" entfernen.

---

## 4. Ausführungs-Gate (Checkliste)

- [ ] `npm run db:verify-target` grün, Ziel korrekt klassifiziert.
- [ ] Bei Löschung: Owner-Freigabe eingeholt (L3).
- [ ] Nicht gegen `czinchfegtglmrloxlmh` (fremd/blockiert); Split-Brain-Status geprüft.
- [ ] Count-first, Transaktion, Verifikation durchgeführt.
- [ ] Evidence-Record ohne Secrets/Rohdaten abgelegt.
- [ ] Backup-Konsequenz (§2d) dem Betroffenen korrekt kommuniziert.

## 5. Belegstand (Repo, read-only)

- Cascade/Restrict-Semantik: `apps/api/prisma/schema.prisma` (`onDelete:` +
  Plain-String-User-Felder, in diesem Runbook §2b verifiziert).
- Guard/Boundary: `docs/productization/bevero-database-boundary-v0.md`,
  `apps/api/scripts/verify-database-target.ts`.
- Backup-Lücke/Split-Brain: `docs/productization/bevero-production-environment-closure.md`.
- Datenkategorien/Fristen-Bezug: `vvt-processing-inventory.md`.

---

*Manuelles Runbook, Pilot-Phase. Keine automatisierte Lösch-/Export-Funktion
zugesichert. Keine Rechtsberatung.*
