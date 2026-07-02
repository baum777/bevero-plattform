# UX-Spec: Item Image Service

> Spec-Status: **draft** (UX only)
> Spec-Owner: `ux`-Subagent
> Sprache: Deutsch
> Zielrepo: `rauschenberger-os/`
> Autoritäts-Contract: `docs/features/item-image-service.md` (docs-Subagent)
> ADR-Referenz: ADR-0059 (Adopt Item-Image-Service Spec, `Status: draft`) — siehe `docs/DECISIONS.md:4203`
> Zulässiger Write-Target: **nur diese Datei**

---

## TTD-Frame (Test-The-Development)

- **Decision:** Eine UX-Datei existiert, die Entry-Points, die vollständige Tab-Liste mit allen enthaltenen Aktionen, die sechs wichtigsten User-Flows, ASCII-Wireframes für sechs Screens, einen State-Katalog, Mobile/A11y/Token-Hinweise, eine RBAC-Sichtbarkeits-Tabelle, Telemetrie-Empfehlungen und offene UX-Fragen für den Item-Image-Service unambiguity definiert — konsistent mit dem docs-Spec, der `IDENTITY.md`-Risikomatrix, dem bestehenden Cockpit und der kanonischen Rollen-Taxonomie in `apps/cockpit/lib/auth/rbac.ts:1`.
- **Owner / Scope:** ux-Subagent → **eine** neue Datei `docs/features/item-image-service-ux.md`. Keine bestehende Datei wird verändert, kein Code, keine UI, keine Komponente.
- **Contract:** Die Datei existiert, enthält alle 13 in der UX-Aufgabe geforderten Abschnitte, zitiert Autoritäts-Dateien im Format `file_path:line_number`, enthält ausschließlich ASCII-Skizzen (kein React, kein JSX, keine Tailwind-Klassen) und widerspricht an keiner Stelle dem docs-Spec — bestehende Inkonsistenzen werden als `BLOCKED` markiert.
- **Gate / Test:** Ein Reviewer kann die Datei lesen und ohne weitere Quellen beantworten: (a) welche Tabs existieren und welche Aktionen sie enthalten, (b) wie der mobile Upload-Flow aussieht, (c) welche Rolle welche Aktion sieht, (d) was bei leerem Bucket passiert, (e) welche A11y-Anforderungen bindend sind.
- **Implementation Slice:** N/A (UX only).
- **Evidence:** Pfad zur geschriebenen Datei; 10-Zeilen-Excerpt, der das Vorhandensein aller 13 Abschnitte belegt.
- **Next Gate:** UX-Spec → Reviewer-Subagent → Reconciliation mit docs-Spec → User-Entscheidung zu "Offene UX-Fragen" → ADR-XXXX `accepted` → erst danach Komponenten-Implementierung.

---

## 0. Rollen-Reconciliation vorab (verbindlich für diese UX)

**Observed** über `apps/cockpit/lib/auth/rbac.ts:1`:
```
export const ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;
```

**Observed** über `apps/cockpit/hooks/useRole.ts:3-5`:
```
export type UserRole = "owner" | "admin" | "manager" | "staff" | "viewer";
const ROLES: UserRole[] = ["owner", "admin", "manager", "staff", "viewer"];
```

**Observed** über `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` (Planungsdokument, nicht kanonisch):
> Target roles: `admin`, `shift_lead`, `staff`

**Inferred:** Das Cockpit-Code-Frontdoor nutzt die 5-stufige Skala; das Phase-0-Dokument formuliert eine 3-stufige Ziel-Taxonomie, die im Code nicht umgesetzt ist. Der docs-Spec `item-image-service.md:496` markiert diese Spannung selbst als `Recommended` zur ADR-Entscheidung.

**Konsequenz für diese UX-Datei:** Die 5-stufige Skala (`owner / admin / manager / staff / viewer`) wird als **Default** verwendet, weil sie der realen Code-Wirklichkeit entspricht (siehe `apps/cockpit/lib/auth/rbac.ts:1`, `apps/cockpit/app/components/app-shell.tsx:77`, `apps/cockpit/lib/auth/guards.ts:8, 35-36`). Die Mapping-Spalte zur 3-stufigen Skala in §8 ist `Inferred` und ausdrücklich als solches markiert. Sollte ADR-XXXX die Skala wechseln, ist das RBAC-Raster in §8 ohne strukturelle Änderung neu zu befüllen.

---

## 1. Zweck & Designprinzipien

Der **Item Image Service** ist ein bildfokussiertes Sub-Modul innerhalb der bestehenden Cockpit-Routen für `InventoryItem` und `StorageLocation` — kein neuer Top-Level-Bereich. Er erlaubt Hochladen, Betrachten, Taggen, Rotieren, Soft-Löschen, Wiederherstellen und Auditieren von Fotos aus dem operativen Alltag (Bar, Küche, Lager, Service). Die UX ist strikt **mobile-first** und **gloves-/low-light-tauglich** ausgelegt, weil der primäre Use-Case Schichtkräfte an der Bar und in der Küche sind.

**Designprinzipien**

- **Mobile-first, Tablet-optimiert.** Primäre Layouts sind Phone (≤ 479 px) und Tablet (480–1023 px) nach `docs/WEB_DESIGN_TOKENS.md:69-71`. Desktop ist zweitrangig.
- **Eine Aktion pro Tap wo möglich.** Im Galerie-Grid ist Antippen = Vollbild. Lange Tap = Aktionsmenü. Kein Hover-only-Pfad.
- **EXIF-GPS wird serverseitig gestrippt — UI muss das nicht erklären.** Der Hinweis erscheint **nur** dann, wenn das Quell-Bild überhaupt GPS-Daten enthielt (siehe §7). Standard ist „kein Hinweis".
- **Audit-Sichtbarkeit pro Aktion.** Jede Mutation erscheint im Audit-Tab; im Vollbild-Modal zeigt ein dezenter Footer „Zuletzt geändert von [Name] am [Datum]".
- **Append-only, soft-delete als Default.** Es gibt **keine** Hard-Delete-Aktion in der UI; das einzige Hard-Delete ist im Admin-Papierkorb-Pfad und ist L2/L3-evidence-pflichtig.
- **Append-only → Idempotenz im UI.** Wiederholte Uploads (Netz-Hickhack, Doppeltipp) dürfen nicht zu Duplikat-Bildern führen; der Client muss bei jedem Upload einen `Idempotency-Key` mitsenden (`item-image-service.md:485-487`).
- **RLS ist Vor-Bedingung, nicht Berechtigungs-Stufe.** Was RLS verbirgt, kann die UI nicht zeigen. Die UX-Visibility-Tabelle in §8 beschreibt **zusätzliche** RBAC-Schicht **innerhalb** des RLS-Scopes.
- **Konsistenz mit Cockpit-Primitiven.** `PageScaffold`, `EmptyState`, `ErrorState`, `Badge`, `Button`, `Drawer`, `ConfirmDangerDialog`, `AccessDenied` (siehe `apps/cockpit/app/components/`-Inhaltsverzeichnis). Keine neuen Komponenten erfunden.

---

## 2. Entry Points & Mounting

Der Bilderservice wird **nicht** als neue Top-Level-Route eingeführt. Er ist eine verschachtelte Sub-Route unter den bereits existierenden Detail-Seiten. Dies ist ein direktes Resultat aus `item-image-service.md:105`: „Cockpit-Routen existieren bereits für Items und Storage; die Bilder-UI wird als verschachtelte Route ergänzt."

### 2.1 ASCII: Mount-Tree

```
apps/cockpit/app/(app)/
├── inventory/
│   └── items/                              (apps/cockpit/app/(app)/inventory/items/page.tsx:1)
│       ├── page.tsx                        ← Artikelliste (existiert)
│       └── [itemId]/
│           ├── page.tsx                    ← Item-Detail (existiert noch nicht, Recommended)
│           └── images/
│               └── page.tsx                ← Bilderservice (NEU, Recommended-Pfad)
├── storage/                                (apps/cockpit/app/(app)/storage/page.tsx:1)
│   ├── page.tsx                            ← Lagerort-Liste (existiert)
│   └── [locationId]/
│       ├── page.tsx                        ← Lagerort-Detail (existiert noch nicht)
│       └── images/
│           └── page.tsx                    ← Bilderservice (NEU, Recommended-Pfad)
└── … (übrige Routen unverändert)
```

`Inferred`: Die Detail-Seiten `[itemId]/page.tsx` und `[locationId]/page.tsx` existieren im Repo-Stand (siehe `ls` der `apps/cockpit/app/(app)/inventory/items/` — enthält nur `items-client.tsx`, `loading.tsx`, `page.tsx`) noch nicht; das ist eine Vor-Bedingung, die im selben Slice mit dem Bilderservice entstehen muss. Die Spec adressiert das nicht explizit; siehe §12 Frage 2.

### 2.2 Klick-Pfade (User-Sicht)

```
INVENTORY-PFAD
  Cockpit-Sidebar
  → "Artikel"                          (apps/cockpit/app/(app)/inventory/items/page.tsx:1)
  → Item-Zeile antippen                (Row in items-client.tsx)
  → Item-Detail öffnet                 (Recommended: [itemId]/page.tsx)
  → Tab "Bilder" antippen              (NEU, Item-Image-Service)
  → Galerie-Tab ist Default            (siehe §3.1)

STORAGE-PFAD
  Cockpit-Sidebar
  → "Lagerorte"                        (apps/cockpit/app/(app)/storage/page.tsx:1)
  → Lagerort-Zeile antippen            (tbody in storage/page.tsx:95-110)
  → Lagerort-Detail öffnet             (Recommended: [locationId]/page.tsx)
  → Tab "Bilder" antippen              (NEU, Item-Image-Service)
  → Galerie-Tab ist Default            (siehe §3.1)
```

**Visualisierung als Boxen:**

```
┌──────────────────────────────────────────────────────────┐
│ Cockpit-AppShell                                        │
│ ┌────────────┐  ┌──────────────────────────────────────┐ │
│ │ Sidebar    │  │ PageScaffold "Artikel"              │ │
│ │  · Dashb.  │  │ ┌──────────────────────────────────┐ │ │
│ │  · Invent.●│  │ │ [Filter: q / status]             │ │ │
│ │  · Lager   │  │ │ ┌──────────────────────────────┐ │ │ │
│ │  · …       │  │ │ │ ItemsClient (Tabelle)        │ │ │ │
│ │            │  │ │ │  ☐ Item XY (Whisky)          │ │ │ │
│ │            │  │ │ │  ☐ Item Z (Rum)              │ │ │ │
│ │            │  │ │ └──────────────────────────────┘ │ │ │
│ │            │  │ └──────────────────────────────────┘ │ │
│ └────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                         │ tap row
                         ▼
         ┌────────────────────────────────────┐
         │ [itemId]/page.tsx — Item-Detail   │
         │ ┌──────┬──────┬──────┬──────┐      │
         │ │ Stamm│ Bew. │Bilder│ Notz │ ←Tabs│
         │ └──────┴──────┴──────┴──────┘      │
         │           ▲ default = Bilder      │
         └────────────────────────────────────┘
                         │ tap "Bilder"
                         ▼
       ┌───────────────────────────────────────────┐
       │ [itemId]/images/page.tsx — Image-Service │
       │ ┌───────────────────────────────────────┐ │
       │ │ Tabs: [Galerie] [Hochladen] [Tags]    │ │
       │ │       [Audit] [Papierkorb] [Einstellg]│ │
       │ └───────────────────────────────────────┘ │
       │ <Galerie-Tab-Inhalt>                      │
       └───────────────────────────────────────────┘
```

Dasselbe Schema mit `locationId` anstelle von `itemId` für den Storage-Pfad.

### 2.3 Tab-Position

Innerhalb der Item- bzw. Storage-Detail-Seite ist der Bilderservice ein **eigener Tab** in der bestehenden Tab-Bar (z. B. `Stammdaten | Bewegungen | Bilder | Notizen`). Das ist konsistent mit dem Cockpit-Pattern, bei dem thematische Sub-Bereiche unter einem Hauptbereich hängen (siehe `apps/cockpit/app/(app)/workspaces/[locationId]/` als Vorbild — die Tabs `today`, `calendar`, `event-spaces`, `event-ops`, `cube` etc. hängen alle unter der Standort-Detail-Seite).

