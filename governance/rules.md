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
