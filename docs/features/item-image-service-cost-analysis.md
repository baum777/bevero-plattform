# Working Paper: Cost-Analysis for the `item-images` Supabase Storage Bucket

> **Status:** parked (working paper, draft, not an ADR)
> **Owner:** open
> **Created:** 2026-06-19
> **Re-evaluation trigger:** when the Item-Image-Service moves from spec to implementation, this paper is promoted to **ADR-0059-K** ("Cost-Approval for the `item-images` Supabase Storage bucket").
> **Source discussions:** 2026-06-19 Q&A in the rauschenberger-os cockpit session; ADR-0059 §Owner-Verdicts-Update 2026-06-19 (OQ §4 verdict).
> **Authority chain (when promoted):** `IDENTITY.md:117` (L3-Freigabe für Cost-Ceiling) → `governance/approval-matrix.md:14` (L3 Approval-Pfad) → ADR-0059-A §Bindings (Hard-Precondition).

---

## 1. Zweck dieses Working-Papers

Dieses Dokument hält die **Kosten-Analyse** und die **operatorische Werterwartung** für den `item-images` Supabase Storage Bucket fest, **bevor** ein ADR-0059-K (Cost-Approval) gedraftet wird. Es ist eine **Arbeitsnotiz**, kein ADR, und wird **nicht** in `docs/DECISIONS.md` aufgenommen. Bei der nächsten Re-Evaluation (typischerweise vor dem Implementation-Slice ADR-0059-A) wird der Inhalt in den ADR-0059-K überführt.

**Out of scope:** technische RLS/Schema-Details (siehe ADR-0059-A), API-Details (siehe ADR-0059-B), UI-Details (siehe ADR-0059-C).

---

## 2. Vier Kosten-Treiber (nach Größe sortiert)

| # | Treiber | Größenordnung v1 | Pricing-Modell (Pro Plan) | Notiz |
|---|---|---|---|---|
| 1 | **Soft-Delete-Akkumulation** (Lifecycle-Lücke) | **unbounded** — die größte Kostenfalle | $0.021/GB/Monat nach 100 GB Inklusiv-Volumen | v1 hat **keinen** Hard-Delete; `ItemImage.deletedAt = now()` lässt das Storage-Objekt unangetastet. Ohne Retention-Policy wächst der Bucket monoton. |
| 2 | **Egress / Bandwidth** (Signed-URL-Reads) | ~60 GB/Monat bei 50 MA × 20 Bilder/Tag × 2 MB | 250 GB/Monat inkl., dann $0.09/GB | Read-Signed-URL-TTL 5 min, jeder Read-Call = ein Bandwidth-Egress. Bei häufiger Mobile-Nutzung (Bar/Küche) steigt dieser Wert linear mit der MA × Bilder/Tag-Quote. |
| 3 | **Storage-Volumen aktiv** (live Bilder) | ~5 GB bei 2 500 Bilder × 2 MB | Pro 100 GB inkl. | Basiert auf Annahmen: 500 `InventoryItem` + 10 `StorageLocation`, 5 Bilder pro Item Median. Tatsächlich erst nach Pilot messbar. |
| 4 | **Image-Transformationen** (optional, ADR-0059-D) | $5 / 1000 Source-Images / Monat | nur falls HEIC-Transcoding später aktiviert | Im v1-Scope **nicht aktiv** (HEIC wird abgelehnt, OQ §3-Verdict). Wird nur scharf, wenn ADR-0059-D später greift. |

> **Reale Kostenfalle ist #1.** Das Pro-Plan-Inklusiv-Volumen von 100 GB reicht für v1-Annahmen (~5 GB aktiv + ~60 GB Egress) **locker**. Die eigentliche Kosten-ESKALATION entsteht, wenn soft-deleted Bilder akkumulieren, ohne dass ein Lifecycle-Worker sie aufräumt. **Ohne Retention-Policy wächst der Bucket irgendwann unkontrolliert.**

---

## 3. Vier operative Wertquellen (Purpose)