**Anker-Punkte für die Mount-Entscheidung:**

- Spec: `item-image-service.md:105` (Empfehlung verschachtelte Route)
- Spec: `item-image-service.md:657` (`Recommended`-Pfad `apps/cockpit/app/(app)/inventory/items/[id]/images/page.tsx`)
- Realität: `apps/cockpit/app/(app)/inventory/items/page.tsx:1` und `apps/cockpit/app/(app)/storage/page.tsx:1` sind die heute existierenden List-Routen.
- Detail-Seiten `[itemId]/page.tsx` und `[locationId]/page.tsx` fehlen — siehe §12 Frage 2.

---

## 3. Tab-Struktur des Bilderservice

Vorgeschlagen werden **sechs Tabs**: `Galerie`, `Hochladen`, `Tags`, `Audit / Verlauf`, `Papierkorb`, `Einstellungen`. Begründung: sechs Tabs sind das obere Ende, das auf Phone (≤ 479 px) noch antippsicher bleibt, ohne zu scrollen — bei sieben Tabs würde der Wrap erzwungen, was die taktile Adressierung in Handschuhen verschlechtert.

| # | Tab | Zielgruppe | Default-Sichtbar? | Kürzel |
|---|---|---|---|---|
| 1 | Galerie | Alle Rollen | **Ja (Default beim Öffnen)** | `gallery` |
| 2 | Hochladen | Staff+ | Ja | `upload` |
| 3 | Tags | Staff+ | Ja | `tags` |
| 4 | Audit / Verlauf | Manager+ | Ja | `audit` |
| 5 | Papierkorb | Manager+ (sichtbar), Admin+ (Aktionen) | Ja (read-only für Manager) | `trash` |
| 6 | Einstellungen | Admin+ | **Nein** — nur für `admin` und `owner` | `settings` |

**Begründung „Einstellungen" nicht in der Sidebar, sondern als Tab:** Das Bilderservice-Sub-Modul hat nur sehr wenige Konfigurations-Punkte (Bucket-Status, EXIF-Toggle, Max-Werte, Default-Caption-Vorlage). Eine eigene Route wäre Overhead; ein Tab mit `Allowed: [admin, owner]` ist proportional.

**Sichtbarkeits-Pseudo-Snippet (kein Code, nur Logik-Form):**
```
canSeeTab(tab):
  if tab.id == "settings" → role ∈ {admin, owner}
  if tab.id == "audit"   → role ∈ {admin, manager, owner}
  if tab.id == "trash"   → role ∈ {admin, manager, owner, staff}   (Staff: nur read-only)
  else                   → all authenticated
```

### 3.1 Galerie (Default-Tab)

- **Zielgruppe:** Alle authentifizierten Rollen.
- **Default-Sichtbar:** Ja.
- **Kurzbeschreibung:** Visueller Bestandsüberblick pro Owner (Item oder Storage-Location) — suchen, filtern, sortieren, in Vollbild öffnen.

**Enthaltene Aktionen**

