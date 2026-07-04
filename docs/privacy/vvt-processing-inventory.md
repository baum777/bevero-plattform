# Verzeichnis von Verarbeitungstätigkeiten (VVT / RoPA, Art. 30 DSGVO)

**Stand:** 2026-07-04 · **Status:** `draft` — strukturiertes Processing Inventory,
**nicht** juristisch final. Abgeleitet aus dem O3-Dateninventar + Prisma-Schema.

> ⚠️ Vorlage/Entwurf. Kein Nachweis rechtlicher Vollständigkeit, keine
> Rechtsberatung. Aufbewahrungsfristen und Drittlandtransfer sind überwiegend
> `offen` und vom Owner (ggf. mit anwaltlicher Prüfung) zu finalisieren.
> Vorgeschlagene Fristen sind **unverbindliche Hinweise „zu bestätigen"**.

---

## 0. Doppelrolle von Bevero

Bevero tritt in **zwei** Rollen auf — daher zwei Register:

| Register | Rolle | Rechtsgrundlage | Betrifft |
|---|---|---|---|
| **A** | **Auftragsverarbeiter** | Art. 30 Abs. 2 | Verarbeitung von Kundendaten **im Auftrag** des Gastro-Kunden (= Verantwortlicher) |
| **B** | **Verantwortlicher** | Art. 30 Abs. 1 | Eigene Verarbeitungen von Bevero (Vertrieb/Outreach, Vertragsverwaltung) |

- Verantwortliche Stelle (Register B) / Auftragsverarbeiter (Register A):
  ‹Owner: Firmierung, Anschrift, Kontakt eintragen — Cheikh als Betreiber›
- Datenschutzkontakt: ‹Owner: benennen (Pr-B4 offen)›
- Unterauftragsverarbeiter (beide Register): Supabase, Vercel (aktiv);
  Microsoft Graph, FoodNotify (inaktiv) — Details `subprocessors.md`.
- TOMs (beide Register): `toms.md` (Anlage 2 des AVV).
- Drittlandtransfer (beide Register): `offen` — `subprocessors.md` / P-B8.

---

## Register A — Bevero als Auftragsverarbeiter (Art. 30 Abs. 2)

> Verarbeitung im Auftrag jedes Gastro-Kunden (Verantwortlicher). „Frist-Vorschlag"
> = unverbindlicher Hinweis, vom Verantwortlichen zu bestätigen (Pr-B3 offen).

### A1 — Benutzer- und Zugriffsverwaltung

| Feld | Inhalt |
|---|---|
| Zweck | Authentifizierung, Rollen-/Rechtevergabe, Mandantenzuordnung |
| Betroffene | Mitarbeiter des Kunden, eingeladene Personen |
| Datenkategorien | E-Mail, Anzeigename, Avatar-URL, Auth-UUID, Org-/Team-/Workspace-Rolle, Einladungs-E-Mail + Token-Hash |
| Schema-Quelle | `UserProfile`, `AuthUser`, `OrganizationMember`, `TeamMember`, `WorkspaceMember`, `TeamInvite`, `OrganizationInvite` |
| Empfänger | Supabase (Auth/DB), Vercel (Hosting) |
| Frist-Vorschlag | Konto: bis Vertragsende + Löschlauf; **Invite: TTL nach `expiresAt`/`revokedAt`** (offen, Pr-B3) |
| Risiko | Standard-PII |

### A2 — Inventar- und Warenbewegungsverwaltung

| Feld | Inhalt |
|---|---|
| Zweck | Bestandsführung, Warenbewegungen, Korrekturen, Freigaben |
| Betroffene | handelnde/prüfende Mitarbeiter |
| Datenkategorien | Warenbewegung mit **`actorUserId`** + Zeitstempel, Korrekturgrund + Freitext, Prüfer-ID |
| Schema-Quelle | `InventoryMovement`, `InventoryCorrectionRequest`, `InventoryStockSnapshot`, `GoodsReceipt` |
| Empfänger | Supabase, Vercel |
| Frist-Vorschlag | betrieblich begründet; Personenbezug über `actorUserId` → Frist festlegen (offen) |
| Risiko | **erhöht** — Warenbewegungen werden über `actorUserId` personenbeziehbar (Verhaltensbezug) |

### A3 — Einkauf und Wareneingang