| # | Use-Case | Wo | Wer profitiert | Messbare Wirkung (Pilot) |
|---|---|---|---|---|
| 1 | **Produkt-Identifikation** bei Schichtwechsel / Einarbeitung | Bar-Tresen, Küche, Tablet | Schichtkräfte (niedrigere Fehlgriffe, schnellere Einarbeitung) | Fehlgriff-Quote, Einarbeitungszeit pro neuem MA |
| 2 | **Standardisierter visueller Reference-Punkt** über Standorte & Schichten | Multi-Location-Motorworld | Schichtleitung (weniger Rückfragen, konsistente Bestellmengen) | Rückfragen pro Schicht, Abweichung Soll-/Ist-Bestand |
| 3 | **Audit-Traceability** bei Reklamation / Verwechslung | Streitfall Lieferant ↔ Bar | Manager, Operator | Anzahl gelöster Streitfälle, durchschnittl. Klärungsdauer |
| 4 | **Schulungs- & Onboarding-Material** | neuer Mitarbeiter onboardet sich am Tablet selbst | Einarbeitungs-Phase | Onboarding-Tage bis zur Schichtfähigkeit |

> **Wichtig:** Keiner dieser Use-Cases erzeugt direkt eine **Umsatzsteigerung**. Der Wert ist **Risikoreduktion** (Fehlgriffe, Reklamationen, Einarbeitungszeit) und **Operating-Speed**. ADR-0059-K ist deshalb ein **L3-Freigabe-ADR**, nicht ein L4-Block: kein direkter Geldfluss, kein Vertrag — aber explizite Operator-Verantwortung nötig, weil die Kosten langfristig und unsichtbar wachsen können.

---

## 4. Warum ADR-0059-K zwingend ist (Cost-Control-Hebel)

`IDENTITY.md:117` definiert L3-Aktionen als **explizite Operator-Freigabe**. Storage-Kostenfreigabe ist eine L3-Aktion, weil der Operator **vier Hebel** braucht, sonst hat er keinen Eingriffspunkt:

1. **Retention-Policy** — wie lange bleiben soft-deleted Bilder im Bucket? 30/90/180 Tage? Unendlich?
2. **Per-Org-Ceiling** — max. Bilder pro Org? max. GB? Hard-Cut oder Soft-Warnung?
3. **Cost-Ceiling** — bei 80 GB Soft-Warn, bei 95 GB Stop-New-Uploads? Oder Plan-Upgrade-Trigger?
4. **Lifecycle-Worker** — automatisches Purge nach Retention? Cron-Job? Edge-Function?

Ohne diese vier Hebel hat der Cost-Owner (Operator) **keine Eingriffsmöglichkeit**, sobald der Bucket wächst. ADR-0059-A könnte die Migration technisch anlegen, aber ohne ADR-0059-K fehlt die **ökonomische Autorität** für den Live-Betrieb.

---

## 5. Was ADR-0059-K konkret enthalten muss (Spec für den zukünftigen ADR)

Wenn dieses Working-Paper zu ADR-0059-K promoted wird, sind die folgenden 6 Pflicht-Felder zu setzen:

| # | Pflicht-Feld | Beispielwert (Recommended) | Owner-Entscheidung |
|---|---|---|---|
| 1 | **Retention-Policy** | soft-deleted → hard-purge nach 90 Tagen via Supabase Storage scheduled job | Cost-Owner (Operator) |
| 2 | **Per-Org-Ceiling** | 1 000 Bilder pro `organizationId`; enforced in ADR-0059-B als `POST /images` 422-Response bei Überschreitung | Cost-Owner (Operator) |
| 3 | **Cost-Ceiling** | 80 GB Soft-Warn, 95 GB Stop-New-Uploads, monatlicher Supabase-Usage-Report | Cost-Owner (Operator) |
| 4 | **Re-Evaluations-Trigger** | monatlicher Report + Schwellwert 80% → Cost-Owner wird automatisch benachrichtigt; Re-Evaluation alle 6 Monate verpflichtend | Cost-Owner (Operator) |
| 5 | **Cost-Owner-Rolle** | Operator-Rolle; L3-Freigabe-Pfad nach `governance/approval-matrix.md:14` | Owner-Doc |
| 6 | **Cross-Reference auf ADR-0059-A** | "Hard-Precondition: ADR-0059-K Status: accepted" — bereits in ADR-0059-A §Bindings eingetragen | this paper |

**Optionale Felder** (je nach Pilot-Ergebnis):

- **Lifecycle-Worker-Implementierung** — Supabase pg_cron? GitHub-Action? Vercel-Cron? `src/modules/image-lifecycle/`?
- **Komprimierungs-Policy** — serverseitiges `sharp`-Resize bei Upload? (Berührt ADR-0059-A §mimeType; out of v1-Scope aber planbar.)
- **Multi-BU-Aufteilung** — wenn `businessUnitId` später greift (ADR-0059-E), wie verteilt sich das Cost-Ceiling auf BUs?
- **EXIF-Heuristik zur Storage-Reduktion** — automatische Komprimierung bei Bildern > 5 MB ohne Qualitätsverlust?

