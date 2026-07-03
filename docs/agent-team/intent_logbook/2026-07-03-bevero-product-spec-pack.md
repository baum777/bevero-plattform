# Intent Memory — Bevero Product Spec Pack (docs-only)

- id: spec-pack-20260703-a
- timestamp: 2026-07-03T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-bevero-product-spec-pack.md`
- status: reviewed

## Core intention

Give Bevero a single, consistent source of truth for what gets built (MVP-Core), what gets sold (pilot offer), and what stays future (vision) — small enough to build in weeks, honest enough to sell tomorrow, and decomposed so a coding agent can execute it slice by slice.

## Logic followed

Product logic: operative Momente zuerst (Warenannahme 7:30, Übergabe 16:00), Auswertung folgt. Scope logic: MVP-Core = 5 Prozesse; alles Datenabhängige (AI-Vorbefüllung, Anomalie-Hinweise) hinter harte Kaltstart-Schwellen nach Pilot v1.5 verschoben. Delivery logic: 10 Slices, Foto und Offline isoliert am Ende; 15 Decision Locks (D1–D15) vor den jeweiligen Slices; Akzeptanztests in Gegeben/Wenn/Dann mit Markierungen für Entscheidungen, Pilotgeräte und DSGVO/BV.

## Design assumptions

- Referenzbetrieb: Hotel mit Gastro, 40–60 Mitarbeitende, 5–8 Lagerorte (Typ „Motorworld Inn", keine Realdaten).
- Geteilte Schichtgeräte mit PIN-Wechsel sichern Personenzuordnung.
- Keine MVP-Integrationen (POS/Buchhaltung/EDI); CSV-Export erst Pilot v1.
- Preise sind Verhandlungs-Spannen, keine Zusagen.

## Tradeoffs

- Accepted:
  - „Jede Abweichung → Freigabe" (einfach, ggf. Freigabe-Müdigkeit → Risiko-Register Nr. 3 wacht).
  - Offline nur Neuerfassung, Kollisionen → Korrekturantrag statt Auto-Merge.
- Rejected:
  - AI-Vorbefüllung am Go-Live-Tag (Kaltstart würde Vertrauen zerstören).
  - Org-übergreifende/Mehrstandort-Funktionen im MVP.

## Durable memory

- MVP-Core-Definition lebt in `docs/productization/spec-pack/mvp-scope-lock.md`; jede Scope-Diskussion startet dort.
- KPI-Baselines müssen in Phase 0 erhoben werden — ohne Baseline keine Erfolgsbehauptung.
- Keine Pro-Person-Auswertungen im Produkt (Zweckbindung gegen Leistungskontrolle, Risiko Nr. 5).

## Do not reuse blindly

- Die Preis-Spannen (Setup 2.000–4.000 €, Pilot 300–500 €) sind Vorschläge aus einer Spezifikationssession, keine validierten Marktpreise.
- Die Slice-Reihenfolge setzt voraus, dass Foto/Offline wirklich zuletzt kommen — bei anderem Risikoprofil neu schneiden.

## Relation to Rauschenberger OS / Bevero

- location logic: ein Standort = eine Instanz; Lagerorte flach, keine Hierarchien im MVP.
- role/approval logic: 6 Rollen (5 im MVP-Core aktiv), Zwei-Personen-Prinzip Ersteller ≠ Freigebender, Bereichsrouting Küche/Bar.
- inventory/procurement/shift-planning logic: Warenfluss ja; Bestellwesen, Inventur-Vollfunktion, Dienstplan explizit Nicht-Ziele.
- external-system boundary: POS/ERP/Buchhaltung bleiben führend; Bevero ist Ausführungs- und Nachweisebene (deckungsgleich mit BEVERO.md).

## Next logic gate

Owner-Entscheidungen D1–D3 (PIN-Modell, Inaktivitäts-Timeout, Zweckbindungs-Produktregel) vor Sprint 1 „Identität & physische Welt".