| Feld | Inhalt |
|---|---|
| Zweck | Bestellung, Wareneingang, Lieferantenpflege |
| Betroffene | erfassende Mitarbeiter, Lieferanten-Ansprechpartner |
| Datenkategorien | Ersteller-/Empfänger-ID, Lieferant (Name, E-Mail, Telefon) |
| Schema-Quelle | `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `Supplier` |
| Empfänger | Supabase, Vercel |
| Frist-Vorschlag | handelsrechtlich orientiert (offen) |
| Risiko | Standard-PII (B2B-Kontakte) |

### A4 — Schichtplanung und Schichterfassung  ⚠️ hohes Risiko

| Feld | Inhalt |
|---|---|
| Zweck | Schichtzuweisung, Ist-Zeiterfassung, Übergaben, Aufgaben/Checklisten, Sign-off |
| Betroffene | Mitarbeiter des Kunden |
| Datenkategorien | Zuweisung (Datum, Start/Ende), **Ist-Zeiten + Abweichung** (`actualStartedAt/EndedAt`, `startDeltaMinutes`, `endDeltaMinutes`), Freitext (`startNote`, `endNote`, Handover-`summary`/`notes`), Aufgabenstatus, Sign-off |
| Schema-Quelle | `ShiftAssignment`, `ShiftSession`, `ShiftSessionEvent`, `ShiftHandoverDraft`, `TaskInstance`, `ShiftSignoff`, `ShiftPlanImport` |
| Empfänger | Supabase, Vercel |
| Frist-Vorschlag | eng begrenzen (offen) |
| Risiko | **sehr hoch** — Beschäftigtendatenschutz §26 BDSG, Leistungs-/Verhaltensbezug → **DSFA/DPIA-Prüfung erforderlich (Pr-B8)** |

### A5 — Betriebsnotizen und operative Kommunikation (Freitext)

| Feld | Inhalt |
|---|---|
| Zweck | betriebliche Notizen, Aufgaben-Kommentare, Problem-/Issue-Meldungen |
| Betroffene | Mitarbeiter des Kunden |
| Datenkategorien | Autor-ID + Rolle, Freitext-Body/Kommentar/Beschreibung, `photoUrl`, Audit-Events |
| Schema-Quelle | `OperationalNote`, `OperationalNoteAuditEvent`, `TaskComment`, `TaskIssue` |
| Empfänger | Supabase, Vercel; (Bilder: Storage `geplant`, s. Pr-B9) |
| Frist-Vorschlag | offen |
| Risiko | **erhöht** — Freitext kann unbeabsichtigt sensible Daten (Art. 9) aufnehmen → Nutzungshinweis `pilot-avv-annex.md` Anlage 4 |

### A6 — Automatisierung / Vorschläge

| Feld | Inhalt |
|---|---|
| Zweck | regelbasierte Vorschläge + Entscheidungsprotokoll |
| Betroffene | entscheidende Mitarbeiter |
| Datenkategorien | Actor + Rolle, Entscheidungsnotizen (Freitext) |
| Schema-Quelle | `AutomationRule`, `AutomationSuggestion`, `AutomationDecision` |
| Empfänger | Supabase, Vercel |
| Hinweis | Keine automatisierte Einzelentscheidung mit Rechtswirkung i.S.v. Art. 22 erkennbar (Vorschlag→menschliche Freigabe); zu bestätigen |
| Risiko | mittel |

### A7 — Procurement-Mail-Ingest  (INAKTIV)

| Feld | Inhalt |
|---|---|
| Zweck | Import von Bestellbestätigungen aus E-Mail (FoodNotify via Microsoft Graph) |
| Status | **inaktiv** — `FOODNOTIFY_IMPORT_ENABLED="false"`, Graph-Credentials leer |
| Datenkategorien (bei Aktivierung) | Absender, Betreff, **`rawText`/`rawHtml`** (rohe E-Mail-Inhalte mit möglicher PII) |
| Schema-Quelle | `ProcurementMailImport`, `ProcurementOrder` |
| Zusätzliche Empfänger | Microsoft (Graph/Azure), FoodNotify |
| Reaktivierung | nur nach DPA-Klärung + Retention-Regel + Risikoentscheidung `rawText/rawHtml` (`subprocessors.md` → Gate) |
| Risiko | **hoch** (nur bei Aktivierung) |

---

## Register B — Bevero als Verantwortlicher (Art. 30 Abs. 1)

### B1 — Vertrieb / Outreach

| Feld | Inhalt |
|---|---|
| Verantwortlicher | Bevero (Owner) |
| Zweck | Erstkontakt/Akquise potenzieller Pilotkunden |
| Rechtsgrundlage (zu bestätigen) | Art. 6 Abs. 1 f (berechtigtes Interesse B2B-Ansprache) — Owner/Recht prüfen |
| Betroffene | Ansprechpartner in Ziel-Gastrobetrieben |
| Datenkategorien | Name, Betriebs-/Kontaktdaten, Aufhänger/Notizen (Lead-Steckbrief) |
| Quelle | `docs/sales-kit/` (z. B. `lead-steckbrief-template.md`, `first-contact-*`) |
| Empfänger | ‹Owner: verwendetes Mail-/CRM-Tool eintragen› |
| Frist-Vorschlag | Lösch-/Wiedervorlagefrist bei Nichtzustandekommen festlegen (offen) |
| Risiko | Standard-PII; Werbe-/Ansprache-Regeln beachten |

### B2 — Vertrags- und AVV-Verwaltung

| Feld | Inhalt |
|---|---|
| Verantwortlicher | Bevero (Owner) |
| Zweck | Verwaltung von Pilot-/Kundenverträgen und AVV |
| Betroffene | Ansprechpartner der Kunden |
| Datenkategorien | Vertragskontakt, Vertragsmetadaten |
| Quelle | `docs/privacy/` (dieses Verzeichnis), `docs/pilot/` |
| Empfänger | ‹Owner: Ablage/Tool eintragen› |
| Frist-Vorschlag | vertrags-/handelsrechtlich (offen) |
| Risiko | Standard-PII |

> Register B ist bewusst schmal. Falls Bevero eigene Mitarbeiter-/Betreiber-Konten
> außerhalb eines Kundenmandanten führt, ist dafür eine weitere Tätigkeit (B3
> „Eigene Nutzerverwaltung") zu ergänzen.

---

## 3. Querschnitt

- **Empfänger/Unterauftragsverarbeiter:** Supabase, Vercel (aktiv); Microsoft
  Graph, FoodNotify (inaktiv). Details + Region: `subprocessors.md`.
- **Drittlandtransfer:** `offen` — Supabase-Region abgeleitet (EU/`eu-west-1`),
  Vercel-Function-Region nicht dokumentiert, Graph via Azure. Assessment P-B8.
- **Aufbewahrung/Löschung:** **kein** verbindliches Retention-Konzept vorhanden
  (P-B4 Export/Löschung, Pr-B3 Retention). Alle „Frist-Vorschlag"-Werte sind
  unverbindlich und Owner-zu-bestätigen.
- **TOMs:** `toms.md`.
- **Besondere Kategorien (Art. 9):** nicht vorgesehen; Rest-Risiko über
  Freitextfelder (A4/A5) → Nutzungshinweis `pilot-avv-annex.md` Anlage 4.
- **Automatisierte Einzelentscheidung (Art. 22):** nicht erkannt (Vorschlag →
  menschliche Freigabe); zu bestätigen.

## 4. Owner-To-Do (Finalisierung)

- [ ] Firmierung/Anschrift/Kontakt + Datenschutzkontakt eintragen (Register-Kopf).
- [ ] Rechtsgrundlagen je Tätigkeit bestätigen (v. a. B1 Outreach).
- [ ] Aufbewahrungsfristen je Tätigkeit festlegen (löst „offen" auf).
- [ ] Drittlandtransfer-Assessment einarbeiten (P-B8).
- [ ] DSFA/DPIA-Entscheidung für A4 dokumentieren (Pr-B8).
- [ ] Bei Aktivierung: A7 + Microsoft/FoodNotify scharf schalten (Gate).
- [ ] Register mit realem Pilot-Scope abgleichen (nur genutzte Tätigkeiten).

## 5. Belegstand (Repo, read-only)

- Datenkategorien/Schema: `apps/api/prisma/schema.prisma` (Modelle wie oben zitiert).
- Doppelrolle/Betroffenenrechte: O3-Review + `pilot-avv-annex.md`.
- Subprozessoren/Region/Inaktiv-Status: `subprocessors.md`, `.env.example`.
- TOM-Evidence: `toms.md`.

---

*Kein juristisch finales Verzeichnis. Strukturierte Grundlage zur
Owner-Finalisierung. Keine Rechtsberatung.*
