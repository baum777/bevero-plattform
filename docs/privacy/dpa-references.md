# DPA-/AVV-Kette — Referenzstruktur (Subprozessoren)

**Stand:** 2026-07-04 · **Status:** `offen` — keine der unten genannten DPAs ist
in diesem Repo als akzeptiert nachgewiesen. Schließt **P-B1** erst nach
Owner-Eintrag.

> ⚠️ Diese Datei dokumentiert **welche** Auftragsverarbeitungsverträge (AVV /
> Data Processing Agreements) mit den Infrastruktur-Subprozessoren bestehen
> müssen und **wo** ihr Nachweis abgelegt wird. Sie ist **kein** Vertrag und
> **kein** Nachweis, dass ein DPA abgeschlossen wurde. Der Owner trägt reale
> Akzeptanz-Daten/-Versionen ein. Keine Rechtsberatung.

---

## Warum eine Kette

Bevero verarbeitet Kundendaten nicht selbst auf eigener Hardware, sondern über
Infrastruktur-Dienstleister. Jeder dieser Dienstleister ist gegenüber Bevero ein
**Auftragsverarbeiter** (bzw. Unterauftragsverarbeiter gegenüber dem
Gastro-Kunden). Für jeden braucht Bevero eine gültige AVV-Grundlage nach
Art. 28 DSGVO, bevor echte Kundendaten fließen.

## Kette (Pilot-relevant)

| # | Dienstleister | Verarbeitet | DPA erforderlich | Nachweis abgelegt | Status |
|---|---|---|---|---|---|
| 1 | **Supabase** | Postgres-DB, Auth-Identitäten, (geplant) Storage | ja | ‹Owner: Link/Version/Datum eintragen› | `offen` |
| 2 | **Vercel** | Hosting `bevero-plattform-api` + `-cockpit`, CDN, Function-Runtime, Logs | ja | ‹Owner: Link/Version/Datum eintragen› | `offen` |

## Kette (nur bei Aktivierung — aktuell inaktiv)

| # | Dienstleister | Verarbeitet | DPA erforderlich | Status |
|---|---|---|---|---|
| 3 | **Microsoft (Graph/Azure)** | Mailbox-Zugriff für Procurement-Ingest | ja — vor Aktivierung | `inaktiv` (`FOODNOTIFY_IMPORT_ENABLED=false`, Graph-Credentials leer) |
| 4 | **FoodNotify** | Quelle der importierten Bestellbestätigungen | Rolle klären + Vereinbarung | `inaktiv` |

> Reaktivierung von (3)/(4) siehe `subprocessors.md` → Reaktivierungs-Gate.

---

## Einzutragende Felder pro DPA (Owner)

Für Supabase und Vercel je Zeile ausfüllen — **ohne Secrets**, nur Metadaten:

```
Dienstleister:        Supabase | Vercel
DPA-Dokumententitel:  ‹z. B. "Data Processing Addendum"›
Version/Datum:        ‹Version + Datum der akzeptierten Fassung›
Akzeptiert am:        ‹YYYY-MM-DD›
Akzeptiert durch:     ‹Name / Account›
Ablage/Referenz:      ‹URL zur Fassung oder internes Ablage-Kürzel›
Subprozessor-Klausel: ‹erlaubt Unterauftragsverarbeitung? Melde-/Widerspruchsrecht?›
Geltungs-Region:      ‹siehe subprocessors.md — muss konsistent sein›
```

## Prüf-Checkliste (Owner, vor Pilot-Freigabe)

- [ ] Supabase-DPA akzeptiert und mit Version/Datum hier referenziert.
- [ ] Vercel-DPA akzeptiert und mit Version/Datum hier referenziert.
- [ ] Beide DPAs erlauben die tatsächlich genutzten Unterauftragsverarbeiter.
- [ ] Regionen in DPA-Scope decken sich mit `subprocessors.md`.
- [ ] Kein Secret, kein Connection-String, kein Key in dieser Datei.

---

## Ableitung / Belegstand (Repo-Evidence, read-only)

- Supabase als kanonische DB/Auth: `apps/api/prisma/schema.prisma`
  (`datasource db`, `schemas = ["public","auth"]`), `docs/DECISIONS.md` (ADR-0011/0014).
- Vercel als Hosting für API + Cockpit: `docs/deployment-vercel.md`
  (Canonical Projects `bevero-plattform-api` / `-cockpit`).
- Microsoft Graph / FoodNotify inaktiv: `.env.example`
  (`FOODNOTIFY_IMPORT_ENABLED="false"`, `MICROSOFT_CLIENT_ID=""`).

> Diese Ableitungen belegen die **Rolle** der Dienstleister, **nicht** den
> Abschluss eines DPA. Der Abschluss ist ein Owner-Schritt außerhalb des Repos.