---

## 6. Cross-References (Status quo 2026-06-19)

- `IDENTITY.md:117` — L3-Freigabe-Pfad (Operator + Reviewer + Evidence)
- `IDENTITY.md:148-153` — Liste der immer-blockierten Aktionen (Storage-Cost ist nicht enthalten → fällt in L3, nicht L4)
- `governance/approval-matrix.md:14` — L3-Approval-Pfad
- `governance/evidence-contract.md:5` — L2+ Aktionen erzeugen Evidence-Artefakt; ADR-0059-K erzeugt **kein** Evidence-Artefakt (Cost-Approval ist eine Operator-Policy, keine Code-Aktion)
- `docs/DECISIONS.md:4203` — ADR-0059 (Spec, Status: draft)
- `docs/DECISIONS.md:4281-4326` — ADR-0059 §Owner-Verdicts-Update 2026-06-19 (OQ §4 verdict: "Separates ADR-0059-K")
- `docs/DECISIONS.md:4405` — ADR-0059-A (Schema + Storage, Status: draft) mit ADR-0059-K als Hard-Precondition in §Bindings
- `docs/features/item-image-service.md:2-9` — Spec-Header (Spec-Status: draft, ADR-Referenz: ADR-0059)
- `docs/features/item-image-service-ux.md:2-9` — UX-Header (UX-Status: draft, ADR-Referenz: ADR-0059)
- `docs/architecture/phase2-phase3-mapping.md` — Pattern-Vorlage für "deferred planning docs" (working paper, parked, re-evaluation-triggered)

---

## 7. Re-Evaluation-Trigger (Wann wird dieses Paper zu ADR-0059-K?)

- **Trigger A (primär):** Wenn ADR-0059 von `Status: draft` auf `Status: proposed` gesetzt wird. Vor diesem Schritt MUSS ADR-0059-K drafted sein (sonst ist die OQ §4-Hard-Precondition für ADR-0059-A verletzt).
- **Trigger B (sekundär):** Wenn die Cockpit-Pilot-Daten erste Storage-Statistiken liefern (z.B. nach 4 Wochen Pilot-Betrieb) — dann können die Recommended-Werte in §5 mit echten Messwerten ersetzt werden, bevor ADR-0059-K final akzeptiert wird.
- **Trigger C (Fallback):** Vor dem ersten `POST /images`-Endpoint-Aufruf in Production (frühestens nach ADR-0059-B Acceptance) — dann muss ADR-0059-K spätestens `Status: accepted` sein.

---

## 8. Nicht-Ziele dieses Working-Papers

- **Keine** technische Implementierungs-Details (die gehören in ADR-0059-A/B/C).
- **Keine** API- oder Schema-Definition (die gehören in ADR-0059-B).
- **Keine** Cockpit-UI-Details (die gehören in ADR-0059-C).
- **Keine** Soft-Delete-vs-Hard-Delete-Diskussion (die gehört in ADR-0059-F, sobald ein realer Hard-Delete-Use-Case entsteht).
- **Keine** HEIC-Diskussion (die gehört in ADR-0059-D, gemäß OQ §3-Verdict).
- **Keine** Multi-BU-Diskussion (die gehört in ADR-0059-E, gemäß OQ §7-Verdict).
- **Keine** `InventoryMovement`-Anhang-Diskussion (die gehört in ADR-0059-G, gemäß OQ §1-Verdict).

---

## 9. Parked-Status & Sign-off

**Status:** parked (working paper, draft, not an ADR). Kein Sign-off erforderlich.

**Re-Activation:** siehe §7 Re-Evaluation-Trigger. Bei Trigger A wird dieses Paper zu ADR-0059-K promoted (kein neues Working-Paper nötig — Inhalt wird in `docs/DECISIONS.md` als neuer Top-Level-ADR-Block eingefügt, mit den 6 Pflicht-Feldern aus §5 als Decision-Paragraph).

**Expiry:** keiner (working paper, zeitlich unbefristet). Wenn das Item-Image-Service-Programm eingestellt wird, wird dieses Paper obsolet und kann in `docs/archive/` verschoben werden.
