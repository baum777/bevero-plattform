# Intent Memory — VVT/RoPA (Art. 30) aus Dateninventar ableiten

- id: 2026-07-04-vvt-processing-inventory
- timestamp: 2026-07-04T00:30:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-04-vvt-processing-inventory.md`
- status: draft

## Core intention

Das O3-Dateninventar in ein Art.-30-Verzeichnis überführen, damit Bevero seine
Verarbeitungstätigkeiten strukturiert nachweisen kann. Nicht juristisch final,
aber vollständig genug, dass der Owner nur noch Kopf-Daten, Fristen und
Rechtsgrundlagen einträgt.

## Logic followed

Art. 30 unterscheidet Verantwortlicher (Abs. 1) und Auftragsverarbeiter (Abs. 2).
Bevero ist beides: Auftragsverarbeiter für Kundendaten (Inventar, Schicht, Notizen)
und Verantwortlicher für eigene Tätigkeiten (Outreach, Vertragsverwaltung). Daher
zwei getrennte Register. Jede Tätigkeit wurde aus konkreten Prisma-Modellen
abgeleitet, damit sie belastbar und nicht erfunden ist.

## Design assumptions

- Struktur folgt den Pflichtfeldern des Art. 30 (Zweck, Betroffene, Kategorien,
  Empfänger, Drittland, Frist, TOM).
- Fristen sind mangels Retention-Konzept `offen`; Vorschläge sind unverbindlich.
- Inaktive Verarbeitungen (Procurement-Ingest) werden als solche geführt, nicht
  weggelassen — Reaktivierung braucht ein Gate.

## Tradeoffs

- Accepted:
  - Register B (Verantwortlicher) bewusst schmal gehalten statt zu spekulieren.
  - „Frist-Vorschlag" statt fester Fristen — verhindert Scheingenauigkeit.
- Rejected:
  - Feste Aufbewahrungsfristen zu setzen — das ist eine Owner-/Rechtsentscheidung.
  - Rechtsgrundlagen als gesichert darzustellen — nur als „zu bestätigen".

## Durable memory

- `vvt-processing-inventory.md` ist der kanonische VVT-Entwurf; Register A =
  Auftragsverarbeiter, Register B = Verantwortlicher.
- A4 (Schicht) trägt das höchste Risiko (§26 BDSG) und triggert die DSFA/DPIA (Pr-B8).
- Retention-Lücke (Pr-B3) ist der Haupt-Owner-Schritt zur VVT-Finalisierung.

## Do not reuse blindly

- VVT ist Entwurf; Fristen/Rechtsgrundlagen/Drittland nicht als final zitieren.
- Register mit realem Pilot-Scope abgleichen — nicht alle Tätigkeiten laufen in
  jedem Pilot.

## Relation to Rauschenberger OS / Bevero

- location logic: keine Änderung.
- role/approval logic: RBAC/Freigabe als TOM-Bezug, Art.-22-Einschätzung (keine
  automatisierte Einzelentscheidung) zu bestätigen.
- inventory/procurement/shift-planning logic: als Verarbeitungstätigkeiten A2/A3/A4
  gespiegelt; Procurement-Ingest A7 inaktiv.
- external-system boundary: Supabase/Vercel aktiv; Graph/FoodNotify inaktiv.

## Next logic gate

Owner-Finalisierung (Kopf-Daten, Fristen, Rechtsgrundlagen, Drittlandtransfer) —
danach P-B4 (Export/Löschung) und P-B5 (Backup/PITR) als operative Blocker.