- **Bild antippen** → Vollbild-Modal (§5.3).
- **Wischen (Swipe)** im Vollbild → nächstes/vorheriges Bild derselben Galerie.
- **Primary setzen** (Long-Press-Menü oder Kontextmenü im Vollbild) → PATCH `/v1/images/:id` `{ isPrimary: true }` (siehe `item-image-service.md:374-398`).
- **Tag-Filter** (Chips oberhalb des Grids) → Query `?tag=` (`item-image-service.md:348`).
- **Uploader-Filter** (Dropdown) → Query `?uploadedByUserId=` (`item-image-service.md:349`).
- **Datums-Filter** (Von/Bis) → Query `?from=&to=` (`item-image-service.md:350-351`).
- **Suchfeld** (Caption-Volltext oder Tag-Substring) — `Inferred`, da `item-image-service.md:333-358` kein Caption-Search-Feld aufführt; siehe §12 Frage 1.
- **Sortierung** (Aufklapp-Menü) → Optionen `Datum absteigend (Default)`, `Datum aufsteigend`, `Uploader A→Z`, `Tag A→Z`. Sortierung ist **client-seitig** auf der aktuellen Seite (`Inferred`; Server unterstützt nur Filter, keine explizite Sort-Order in `item-image-service.md:333-358`).
- **Mehrfachauswahl** (Long-Press aktiviert den Auswahl-Modus) → Toolbar am unteren Rand: Soft-Delete (L2), Tag hinzufügen (Bulk), Primary setzen (Bulk, Admin+).
- **Leeren-CTA** wenn 0 Bilder → siehe §6.1.
- **Pagination** („Mehr laden"-Button) → 24 Default, max 100 (`item-image-service.md:354`).
- **Kamera-Schnellzugriff** (FAB unten rechts) → wechselt in Tab `Hochladen` und öffnet Kamera direkt (Mobile only).

### 3.2 Hochladen

- **Zielgruppe:** Staff+.
- **Default-Sichtbar:** Ja.
- **Kurzbeschreibung:** Datei-Quelle wählen, Metadaten setzen, hochladen. Mobile: Kamera vorrangig. Desktop: Drag-and-Drop.

**Enthaltene Aktionen**

- **Datei auswählen** (Multi-Select, bis 20 Dateien pro Upload-Vorgang — `Inferred` anhand `item-image-service.md:558` „Max. 20 Tags pro Bild", hier sinngemäß übertragen, genaue Obergrenze im ADR-XXXX zu fixieren).
- **Kamera** (Mobile only, FAB „Foto aufnehmen") → öffnet die native Kamera; ein Selfie-Switch ist sichtbar; nach Aufnahme landet das Bild in der Pre-Upload-Liste.
- **Drag-and-Drop** (Desktop only) — gleicher Effekt wie „Datei auswählen".
- **EXIF-Hinweis-Dialog** → erscheint **nur**, wenn die gewählte Datei GPS-Daten enthält (`item-image-service.md:564-567` und §7 unten). Standard: kein Dialog.
- **Caption-Eingabe** (ein Feld pro Datei, max. 500 Zeichen) — `item-image-service.md:154, 319`.
- **Tags-Eingabe** (Chips-Input, max. 20 Tags pro Bild, je ≤ 64 Zeichen) — `item-image-service.md:558`.
- **„Als Primary setzen"-Toggle** (pro Datei) — `item-image-service.md:374-398`. Default: aus. Wenn ein anderes Bild bereits Primary ist, zeigt die UI einen Hinweis „Aktuelles Primary wird ersetzt."
- **„An Standort X anhängen"** (im Storage-Mount) bzw. **„An Item Y anhängen"** (im Item-Mount) — sichtbarer Owner-Selector. Im jeweiligen Mount ist er **vorausgewählt und schreibgeschützt** (das Storage-Bild hängt am Storage-Owner, das Item-Bild am Item-Owner).
- **Storage-Preview** — pro gewähltem Bild eine kleine Vorschau (Vorschaubild, Dateiname, Größe).
- **Upload starten** (Primärbutton) → triggert `POST /v1/images/upload-url` pro Datei, dann Upload direkt zu Supabase, dann `POST /v1/images` zur Row-Erzeugung — die genaue Sequenz ist in `item-image-service.md:268-331` dokumentiert.
- **Upload-Fortschritt** (Pro Liste, 0–100 %) — `aria-live="polite"`-Region (siehe §9).
- **Abbruch** pro laufendem Upload.
- **Wiederholen** bei fehlgeschlagenem Upload (gleicher Idempotency-Key, vermeidet Duplikate — `item-image-service.md:485-487`).
- **Offline-Queue-Hinweis** — wenn kein Netz: Banner „Wird hochgeladen, sobald wieder online" und der Upload wird in die OfflineActionQueue eingereiht (siehe §7, Anker `docs/automation/semi-automated-operations-layer.md:155-318`).

### 3.3 Tags

- **Zielgruppe:** Staff+ (Self-Edit an eigenen Tags), Manager+ (Cross-User-Edit).
- **Default-Sichtbar:** Ja.
- **Kurzbeschreibung:** Tag-Vokabular pflegen, Bilder taggen, Filter-Tags aus der Galerie übernehmen.

**Enthaltene Aktionen**

- **Tag anlegen** (Eingabefeld + Enter) → Validierung gem. `item-image-service.md:554-559` (trim, lowercase, ASCII, max 64, Whitespace→`-`).
- **Tag umbenennen** (Inline-Edit) — `Inferred`; UI-Variante, die einen alten Tag-Namen auf alle Bilder umschreibt; konkrete API dafür ist im docs-Spec nicht eigenständig spezifiziert, sondern läuft als Bulk-PATCH mit `tags`-Array.
- **Tag löschen** (Soft, „Tag auflösen") → entfernt Tag aus allen Bildern, behält die Bilder.
- **Tag-Farbe setzen** (Color-Picker, ≤ 8 Presets) — kosmetisch; nicht in der API erzwungen.
- **Tag zusammenführen** (Merge) → wählt Quell-Tag und Ziel-Tag; alle Bilder mit Quell-Tag erhalten Ziel-Tag; Quell-Tag verschwindet. `Inferred`, Aktion ist UI-only und läuft als Bulk-PATCH.
- **Filter-Tags aus Galerie übernehmen** (Toolbar-Button im Galerie-Tab) → öffnet einen Dialog mit den Tags, die in der aktuellen Galerie vorkommen, sortiert nach Häufigkeit; Mehrfachauswahl zum Bulk-Taggen weiterer Bilder.
- **Tag-Suchfeld** (Volltext auf Tag-Liste).
- **Tag-Counter** (Anzahl Bilder pro Tag, `Inferred`; `GET /v1/images?tag=…`-Loop auf der aktuellen Galerie).

### 3.4 Audit / Verlauf

- **Zielgruppe:** Manager+ (Audit-Daten sind personalbezogen, `item-image-service.md:466`).
- **Default-Sichtbar:** Ja.
- **Kurzbeschreibung:** Append-only-Trail aller Mutationen pro Bild oder pro Owner; Filter, Export, Pagination.

**Enthaltene Aktionen**

- **Filter: Aktion** (Dropdown: `created`, `caption_updated`, `tags_updated`, `primary_set`, `primary_unset`, `rotation_updated`, `soft_deleted`, `restored`, `uploaded_bytes_verified`) — `item-image-service.md:474-475`.
- **Filter: Nutzer** (User-Picker).
- **Filter: Datumsbereich** (Von/Bis).
- **Filter: Owner-Scope** (`item` / `location` / „beide").
- **Eintrag expandieren** (Tap auf eine Row) → Diff-Payload sichtbar (JSON, monospace, lesbar formatiert).
- **Export CSV** (Toolbar-Button) → L1; nur die gefilterte Sicht; Download als `audit-export-YYYY-MM-DD.csv`.
- **Pagination** (50 Default, max 200, `item-image-service.md:477`).
- **Direkt-Verweis zum Bild** (Tap auf `imageId` → springt in Galerie-Tab und öffnet Vollbild des Bildes).

### 3.5 Papierkorb

- **Zielgruppe:** Sichtbar für alle authentifizierten Rollen (read-only für Staff), Aktionen für Manager+, Hard-Delete für Admin+.
- **Default-Sichtbar:** Ja.
- **Kurzbeschreibung:** Liste der soft-deleted Bilder; Restore und (Admin) Hard-Delete mit L2-Evidence-Pfad.

**Enthaltene Aktionen**

- **Vorschaubild** (Thumbnail, ggf. dim-wenn-soft-deleted).
- **Wiederherstellen** (Restore, L1) → `POST /v1/images/:id/restore` (`item-image-service.md:418-434`).
- **Endgültig löschen** (Admin only) → L2 + L2-Evidence-Artefakt (`item-image-service.md:599-606`). Button ist sichtbar, aber mit L2-Lock-Icon (siehe §5.6). Bei Klick: `ConfirmDangerDialog` → zweiter Bestätigungsdialog mit Eingabe des Bild-Captions zur Tipp-Bestätigung.
- **Mehrfachauswahl** → Bulk-Restore (L1) oder Bulk-Hard-Delete (L2, Admin+).
- **Leerstands-Hinweis** → wenn 0 Bilder im Papierkorb: EmptyState „Kein Papierkorb-Inhalt" mit CTA „Zur Galerie".
- **Storage-Objekt-Status** (read-only, „Im Storage: ja/nein") — `Inferred`, könnte `HEAD /v1/images/:id/storage-status` sein, im docs-Spec nicht eigenständig spezifiziert. Siehe §12 Frage 3.
- **Tage-bis-Hard-Delete-Counter** (read-only, „Wird in 23 Tagen endgültig gelöscht") — `Inferred` aus `item-image-service.md:679` „30 Tage nach `deletedAt`".

### 3.6 Einstellungen (Admin only)

- **Zielgruppe:** Admin, Owner. Andere Rollen sehen den Tab nicht (`role-gate`-Pattern analog `apps/cockpit/app/components/role-gate.tsx:6-18`).
- **Default-Sichtbar:** Nein — sichtbar nur, wenn Rolle in `[admin, owner]`.
- **Kurzbeschreibung:** Bilderservice-Konfiguration pro Org. Read-only für alle Werte, die ADR-XXXX nicht zur Laufzeit erlaubt.

**Enthaltene Aktionen**

- **Bucket-Status anzeigen** (read-only: „Bucket `item-images` aktiv, Pfad-Konvention `org/{id}/{type}/{id}/{cuid}.{ext}`").
- **Max. Bilder pro Owner** (Default 200, `item-image-service.md:538`; UI-editable für Admin, mit Bestätigungsdialog).
- **Max. Dateigröße** (Default 10 MB, `item-image-service.md:537`; UI-editable).
- **Auto-Strip EXIF an/aus** (Toggle, Default an, `item-image-service.md:564-567`).
- **Standard-Tags** (Editor, JSON-artige Liste, `Inferred`, Convenience-Funktion).
- **Default-Caption-Vorlage** (Template-String, z. B. „{{ownerLabel}} — {{date}}").
- **Zuletzt geändert von** (Footer, read-only, mit Verweis in den Audit-Trail der Settings-Row).
- **Bucket-/RLS-Konfigurations-Änderung**: **nicht** in der UI. L4-Restriktion, `item-image-service.md:522` „Hard-Restriction, nie via UI". UI zeigt einen expliziten Hinweis-Block: „Bucket-Konfiguration und RLS-Policies werden ausschließlich über ADR-XXXX-Operator-Aktion geändert."

---

## 4. User-Flows

Sechs Flows. Jeder Flow folgt dem Schema **Trigger → Steps → Outcome → Edge Cases**.

### 4.1 Flow A — Mitarbeiter fotografiert neues Bar-Item (Mobile, schlechtes Licht, Handschuhe)

- **Trigger:** Eine Schichtkraft hat eine neue Whisky-Flasche ausgepackt und möchte das Bar-Item schnell fotografieren.
- **Vorbedingung:** Schichtkraft ist eingeloggt, hat `staff`-Rolle, ist im Cockpit auf dem Phone, möglicherweise mit Handschuhen, schwaches Licht an der Bar.

```
Trigger:        "Neues Bar-Item fotografieren"
  │
  ▼
Step 1:         Sidebar → "Artikel" → Item-Zeile "Whisky A" antippen
                (kein Handschuh-Problem: tap targets 44×44 px, globals.css:357-358, 449)
  │
  ▼
Step 2:         Tab "Bilder" im Item-Detail antippen → Galerie öffnet
                (Default-Tab, §3.1)
  │
  ▼
Step 3:         FAB "Foto aufnehmen" unten rechts antippen
                (Mobile only, §3.1 letzter Aufzählungspunkt)
  │
  ▼
Step 4:         Native Kamera öffnet. Ein Selfie-Switch ist sichtbar (kein Selfie
                in diesem Use-Case, aber sichtbar für Storage-Bilder, in denen
                ein Standort-Markierungs-Foto legitim ist)
  │
  ▼
Step 5:         Auslöser antippen. Vorschau erscheint in der Pre-Upload-Liste.
                Caption "Neue Lieferung 2026-06-19" wird vorgeschlagen
                (Default-Caption-Vorlage, §3.6).
  │
  ▼
Step 6:         Toggle "Als Primary setzen" an (neues Bar-Item soll als
                Primary angezeigt werden).
                Kein EXIF-Hinweis (kein GPS-Tag im Bild, §7).
  │
  ▼
Step 7:         "Hochladen" antippen. Fortschrittsbalken, aria-live="polite".
  │
  ▼
Step 8:         Erfolgs-Toast: "Bild hochgeladen" + dezentes Haptik-Feedback
                (§7). Galerie-Tab ist wieder aktiv, das neue Bild erscheint
                ganz oben mit Primary-Badge.
```

- **Outcome:** Bild ist im Storage (privater Bucket `item-images`, `item-image-service.md:224-225`), Metadaten-Row in `ItemImage` mit `isPrimary = true`, `ItemImageAudit`-Row `created` und `primary_set` (`item-image-service.md:589-591`).
- **Edge Cases:**
  - **Netz weg während Upload:** Offline-Queue (`item-image-service.md:486` Idempotenz-Key), Banner „Wird hochgeladen, sobald wieder online" — siehe §7.
  - **GPS im Bild:** EXIF-Hinweis-Dialog zeigt „Standortdaten werden entfernt" mit OK-Button.
  - **HEIC-Quelle:** Ablehnung `415 UNSUPPORTED_MIME` (`item-image-service.md:545-547`); UX zeigt „HEIC wird in dieser Version nicht unterstützt, bitte JPEG/PNG/WebP".
  - **Datei zu groß (> 10 MB):** `413 PAYLOAD_TOO_LARGE`; UX zeigt Vorschau mit Hinweis „Diese Datei überschreitet das Limit".
  - **Doppeltipp / versehentlich zweimal Hochladen:** Idempotenz-Key dedupliziert (`item-image-service.md:485-487`).
  - **Bereits anderes Primary vorhanden:** UI-Hinweis vor dem Hochladen, „Aktuelles Primary wird ersetzt".

### 4.2 Flow B — Manager setzt Primary-Bild nach Lieferantenwechsel

- **Trigger:** Lieferant hat neue Flaschen-Etiketten geschickt. Manager möchte das neue Flaschen-Foto als Primary setzen.
- **Vorbedingung:** Manager-Rolle. Mehrere Bilder für dasselbe Item existieren bereits.

```
Trigger:        "Primary-Bild aktualisieren"
  │
  ▼
Step 1:         Inventory → Items → Item-Zeile → Tab "Bilder" → Galerie.
  │
  ▼
Step 2:         Mehrfachauswahl-Modus: Long-Press auf das neue Bild.
                Toolbar erscheint unten.
  │
  ▼
Step 3:         Toolbar-Button "Als Primary setzen" antippen.
  │
  ▼
Step 4:         ConfirmDialog: "Aktuelles Primary-Bild (Whisky A — altes
                Etikett) wird ersetzt durch (Whisky A — neues Etikett).
                Audit-Eintrag wird erstellt."
                [Abbrechen] [Bestätigen]
  │
  ▼
Step 5:         PATCH /v1/images/:id { isPrimary: true } (item-image-service.md:374-398).
                Server wechselt implizit das alte Primary auf false in derselben
                Transaktion (item-image-service.md:394-395).
  │
  ▼
Step 6:         Erfolgs-Toast. Beide Bilder im Audit-Tab sichtbar:
                `primary_unset` (altes Bild) + `primary_set` (neues Bild).
```

- **Outcome:** Neues Bild ist Primary, altes Bild ist reguläres Bild, beide Aktionen in `ItemImageAudit` (append-only).
- **Edge Cases:**
  - **Neues Bild ist soft-deleted:** `404 NOT_FOUND` (`item-image-service.md:373`); UX zeigt „Bild nicht (mehr) verfügbar".
  - **Netz-Fehler:** Retry mit gleichem Idempotency-Key.
  - **Staff versucht dasselbe auf Bild eines anderen Users:** `403 FORBIDDEN_PRIMARY` (`item-image-service.md:398`); UX zeigt „Diese Aktion erfordert Manager-Berechtigung".
  - **Restore-Konflikt beim späteren Restore:** Wenn das ehemalige Primary aus dem Papierkorb zurückkommt und das aktuelle Primary bereits gesetzt ist, bleibt das Restored-Bild `isPrimary = false` (`item-image-service.md:432`); UX kommuniziert das.

### 4.3 Flow C — Admin räumt Papierkorb auf (L2 Evidence)

- **Trigger:** Mehrere soft-deleted Bilder haben sich angesammelt; Admin möchte Hard-Delete durchführen.
- **Vorbedingung:** Admin-Rolle. Bilder sind seit > X Tagen soft-deleted.

```
Trigger:        "Papierkorb aufräumen"
  │
  ▼
Step 1:         Tab "Papierkorb" öffnen.
                Liste zeigt alle soft-deleted Bilder, neueste zuerst.
                Jede Row: Vorschaubild (gedimmt), Caption, gelöscht von,
                gelöscht am, "Wird in N Tagen endgültig gelöscht".
  │
  ▼
Step 2:         Mehrfachauswahl: Long-Press, dann 8 Bilder markieren.
                (Bulk-Hard-Delete 2–9: Manager erlaubt, item-image-service.md:515.
                 Hier Admin-Pfad, weil L2-Evidence erforderlich.)
  │
  ▼
Step 3:         Toolbar "Endgültig löschen" antippen.
  │
  ▼
Step 4:         ConfirmDangerDialog (rot, §3.5):
                "8 Bilder werden endgültig aus dem Storage gelöscht.
                Diese Aktion ist nicht umkehrbar. Ein L2-Evidence-Artefakt
                wird erstellt."
  │
  ▼
Step 5:         Zweiter Bestätigungsdialog (Tipp-Bestätigung):
                "Zum Bestätigen tippen Sie 'endgültig löschen' in das Feld."
  │
  ▼
Step 6:         Bulk-Operation startet. aria-live="polite" mit "Löscht 8 Bilder…".
                Nach Abschluss: Toast "8 Bilder endgültig gelöscht.
                Evidence: logs/evidence/2026-06-19-bulk-image-delete-{ownerId}.md"
                (item-image-service.md:603).
  │
  ▼
Step 7:         Audit-Log-Eintrag wird automatisch erzeugt durch @auditor-Agent
                (item-image-service.md:614, governance/evidence-contract.md:39-42).
```

- **Outcome:** 8 Bilder sind aus `ItemImage` hart entfernt (DB-Delete), Storage-Objekte sind aus dem Bucket gelöscht, `ItemImageAudit`-Rows bleiben **bestehen** (append-only, `item-image-service.md:589-592` und §4.2 `imageId` ohne Cascade).
- **Edge Cases:**
  - **≥ 10 Bilder:** Bulk-Stufe wechselt auf L2 mit pflichtendem Evidence-Artefakt (`item-image-service.md:603`); UI muss das aktiv kommunizieren und das Evidence-Artefakt vor dem eigentlichen Delete erstellen (Operator-Pfad nach `governance/evidence-contract.md:28-33`).
  - **„Alle Bilder eines Owners":** L3 + Operator-Freigabe (`item-image-service.md:604`); UI muss einen zusätzlichen Bestätigungsschritt „Operator-Freigabe erforderlich" einblenden.
  - **Bucket-Lifecycle-Konflikt:** Wenn der Background-Job nach §5.3 die Bilder bereits entfernt hat, ist der Hard-Delete-Pfad idempotent (zweites `DELETE` liefert `404`, `item-image-service.md:408`).
  - **RLS-Deny:** `403 FORBIDDEN_ORG_SCOPE`; UX zeigt eine erklärende EmptyState „Berechtigung zum endgültigen Löschen fehlt".

### 4.4 Flow D — Filter-Tag „Hochprozentig" → Bulk-Tag weiterer Bilder

- **Trigger:** Schichtleitung möchte alle Spirituosen-Bilder mit „Hochprozentig" taggen, ohne jedes einzeln anzufassen.
- **Vorbedingung:** Staff+-Rolle. Bilder mit Tag „Hochprozentig" existieren bereits.

```
Trigger:        "Bulk-Tagging"
  │
  ▼
Step 1:         Galerie-Tab. Tag-Chip "Hochprozentig" oberhalb des Grids
                antippen → Query ?tag=hochprozentig.
                (§3.1, item-image-service.md:348)
  │
  ▼
Step 2:         Gefiltertes Grid zeigt nur Bilder mit Tag "Hochprozentig".
  │
  ▼
Step 3:         Toolbar-Button "Diese Galerie taggen" (neu in dieser UX).
                Öffnet Dialog "Tag wählen".
  │
  ▼
Step 4:         Im Dialog: Tag "Hochprozentig" ist vorausgewählt (kommt aus
                Filter). Optional weitere Tags. Aktion wählen: "Auf alle
                Bilder der Galerie anwenden" vs. "Nur auf nicht-getaggte
                Bilder anwenden".
  │
  ▼
Step 5:         Bestätigen. Pro Bild: PATCH /v1/images/:id { tags: [...] }
                mit Idempotency-Key (item-image-service.md:382, 485-487).
                aria-live-Region "Taggt 12 Bilder…"
  │
  ▼
Step 6:         Erfolgs-Toast "12 Bilder aktualisiert".
                Audit-Tab zeigt 12× tags_updated Einträge.
```

- **Outcome:** 12 Bilder tragen Tag „Hochprozentig"; jeder Update ist eine eigene `tags_updated`-Audit-Row.
- **Edge Cases:**
  - **Bereits getaggtes Bild:** Server ist tolerant (`item-image-service.md:389` „wechselt implizit das bisherige Primary-Bild" — analog wird beim Tag-Update das neue Array gemergt). UX muss das Verhalten konsistent abbilden; ein No-Op-Update erzeugt **keine** Audit-Row (`Inferred`, da `item-image-service.md:589-592` „nur falls Row vorher aktiv war" für Soft-Delete spezifiziert ist, die Tag-Pfad-Logik ist im Spec nicht explizit).
  - **Netz-Fehler mitten im Bulk:** Bereits abgeschickte PATCHes sind idempotent; UI muss den Status pro Bild anzeigen (erfolgreich / pending / fehlgeschlagen) und erneutes Anstoßen erlauben.
  - **Tag-Normalisierung:** Wenn der User „Hochprozentig " mit Leerzeichen eingibt, normalisiert die UI zu „hochprozentig" (`item-image-service.md:554-559`).

### 4.5 Flow E — Storage-Location-Bilder ansehen (Übersicht, kein Bearbeiten)

- **Trigger:** Schichtkraft will sich vor der Schichtübergabe den Zustand eines Lagerorts visuell anschauen.
- **Vorbedingung:** Staff-Rolle. Storage-Detail-Seite und Bilder-Tab existieren.

```
Trigger:        "Lagerort-Bilder ansehen"
  │
  ▼
Step 1:         Sidebar → "Lagerorte" → Lagerort-Zeile (storage/page.tsx:95-110)
                antippen.
  │
  ▼
Step 2:         Tab "Bilder" im Lagerort-Detail antippen.
  │
  ▼
Step 3:         Galerie-Tab öffnet. Read-only-Modus ist visuell erkennbar
                (Hochladen-Tab ist ausgegraut, FAB ist nicht sichtbar).
                (§3.1: Mehrfachauswahl ist nicht aktivierbar.)
                (Hinweis: Staff darf im docs-Spec durchaus uploaden
                — Flow E zeigt bewusst den "nur ansehen"-Fall, der
                explizit per Mount-Configurierbar ist; siehe §12 Frage 4.)
  │
  ▼
Step 4:         Bilder antippen → Vollbild-Modal. Wischen funktioniert.
                Long-Press für Aktionen ist deaktiviert.
  │
  ▼
Step 5:         Audit-Tab ist nicht sichtbar (Manager+ only, §3.4).
                Papierkorb-Tab ist sichtbar, aber read-only (Restore
                erfordert Manager, §3.5).
  │
  ▼
Step 6:         Zurück zur Galerie. Schichtkraft kann visuell prüfen, ob
                das Lagerfoto zum Schichtende passt.
```

- **Outcome:** Schichtkraft hat visuellen Überblick, ohne Schreibrechte auszuüben.
- **Edge Cases:**
  - **Storage-Location ist soft-deleted (`isActive = false`):** `item-image-service.md:373` „auch wenn soft-deleted"; Galerie zeigt die Bilder weiterhin, gekennzeichnet mit Badge „Lagerort inaktiv".
  - **RLS-Deny auf StorageLocation:** `403 FORBIDDEN_OWNER` (`item-image-service.md:358`); UX zeigt AccessDenied.

### 4.6 Flow F — Restore aus Papierkorb + Audit-Eintrag prüfen

- **Trigger:** Ein Mitarbeiter hat versehentlich ein Bild gelöscht; Manager stellt es wieder her.
- **Vorbedingung:** Manager-Rolle. Bild ist soft-deleted.

```
Trigger:        "Bild wiederherstellen"
  │
  ▼
Step 1:         Tab "Papierkorb" öffnen. Bild suchen (Caption-Text oder
                Vorschau).
  │
  ▼
Step 2:         Row antippen → "Wiederherstellen"-Button in der Detail-
                Seitenleiste.
  │
  ▼
Step 3:         ConfirmDialog (kein Danger, da reversibel):
                "Bild wird wieder in der Galerie angezeigt.
                Wenn ein anderes Bild aktuell Primary ist, bleibt das
                wiederhergestellte Bild nicht Primary."
                (item-image-service.md:432)
                [Abbrechen] [Wiederherstellen]
  │
  ▼
Step 4:         POST /v1/images/:id/restore (item-image-service.md:418-434).
  │
  ▼
Step 5:         Erfolgs-Toast. Toast verlinkt direkt in den Audit-Tab
                "Audit-Eintrag ansehen".
  │
  ▼
Step 6:         Audit-Tab öffnet sich. Gefiltert auf das wiederhergestellte
                Bild. Eintrag: "restored by [Manager] am [Datum]".
  │
  ▼
Step 7:         Optional: aus Audit-Tab zurück in Galerie-Tab springen
                (§3.4 letzter Punkt: "Direkt-Verweis zum Bild").
```

- **Outcome:** Bild ist in `ItemImage` mit `deletedAt = NULL`, in der Galerie sichtbar, `ItemImageAudit` enthält `restored`-Row.
- **Edge Cases:**
  - **Bild war nicht soft-deleted:** `404 NOT_FOUND` (`item-image-service.md:434`); UX zeigt „Bild ist bereits aktiv".
  - **Primary-Konflikt:** UI-Hinweis gem. `item-image-service.md:432` „Wiederhergestelltes Bild ist nicht Primary, weil [Name] bereits Primary ist".
  - **Berechtigungs-Mismatch (Staff statt Manager):** `403 FORBIDDEN_ORG_SCOPE` (`item-image-service.md:434`); UX zeigt „Wiederherstellung erfordert Manager-Berechtigung".

---

## 5. Komponenten-Skizzen (ASCII)

Alle Skizzen sind **wireframe-level**. Keine Farben, keine Tailwind-Klassen, keine Bibliotheks-Imports. RBAC-Lock-Symbol: `[L1]`, `[L2]`, `[L3]`, `[admin]`, `[manager]`. Sichtbar-aber-deaktiviert: `[ ---- ]`.

### 5.1 Galerie-Tab (Grid 2×2 Mobile, 4×3 Tablet)

Mobile (≤ 479 px, `WEB_DESIGN_TOKENS.md:69-71`):

```
┌─────────────────────────────────────┐
│ ‹ Zurück   Bilder: Whisky A  [⋯]   │ ← Header (44 px)
├─────────────────────────────────────┤
│ [Suche...] [Tag▾] [Sort▾] [Filter] │ ← Toolbar (44 px)
├─────────────────────────────────────┤
│ Tags:  ●hochprozentig  ●neu  ●alt  │ ← Tag-Chips
├─────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐         │
│ │  [IMG]   │  │  [IMG]★  │ ← Primary-Badge (★)
│ │          │  │          │         │
│ │ 19.06.26 │  │ 18.06.26 │         │
│ │ ★ Primary│  │ neu      │         │
│ └──────────┘  └──────────┘         │
│ ┌──────────┐  ┌──────────┐         │
│ │  [IMG]   │  │  [IMG]   │         │
│ │          │  │          │         │
│ │ 17.06.26 │  │ 16.06.26 │         │
│ │ ─        │  │ ─        │         │
│ └──────────┘  └──────────┘         │
│                                     │
│            [Mehr laden]             │
├─────────────────────────────────────┤
│                        ┌────────┐  │
│                        │ 📷 +   │  │ ← FAB Hochladen, nur Staff+
│                        └────────┘  │
└─────────────────────────────────────┘
```

Tablet (480–1023 px):

```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Zurück    Bilder: Lagerort Kühlhaus 1    [⋯]              │
├──────────────────────────────────────────────────────────────┤
│ [Suche...] [Tag▾] [Uploader▾] [Von] [Bis] [Sort▾] [Filter]  │
├──────────────────────────────────────────────────────────────┤
│ Tags:  ●hochprozentig  ●kühlung  ●lichtgeschützt            │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ [IMG]   │ │ [IMG]★  │ │ [IMG]   │ │ [IMG]   │              │
│ │ 19.06   │ │ 18.06   │ │ 17.06   │ │ 16.06   │              │
│ │ ─       │ │ Prim.   │ │ ─       │ │ ─       │              │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ [IMG]   │ │ [IMG]   │ │ [IMG]   │ │ [IMG]   │              │
│ │ 15.06   │ │ 14.06   │ │ 13.06   │ │ 12.06   │              │
│ │ ─       │ │ ─       │ │ ─       │ │ ─       │              │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                              │
│                          [Mehr laden]                        │
└──────────────────────────────────────────────────────────────┘
```

**Interaction notes**

- Tap auf Bild → Vollbild-Modal (§5.3).
- Long-Press auf Bild → Mehrfachauswahl-Modus, Toolbar am unteren Rand: `[Primary setzen [L1]]` · `[Tags bearbeiten [L1]]` · `[Soft-Delete [L2]]` · `[Mehr...]`.
- FAB ist auf Mobile **immer** sichtbar (außer der User hat nicht Staff+); auf Tablet **nur**, wenn im aktuellen Tab eine sinnvolle Aktion existiert (Galerie: ja).
- Primary-Badge: gelber Stern auf dem Thumbnail, sichtbar **ohne** Tab-Wechsel, auch im Suchergebnis.
- Sortierung wird **client-seitig** auf der aktuell geladenen Seite ausgeführt; bei „Mehr laden" wird die client-seitige Sort-Reihenfolge neu berechnet.

### 5.2 Hochladen-Tab

```
┌─────────────────────────────────────────────┐
│ ‹ Galerie   Hochladen   [Abbrechen]          │
├─────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐ │
│  │                                        │ │
│  │   📷  Foto aufnehmen   (Mobile)        │ │
│  │   📁  Datei wählen     (Desktop)       │ │
│  │   ⬇  Drag & Drop      (Desktop)       │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  Ausgewählte Dateien (2)                    │
│  ┌──────────────────────────────────────┐   │
│  │ [Thumb]  IMG_1234.jpg                │   │
│  │          1.2 MB · jpeg               │   │
│  │          Caption: [_____________]    │   │
│  │          Tags:    [#hochprozentig ×] │   │
│  │          ☑ Als Primary setzen        │   │
│  │          An: Whisky A (Item) [fest]  │   │
│  │          [Entfernen]                 │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ [Thumb]  IMG_1235.jpg                │   │
│  │          ⚠ Standortdaten werden      │   │ ← EXIF-Hinweis, §7
│  │          entfernt                    │   │
│  │          Caption: [_____________]    │   │
│  │          Tags:    [____]             │   │
│  │          ☐ Als Primary setzen        │   │
│  │          An: Whisky A (Item) [fest]  │   │
│  │          [Entfernen]                 │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Offline: 0 in Warteschlange                │ ← Status-Zeile
├─────────────────────────────────────────────┤
│  [Hochladen (2)]                            │ ← Primärbutton
└─────────────────────────────────────────────┘
```

**Interaction notes**

- Foto aufnehmen ist Mobile-only (`@media (max-width: 1023px)` Logik), wird auf Desktop ausgegraut.
- Drag-and-Drop ist Desktop-only, wird auf Mobile ausgegraut.
- EXIF-Hinweis erscheint **nur** bei erkannten GPS-Daten; siehe §7.
- Offline-Banner ist read-only und verweist auf die `OfflineActionQueue` (`docs/automation/semi-automated-operations-layer.md:155-318`).
- Hochladen-Button triggert sequenziell: `POST /upload-url` → Direkt-Upload zu Supabase → `POST /images` für die Row (`item-image-service.md:268-331`).

### 5.3 Vollbild-Modal (Pinch-to-zoom, Swipe, Bottom-Action-Bar)

```
┌─────────────────────────────────────────────┐
│ ‹ Schließen     Bild 3 / 8      [⋯]          │ ← Header, transparent
│                                              │
│                                              │
│                                              │
│              [VOLLFORMAT-IMAGE]              │ ← Pinch-to-zoom aktiv
│                                              │
│                                              │
│                                              │
│  Whisky A — neues Etikett                   │ ← Caption
│  ●hochprozentig  ●neu                       │ ← Tags
│  Hochgeladen von M. Krause · 18.06.26 14:22 │ ← Footer Audit-Zeile
├─────────────────────────────────────────────┤
│ [← Prev] [→ Next]  │ [Tags] [Rotieren] [⋯] │ ← Bottom Action Bar
└─────────────────────────────────────────────┘
```

`[⋯]` öffnet Overflow-Menü mit:

- `[Primary setzen [L1]]` (grau, wenn aktuell Primary)
- `[Soft-Delete [L2]]`
- `[Audit ansehen]` (öffnet Audit-Tab mit Filter `imageId == current`)
- `[Vollständige Metadaten]`

**Interaction notes**

- Swipe links/rechts = nächstes/vorheriges Bild derselben Galerie.
- Pinch-to-zoom (Mobile) / Scroll-to-zoom (Desktop) — Maximum 4×, Minimum 1×.
- Tap auf den Bildbereich außerhalb der Action-Bar = Action-Bar ausblenden; Tap erneut = einblenden.
- Bottom Action Bar ist auf Mobile **sticky am unteren Rand**, Buttons jeweils ≥ 44×44 px (`globals.css:357-358, 449, 474`).
- Auf Phone im Landscape-Modus bleibt die Action-Bar unten; das Bild nutzt die volle Höhe.
- Haptik-Feedback bei Erfolg (Upload/Restore), kein Haptik bei reinem Öffnen.

### 5.4 Audit-Tab (List mit expandierbaren Rows)

```
┌─────────────────────────────────────────────────┐
│ ‹ Galerie   Audit / Verlauf                     │
├─────────────────────────────────────────────────┤
│ [Aktion▾] [Nutzer▾] [Von] [Bis] [Export CSV]   │
├─────────────────────────────────────────────────┤
│ ▼ 2026-06-19 14:22:01  M. Krause               │
│   Aktion: tags_updated                          │
│   Bild: Whisky A — neues Etikett (id: i_abc)    │
│   ┌─────────────────────────────────────────┐  │
│   │ {                                       │  │
│   │   "before": ["hochprozentig"],          │  │ ← expandiert
│   │   "after":  ["hochprozentig", "neu"]    │  │
│   │ }                                       │  │
│   └─────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ ▶ 2026-06-19 14:18:43  M. Krause               │
│   Aktion: created                               │
│   Bild: Whisky A — neues Etikett (id: i_abc)    │
├─────────────────────────────────────────────────┤
│ ▶ 2026-06-18 09:11:12  J. Bauer                │
│   Aktion: soft_deleted                          │
│   Bild: Whisky A — altes Etikett (id: i_xyz)    │
├─────────────────────────────────────────────────┤
│         [Mehr laden (12 weitere)]               │
└─────────────────────────────────────────────────┘
```

**Interaction notes**

- Filter sind **kumulativ**: Aktion UND Nutzer UND Datumsbereich.
- Export-CSV-Button erfordert Manager+ (§3.4).
- Tap auf `imageId` in einer Row → springt in Galerie-Tab und öffnet das Bild im Vollbild-Modal.
- Diff-Payload wird **monospace** gerendert, max 6 Zeilen sichtbar, Scrollen innerhalb der Card möglich.
- Sortierung neueste zuerst (`item-image-service.md:479`).
- Default Page-Size 50, max 200 (`item-image-service.md:477`).

### 5.5 Papierkorb-Tab

```
┌─────────────────────────────────────────────────┐
│ ‹ Galerie   Papierkorb                          │
├─────────────────────────────────────────────────┤
│  Hinweis: Soft-Delete ist reversibel.           │
│           Hard-Delete erfordert Admin.          │
├─────────────────────────────────────────────────┤
│ [Mehrfachauswahl]  [Wiederherstellen]           │
│                   [Endgültig löschen  [admin] ] │ ← L2-Lock
├─────────────────────────────────────────────────┤
│ ┌──────────┐                                    │
│ │ [IMG]*   │  Whisky A — altes Etikett          │
│ │  (dim)   │  Gelöscht von J. Bauer · 18.06.26  │
│ │          │  Wird in 23 Tagen endgültig        │
│ └──────────┘  gelöscht.                         │
│              Soft-Delete · [Wiederherstellen]   │
├─────────────────────────────────────────────────┤
│ ┌──────────┐                                    │
│ │ [IMG]*   │  Whisky A — Vergleichsfoto         │
│ │  (dim)   │  Gelöscht von J. Bauer · 17.06.26  │
│ │          │  Wird in 24 Tagen endgültig        │
│ └──────────┘  gelöscht.                         │
│              Soft-Delete · [Wiederherstellen]   │
├─────────────────────────────────────────────────┤
│  Leerstand: 0 → "Kein Papierkorb-Inhalt"        │ ← EmptyState
│  [Zur Galerie]                                  │
└─────────────────────────────────────────────────┘
```

**Interaction notes**

- Soft-Delete-Rows sind visuell gedimmt (Opacity ~0.5), aber noch vollständig sichtbar.
- Hard-Delete-Button (`[admin]`) öffnet `ConfirmDangerDialog` (rot, `apps/cockpit/app/components/...` Pattern) mit Tipp-Bestätigung.
- Tage-bis-Hard-Delete-Counter ist read-only; `Inferred` aus `item-image-service.md:679`.
- Storage-Objekt-Status (read-only) wird als kleines Badge „Im Storage: ja/nein" angezeigt; siehe §12 Frage 3.

### 5.6 Einstellungen-Tab (Admin only)

```
┌─────────────────────────────────────────────────┐
│ ‹ Galerie   Einstellungen (Bilderservice)       │
├─────────────────────────────────────────────────┤
│ Sichtbar nur für admin / owner.                 │
├─────────────────────────────────────────────────┤
│  Bucket-Status                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Bucket: item-images                     │    │
│  │ Status: aktiv                           │    │
│  │ Pfad-Konvention:                        │    │
│  │   org/{organizationId}/{ownerType}/     │    │
│  │   {ownerId}/{imageId}.{ext}             │    │
│  │   (item-image-service.md:226-233)       │    │
│  │ Storage-Region: eu-central-1 (Frankfurt) │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  Limits                                          │
│  Max. Bilder pro Owner:    [ 200 ]   [Speichern]│
│  Max. Dateigröße (MB):     [  10 ]   [Speichern]│
│  Auto-Strip EXIF:          [● an ◯ aus ]        │
│                                                  │
│  Standard-Tags: [hochprozentig ×] [bar ×] [+]  │
│  Default-Caption-Vorlage:                       │
│  [ {{ownerLabel}} — {{date}}             ]      │
│                                                  │
│  Zuletzt geändert von:                           │
│  A. Holzer · 2026-06-12 09:33                   │
│  → Audit-Eintrag ansehen                        │
├─────────────────────────────────────────────────┤
│  ⚠ Bucket-Konfiguration und RLS-Policies        │
│  werden ausschließlich über ADR-XXXX-           │
│  Operator-Aktion geändert. Kein UI-Pfad.         │
└─────────────────────────────────────────────────┘
```

**Interaction notes**

- Save-Buttons sind deaktiviert, wenn der Wert sich nicht geändert hat.
- Token-Validierung: `Max. Bilder pro Owner` ist Integer ≥ 1; `Max. Dateigröße` ist Float 0.1–50; `Standard-Tags` ist kommaseparierte Liste mit Tag-Normalisierung (`item-image-service.md:554-559`).
- Alle Änderungen erzeugen Audit-Rows (`recommended-Standard`).
- L4-Hinweis-Block ist **nicht** interaktiv, dient nur der Aufklärung.

---

## 6. Zustände (States)

Pro Screen die folgenden Zustände: `Empty`, `Loading`, `Error`, `Permission denied`, `Soft-deleted item` (nur wo relevant), `Bulk-action in progress`. Der `Bulk-action`-Zustand gilt für Galerie, Hochladen und Papierkorb.

### 6.1 Galerie-Tab

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (kein Bild) | EmptyState „Noch keine Bilder für [Item/Location]" mit Icon und Hinweistext | „Erstes Bild hochladen" → wechselt in Tab Hochladen |
| Loading | Skeleton-Grid (8 Platzhalter-Cards, schimmernd) | — |
| Error (Netzwerk) | ErrorState „Galerie konnte nicht geladen werden" + technische Details ausklappbar | „Erneut versuchen" |
| Error (Signed-URL expired) | Pro Bild ein Overlay „Vorschau abgelaufen" + „Neu laden"-Button am Thumbnail | „Neu laden" pro Bild |
| Error (RLS denied) | AccessDenied-Komponente (`apps/cockpit/app/components/access-denied.tsx:1-13`) | „Zurück" |
| Permission denied | AccessDenied „Diese Ansicht ist für deine Rolle nicht freigegeben" | „Zurück" |
| Soft-deleted item (Owner) | Galerie zeigt Bilder weiterhin, aber Header hat Badge „[Item/Location] ist inaktiv" (analog `apps/cockpit/app/(app)/storage/page.tsx:99-102` für StorageLocation) | — |
| Bulk-action in progress | Toolbar am unteren Rand mit Fortschrittsbalken, Auswahl-Counter („3 von 8 verarbeitet"), aria-live="polite" | „Abbrechen" (nur solange noch nicht alle PATCHes abgesetzt sind) |

### 6.2 Hochladen-Tab

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (kein Bild gewählt) | Großer Drop-Bereich (Desktop) bzw. Kamera-Button (Mobile) | „Foto aufnehmen" / „Datei wählen" |
| Loading (Upload läuft) | Pro Datei eine Progress-Bar 0–100 %; globale aria-live-Region „Lädt 2 von 3 Dateien" | „Abbrechen" pro Datei |
| Error (einzelne Datei fehlgeschlagen) | Pro Datei ein roter Statustext + „Erneut versuchen"-Button | „Erneut versuchen" / „Entfernen" |
| Error (415 UNSUPPORTED_MIME) | Klartext-Hinweis „HEIC wird in dieser Version nicht unterstützt, bitte JPEG/PNG/WebP" | „Andere Datei wählen" |
| Error (413 PAYLOAD_TOO_LARGE) | Klartext-Hinweis „Diese Datei überschreitet das Limit (10 MB)" | „Andere Datei wählen" |
| Permission denied (Staff versucht Tag-Edit am Bild anderer User — der Pfad ist im Hochladen-Tab nicht direkt erreichbar, aber UI blockt ihn auch nicht) | Button ist sichtbar, aber bei Tap `403 FORBIDDEN_PRIMARY` → Toast „Diese Aktion erfordert Manager-Berechtigung" | — |
| Soft-deleted item (Owner ist inaktiv) | Banner „[Item/Location] ist inaktiv — Bilder können weiterhin hochgeladen werden, sind aber nur im Audit sichtbar" | — |
| Bulk-action in progress | Button „Hochladen" zeigt Spinner; Sekundärbuttons disabled | — |

### 6.3 Vollbild-Modal

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (gilt nicht) | n/a | n/a |
| Loading (Signed-URL wird geholt) | Spinner zentriert auf Bildbereich | „Abbrechen" |
| Error (Signed-URL expired) | Overlay „Vorschau abgelaufen" + „Neu laden" | „Neu laden" |
| Error (Bild soft-deleted während Modal offen) | Modal schließt sich, Toast „Bild nicht mehr verfügbar" | — |
| Permission denied | Modal öffnet gar nicht erst; User landet in Galerie mit Toast | — |

### 6.4 Audit-Tab

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (kein Eintrag) | EmptyState „Keine Audit-Einträge für diesen Filter" | „Filter zurücksetzen" |
| Loading | Skeleton-List (10 Zeilen) | — |
| Error (Netzwerk) | ErrorState „Audit konnte nicht geladen werden" | „Erneut versuchen" |
| Permission denied (Staff ruft Audit-Tab auf) | AccessDenied — Tab ist für Manager+ reserviert | — |
| Bulk-action in progress | gilt nicht | — |

### 6.5 Papierkorb-Tab

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (kein Papierkorb-Inhalt) | EmptyState „Kein Papierkorb-Inhalt" mit ruhigem Icon | „Zur Galerie" |
| Loading | Skeleton-List (6 Zeilen) | — |
| Error (Netzwerk) | ErrorState | „Erneut versuchen" |
| Permission denied (Staff) | Liste ist sichtbar, aber alle Aktions-Buttons disabled; Hinweis „Wiederherstellung erfordert Manager-Berechtigung" | — |
| Soft-deleted item | gilt nicht (Papierkorb **enthält** soft-deleted Bilder) | — |
| Bulk-action in progress | Toolbar mit Progress + Cancel | „Abbrechen" |

### 6.6 Einstellungen-Tab

| Zustand | Was der User sieht | CTA |
|---|---|---|
| Empty (gilt nicht) | n/a | n/a |
| Loading | Skeleton-Form | — |
| Error (Netzwerk) | ErrorState | „Erneut versuchen" |
| Permission denied (jeder Nicht-Admin) | Tab ist nicht sichtbar (§3.6) | — |

---

## 7. Mobile-Optimierungen

- **Tap-Targets:** Alle interaktiven Controls ≥ 44×44 px. Konvention bestätigt im Repo: `apps/cockpit/app/globals.css:357-358, 449, 474, 1852, 2048, 2511, 2787, 2807` (alle setzen 44 px).
- **Kamera-Shortcut (FAB):** Galerie-Tab zeigt FAB nur auf Mobile (`@media (max-width: 1023px)`-Logik, analog `WEB_DESIGN_TOKENS.md:74-76`). FAB wechselt in den Hochladen-Tab **und** öffnet direkt die native Kamera.
- **Offline-Upload-Queue:** Schließt an `OfflineActionQueue` aus `docs/automation/semi-automated-operations-layer.md:155-318, 1382-1393, 1750-1762` an. Wenn der Cockpit-Client offline ist:
  - Upload wird in die lokale `OfflineActionQueue` eingereiht.
  - Hochladen-Tab zeigt Banner „Wird hochgeladen, sobald wieder online".
  - Galerie zeigt für noch nicht synchronisierte Uploads einen lokalen Eintrag mit Status-Badge `pending` (analog `semi-automated-operations-layer.md:1147, 1198, 1294-1310`).
  - Auf Reconnect: Service Worker ruft `POST /v1/images` mit dem ursprünglichen `Idempotency-Key` (`item-image-service.md:485-487`); Server liefert bei Replay dieselbe Response.
  - **Konflikt-Pfad:** Wenn das Ziel-Item in der Zwischenzeit soft-deleted wurde (`isActive = false`), schlägt `POST /v1/images` mit `403 FORBIDDEN_OWNER` fehl. UX zeigt Toast „[Item] wurde gelöscht/deaktiviert. Upload abgebrochen." (analog Conflict-UI `semi-automated-operations-layer.md:309`).
- **Dark-Mode:** Cockpit-Standard. Küche/Bar-Lichtsituation verlangt dunklen Hintergrund, helle Schrift. Tokens siehe `docs/WEB_DESIGN_TOKENS.md:19-21` (`--color-bg-canvas`, `--color-text-primary`).
- **Reduzierte Animationen:** Respektiere `prefers-reduced-motion`; Gallery-Fade und Pinch-Animationen werden zu Cross-Fades bzw. Direkt-Snap.
- **Haptik-Feedback:** `navigator.vibrate(10)` bei Erfolg (Upload, Restore, Primary-Set), `navigator.vibrate([10, 50, 10])` bei Fehler. Haptik **nicht** in der Quiet-Story für Permission-Denied.
- **EXIF-Hinweis nur bei GPS:** `Inferred` aus `item-image-service.md:564-567` („GPS-Daten werden immer serverseitig entfernt"). UX-Pfad:
  - Client prüft EXIF vor Upload. Wenn `GPSLatitude`/`GPSLongitude` fehlt → kein Dialog.
  - Wenn vorhanden → Mini-Dialog „Standortdaten in diesem Foto werden automatisch entfernt" mit OK-Button (kein Toggle, nicht abwählbar — Schutzpflicht).
- **Großflächige Buttons in Handschuh-Situation:** Der FAB, der Hochladen-Primärbutton und die Action-Bar-Buttons sind 56 px hoch (statt 44 px), wenn der Viewport ≤ 479 px ist (`@media (max-width: 479px)`).
- **Querformat-Hochladen:** Im Querformat auf Phone wird der Drop-Bereich zum Hochformat-Hinweis „Für bessere Übersicht Phone drehen" mit non-blocking Tooltip.
- **Mehrfachauswahl ohne Long-Press (Alternative):** Wenn `prefers-reduced-motion` aktiv ist oder die Long-Press-Geste vom Browser nicht zuverlässig erkannt wird: Toggle-Button „Auswählen" in der Galerie-Toolbar wechselt in Mehrfachauswahl-Modus per Tap.

---

## 8. RBAC-Sichtbarkeit

**Rollenspalten:** Die kanonische 5-stufige Skala aus `apps/cockpit/lib/auth/rbac.ts:1`. **Mapping-Spalte:** 3-stufige Skala aus `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` ist `Inferred` (siehe §0 oben). Die Mapping-Spalte ist als Planungs-Hilfe gedacht; jede Zeile mit `Mapping: Inferred` muss vor dem Implementierungs-Slice durch den User bestätigt werden.

**Legende:**
- `S` = sichtbar
- `A` = ausführbar (mit eigener Berechtigungsstufe)
- `—` = weder sichtbar noch ausführbar
- `S*` = sichtbar, aber Aktion nicht ausführbar (read-only)
- `[L1]`, `[L2]`, `[L3]`, `[L4]` = Mindest-Risikostufe (siehe `item-image-service.md:3`)

### 8.1 Tab-Sichtbarkeit

| Tab | owner | admin | manager | staff | viewer | admin/shift_lead/staff (Inferred Mapping) |
|---|---|---|---|---|---|---|
| Galerie | S, A | S, A | S, A | S, A | S | admin=S/A, shift_lead=S/A, staff=S/A |
| Hochladen | S, A | S, A | S, A | S, A | — | admin=S/A, shift_lead=S/A, staff=S/A |
| Tags | S, A | S, A | S, A | S, A (eigene) | S | admin=S/A, shift_lead=S/A, staff=S (eigene) |
| Audit | S, A | S, A | S, A | — | — | admin=S/A, shift_lead=S/A, staff=— |
| Papierkorb | S, A | S, A | S, A (ohne Hard-Delete) | S* | S* | admin=S/A, shift_lead=S (ohne Hard-Delete), staff=S* |
| Einstellungen | S, A | S, A | — | — | — | admin=S/A, shift_lead=—, staff=— |

### 8.2 Aktions-Sichtbarkeit

| Aktion | owner | admin | manager | staff | viewer | Spec-Referenz |
|---|---|---|---|---|---|---|
| Galerie ansehen | A | A | A | A | A | `item-image-service.md:504` |
| Bild herunterladen (Signed-URL) | A | A | A | A | A | `item-image-service.md:506` |
| Bild hochladen | A | A | A | A | — | `item-image-service.md:507` |
| Caption bearbeiten (eigen) | A | A | A | A | — | `item-image-service.md:508` |
| Caption bearbeiten (fremd) | A | A | A | — | — | `item-image-service.md:509` |
| Tags bearbeiten (eigen) | A | A | A | A | — | `item-image-service.md:508` |
| Tags bearbeiten (fremd) | A | A | A | — | — | `item-image-service.md:509` |
| Rotation setzen (eigen) | A | A | A | A | — | `item-image-service.md:510` |
| Primary setzen (eigen) | A | A | A | A | — | `item-image-service.md:511` |
| Primary setzen (fremd) | A | A | A | — | — | `item-image-service.md:512` |
| Soft-Delete Einzel (eigen) | A | A | A | A [L2] | — | `item-image-service.md:513` |
| Soft-Delete Einzel (fremd) | A | A | A | — | — | `item-image-service.md:514` |
| Bulk Soft-Delete 2–9 | A | A | A [L2] | — | — | `item-image-service.md:515` |
| Bulk Soft-Delete ≥ 10 | A | A [L2+Evidence] | — | — | — | `item-image-service.md:516` |
| Bulk Soft-Delete „alle eines Owners" | A [L3+Operator] | A [L3+Operator] | — | — | — | `item-image-service.md:517` |
| Restore (eigen) | A | A | A | A | — | `item-image-service.md:518` |
| Restore (fremd) | A | A | A | — | — | `item-image-service.md:519` |
| Audit-Trail ansehen | A | A | A | — | — | `item-image-service.md:520` |
| Liste `includeDeleted=true` | A | A | A | — | — | `item-image-service.md:521` |
| Bucket-/RLS-Konfig | A [L4] | — | — | — | — | `item-image-service.md:522` |
| Soft-Delete alle Bilder Org | A [L3/L4+Operator] | — | — | — | — | `item-image-service.md:523` |

### 8.3 3-stufiges Mapping (Inferred)

`Inferred` — diese Spalte ist **nicht** aus dem Code, sondern aus dem Planungs-Doc `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` abgeleitet. Vor Implementierung muss die Reconciliation im ADR-XXXX erfolgen (`item-image-service.md:496`).

| 5-stufig (Code) | 3-stufig (Plan) | Inferred-Mapping-Logik |
|---|---|---|
| `owner` | nicht abgedeckt | ADR-XXXX muss klären, ob `owner` zu `admin` kollabt oder ob eine 4. Stufe dazukommt |
| `admin` | `admin` | 1:1 |
| `manager` | `shift_lead` | 1:1 mit semantischer Verschiebung „Manager = Schichtleitung" |
| `staff` | `staff` | 1:1 |
| `viewer` | nicht abgedeckt | ADR-XXXX muss klären, ob `viewer` hinzukommt oder `staff` Lese-Rechte behält |

**BLOCKED-Hinweis:** Wenn die Rollen-Skala im ADR-XXXX wechselt, müssen §8.1, §8.2, §3 Tab-Sichtbarkeit und §5 Komponenten-Skizzen RBAC-Locks konsistent nachgezogen werden. Diese UX-Datei kann in der jetzigen Form nicht implementiert werden, ohne dass die Skala fixiert ist.

---

## 9. Accessibility (a11y)

- **Farb-Kontrast:** WCAG 2.1 AA. Alle Text-Vordergründe auf Tokens aus `docs/WEB_DESIGN_TOKENS.md:11-21` erreichen mindestens 4.5:1 für Body-Text, 3:1 für Large Text. Status-Indikatoren kombinieren Farbe + Icon + Text (`WEB_DESIGN_TOKENS.md:48-55`).
- **Tastatur-Navigation (Desktop):**
  - Tab-Reihenfolge: Sidebar → Toolbar → Tag-Chips → Galerie-Grid (zeilenweise, dann spaltenweise) → FAB → Pagination.
  - Galerie-Grid: `role="grid"`, jede Card ist `role="gridcell"` mit `aria-label` „Bild [Caption], hochgeladen von [Name] am [Datum]".
  - Long-Press-Mehrfachauswahl hat ein **Tastatur-Äquivalent**: Leertaste auf einer fokussierten Card toggelt die Auswahl.
  - Vollbild-Modal: `Esc` schließt; `←`/`→` navigieren; `Enter` öffnet Overflow-Menü.
- **Screen-Reader-Labels pro Aktion:**
  - FAB Kamera: `aria-label="Foto aufnehmen und hochladen"`.
  - Bild-Card: `aria-label="Bild: [Caption]. Primärbild. Tags: [Tag-Liste]. Hochgeladen am [Datum] von [Name]."`.
  - Primary setzen Button: `aria-label="Als Primärbild markieren. Aktuelles Primärbild: [Caption]."`.
  - Soft-Delete Button: `aria-label="Bild in den Papierkorb verschieben"`.
  - Hard-Delete Button: `aria-label="Bild endgültig löschen. Erfordert Admin-Berechtigung. L2 Evidence-Artefakt wird erstellt."`.
  - Audit-Row: `aria-label="Audit-Eintrag [Aktion] durch [Name] am [Datum]."`.
- **Fokus-Reihenfolge:** Modal-Öffnung verschiebt Fokus in den Modal-Header; Modal-Schließung gibt Fokus an die auslösende Card zurück.
- **ARIA-Live-Region für Upload-Fortschritt:**
  - `aria-live="polite"` Region am unteren Rand des Hochladen-Tabs.
  - Ansagen: „Datei 1 von 3 wird hochgeladen", „Upload erfolgreich: [Dateiname]", „Upload fehlgeschlagen: [Dateiname]. Grund: [Fehlertext]."
- **Reduced Motion:** Respektiere `prefers-reduced-motion: reduce`; cross-fade statt slide; sofortige Transitions.
- **Touch-Targets:** ≥ 44×44 px (siehe §7).
- **Form-Validierung:** Inline-Fehlermeldungen mit `aria-describedby`; Fehlerton optional.
- **Status-Kommunikation:** Badges kombinieren Farbe + Icon + Text (`WEB_DESIGN_TOKENS.md:48-55`). Keine reine Farbabhängigkeit.
- **Reduced-Data-Mode:** Galerie-Thumbnails haben `loading="lazy"`; Vollbild-Modal prefetched das nächste Bild nicht, um Datenvolumen zu schonen.

---

## 10. Konsistenz mit Design-Tokens

Alle visuellen Werte stammen aus `docs/WEB_DESIGN_TOKENS.md` (Stand Phase 1 Foundation). Wo die Spec einen Wert verlangt, der nicht im Token-Set enthalten ist, ist das als `Recommended` markiert und muss im ADR-XXXX / Token-Patch 02 ergänzt werden.

### 10.1 Verwendete Tokens (Observed)

| Kategorie | Token | Verwendung in dieser UX |
|---|---|---|
| Surface (Canvas) | `--color-bg-canvas` | Galerie-Hintergrund, Hochladen-Hintergrund |
| Surface (Panel) | `--color-bg-surface` | Cards, Thumbnail-Hintergrund |
| Surface (Muted) | `--color-bg-surface-muted` | Soft-deleted-Cards (gedimmt) |
| Surface (Input) | `--color-bg-input` | Suchfeld, Caption-Eingabe, Tag-Input |
| Text Primary | `--color-text-primary` | Bildunterschriften, Body-Text |
| Border Default | `--color-border-default` | Card-Borders, Trennlinien |
| Status OK | `--color-ok`, `--color-ok-strong` | Erfolgs-Toast, Primary-Badge |
| Status Warning | `--color-warning`, `--color-warning-strong` | EXIF-Hinweis, Offline-Banner |
| Status Danger | `--color-danger`, `--color-danger-strong` | Hard-Delete-Button, Fehler-Toast |
| Spacing | `--token-space-2` (8 px), `--token-space-3` (12 px), `--token-space-4` (16 px), `--token-space-6` (24 px) | Card-Padding, Section-Gap |
| Radius | `--token-radius-sm` (4 px) für Chips, `--token-radius-md` (8 px) für Cards, `--token-radius-full` (Pills) | Cards, Badges, FAB |
| Shadow | `--token-shadow-panel` | Card-Hover, Modal |
| Badge-Neutral | `--token-badge-neutral-*` | Status-Badges (Owner inaktiv) |
| Badge-OK | `--token-badge-ok-*` | „Bild aktiv" |
| Badge-Warning | `--token-badge-warning-*` | „Wird in N Tagen endgültig gelöscht" |
| Badge-Danger | `--token-badge-danger-*` | „L2 Evidence erforderlich" |
| Status-Card Tones | `.status-card--tone-{neutral,ok,info,warning,danger}` | Audit-Row-Karten, Bulk-Status-Karten |

### 10.2 Fehlende Tokens (Recommended)

`Recommended` — diese Tokens existieren in `docs/WEB_DESIGN_TOKENS.md:1-76` nicht und müssen in einem Token-Patch ergänzt werden, **bevor** die Komponenten implementiert werden:

| Token-Name | Zweck | Wertvorschlag |
|---|---|---|
| `--color-danger-soft` | Hintergrund für `ConfirmDangerDialog`-Panels und Hard-Delete-Rows; Papierkorb-Reihe bei Hard-Delete-Stufe | `--color-danger` mit Alpha 0.1 |
| `--color-warning-soft` | EXIF-Hinweis-Hintergrund, Offline-Banner | `--color-warning` mit Alpha 0.1 |
| `--color-success-soft` | Erfolgs-Toast-Hintergrund | `--color-ok` mit Alpha 0.1 |
| `--color-info-soft` | Audit-Header-Hintergrund | `--color-info` mit Alpha 0.1 |
| `--token-shadow-modal` | Höhere Elevation als `--token-shadow-panel`, explizit für Modals | 0 8 24 rgba(0,0,0,0.18) |
| `--token-radius-thumb` | Spezifischer Radius für quadratische Bild-Thumbnails | 6 px (zwischen sm und md) |
| `--token-space-1` (4 px) | Wird in Mobile-Layouts benötigt, fehlt im aktuellen Set | 4 px |
| `--token-space-5` (20 px) | Wird in Mobile-Layouts benötigt, fehlt im aktuellen Set | 20 px |
| `--token-font-size-tap-min` | Erzwingt 16 px als Minimum-Schriftgröße in tappbaren Controls (iOS-Zoom-Schutz) | 16 px |
| `--token-z-modal`, `--token-z-fab`, `--token-z-toast` | Explizite z-index-Skala | modal=100, fab=50, toast=200 |

**Spec-Addendum-Empfehlung:** Diese Token-Vorschläge sollten in `docs/WEB_DESIGN_TOKENS.md` als Patch 02 angehängt werden, parallel zum ADR-XXXX.

---

## 11. Metriken (Telemetrie-Empfehlung)

Datenschutzfreundlich (kein PII im Event-Payload — `item-image-service.md:622` „Bilder können personenbezogene Daten enthalten"). Empfohlene Events:

| Event-Name | Trigger | Payload-Felder (kein PII) |
|---|---|---|
| `image.upload.started` | User tippt „Hochladen" | `ownerType`, `ownerId` (Hash), `fileCount`, `totalBytes` |
| `image.upload.success` | `POST /v1/images` 201 empfangen | `ownerType`, `ownerId` (Hash), `imageId` |
| `image.upload.failed` | `4xx`/`5xx` empfangen | `ownerType`, `ownerId` (Hash), `statusCode`, `errorCode` |
| `image.primary.set` | `PATCH /v1/images/:id { isPrimary: true }` 200 | `imageId`, `previousPrimaryImageId` (falls vorhanden) |
| `image.primary.unset` | implizit beim Setzen eines neuen Primary | `imageId` |
| `image.caption.updated` | `PATCH /v1/images/:id { caption: ... }` | `imageId` |
| `image.tags.updated` | `PATCH /v1/images/:id { tags: ... }` | `imageId`, `tagCount`, `addedTags` (Strings) |
| `image.rotation.updated` | `PATCH /v1/images/:id { rotationDeg: ... }` | `imageId`, `rotationDeg` |
| `image.soft_delete` | `DELETE /v1/images/:id` 200 | `imageId` |
| `image.restore` | `POST /v1/images/:id/restore` 200 | `imageId` |
| `image.bulk_delete.started` | `POST /v1/images/bulk-delete` aufgerufen | `imageCount`, `scope` (`partial` / `allForOwner`) |
| `image.bulk_delete.completed` | Bulk-Aktion abgeschlossen | `imageCount`, `successCount`, `failedCount` |
| `image.bulk_delete.aborted` | User bricht ab | `imageCount` (zum Zeitpunkt des Abbruchs) |
| `image.exif.gps_stripped` | Server hat GPS-Tag entfernt | `imageId`, `gpsFieldsRemoved` (Anzahl) |
| `image.tab.opened` | Tab-Wechsel in den Bilderservice | `tabId` (`gallery`/`upload`/...) |
| `image.fullscreen.opened` | Vollbild-Modal öffnet | `imageId` |
| `image.audit.exported` | CSV-Export | `rowCount`, `format` (`csv`) |
| `image.evidence.created` | L2/L3-Evidence-Artefakt geschrieben | `evidencePath` (relativ zu `logs/evidence/`) |
| `image.permission_denied` | 403 empfangen | `endpoint`, `requiredRole` |
| `image.queue.queued` | Offline-Upload in `OfflineActionQueue` eingereiht | `ownerType`, `sizeBytes` |
| `image.queue.synced` | Offline-Upload erfolgreich synchronisiert | `ownerType`, `imageId` |
| `image.queue.conflict` | Sync-Konflikt (Owner inzwischen inaktiv) | `ownerType`, `ownerId` (Hash) |

**Datenschutz-Hinweise**

- `ownerId` und `imageId` werden **nur** als Hash gespeichert, niemals als Klartext. Ein Pre-Processor hasht die IDs vor dem Telemetrie-Export.
- Keine Datei-Inhalte, keine EXIF-Werte, keine Uploader-User-IDs.
- `actorUserId` ist im Telemetrie-Stream **nicht** enthalten; sie ist über die Server-Logs (`X-Request-Id` Korrelation) rekonstruierbar, wenn ein Investigation-Loop das verlangt.

---

## 12. Offene UX-Fragen

Diese Fragen werden **nicht** in dieser UX-Datei entschieden. Sie sind `Recommended`-Listung; jede muss vor dem Komponenten-Implementierungs-Slice beantwortet werden.

1. **Galerie-Default-Ansicht** — Soll im Galerie-Tab standardmäßig nur das Primary-Bild gezeigt werden (Tap-to-expand in Vollbild-Modal), oder das vollständige Grid mit allen Bildern? Aktuelle Empfehlung in §3.1: vollständiges Grid, Primary-Badge hervorgehoben. Alternative: Single-Primary-View spart Platz in der Tablet-Küche. `Recommended`: Default = Grid, weil Staff beim Photographieren wissen muss, „gibt es schon ein Bild?".

2. **Detail-Seiten** — `apps/cockpit/app/(app)/inventory/items/[itemId]/page.tsx` und `apps/cockpit/app/(app)/storage/[locationId]/page.tsx` existieren im Repo-Stand nicht (siehe §2.1). Soll der Bilderservice als eigener Tab in einer neuen Detail-Seite entstehen, oder als Modal/Overlay direkt aus der Liste heraus? Wenn Detail-Seite: wer baut sie im selben Slice? `Recommended`: Detail-Seiten im selben Slice; der Bilderservice-Tab versteht sich als „Aufhänger" für den Detail-Page-Bau.

3. **Storage-Objekt-Status im Papierkorb** — `item-image-service.md:5.3` erwähnt einen Background-Job für endgültiges Storage-Löschen, aber kein API-Endpoint, der den aktuellen Status eines Papierkorb-Bildes im Storage abfragt. Braucht die UI diese Information? Wenn ja, neuer Endpoint `GET /v1/images/:id/storage-status` (`Inferred`). `Recommended`: vorerst read-only-Anzeige „Im Storage: ja/nein" mit klarem Disclaimer, dass die Information eventuell veraltet ist.

4. **Read-only-Mount-Modus** — Soll der Bilderservice-Tab im Storage-Pfad für Staff read-only sein (siehe Flow E), oder darf Staff auch Storage-Bilder hochladen? `item-image-service.md:507` erlaubt es (`Staff` darf hochladen), aber operativ könnte die Schichtleitung das ausschließen wollen. `Recommended`: Default ist Schreibrecht für Staff im Storage-Pfad; ein Org-Setting `storage.images.staff_writable = false` (Boolean, Default `true`) ist als Setting-Token in §3.6 nachzutragen.

5. **Mehrfachauswahl ohne Long-Press** — Soll es eine sichtbare Toggle-Button-Alternative zur Long-Press-Geste geben? Siehe §7 letzter Punkt. `Recommended`: ja, weil Long-Press auf iOS-PWA und in Handschuhen unzuverlässig ist.

6. **HEIC-Upload-Verhalten** — `item-image-service.md:681` empfiehlt HEIC in v1 abzulehnen. UX muss dann die Ablehnung sauber kommunizieren (§6.2 Error-Path „HEIC wird in dieser Version nicht unterstützt"). Soll alternativ ein „Konvertieren" angeboten werden, das die Konvertierung in einem Client-Lib (z. B. `heic2any`) erledigt? `Recommended`: v1 ablehnen, in v2 nachziehen.

7. **Audit-Export Datenformat** — CSV ist in §3.4 vorgeschlagen. Soll zusätzlich JSON angeboten werden, oder ein `pdf`-Format für Reviewer? `Recommended`: CSV für Manager-Auswertung, kein PDF (Generierung wäre zusätzlicher Server-Pfad).

8. **EXIF-Hinweis-Dialog Modalität** — Soll der EXIF-Hinweis ein blockierender Dialog sein, oder ein non-blocking Toast mit „Mehr erfahren"-Link? `Recommended`: non-blocking Toast; der Schutz erfolgt serverseitig ohnehin (`item-image-service.md:564-567`), der UI-Hinweis ist reine Information.

9. **`BLOCKED`-Hinweise aus dem Spec** — Die folgenden Punkte aus `item-image-service.md:12` werden in dieser UX-Datei nicht eigenständig gelöst, sondern nur referenziert: Bilder an `InventoryMovement` anhängen, Rollen-Hierarchie abstimmen, Storage-Lifecycle-Policy, EXIF-Transcoding HEIC, Serverless-Body-Size, UI-Feature-Flag-Lifecycle, DSGVO-Bewertung. Insbesondere der **Rollen-Konflikt** zwischen `apps/cockpit/lib/auth/rbac.ts:1` (5-stufig) und `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` (3-stufig) ist `BLOCKED` für die Komponenten-Implementierung, bis ADR-XXXX die Reconciliation bringt. Diese UX-Datei dokumentiert beide Skalen, kann aber nur eine zur Build-Zeit verwenden.

---

## 13. Verweise

Exakte Pfade und Zeilennummern für jede zitierte Stelle. Pfade relativ zum Repo-Root `/home/baum/Schreibtisch/workspace/main_projects/OS-BASEMENT/rauschenberger-os/`.

### 13.1 Spec und Identität

- `docs/features/item-image-service.md:24-48` — Zweck, in/out-Scope.
- `docs/features/item-image-service.md:108-132` — Risikostufen-Matrix L0–L4.
- `docs/features/item-image-service.md:137-217` — Datenmodell `ItemImage` und `ItemImageAudit`.
- `docs/features/item-image-service.md:220-252` — Storage-Strategie und Pfad-Konvention.
- `docs/features/item-image-service.md:256-488` — API-Kontrakte.
- `docs/features/item-image-service.md:492-530` — RBAC-Matrix.
- `docs/features/item-image-service.md:533-580` — Validierung & Limits.
- `docs/features/item-image-service.md:584-622` — Audit & Evidence.
- `docs/features/item-image-service.md:625-644` — Test-Strategie.
- `docs/features/item-image-service.md:647-664` — Migration / Rollout.
- `docs/features/item-image-service.md:668-691` — Offene Fragen.
- `IDENTITY.md:108-120` — Risikostufen L0–L4.
- `IDENTITY.md:120` — Klassifikationsregel „Unklare Stufe → eine Stufe höher".
- `IDENTITY.md:148-153` — Liste der immer blockierten Aktionen.
- `IDENTITY.md:184-193` — Autoritätskette.

### 13.2 Repo-Cockpit-Anker

- `apps/cockpit/app/(app)/inventory/items/page.tsx:1` — Items-List-Route.
- `apps/cockpit/app/(app)/inventory/items/items-client.tsx:1` — Items-Client-Component.
- `apps/cockpit/app/(app)/storage/page.tsx:1` — Storage-List-Route.
- `apps/cockpit/app/(app)/storage/page.tsx:95-110` — Tabellen-Render mit Zeilen pro Storage.
- `apps/cockpit/app/(app)/storage/page.tsx:99-102` — Status-Badge-Pattern.
- `apps/cockpit/app/(app)/layout.tsx:1` — Protected Layout (AuthProvider, WorkspaceProvider).
- `apps/cockpit/app/components/access-denied.tsx:1-13` — AccessDenied-Komponente.
- `apps/cockpit/app/components/role-gate.tsx:6-18` — RoleGate-Komponente.
- `apps/cockpit/app/(app)/settings/roles/page.tsx:1-64` — Rollen- und Capability-Visualisierung.
- `apps/cockpit/lib/auth/rbac.ts:1` — `ROLES = ["owner", "admin", "manager", "staff", "viewer"]`.
- `apps/cockpit/lib/auth/rbac.ts:14-26` — CAPABILITIES-Definition.
- `apps/cockpit/lib/auth/guards.ts:8, 35-36` — Guard-Kontext mit `Role` und `organizationId`.
- `apps/cockpit/hooks/useRole.ts:3-5` — UserRole-Type.
- `apps/cockpit/app/components/bottom-nav.tsx:84, 108, 124` — Sichtbarkeits-Pattern per `allowed.includes(role)`.
- `apps/cockpit/app/components/app-shell.tsx:77, 112, 163, 262, 305` — Sidebar-Sichtbarkeits-Pattern.
- `apps/cockpit/app/components/page-scaffold.tsx` — `PageScaffold` Pattern.
- `apps/cockpit/app/components/ui/empty-state.tsx` — `EmptyState` Pattern.
- `apps/cockpit/app/components/ui/error-state.tsx` — `ErrorState` Pattern.
- `apps/cockpit/app/components/ui/badge.tsx` — `Badge` Pattern.
- `apps/cockpit/app/components/ui/button.tsx` — `Button` Pattern.
- `apps/cockpit/app/components/ui/drawer.tsx` — `Drawer` Pattern.
- `apps/cockpit/app/components/ui/confirm-dialog.tsx` — `ConfirmDangerDialog` Pattern.
- `apps/cockpit/app/globals.css:357-358, 449, 474, 1852, 2048, 2511, 2787, 2807` — 44×44 px Tap-Target-Konvention.
- `apps/cockpit/app/globals.css:74-76` — Mobile-Breakpoint-Media-Queries.
- `apps/cockpit/README.md:33-71` — Auth- und Rollen-Pipeline.

### 13.3 Design-Tokens

- `docs/WEB_DESIGN_TOKENS.md:11-15` — Semantic colors.
- `docs/WEB_DESIGN_TOKENS.md:19-21` — Surfaces and text.
- `docs/WEB_DESIGN_TOKENS.md:25-27` — Spacing, Radius, Shadow.
- `docs/WEB_DESIGN_TOKENS.md:30-35` — Badge tokens.
- `docs/WEB_DESIGN_TOKENS.md:48-55` — Status-Communication-Contract.
- `docs/WEB_DESIGN_TOKENS.md:60-65` — Metric-card tones.
- `docs/WEB_DESIGN_TOKENS.md:69-76` — Breakpoints.

### 13.4 Rollen- und Governance-Doku

- `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` — 3-stufige Planungsrollen (`admin / shift_lead / staff`).
- `docs/ROLE_BASED_UI_UX_PHASE_0.md:53-62` — UI-Migrationsziel.
- `governance/evidence-contract.md:10-22` — Pflichtfelder des Evidence-Artefakts.
- `governance/evidence-contract.md:28-33` — Ablageort für L2/L3/L4.
- `governance/evidence-contract.md:39-42` — Audit-Log-Eintragsschema.
- `governance/approval-matrix.md:7-16` — Stufen-×-Approval-Pfad.
- `governance/approval-matrix.md:19-26` — Rollen `operator / reviewer / governance / author`.
- `AGENTS.md:6-17` — Agent-Rollen (zur Trennung von User-Rollen).

### 13.5 Offline-Queue und Automation

- `docs/automation/semi-automated-operations-layer.md:155-318` — OfflineActionQueue-Datenmodell und Sync-Strategie.
- `docs/automation/semi-automated-operations-layer.md:1147, 1198, 1294-1310` — Offline-UI-Badges und States.
- `docs/automation/semi-automated-operations-layer.md:1382-1393` — Phase-D-Rollout-Plan.
- `docs/automation/semi-automated-operations-layer.md:1599-1658` — Offline-Risiken und Mitigation.
- `docs/automation/semi-automated-operations-layer.md:1750-1762` — Mobile-Notwendigkeit der Queue.

### 13.6 Vision und Strategie

- `docs/VISION.md:1-40` — Produktthese Bevero.
- `docs/VISION.md:88-96` — Erfolgskriterien Pilot-Phase.
- `docs/RAUSCHENBERGER-OS-SUMMARY.md:60-67` — Risikostufen-Modell.
- `docs/RAUSCHENBERGER-OS-SUMMARY.md:128-149` — Cockpit-Seiten-Inventar.
- `docs/RAUSCHENBERGER-OS-SUMMARY.md:191-203` — Systemstack-Diagramm.

### 13.7 Konflikte / `BLOCKED`

- **Rollen-Skala-Konflikt:** `apps/cockpit/lib/auth/rbac.ts:1` (5-stufig) vs. `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` (3-stufig). `item-image-service.md:496` markiert selbst `Recommended`. **Status:** `BLOCKED` für Komponenten-Implementierung, bis ADR-XXXX die Reconciliation bringt. Diese UX-Datei verwendet die 5-stufige Skala als Default und bildet die 3-stufige Skala nur als `Inferred` Mapping ab.
- **Detail-Page-Fehlt:** `[itemId]/page.tsx` und `[locationId]/page.tsx` existieren nicht; `item-image-service.md:105` empfiehlt verschachtelte Routen, sagt aber nicht, ob die Detail-Seiten im selben Slice gebaut werden. **Status:** `BLOCKED` für die Frage „wo wird der Bilder-Tab eingehängt", siehe §12 Frage 2.
- **Storage-Lifecycle-Endpoint:** `item-image-service.md:5.3` beschreibt einen Hintergrund-Job, aber kein API-Endpoint für Live-Status. **Status:** `BLOCKED` für die §3.5 Storage-Objekt-Status-Anzeige, siehe §12 Frage 3.

---

## Anhang A — UX-Selbst-Check (Observed)

- [x] §1 Zweck & Designprinzipien vorhanden, 6 Prinzipien.
- [x] §2 Entry Points & Mounting als ASCII-Tree + Klick-Pfade, beide Mount-Punkte dokumentiert.
- [x] §3 Tab-Struktur mit 6 Tabs (Galerie, Hochladen, Tags, Audit, Papierkorb, Einstellungen), je Zielgruppe, Sichtbarkeit, Aktionen, Kurzbeschreibung.
- [x] §4 Sechs User-Flows (A–F), je Trigger, Steps, Outcome, Edge Cases.
- [x] §5 Sechs ASCII-Komponenten-Skizzen (Galerie, Hochladen, Vollbild, Audit, Papierkorb, Einstellungen), je Interaction notes.
- [x] §6 Sechs Zustands-Tabellen (Empty, Loading, Error, Permission denied, Soft-deleted, Bulk-action) pro Screen.
- [x] §7 Mobile-Optimierungen (Tap-Targets, FAB, Offline-Queue, Dark-Mode, Reduced Motion, Haptik, EXIF-Hinweis-Verhalten, Handschuh-Modus).
- [x] §8 RBAC-Sichtbarkeit als Tabelle, 5-stufige Default-Skala + `Inferred` Mapping auf 3-stufige Skala.
- [x] §9 Accessibility (Kontrast, Tastatur, Screen-Reader, ARIA-Live, Reduced Motion).
- [x] §10 Design-Token-Konsistenz mit Liste vorhandener und `Recommended` neuer Tokens.
- [x] §11 Telemetrie-Empfehlungen (21 Events, datenschutzfreundlich).
- [x] §12 Acht offene UX-Fragen plus ein expliziter `BLOCKED`-Hinweis.
- [x] §13 Verweise mit `file_path:line_number` für jede zitierte Stelle, gegliedert in 7 Untergruppen.
- [x] Keine Code-Blöcke mit React/JSX/Tailwind-Klassen/Bibliotheksimports.
- [x] Keine bestehende Datei modifiziert (Observed: einziger Write-Target ist `docs/features/item-image-service-ux.md`).
- [x] Keine Widersprüche zum docs-Spec `docs/features/item-image-service.md`; vorhandene Inkonsistenzen sind als `BLOCKED` markiert.
