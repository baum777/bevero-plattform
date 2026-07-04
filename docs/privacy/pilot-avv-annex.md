# Pilotkunden-AVV — Anhang-Set (Vorbereitung, Art. 28 DSGVO)

**Stand:** 2026-07-04 · **Status:** `draft` · Bereitet **P-B2** vor.

> ⚠️ Dies ist **kein** Vertrag und **keine** Rechtsberatung. Es ist ein
> strukturiertes Anhang-Set, das dem eigentlichen Auftragsverarbeitungsvertrag
> (AVV) zwischen Bevero und einem Pilotkunden beigelegt wird. Der AVV-Text selbst
> und dessen rechtliche Prüfung liegen beim Owner (ggf. mit anwaltlicher
> Unterstützung). Bevero behauptet keine DSGVO-Vollkonformität.

---

## Rollen im Pilot

| Partei | Rolle nach DSGVO | Begründung |
|---|---|---|
| **Pilotkunde (Gastro-Betrieb)** | **Verantwortlicher** (Art. 4 Nr. 7) | Bestimmt Zweck/Mittel der Verarbeitung der Betriebs- und Mitarbeiterdaten |
| **Bevero (Betreiber)** | **Auftragsverarbeiter** (Art. 4 Nr. 8) | Verarbeitet die Daten weisungsgebunden im Auftrag des Kunden |
| **Supabase / Vercel** | **Unterauftragsverarbeiter** | Infrastruktur; siehe `subprocessors.md` |

## Was der AVV mindestens regeln muss (Art. 28 Abs. 3)

- [ ] Gegenstand, Art, Zweck, Dauer der Verarbeitung
- [ ] Art der personenbezogenen Daten + Kategorien Betroffener (→ Anlage 1)
- [ ] Weisungsbindung des Auftragsverarbeiters
- [ ] Vertraulichkeitsverpflichtung
- [ ] TOMs nach Art. 32 (→ Anlage 2 = `toms.md`)
- [ ] Unterauftragsverarbeiter + Genehmigung/Widerspruch (→ Anlage 3 = `subprocessors.md`)
- [ ] Unterstützung bei Betroffenenrechten
- [ ] Unterstützung bei Meldepflichten (Breach)
- [ ] Löschung/Rückgabe nach Vertragsende
- [ ] Nachweis-/Auditrechte des Verantwortlichen

---

## Anlage 1 — Datenkategorien & Betroffene (Entwurf aus O3-Dateninventar)

> Basis: Dateninventar des O3-Reviews. Vor Vertragsschluss auf den konkreten
> Pilot-Scope kürzen (nur tatsächlich genutzte Prozesse).

| Datenkategorie | Betroffene | Quelle (Schema) | Sensitivität |
|---|---|---|---|
| Account-/Profildaten (E-Mail, Name) | Kunden-Mitarbeiter | `UserProfile`, `AuthUser` | Standard-PII |
| Org-/Rollen-/Membership-Daten | Kunden-Mitarbeiter | `OrganizationMember`, `TeamMember`, `WorkspaceMember` | Standard-PII |
| Einladungen (E-Mail, Token-Hash) | eingeladene Personen | `TeamInvite`, `OrganizationInvite` | Standard-PII (TTL beachten) |
| Warenbewegungen mit Person | handelnde Mitarbeiter | `InventoryMovement.actorUserId` | erhöht (Verhaltensbezug) |
| Korrekturen + Freitext | Antragsteller/Prüfer | `InventoryCorrectionRequest` | erhöht (Freitext) |
| Schichtplanung / Sessions | Mitarbeiter | `ShiftAssignment`, `ShiftSession` (`startDeltaMinutes`, `endDeltaMinutes`, `startNote`, `endNote`) | **hoch** (§26 BDSG, Leistungsbezug) |
| Schichtübergaben / Notizen (Freitext) | Mitarbeiter | `ShiftHandoverDraft`, `OperationalNote` | erhöht (Freitext) |
| Aufgaben / Kommentare / Issues (Freitext, Foto) | Mitarbeiter | `TaskInstance`, `TaskComment`, `TaskIssue.photoUrl` | erhöht (Freitext/Bild) |
| Lieferantenkontakte | Lieferanten-Ansprechpartner | `Supplier` (email, phone) | Standard-PII (B2B) |
| Roh-E-Mail-Import (nur bei Aktivierung) | Absender/Inhalt | `ProcurementMailImport` (`rawText`, `rawHtml`) | **hoch** — aktuell inaktiv |

**Hinweis besondere Kategorien (Art. 9):** Nicht vorgesehen. **Risiko:**
Freitextfelder (`OperationalNote.body`, `ShiftSession.startNote/endNote`,
`TaskComment.content`, Handover-Notizen) können unbeabsichtigt sensible Daten
(z. B. Gesundheit, Fehlzeiten) aufnehmen → siehe Anlage 4.

## Anlage 2 — TOMs

→ `toms.md` (dieses Verzeichnis). Als Anlage beilegen.

## Anlage 3 — Subprozessoren

→ `subprocessors.md` (dieses Verzeichnis). Als Anlage beilegen.

## Anlage 4 — Freitext-/Nutzungshinweis (Kunde an Mitarbeiter weiterzugeben)

> Empfohlener Onboarding-Hinweis für Pilotkunden-Admins (schließt Teile von P-B6):

„Die Freitextfelder in Bevero (Notizen, Schichtübergaben, Aufgaben-Kommentare,
Schicht-Start/-Ende-Notizen) sind für **betriebliche** Angaben gedacht. Bitte
keine sensiblen Personendaten eintragen — insbesondere keine Gesundheitsangaben,
Krankheits-/Fehlzeitgründe oder sonstige besondere Kategorien nach Art. 9 DSGVO."

---

## Betroffenenrechte — heutiger technischer Stand (ehrlich)

| Recht | Technisch heute | Lücke |
|---|---|---|
| Auskunft | teilweise (Daten pro User in DB abfragbar) | kein Self-Service-Export |
| Berichtigung | ja (Profil-/Datenpflege im Cockpit) | — |
| Löschung | teilweise (`isActive`-Flag, Cascade-Deletes im Schema) | **kein Löschkonzept/-prozess (P-B4)**; Backup-Daten ungeklärt |
| Datenportabilität/Export | **nein** | Export nicht implementiert (P-B4) |
| Einschränkung | teilweise (Deaktivierung) | kein formaler Prozess |
| Zugriffskontrolle | ja (RBAC/RLS) | Cross-Org-Test offen |

> Diese Tabelle **nicht** als „wir erfüllen alle Betroffenenrechte" darstellen.
> Offene Punkte sind reale Pilot-/Production-Blocker.

## Owner-To-Do vor Vertragsschluss

- [ ] AVV-Vertragstext erstellen/beschaffen (Owner/Recht).
- [ ] Anlagen 1–3 auf konkreten Pilot-Scope anpassen.
- [ ] P-B1 (DPA-Kette), P-B3 (Region), P-B4 (Export/Löschung), P-B5 (Backup)
      geschlossen oder als bekannte Einschränkung benannt.
- [ ] Anlage 4 in Kunden-Onboarding aufnehmen.
