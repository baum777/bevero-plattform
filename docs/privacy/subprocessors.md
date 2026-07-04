# Subprozessor-Liste (Art. 28 Abs. 2 DSGVO)

**Stand:** 2026-07-04 · **Status:** `draft` · Schließt **P-B7**.
Regionen final zu verifizieren (koppelt **P-B3** Supabase-Region, **P-B8**
Drittlandtransfer).

> ⚠️ Vorlage. Regionen sind teils aus `.env.example` **abgeleitet**, nicht
> Dashboard-verifiziert. Vor Pilot-Freigabe durch Owner belegen. Keine
> Rechtsberatung.

---

## Aktive Subprozessoren (Pilot)

| Subprozessor | Zweck der Verarbeitung | Datenkategorien | Region | Region-Belegstand | DPA (siehe `dpa-references.md`) | Status |
|---|---|---|---|---|---|---|
| **Supabase** (Postgres, Auth) | Betrieb der Datenbank + Authentifizierung | Alle Anwendungsdaten inkl. `UserProfile`, `OrganizationMember`, Inventar-/Shift-/Notiz-Daten | EU (AWS `eu-west-1` / Irland) — **abgeleitet** | Aus `.env.example`-Template (`aws-0-eu-west-1.pooler.supabase.com`); **Dashboard-Verifikation offen (P-B3)** | erforderlich, `offen` | aktiv |
| **Vercel** (Hosting) | Ausführung API (`bevero-plattform-api`) + Cockpit (`bevero-plattform-cockpit`), CDN, Function-Runtime, Request-Logs | Alle über HTTP transportierten Daten; Log-Metadaten | **nicht dokumentiert** | Function-Execution-Region nicht in Repo konfiguriert/belegt — **offen (P-B8)** | erforderlich, `offen` | aktiv |

## Inaktive / geplante Subprozessoren

| Subprozessor | Zweck | Status | Reaktivierungsbedingung |
|---|---|---|---|
| **Microsoft (Graph/Azure)** | App-only-Mailbox-Zugriff für Procurement-Ingest | `inaktiv` — `MICROSOFT_CLIENT_ID`/`_SECRET` leer in `.env.example` | siehe Reaktivierungs-Gate unten |
| **FoodNotify** | Lieferant der importierten Bestellbestätigungen (E-Mail) | `inaktiv` — `FOODNOTIFY_IMPORT_ENABLED="false"` | siehe Reaktivierungs-Gate unten |
| **Supabase Storage** (Bilder/Fotos) | Item-/Location-Bilder, ggf. `TaskIssue.photoUrl`, `UserProfile.avatarUrl` | `geplant, nicht implementiert` — `ADR-0059` = `Status: draft`, kein Bucket/keine Policy im Repo | siehe Storage-Gate unten |

---

## Reaktivierungs-Gate — Microsoft Graph / FoodNotify

`FOODNOTIFY_IMPORT_ENABLED=true` und das Setzen von Graph-Credentials dürfen
**erst** erfolgen nach:

1. **DPA-/Rollenklärung** Microsoft Graph (Auftragsverarbeiter) **und** FoodNotify
   (Rolle: Lieferant / eigener Verantwortlicher? — klären).
2. **Retention-Regel** für `ProcurementMailImport` (insb. `rawText`, `rawHtml` =
   rohe E-Mail-Inhalte mit möglicher PII).
3. **Explizite Risikoentscheidung** zu `rawText`/`rawHtml`: speichern / kürzen /
   nicht speichern.

Bis dahin: in Außenkommunikation **nicht** als aktive Fähigkeit nennen.

## Storage-Gate — Supabase Storage / Fotos

Vor Aktivierung von Foto-/Avatar-Funktionen (`Pr-B9`) zu belegen:

- privater Bucket (kein Public Bucket), Signed-URL-Zugriff,
- org-scoped RLS auf Storage-Objekte,
- EXIF-/GPS-Stripping bei Upload,
- Lösch-/Retention-Konvention für Bild-Objekte.

Grundlage/Plan: `docs/features/item-image-service.md` (Spec, **nicht** akzeptiert).
`TaskIssue.photoUrl` / `UserProfile.avatarUrl` sind aktuell Schema-Felder **ohne**
implementierten, policy-belegten Bucket.

---

## Owner-To-Do

- [ ] Supabase-Region im Dashboard verifizieren, `EU`-Nachweis hier eintragen (P-B3).
- [ ] Vercel-Function-Region festlegen (EU) + dokumentieren; sonst
      Drittlandtransfer-Grundlage benennen (P-B8).
- [ ] Diese Liste als Anlage in den Pilotkunden-AVV aufnehmen.
- [ ] Melde-/Widerspruchsprozess bei Subprozessor-Wechsel festlegen.

## Belegstand (Repo, read-only)

- Supabase-Region abgeleitet: `.env.example` (`aws-0-eu-west-1.pooler.supabase.com`).
- Vercel-Projekte: `docs/deployment-vercel.md`.
- Graph/FoodNotify inaktiv: `.env.example` (`FOODNOTIFY_IMPORT_ENABLED="false"`).
- Storage geplant: `docs/features/item-image-service.md`; Schema-Felder
  `TaskIssue.photoUrl`, `UserProfile.avatarUrl` in `apps/api/prisma/schema.prisma`.
