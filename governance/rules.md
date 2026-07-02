# Governance Rules — Rauschenberger OS

Diese Regeln sind nicht optional. Sie sind der Betriebskern.
Autorität: [`IDENTITY.md`](../IDENTITY.md)

---

## Regel 1 — Draft vor Commitment

Kein KI-Output wird direkt ausgeführt.
Jede Aktion über L0 landet zuerst im Draft-State.
Erst Freigabe → dann Ausführung.

---

## Regel 2 — Risikostufe zuerst

Bevor eine Aktion ausgeführt wird: Risikostufe klassifizieren (L0–L4).
Bei Unklarheit: eine Stufe höher. Eskalieren, nicht raten.
→ Vollständige Stufendefinition: [`IDENTITY.md#risikostufen`](../IDENTITY.md)

---

## Regel 3 — Kein Kontext aus dem Kopf

Jede Session beginnt mit Context Load aus `context/current-state.md`.
Veralteter Kontext → erst aktualisieren, dann arbeiten.

---

## Regel 4 — Audit ist nicht optional

Jede Aktion ab L2 bekommt einen Audit-Eintrag in `logs/audit-log.md`.
Kein Ergebnis ohne Dokumentation.

---

## Regel 5 — Operator-Freigabe ist nicht delegierbar

L3/L4-Freigaben brauchen die explizite Freigabe des zuständigen Operators
(Name + Timestamp + Kanal).
Keine Ausnahme — auch nicht unter Zeitdruck.

---

## Regel 6 — Bestehende Systeme bleiben führend

FoodNotify, Dynamics 365 und DATEV sind die Führungssysteme.
Rauschenberger OS schreibt nicht in diese Systeme ohne L3/L4-Freigabe.
Daten-Ingestion (lesen) ist ab L2 erlaubt mit Evidence-Artefakt.

---

## Regel 7 — Datenbankziel vor jedem riskanten Befehl verifizieren

Vor Prisma-Migrationen, `db push`, `migrate reset`, Seeds, Deploys oder anderen
produktiven DB-Operationen muss der Operator:

1. die Supabase Project Ref aus dem Ziel ableiten,
2. sie gegen `BEVERO_EXPECTED_SUPABASE_REF` prüfen,
3. die Rolle über `BEVERO_DB_TARGET` deklarieren,
4. für Production ein separates Owner-Go plus Production-Approval setzen,
5. ein Evidence-Artefakt ohne Secrets erzeugen.

Unbekannte Refs, Ref-Mismatch, Rollen-Mismatch oder unterschiedliche Ziele in
`DIRECT_URL` und `DATABASE_URL` stoppen die Operation. Ein bestandener technischer
Guard ist keine dauerhafte Freigabe für Production.

**Owned Supabase Projects:**

```text
ienwshemokpsjwkedmyp = bevero-os / development / bevero-plattform
```

**Foreign Projects (Cross-Project Read-Only):**

Supabase-Projekte anderer Workspaces (z. B. `czinchfegtglmrloxlmh` = `warenwirtschaft`
/ `production` / `rauschenberger-os`) sind aus `bevero-plattform` heraus
**standardmäßig blockiert**. Auch ein gesetzter Cross-Project-Override
(`BEVERO_ALLOW_CROSS_PROJECT_READ`) erlaubt ausschließlich Lesezugriff; riskante
Prisma-Befehle (`migrate deploy`, `migrate dev`, `migrate reset`, `migrate resolve`,
`db push`, `db seed`, `db execute`) bleiben gegen fremde Projekte verboten.
