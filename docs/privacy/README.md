# Bevero Privacy-Paket — Index

**Stand:** 2026-07-04 · **Status:** `draft` — Owner-Vervollständigung ausstehend
**Bezug:** Bevero O3 DSGVO Stufe 2 Readiness Review + Supplement (2026-07-03)

---

## Was das ist

Dieses Verzeichnis ist die **dokumentarische Grundlage** für die DSGVO-Readiness
von Bevero im Pilot- und späteren Produktivbetrieb. Es ersetzt **keine
Rechtsberatung** und behauptet **keine** abgeschlossene DSGVO-Konformität. Alle
Dokumente sind **Vorlagen/Entwürfe**, die durch den Owner (aktuell Cheikh) mit
belastbaren Werten, akzeptierten Verträgen und ggf. anwaltlicher Prüfung
finalisiert werden müssen.

> ⚠️ Kein Dokument in diesem Ordner ist ein abgeschlossener Vertrag. Ein
> `Status: offen` bedeutet: der zugrunde liegende Schritt (DPA-Akzeptanz,
> Region-Verifikation, Vertragsschluss) ist **noch nicht erfolgt**.

## Inhalt

| Datei | Zweck | Schließt Blocker | Status |
|---|---|---|---|
| [`dpa-references.md`](dpa-references.md) | Referenzstruktur für Supabase- + Vercel-DPA (AVV-Kette) | P-B1 | `offen` |
| [`subprocessors.md`](subprocessors.md) | Subprozessor-Liste inkl. Region/Rolle/Status | P-B7 | `draft` |
| [`toms.md`](toms.md) | Minimale technisch-organisatorische Maßnahmen (Art. 32) | P-B9 | `draft` |
| [`pilot-avv-annex.md`](pilot-avv-annex.md) | Anhang-Set für Pilotkunden-AVV (Art. 28) | P-B2 (Vorbereitung) | `draft` |
| [`vvt-processing-inventory.md`](vvt-processing-inventory.md) | Verzeichnis von Verarbeitungstätigkeiten (Art. 30), Prozessor- + Verantwortlicher-Register | Next Step VVT/RoPA | `draft` |
| [`export-deletion-runbook.md`](export-deletion-runbook.md) | Manuelles Export-/Lösch-/Retention-Runbook (Art. 15/17/20) | P-B4 (+ VVT-Fristen) | `draft` |

## Blocker-Mapping (aus O3-Supplement)

- **P-B1 — AVV-Kette Supabase + Vercel:** Struktur vorhanden (`dpa-references.md`);
  Akzeptanz/Datum/Version durch Owner einzutragen.
- **P-B7 — Subprozessor-Liste:** Liste vorhanden (`subprocessors.md`); Regionen
  final zu verifizieren (koppelt P-B3 / P-B8).
- **P-B9 — TOM-Anhang:** Minimales TOM-Dokument vorhanden (`toms.md`), belegt aus
  Repo-Evidence. Ist Anlage zum Pilotkunden-AVV.
- **P-B2 — Pilotkunden-AVV:** Vorbereitet (`pilot-avv-annex.md`); Vertragsschluss
  bleibt Owner-/Rechtsschritt.

## Noch offen (nicht Teil dieser Blöcke)

- **P-B3 Supabase-Region** — Dashboard-Verifikation (nur aus `.env.example`
  abgeleitet).
- **P-B8 Drittlandtransfer-Assessment** — v.a. Vercel-Function-Region + Graph.
- **VVT/RoPA (Art. 30)** — Entwurf vorhanden (`vvt-processing-inventory.md`);
  Fristen, Rechtsgrundlagen und Drittlandtransfer sind Owner-zu-finalisieren.
- **P-B4 Export/Löschung** — Runbook vorhanden (`export-deletion-runbook.md`);
  Retention-Fristen als Vorschlag (Owner zu bestätigen), reale Ausführung
  hängt an DB-Guard/Owner-Freigabe und offenem Split-Brain.
- **P-B5 Backup/PITR**, **Pr-B3 Retention** (Bestätigung), **Pr-B8 DSFA/DPIA**,
  **Pr-B9 Storage/Foto** — Pilot-/Production-Ebene.

## Umgang

1. Owner trägt in `dpa-references.md` die tatsächlich akzeptierten DPA-Stände ein.
2. Owner verifiziert Regionen (Supabase-Dashboard, Vercel-Projekt) und aktualisiert
   `subprocessors.md`.
3. `toms.md` wird als Anlage an den Pilotkunden-AVV gehängt.
4. Erst wenn P-B1, P-B3, P-B7, P-B8, P-B9 geschlossen sind, ist der
   Pilotkunden-AVV (P-B2) sauber abschließbar.

---

*Keine Rechtsberatung. Technischer und dokumentarischer Readiness-Stand.*
