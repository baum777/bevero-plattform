# Intent Memory — Privacy-Paket: AVV/Subprozessor/TOM anlegen

- id: 2026-07-04-privacy-package-avv-subprocessor-tom
- timestamp: 2026-07-04T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-04-privacy-package-avv-subprocessor-tom.md`
- status: draft

## Core intention

Den O3-DSGVO-Befund von reiner Analyse in ein **verwendbares Dokumentengerüst**
überführen. Ziel ist, die drei dokumentarischen Pilot-Blocker P-B1 (DPA-Kette),
P-B7 (Subprozessor-Liste) und P-B9 (TOM) zu schließen und P-B2 (Pilotkunden-AVV)
so vorzubereiten, dass nur noch Owner-/Rechtsschritte fehlen.

## Logic followed

DSGVO-Kette: Gastro-Kunde = Verantwortlicher, Bevero = Auftragsverarbeiter,
Supabase/Vercel = Unterauftragsverarbeiter. Für einen sauberen Pilotkunden-AVV
braucht es (a) belegte AVV-Grundlage mit den Subprozessoren, (b) eine
Subprozessor-Liste als AVV-Anlage, (c) ein TOM-Dokument als AVV-Anlage. Das TOM
wurde ausschließlich aus vorhandener Repo-Evidence abgeleitet, damit es
belastbar und nicht geschönt ist.

## Design assumptions

- Alle Dokumente sind Vorlagen; reale Vertrags-/Akzeptanzschritte liegen außerhalb
  des Repos beim Owner.
- Ehrlichkeit vor Vollständigkeit: nicht belegte Punkte werden als `offen`
  markiert statt als erfüllt dargestellt.
- Kein Secret, kein Connection-String, kein Key in Privacy-Dokumenten.

## Tradeoffs

- Accepted:
  - Dokumente bleiben bewusst Entwürfe mit Platzhaltern statt scheinbar fertiger
    Compliance — verhindert Overclaiming.
  - TOM listet offene Punkte (Backup, Verschlüsselung-at-rest-Beleg, Breach) offen
    aus, auch wenn das den Reifegrad kleiner wirken lässt.
- Rejected:
  - Fertig klingende „DSGVO-konform"-Formulierungen — verboten laut O3.
  - VVT/RoPA in diesem Block mitzubauen — bewusst als eigener nächster Schritt.

## Durable memory

- `docs/privacy/` ist ab jetzt der kanonische Ort für DPA-Referenzen,
  Subprozessor-Liste, TOM und AVV-Anlagen.
- TOM (`toms.md`) ist die Anlage 2, Subprozessor-Liste (`subprocessors.md`) die
  Anlage 3 des Pilotkunden-AVV.
- Storage/Foto (`photoUrl`/`avatarUrl`) und FoodNotify/Graph sind ausdrücklich
  als geplant/inaktiv mit eigenen Reaktivierungs-Gates markiert.

## Do not reuse blindly

- Keines der Dokumente als abgeschlossenen Vertrag oder Konformitätsnachweis
  zitieren. Status-Marker (`offen`/`draft`) prüfen, bevor eine Aussage nach außen
  getragen wird.
- Supabase-Region ist abgeleitet, nicht verifiziert — nicht als „EU-garantiert"
  verkaufen (P-B3/P-B8 offen).

## Relation to Rauschenberger OS / Bevero

- location logic: keine Änderung.
- role/approval logic: nutzt bestehende RBAC/Autonomie-Stufen als TOM-Evidence.
- inventory/procurement/shift-planning logic: Datenkategorien aus Schema als
  AVV-Anlage 1 gespiegelt; Procurement-Import als inaktiv markiert.
- external-system boundary: Supabase/Vercel aktiv; Graph/FoodNotify/Storage
  inaktiv/geplant mit Gates.

## Next logic gate

Owner-Vervollständigung (DPA-Akzeptanz, Region-Verifikation) — danach die
operativen Blocker P-B4 (Export/Löschung), P-B5 (Backup/PITR) und der Next Step
VVT/RoPA (Art. 30) aus dem Dateninventar.
