# Feature-Spec: Item Image Service

> Spec-Status: **draft**
> Spec-Owner: `docs`-Subagent
> ADR-Referenz: ADR-0059 (Adopt Item-Image-Service Spec, `Status: draft`) — siehe `docs/DECISIONS.md:4203`
> UX-Referenz: ADR-0059 / `docs/features/item-image-service-ux.md` (UX-Status: draft)
> Sprache: Deutsch
> Zielrepo: `rauschenberger-os/` (Bevero-Workspace)
> Betroffene App: `apps/api` (Fastify), `apps/cockpit` (Next.js), Supabase (Postgres + Storage)

---

## TTD-Frame (Test-The-Development)

- **Decision**: Eine neue Feature-Spec existiert, die Datenmodell, API-Kontrakte, RBAC, Storage-Strategie, Audit-Politik, Risikoklassifikation und Rollout-Reihenfolge für den Item-Image-Service in rauschenberger-os unambiguity definiert, konsistent mit `IDENTITY.md`, `governance/*` und dem bestehenden Prisma-Schema.
- **Owner / Scope**: docs-Subagent → genau **eine** neue Datei `docs/features/item-image-service.md`. Keine bestehende Datei wird verändert, kein Code, keine Migration, keine UI.
- **Contract**: Die Datei existiert, enthält alle 13 in der Spec geforderten Abschnitte, zitiert Autoritätsdateien im Format `file_path:line_number` und macht **keine** Implementierungs-Zusagen.
- **Gate / Test**: Ein Reviewer kann die Datei lesen und ohne weitere Quellen beantworten: (a) welcher ADR muss zuerst `accepted` sein, (b) welche RBAC-Rolle darf ein Bild löschen, (c) welches Storage-Pfad-Format wird verwendet, (d) welche Aktionen erzwingen ein L2-Evidence-Artefakt.
- **Implementation Slice**: N/A (Spec only).
- **Evidence**: Pfad zur geschriebenen Datei; alle 13 Abschnitte + Verweise aufgeführt.
- **Next Gate**: spec → Reviewer-Subagent → ADR-Draft → User-Entscheidung zu §12 "Offene Fragen" → erst danach Implementierung.

---

## 1. Zweck & Scope

Der **Item Image Service** ist ein Bilderservice pro `InventoryItem` und pro `StorageLocation`, der das Hochladen, Anzeigen, Taggen, Rotieren, Soft-Löschen, Wiederherstellen und Auditieren von Fotos aus dem operativen Tagesgeschäft (Bar, Kitchen, Storage, Service) ermöglicht. Die Bilder dienen der visuellen Identifikation von Artikeln und Lagerorten — z. B. damit Schichtkräfte auf Tablet/Phone das richtige Produkt oder den richtigen Schrank wiedererkennen — sowie der internen Nachvollziehbarkeit (wer hat wann welches Bild hochgeladen, getaggt oder gelöscht).

**In Scope**

- Upload pro `InventoryItem` und pro `StorageLocation` (Owner-Polymorphismus via `(ownerType, ownerId)`).
- Galerie-Ansicht pro Owner, Filter nach Tag, Uploader, Datum.
- Metadaten-Editierung: Caption, Tags, Primary-Markierung, Rotation (Metadata, nicht Pixel-Transformation).
- Soft-Delete und Restore pro Bild.
- Append-only-Audit-Trail pro Bild.
- Signed-URL-basierter Zugriff (privater Bucket, kein Public Bucket).
- Mobile-first UI im Cockpit (Tablet/Phone, primär Kitchen/Bar-Use-Case).
- RLS-Scoping strikt auf `organizationId` des authentifizierten Users (siehe `apps/api/AGENTS.md:92-93`).

**Explizit out of Scope**

- Automatische Bildverarbeitung, die Bestandsstände verändert (verstößt gegen `apps/api/AGENTS.md:86`).
- Writeback an FoodNotify, Dynamics 365, DATEV oder andere externe Systeme (verstößt gegen `apps/api/AGENTS.md:87-88`).
- LLM-gestützte Bildanalyse, OCR, Auto-Tagging, Auto-Klassifikation, Auto-Bestelltrigger (verstößt gegen `apps/api/AGENTS.md:89-91`).
- Verwendung von Service-Role-Credentials in User-Request-Pfaden (verstößt gegen `apps/api/AGENTS.md:36-37, 92-93`).
- Public Buckets, anonyme Bild-URLs, CDN-Public-Read.
- Stock-Mutation aus dem Bild-Upload heraus.
- Anzeige von Bildern an Kunden oder externen Parteien (kein L3/L4-Freigabe-Pfad in dieser Spec).
- Pixel-Operationen (Resize, Compress, EXIF-Rotate) im API-Pfad; EXIF-Stripping (nur GPS) ist erlaubt und vorgeschrieben (siehe §8).

**Anker für Scope-Grenzen (file_path:line_number)**

- `apps/api/prisma/schema.prisma:86` — `InventoryItem` hat kein Bild-Feld.
- `apps/api/prisma/schema.prisma:226` — `StorageLocation` hat kein Bild-Feld.
- `apps/api/AGENTS.md:86, 87-88, 89-91, 92-93, 36-37` — Hard-Guardrails.
- `IDENTITY.md:148-153` — Liste der Aktionen, die das OS niemals ohne Freigabe ausführen darf; Bilder-Upload ist dort nicht gelistet → fällt in den normalen L0–L4-Pfad.

---

## 2. Autorität & Vorbedingungen

### 2.1 Autoritätskette

Diese Spec folgt strikt der in `IDENTITY.md:184-193` definierten Autoritätskette und den nachgelagerten Spezifikations-Surfaces aus `apps/api/AGENTS.md:129-143`:

```
IDENTITY.md  (L4 — Existenzgrund, Leitprinzipien, Risikostufen-Matrix)
  └── OS.md  (L3 — Systemkarte, Repo-Struktur)
        └── governance/rules.md      (L2 — Betriebsregeln)
              ├── governance/approval-matrix.md
              └── governance/evidence-contract.md
        └── apps/api/AGENTS.md       (Repo-lokales Frontdoor, Hard-Guardrails)
              └── docs/DECISIONS.md  (Akzeptierte ADRs sind bindend)
                    └── docs/VISION.md, docs/ROLE_BASED_UI_UX_PHASE_0.md
```

### 2.2 Vorbedingung: ADR

`apps/api/AGENTS.md:100-103` ist bindend:

> "New data model (proposed, not yet migrated): `AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`. **Do not implement these before the spec is promoted out of Phase A and the corresponding ADR is `accepted`.**"

Übertragen auf den Item-Image-Service:

1. **ADR-0059** ("Adopt Item-Image-Service Spec", `Status: draft` 2026-06-19, `docs/DECISIONS.md:4203`) muss zuerst auf `Status: accepted` gesetzt werden, **bevor** ADR-0059-A (Schema + Storage) drafted werden kann.
2. **ADR-0059-K** ("Cost-Approval for `item-images` Supabase Storage bucket", neu eingeführt durch OQ §4-Verdict 2026-06-19) muss als Hard-Precondition für ADR-0059-A ebenfalls `Status: accepted` sein.
3. Die ADR-0059-A muss mindestens begründen: Owner-Polymorphismus ohne harte FK, RLS-Politik, Append-only-Audit, Soft-Delete-Konvention, EXIF-GPS-Stripping, Storage-Bucket-Design, Idempotenz-Key-Pattern.
4. Die ADR muss die Kompatibilität mit `apps/api/AGENTS.md:86-99` explizit bestätigen (kein Stock-Writeback, kein Service-Role-Bypass, keine LLM-Auswertung der Bilder).

> **Status-Update 2026-06-19:** ADR-0059 wurde gedraftet (siehe `docs/DECISIONS.md:4203`); die 10 Open Questions wurden durch den Owner aufgelöst (siehe ADR-0059 §Owner-Verdicts-Update 2026-06-19, `docs/DECISIONS.md:4281-4326`). ADR-0059-A wurde gedraftet (siehe `docs/DECISIONS.md:4405`). ADR-0059-K muss als nächster Schritt gedraftet werden, gefolgt von Owner-Acceptance der drei ADRs in der Reihenfolge ADR-0059 → ADR-0059-K → ADR-0059-A.

### 2.3 Stand der existierenden ADRs (`docs/DECISIONS.md:1-100`)

`Observed` über `docs/DECISIONS.md:1-100`:

- ADR-0001 bis ADR-0014 sind im Block dokumentiert.
- **Kein bestehender ADR adressiert** `ItemImage`, `ItemImageAudit`, Supabase-Storage-Buckets oder Bild-Upload-Pfade. (`Inferred` auf Basis der im Block enthaltenen Titel; eine vollständige Inhaltsprüfung jenseits von Zeile 100 ist für die Vorbedingung nicht erforderlich, da die ADR-Nummerierung lückenlos vergeben ist und ein neuer ADR die nächste freie Nummer erhält.)
- Relevante Vorentscheidungen, die der neue ADR referenzieren oder nicht widersprechen darf:
  - `ADR-0009` — Soft-Deactivation via `isActive = false`; Pattern-Vorlage für Soft-Delete (siehe `docs/DECISIONS.md:56-61`, gespiegelt in `apps/api/prisma/schema.prisma:100`).
  - `ADR-0011` — Supabase Postgres ist kanonische DB; Storage muss ebenfalls Supabase sein (siehe `docs/DECISIONS.md:69-75`).
  - `ADR-0012` — Rollen-basiertes UX baut auf DB-backed Inventory auf; UI-Erweiterung muss in `apps/cockpit` erfolgen (siehe `docs/DECISIONS.md:77-81`).
  - `ADR-0013` — Cockpit ist die Next.js-Oberfläche (siehe `docs/DECISIONS.md:83-98`). `Inferred`: `docs/DECISIONS.md:90` referenziert `apps/cockpit/`, die Realität im Repo ist `apps/cockpit/` (siehe `OS.md:43-46` und `apps/cockpit/app/(app)/storage/page.tsx:1`); die ADR-Textstelle ist veraltet und sollte im selben Atemzug mit dem neuen ADR-XXXX harmonisiert werden — diese Spec ändert **keinen** ADR-Text.
  - `ADR-0014` — Organisations-Identität aus Supabase-Auth-Membership; `organizationId` für RLS-Scoping ist daraus abgeleitet (siehe `docs/DECISIONS.md:100`).

### 2.4 Weitere Vorbedingungen

- Klärung der offenen Fragen in §12, insbesondere zur optionalen Bildanlage an `InventoryMovement` (würde Append-only-Plane berühren) und zur Storage-Kostenfreigabe.
- Existierendes RLS-Pattern im Repo (`apps/api/AGENTS.md:92-93`) muss übernommen werden: Jeder API-Pfad setzt `organizationId` aus der authentifizierten Session, nicht aus dem Request-Body.
- Cockpit-Routen existieren bereits für Items und Storage (`apps/cockpit/app/(app)/inventory/items/page.tsx:1`, `apps/cockpit/app/(app)/storage/page.tsx:1`); die Bilder-UI wird als verschachtelte Route ergänzt.

---

## 3. Risikostufe (L0–L4)

Klassifikationsmatrix nach `IDENTITY.md:108-120` (Stufen-Definition) und `IDENTITY.md:120` (Regel: "Unklare Stufe → eine Stufe höher").

| Aktion | Stufe | Begründung |
|---|---|---|
| Galerie ansehen (`GET /images`) | **L0** | Read-only, vergleichbar "Bestandsauswertung" (`IDENTITY.md:114`). |
| Liste filtern / suchen (Tag, Uploader, Datum) | **L0** | Read-only Abfrage. |
| Bild herunterladen (Signed-URL) | **L0** | Read-only Objektzugriff. |
| Bild hochladen (`POST /images` / Signed-Upload) | **L1** | Erzeugt Datensatz, aber **keine** Stock-Mutation, **keine** externe Wirkung. Vergleichbar "Checkliste aktualisieren" (`IDENTITY.md:115`). |
| Caption bearbeiten | **L1** | Reine Metadaten-Änderung am selbst hochgeladenen Bild. |
| Tags hinzufügen / entfernen | **L1** | Reine Metadaten-Änderung. |
| `isPrimary` setzen (pro Owner) | **L1** | UI-Hinweis, keine Daten-Semantik außerhalb der Galerie. |
| Rotation setzen (Metadaten) | **L1** | UI-Hinweis, keine Pixel-Operation. |
| Soft-Delete Einzelbild (`DELETE /images/:id`) | **L2** | Daten-State-Mutation an User-Daten; wegen `IDENTITY.md:120` "Unklare Stufe → eine Stufe höher" und weil ein gelöschtes Bild Galerien verfälschen kann, ist **L2** mit Self-Review + Audit-Row die sichere Wahl. Vergleichbar "Bestellung anpassen" (`IDENTITY.md:116`). |
| Soft-Delete Bulk (2–9 Bilder in einer Operation) | **L2** | Mehrere Datensätze gleichzeitig, reversibel. |
| Soft-Delete Bulk (≥ 10 Bilder) | **L2** (mit verpflichtendem Evidence-Artefakt) | Mengen-Schwellwert; Pflicht-Marke nach §9. |
| Soft-Delete "alle Bilder eines Owners" | **L3** | Operator-Freigabe nach `governance/approval-matrix.md:14`; vergleichbar Auth-Zugriff-Umfang (`IDENTITY.md:117`). |
| Restore (`POST /images/:id/restore`) | **L1** | Reversibel, stellt vorherigen State wieder her. |
| Audit-Trail ansehen (`GET /images/:id/audit`) | **L0** | Read-only. |

**Anmerkungen**

- Keine dieser Aktionen fällt unter die in `IDENTITY.md:148-153` explizit **immer blockierten** Aktionen (Zahlungen, Verträge, Kundendaten-Export, Produktiv-Deploy, etc.). Damit bleibt der höchste Risiko-Gipfel bei L3 (Bulk-Löschung aller Bilder eines Owners) und es ist **keine** L4-Aktion in dieser Spec.
- L2 und höher benötigen nach `governance/evidence-contract.md:5` ein Evidence-Artefakt. Die Pflicht-Marken sind in §9 konkretisiert.

---

## 4. Datenmodell (Vorschlag, nicht final)

> **Wichtig:** Dieses Datenmodell ist ein Vorschlag. Es ist **keine** DDL und **keine** Migration. Die endgültige Form entsteht im ADR-XXXX und in der Prisma-Migration, die nach ADR-Acceptance erstellt wird.

### 4.1 `ItemImage` (Vorschlag)

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `id` | `String` (cuid) | ja | Primary Key. |
| `organizationId` | `String` | ja | RLS-Scope. `Inferred`: Pflicht im Gegensatz zu `InventoryItem.organizationId` (siehe `apps/api/prisma/schema.prisma:88`, dort nullable) — Bilder MÜSSEN org-scoped sein, sonst ist RLS nicht erzwingbar. |
| `ownerType` | `Enum { item, location }` | ja | Diskriminator für Owner-Polymorphismus. |
| `ownerId` | `String` | ja | Referenziert `InventoryItem.id` oder `StorageLocation.id`. **Kein FK** auf DB-Ebene; Validierung app-seitig (Owner muss zur Org passen). Begründung: zwei Parent-Tabellen, beide mit `organizationId` (siehe `apps/api/prisma/schema.prisma:88, 228`); ein FK würde eine Parent-Tabelle festnageln. |
| `storagePath` | `String` | ja | Supabase-Storage-Pfad, Format §5.1. |
| `mimeType` | `String` | ja | Aus Allowlist §8.2. |
| `sizeBytes` | `Int` | ja | §8.1. |
| `width` | `Int?` | nein | Aus Image-Header, nicht vertrauenswürdig. |
| `height` | `Int?` | nein | Siehe `width`. |
| `caption` | `String?` | nein | Max. 500 Zeichen (Recommended, §8). |
| `tags` | `String[]` (Postgres `text[]`) | nein | Freie Tags, Normalisierung §8.4. |
| `rotationDeg` | `Int` (default 0) | ja | Nur 0/90/180/270; UI-Hint, keine Pixel-Operation. |
| `isPrimary` | `Boolean` (default `false`) | ja | Pro Owner höchstens **eine** Row mit `isPrimary = true`. Pattern-Vorlage: `BusinessUnitLocation.isPrimary` (`apps/api/prisma/schema.prisma:1896`). |
| `uploadedByUserId` | `String` | ja | Server-gesetzt aus authentifizierter Session, **nie** aus Request-Body. |
| `createdAt` | `DateTime` | ja | `default(now())`. |
| `updatedAt` | `DateTime` | ja | `@updatedAt`. |
| `deletedAt` | `DateTime?` | nein | Soft-Delete-Marker; `null` = aktiv. |

#### Indizes (Vorschlag, prose only)

- `@@index([organizationId, ownerType, ownerId, createdAt])` — primäre Lookup-Route für Galerien.
- `@@index([organizationId, ownerType, ownerId, deletedAt])` — Filter "nur aktive Bilder".
- `@@index([organizationId, uploadedByUserId, createdAt])` — Uploader-Filter.
- `@@index([organizationId, tags])` — Tag-Filter (Gin-Index auf `text[]` Recommended, in Prisma-Migration zu entscheiden).
- `@@unique([organizationId, ownerType, ownerId]) WHERE isPrimary = true AND deletedAt IS NULL` — **genau ein** Primärbild pro Owner. **Entschieden** durch ADR-0059 Hard-Guardrail #10 (`docs/DECISIONS.md:4231`): partieller Unique-Index auf DB-Level, kein separater `primaryMarker`-String. DB-Level-Enforcement ist eine **neue** Einführung durch ADR-0059-A; `BusinessUnitLocation.isPrimary` (`apps/api/prisma/schema.prisma:1896`) liefert nur das Naming-Pattern.

### 4.2 `ItemImageAudit` (Vorschlag, append-only)

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `id` | `String` (cuid) | ja | Primary Key. |
| `imageId` | `String` | ja | Verweist auf `ItemImage.id`. **Kein** Cascade-Delete; Audit-Rows bleiben erhalten. |
| `organizationId` | `String` | ja | RLS-Scope, denormalisiert für RLS-Performance. |
| `action` | `Enum { created, caption_updated, tags_updated, primary_set, primary_unset, rotation_updated, soft_deleted, restored, uploaded_bytes_verified }` | ja | Diskriminator. |
| `actorUserId` | `String` | ja | Server-gesetzt. |
| `payload` | `Json?` | nein | Diff/State-Snapshot, schema-los in v1. `Recommended`: später auf konkretes Zod-Schema pro `action`. |
| `createdAt` | `DateTime` | ja | `default(now())`. Append-only: kein `updatedAt`. |

#### Append-only-Constraints

- App-Schicht: API exponiert **keine** `PATCH`/`DELETE` auf `ItemImageAudit`. `Inferred` aus `apps/api/AGENTS.md:95-98` ("nur Append erlaubt" für vergleichbare Audit-Trails).
- DB-Schicht: `REVOKE UPDATE, DELETE ON item_image_audit FROM authenticated, anon; GRANT INSERT, SELECT ON item_image_audit TO authenticated;` — `Recommended` im ADR-XXXX zu beschließen.

#### Indizes (Vorschlag)

- `@@index([imageId, createdAt])` — Audit-Trail-Read.
- `@@index([organizationId, actorUserId, createdAt])` — "Wer hat wann was gemacht".
- `@@index([organizationId, action, createdAt])` — Operator-Cross-Cut.

### 4.3 Beziehung zu bestehenden Modellen

**Bewusst keine harten Foreign-Keys** zwischen `ItemImage` und `InventoryItem` bzw. `StorageLocation`. Begründung:

- Zwei Parent-Tabellen mit unterschiedlichen RLS-Kontexten (`apps/api/prisma/schema.prisma:86` Items, `apps/api/prisma/schema.prisma:226` Locations).
- Soft-Delete am Bild muss funktionieren, ohne die Parent-Tabellen zu berühren.
- Audit-Trail bleibt intakt, selbst wenn ein Owner-Datensatz dereferenziert wird.

**Logische Referenzen (app-seitig validiert):**

- `ownerType = "item"` ⇒ `ownerId` muss `InventoryItem.id` mit passender `organizationId` sein.
- `ownerType = "location"` ⇒ `ownerId` muss `StorageLocation.id` mit passender `organizationId` sein.
- `ItemImageAudit.imageId` ⇒ `ItemImage.id` in derselben `organizationId`.

### 4.4 RLS-Policy-Skizze (Policy-Logik, nicht SQL)

Pro Tabelle, pro Operation. Konkretes SQL ist nicht Inhalt dieser Spec und wird im ADR-XXXX festgelegt.

- `SELECT` auf `ItemImage`: erlaubt, wenn `organizationId` der `organizationId` der authentifizierten Session entspricht. `DeletedAt IS NOT NULL` wird mit ausgeliefert (für Audit-Trail), UI filtert standardmäßig aus.
- `INSERT` auf `ItemImage`: erlaubt, wenn `organizationId = session.org` UND `uploadedByUserId = auth.uid()`. **`organizationId` und `uploadedByUserId` werden ausschließlich serverseitig gesetzt** (siehe §6).
- `UPDATE` auf `ItemImage`: erlaubt, wenn `organizationId = session.org`. Verboten für Spalten, die den Owner wechseln (`organizationId`, `ownerType`, `ownerId`, `uploadedByUserId`, `createdAt`).
- `DELETE` auf `ItemImage`: **nicht** erlaubt (Hard-Delete verboten; nur Soft-Delete via `UPDATE deletedAt`).
- `ItemImageAudit`: `SELECT` mit `organizationId = session.org`. `INSERT` mit `organizationId = session.org` UND `actorUserId = auth.uid()`. `UPDATE`/`DELETE`: **revoked** für alle Rollen außer `service_role` (für Migrations-Wartung; nicht im User-Pfad).

---

## 5. Storage-Strategie (Supabase Storage)

### 5.1 Bucket und Pfad-Konvention

- **Bucket-Name:** `item-images` (privat, nicht public).
- **Pfad-Konvention:**
  ```
  org/{organizationId}/{ownerType}/{ownerId}/{imageId}.{ext}
  ```
  - `organizationId` muss mit `ItemImage.organizationId` übereinstimmen.
  - `ownerType` ist `item` oder `location`.
  - `ownerId` ist `InventoryItem.id` bzw. `StorageLocation.id`.
  - `imageId` ist `ItemImage.id` (deterministisch, vor Upload generiert).
  - `ext` ist eine normalisierte Erweiterung aus der Mime-Allowlist (§8.2).
- **Storage-RLS-Policy-Skizze (Policy-Logik, nicht SQL):**
  - `SELECT`/`INSERT`/`UPDATE`: erlaubt, wenn das Pfad-Segment `org/{organizationId}/...` mit `auth.jwt() ->> 'organization_id'` übereinstimmt.
  - Service-Role-Credentials werden im User-Pfad **nicht** verwendet (siehe `apps/api/AGENTS.md:36-37, 92-93`). Upload und Read laufen mit dem User-JWT.

### 5.2 Signed-URL-Strategie

- **Read-URL (Download/View):** TTL **5 Minuten** (Recommended Default). Server-issued bei `GET /images/:id`. Keine Caching-Header mit langer TTL.
- **Upload-URL (Signed Upload):** TTL **10 Minuten** (Recommended Default). Server-issued bei `POST /images/upload-url`. Enthält einen Nonce, der beim abschließenden `POST /images` als Idempotenz-Key dient.
- **Kein** Public Bucket, **keine** anonymen URLs, **kein** CDN-Public-Read.

### 5.3 Lifecycle

- **Soft-Delete:** Storage-Objekt bleibt zunächst liegen. Ein separater Hintergrund-Job (`Recommended`, nicht Inhalt dieser Spec) räumt Objekte auf, deren `ItemImage.deletedAt` älter als N Tage ist UND die nicht im `restored` Audit-Trail referenziert wurden.
- **Hard-Delete:** **nicht** im MVP. Wenn später erforderlich, neuer ADR + L3-Freigabe.
- **Größen-Limits:** §8.

### 5.4 Kein Custom Storage-Backend

Supabase Storage ist kanonisch (siehe `ADR-0011` in `docs/DECISIONS.md:69-75`). S3-kompatible Alternativen sind explizit **out of scope** für diese Spec.

---

## 6. API-Kontrakte (Fastify + Zod)

> **Wichtig:** Dies sind Vertrags-Skizzen, keine TypeScript-Implementierung. Zod-Felder sind als Tabellen dokumentiert. Konkrete Typen entstehen in der Implementierungs-Phase nach ADR-Acceptance.

Alle Endpoints:

- Basis-Pfad: `/v1/images` (genauer Pfad in der ADR-XXXX zu fixieren; im Repo-Kontext wahrscheinlich `/api/v1/...` analog zu existierenden Routen — `Inferred`).
- Authentifizierung: Supabase-Auth (Bearer-JWT).
- RLS-Kontext: jeder Request läuft unter dem User-JWT, **nicht** unter Service-Role.
- Antwort: `application/json; charset=utf-8` (außer bei expliziten File-Responses).
- Standard-Error-Format (Recommended, in ADR zu fixieren): `{ "error": { "code": string, "message": string, "details"?: unknown } }`.

### 6.1 `POST /v1/images/upload-url` — Signed-Upload-URL anfordern (L1)

| Aspekt | Wert |
|---|---|
| Methode | `POST` |
| Pfad | `/v1/images/upload-url` |
| RBAC (min) | `Staff` |
| Risiko | L1 |
| Idempotenz | Pflicht-Header `Idempotency-Key` (UUIDv4) |

**Request-Body (Zod)**

| Feld | Typ | Pflicht | Constraints |
|---|---|---|---|
| `ownerType` | `enum('item','location')` | ja | — |
| `ownerId` | `string` (cuid) | ja | muss existieren und zur Org des Users passen |
| `mimeType` | `string` | ja | aus Allowlist §8.2 |
| `sizeBytes` | `int` | ja | ≤ Limit §8.1 |

**Response 200**

| Feld | Typ | Hinweis |
|---|---|---|
| `imageId` | `string` (cuid) | vorgegeben, wird im Pfad verwendet |
| `uploadUrl` | `string` (URL) | Signed-Upload-URL, TTL §5.2 |
| `storagePath` | `string` | wie §5.1 |
| `expiresAt` | `string` (ISO-8601) | TTL-Ende |

**Fehler:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN_OWNER` · `409 IDEMPOTENCY_CONFLICT` · `413 PAYLOAD_TOO_LARGE` · `415 UNSUPPORTED_MIME`.

### 6.2 `POST /v1/images` — Metadaten-Row nach Upload erzeugen (L1)

| Aspekt | Wert |
|---|---|
| Methode | `POST` |
| Pfad | `/v1/images` |
| RBAC (min) | `Staff` |
| Risiko | L1 |
| Idempotenz | Pflicht-Header `Idempotency-Key` (UUIDv4); serverseitig gegen Nonce aus `upload-url` verriegelt |

**Request-Body (Zod)**

| Feld | Typ | Pflicht | Constraints |
|---|---|---|---|
| `imageId` | `string` (cuid) | ja | muss zur Nonce aus `upload-url` passen |
| `ownerType` | `enum('item','location')` | ja | — |
| `ownerId` | `string` (cuid) | ja | muss zur Org des Users passen |
| `mimeType` | `string` | ja | aus Allowlist §8.2 |
| `sizeBytes` | `int` | ja | ≤ Limit §8.1 |
| `width` | `int?` | nein | ≥ 1, ≤ §8.3 |
| `height` | `int?` | nein | ≥ 1, ≤ §8.3 |
| `caption` | `string?` | nein | ≤ 500 Zeichen (Recommended) |
| `tags` | `string[]?` | nein | jede Tag ≤ 64 Zeichen, normalisiert nach §8.4 |

**Response 201** — Felder: `id`, `organizationId`, `ownerType`, `ownerId`, `storagePath`, `mimeType`, `sizeBytes`, `width`, `height`, `caption`, `tags`, `rotationDeg` (initial 0), `isPrimary` (initial `false`), `uploadedByUserId`, `createdAt`, `updatedAt`, `signedUrl` (TTL §5.2).

**Fehler:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN_OWNER` · `404 UPLOAD_NOT_FOUND` (kein Objekt unter `storagePath`) · `409 IDEMPOTENCY_CONFLICT` · `413 PAYLOAD_TOO_LARGE` · `415 UNSUPPORTED_MIME`.

**Server-seitige Validierung**

- Vor Insert: `HEAD`/`STAT` auf `storagePath` muss nicht-leer sein und `Content-Length` ≈ `sizeBytes` (±1%).
- Server setzt `organizationId` und `uploadedByUserId`; Client-Werte werden ignoriert.
- Insert erzeugt **zwingend** eine `ItemImageAudit`-Row mit `action = 'created'`.

### 6.3 `GET /v1/images` — Liste pro Owner, gefiltert (L0)

| Aspekt | Wert |
|---|---|
| Methode | `GET` |
| Pfad | `/v1/images` |
| RBAC (min) | `Viewer` |
| Risiko | L0 |
| Idempotenz | n/a |

**Query-Parameter (Zod)**

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `ownerType` | `enum('item','location')` | ja | — |
| `ownerId` | `string` (cuid) | ja | muss im Org-Scope sichtbar sein |
| `tag` | `string?` | nein | exakter Tag-Match |
| `uploadedByUserId` | `string?` | nein | exakter User-Match |
| `from` | `string?` (ISO-8601) | nein | `createdAt >= from` |
| `to` | `string?` (ISO-8601) | nein | `createdAt < to` |
| `includeDeleted` | `bool?` (default `false`) | nein | nur Admin/Manager (siehe §7) |
| `page` | `int?` (default 1) | nein | ≥ 1 |
| `pageSize` | `int?` (default 24, max 100) | nein | — |

**Response 200** — `items` (`ImageSummary[]` ohne `signedUrl`/`storagePath`), `page`, `pageSize`, `total`, `nextPage`. Pfad nur on-demand via `GET /v1/images/:id`.

**Fehler:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN_OWNER`.

### 6.4 `GET /v1/images/:id` — Metadaten + Signed-URL (L0)

| Aspekt | Wert |
|---|---|
| Methode | `GET` |
| Pfad | `/v1/images/:id` |
| RBAC (min) | `Viewer` |
| Risiko | L0 |
| Idempotenz | n/a |

**Response 200** — wie §6.2 Response, inklusive `signedUrl` (TTL §5.2) und `storagePath`.

**Fehler:** `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORG_SCOPE` · `404 NOT_FOUND` (auch wenn soft-deleted und `includeDeleted=false`).

### 6.5 `PATCH /v1/images/:id` — Caption, Tags, `isPrimary`, Rotation (L1)

| Aspekt | Wert |
|---|---|
| Methode | `PATCH` |
| Pfad | `/v1/images/:id` |
| RBAC (min) | `Staff` für Tags/Caption/Rotation; `Manager+` für `isPrimary`-Änderung an Bildern anderer User (siehe §7) |
| Risiko | L1 |
| Idempotenz | Pflicht-Header `Idempotency-Key` |

**Request-Body (Zod)** — alle Felder optional, mindestens eines muss gesetzt sein.

| Feld | Typ | Constraints |
|---|---|---|
| `caption` | `string?` | ≤ 500 Zeichen; `null` löscht Caption |
| `tags` | `string[]?` | je ≤ 64 Zeichen, normalisiert §8.4 |
| `isPrimary` | `bool?` | wechselt implizit das bisherige Primary-Bild |
| `rotationDeg` | `int?` | nur 0/90/180/270 |

**Server-Verhalten**

- Bei `isPrimary = true`: in derselben Transaktion das bisherige Primary-Bild desselben Owners auf `isPrimary = false` setzen, dann das Ziel auf `true`. Unique-Constraint siehe §4.1.
- Jede Änderung erzeugt **eine** `ItemImageAudit`-Row mit passender `action`.

**Fehler:** `400 VALIDATION_ERROR` / leerer Body · `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORG_SCOPE` / `403 FORBIDDEN_PRIMARY` · `404 NOT_FOUND` (oder soft-deleted) · `409 IDEMPOTENCY_CONFLICT`.

### 6.6 `DELETE /v1/images/:id` — Soft-Delete Einzelbild (L2)

| Aspekt | Wert |
|---|---|
| Methode | `DELETE` |
| Pfad | `/v1/images/:id` |
| RBAC (min) | `Manager` (siehe §7) |
| Risiko | L2 |
| Idempotenz | n/a (idempotent: zweiter `DELETE` liefert `404`) |

**Verhalten**

- `UPDATE ItemImage SET deletedAt = now() WHERE id = :id AND deletedAt IS NULL`.
- Erzeugt `ItemImageAudit` mit `action = 'soft_deleted'` (nur falls Row vorher aktiv war).
- Storage-Objekt bleibt liegen (siehe §5.3).

**Fehler:** `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORG_SCOPE` / `403 FORBIDDEN_DELETE` · `404 NOT_FOUND` (auch wenn bereits soft-deleted).

### 6.7 `POST /v1/images/:id/restore` — Restore (L1)

| Aspekt | Wert |
|---|---|
| Methode | `POST` |
| Pfad | `/v1/images/:id/restore` |
| RBAC (min) | `Manager` |
| Risiko | L1 |
| Idempotenz | Pflicht-Header `Idempotency-Key` |

**Verhalten**

- `UPDATE ItemImage SET deletedAt = NULL WHERE id = :id AND deletedAt IS NOT NULL`.
- Erzeugt `ItemImageAudit` mit `action = 'restored'` (nur falls Row vorher soft-deleted war).
- Primärbild-Konflikt: Falls beim Restore ein anderes Bild bereits `isPrimary = true` ist, bleibt das Restore-Bild `isPrimary = false`. UI muss das kommunizieren.

**Fehler:** `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORG_SCOPE` · `404 NOT_FOUND` (nicht soft-deleted) · `409 IDEMPOTENCY_CONFLICT`.

### 6.8 `POST /v1/images/bulk-delete` — Bulk Soft-Delete (L2 / L3)

| Aspekt | Wert |
|---|---|
| Methode | `POST` |
| Pfad | `/v1/images/bulk-delete` |
| RBAC (min) | `Manager` (2–9 Bilder); `Admin+` (≥ 10 oder "alle Bilder eines Owners") |
| Risiko | L2; ab "alle Bilder eines Owners" L3 mit Operator-Freigabe |
| Idempotenz | Pflicht-Header `Idempotency-Key` |

**Request-Body (Zod)**

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `imageIds` | `string[]` (cuid) | ja | 2 ≤ length ≤ 100; im Org-Scope |
| `allForOwner` | `object?` | nein | `{ ownerType, ownerId }` — alle aktiven Bilder des Owners |

**Verhalten**

- Pro Bild: Soft-Delete + Audit-Row in einer Transaktion.
- Wenn `allForOwner` gesetzt: zusätzliche Operator-Freigabe erforderlich (L3).

**Fehler:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN_BULK` · `403 OPERATOR_APPROVAL_REQUIRED` (L3-Pfad) · `409 IDEMPOTENCY_CONFLICT`.

### 6.9 `GET /v1/images/:id/audit` — Audit-Trail (L0)

| Aspekt | Wert |
|---|---|
| Methode | `GET` |
| Pfad | `/v1/images/:id/audit` |
| RBAC (min) | `Manager` (Audit-Daten sind personalbezogen) |
| Risiko | L0 |
| Idempotenz | n/a |

**Query-Parameter (Zod)**

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `action` | `enum?` | nein | Filter auf eine der §4.2 actions |
| `from` | `string?` (ISO-8601) | nein | — |
| `to` | `string?` (ISO-8601) | nein | — |
| `page`, `pageSize` | `int?` | nein | Default 1 / 50, max 200 |

**Response 200** — `items` (`AuditEntry[]`, neueste zuerst), `page`, `pageSize`, `total`. `AuditEntry`: `id`, `imageId`, `action`, `actorUserId`, `payload`, `createdAt`.

**Fehler:** `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORG_SCOPE` · `404 NOT_FOUND`.

### 6.10 Übergreifende API-Regeln

- **Idempotenz:** Alle Mutationen verlangen `Idempotency-Key`. Server speichert den Key 24 h und liefert bei Replay dieselbe Response (Status + Body). Konflikt (gleicher Key, anderer Body) → `409 IDEMPOTENCY_CONFLICT`.
- **Pagination:** Cursor- oder Offset-Pagination konsistent zu existierenden Routen — `Inferred` (im Repo-Pattern zu verifizieren).
- **Tracing:** Jeder Response trägt `X-Request-Id` (Recommended; in ADR-XXXX zu fixieren).
- **Kein Service-Role:** Jeder Endpoint läuft unter dem User-JWT. `apps/api/AGENTS.md:36-37, 92-93` ist verbindlich.

---

## 7. Berechtigungen (RBAC)

### 7.1 Rollen-Modell

`Inferred` — das vom User vorgegebene Rollen-Set ist `Owner / Admin / Manager / Staff / Viewer`. Die kanonische Rollen-Liste im Repo-Stand findet sich in `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` als `admin / shift_lead / staff`. **Recommended**: Im ADR-XXXX die Rollen-Hierarchie abstimmen und entweder die `Owner / Admin / Manager / Staff / Viewer`-Skala in die existierende Taxonomie abbilden oder die existierende Taxonomie erweitern. Diese Spec legt die Wirkung pro Aktion fest; die **Namen** sind in der ADR zu finalisieren.

### 7.2 Aktions-×-Rollen-Matrix

`min. Rolle` = niedrigste Rolle, die die Aktion **ohne** Operator-Freigabe ausführen darf. Höhere Rollen erben alle Rechte der niedrigeren.

| Aktion | min. Rolle | Risiko | Anmerkung |
|---|---|---|---|
| Galerie ansehen (`GET /images`) | `Viewer` | L0 | Alle Rollen. |
| Liste filtern | `Viewer` | L0 | — |
| Bild herunterladen (Signed-URL) | `Viewer` | L0 | — |
| Bild hochladen | `Staff` | L1 | Self-Upload in eigenem Org-Scope. |
| Caption / Tags bearbeiten (eigene Bilder) | `Staff` | L1 | Self-Edit am eigenen Bild. |
| Caption / Tags bearbeiten (Bilder anderer User) | `Manager` | L1 | Cross-User-Edit. |
| `rotationDeg` setzen | `Staff` | L1 | Metadata only. |
| `isPrimary` setzen (eigenes Bild) | `Staff` | L1 | — |
| `isPrimary` setzen (Bild anderer User) | `Manager` | L1 | Cross-User. |
| Soft-Delete Einzelbild (eigenes Bild) | `Staff` | L2 | Per `IDENTITY.md:120` "Unklare Stufe → eine Stufe höher". |
| Soft-Delete Einzelbild (Bild anderer User) | `Manager` | L2 | Cross-User. |
| Bulk Soft-Delete 2–9 Bilder | `Manager` | L2 | — |
| Bulk Soft-Delete ≥ 10 Bilder | `Admin` | L2 + L2-Evidence | L2-Evidence-Artefakt nach §9. |
| Bulk Soft-Delete "alle Bilder eines Owners" | `Admin` | L3 + Operator-Freigabe | Operator-Freigabe nach `governance/approval-matrix.md:14`. |
| Restore (eigenes Bild) | `Staff` | L1 | — |
| Restore (Bild anderer User) | `Manager` | L1 | — |
| Audit-Trail ansehen | `Manager` | L0 | Audit-Daten sind personalbezogen. |
| Liste mit `includeDeleted=true` | `Manager` | L0 | Default `false`. |
| Bucket-Konfiguration / RLS-Änderung | `Owner` | L4 | Hard-Restriction, nie via UI. |
| Soft-Delete aller Bilder der Org | `Owner` + Operator | L3/L4 | Out of MVP. |

### 7.3 RLS vs. RBAC

- **RLS** (`apps/api/AGENTS.md:92-93`) ist die **autoritative** Zeilen-Sichtbarkeit auf DB-Ebene. Ohne RLS-Freigabe ist eine Zeile für den User **nicht existent**; das ist eine Vor-Bedingung, keine Berechtigungs-Stufe.
- **RBAC** ist die zusätzliche, granulare "Wer darf was schreiben"-Schicht **innerhalb** des RLS-Scopes.
- Konflikte gehen in Richtung "sicherer": RLS verbietet zuerst, RBAC kann nur weiter einschränken.

---

## 8. Validierung & Limits

### 8.1 Maximale Dateigröße

- **Per File:** 10 MB (Recommended Default). Höhere Limits würden Mobile-Upload-Zeit und Storage-Kosten unnötig treiben; Cockpit-Use-Case ist Tablet/Phone in der Küche/an der Bar, nicht Hochformat-Foto-Studio.
- **Total pro Owner:** 200 MB (Recommended Default). Hard-Cap als App-Layer-Check; nicht durch Storage-Bucket-Quota erzwungen.

### 8.2 Mime-Allowlist

- `image/jpeg` (`.jpg`, `.jpeg`)
- `image/png` (`.png`)
- `image/webp` (`.webp`)
- `image/heic` (`.heic`) — Mobile-Quellen; **Recommended**: serverseitig nach WebP/JPEG transkodieren, **außerhalb** dieser Spec (separater ADR-Diskussionspunkt, würde Bild-Processing-Pipeline erfordern, die derzeit nicht im Repo existiert).

Andere Mimes werden mit `415 UNSUPPORTED_MIME` abgelehnt.

### 8.3 Dimensions-Limits

- Max `width`/`height`: 6000 × 6000 px (Recommended Default). Größere Bilder werden vor Upload vom Client skaliert; falls roh eingereicht, lehnt der Server mit `413 PAYLOAD_TOO_LARGE` ab.
- Min `width`/`height`: 64 × 64 px. Darunter ist die Galerie-Vorschau nicht sinnvoll.

### 8.4 Tag-Normalisierung

- Trim, Lowercase, ASCII-only (Recommended).
- Max. 64 Zeichen pro Tag.
- Max. 20 Tags pro Bild.
- Erlaubte Zeichen: `[a-z0-9-_]` (Whitespace mit `-` ersetzt).
- Diese Regeln sind **app-seitig** durchzusetzen, nicht durch DB-Constraint (DB lässt `text[]` durch).

### 8.5 EXIF-Politik

- **GPS-Daten werden immer serverseitig entfernt** (Datenschutz; Tags können Standort enthalten, das ist nicht beabsichtigt).
- Kamera-Modell, Aufnahme-Datum, Blende etc. **bleiben** erhalten (nicht-personenbezogen, nützlich für Audit).
- Implementierung: in der Upload-Pipeline mit `sharp` oder `exiftool`. **Recommended** Variante in ADR-XXXX.
- Pixel-EXIF-Rotation wird **nicht** angewendet; Rotation wird als UI-Metadata-Hint (`rotationDeg`) gepflegt.

### 8.6 Validierungs-Gate (TTD-Kontrakt)

Bevor ein Bild-Insert in `ItemImage` stattfindet, MÜSSEN serverseitig folgende Checks bestanden sein (in dieser Reihenfolge):

1. Authentifizierung (JWT gültig).
2. RLS-Scope-Check für `ownerType/ownerId`.
3. Mime-Allowlist (§8.2).
4. Size-Limit (§8.1).
5. Dimensions-Limits (§8.3) — falls `width`/`height` mitgesendet.
6. Storage-Objekt-Existenz und Größen-Match.
7. Tag-Normalisierung (§8.4).
8. EXIF-Stripping (§8.5) — als Post-Upload-Step.

---

## 9. Audit & Evidence

### 9.1 Datenbank-Audit (pro Mutation)

Jede Mutation in `ItemImage` erzeugt **eine** Append-only-Row in `ItemImageAudit` mit:

- `imageId`, `organizationId`, `action`, `actorUserId`, `payload` (optional Diff), `createdAt`.

Actions siehe §4.2. Audit-Rows werden **nie** updated oder gelöscht (siehe §4.2 "Append-only-Constraints"). Dies steht im Einklang mit `apps/api/AGENTS.md:95-98` ("nur Append erlaubt" für vergleichbare Audit-Trails wie `AutomationDecision`).

### 9.2 Evidence-Artefakt (Datei-Ebene)

`governance/evidence-contract.md:10-22` definiert das Pflicht-Schema. Anwendung auf diese Spec:

| Aktion | Stufe | Evidence-Artefakt erforderlich? |
|---|---|---|
| Upload, Tag-Edit, Caption-Edit, Rotation, `isPrimary`-Set, Restore, Audit-Read | L0/L1 | nein |
| Soft-Delete Einzelbild | L2 | **empfohlen**, nicht zwingend (Self-Review-Pfad) |
| Bulk Soft-Delete 2–9 Bilder | L2 | **empfohlen** |
| Bulk Soft-Delete ≥ 10 Bilder | L2 | **pflichtend** (`logs/evidence/YYYY-MM-DD-bulk-image-delete-{ownerId}.md`) |
| Bulk Soft-Delete "alle Bilder eines Owners" | L3 | **pflichtend** + Operator-Freigabe-Anhang |
| Bucket-/RLS-Konfigurations-Änderung | L4 | immer pflichtend + 2× Reviewer + Operator |

Ablageort nach `governance/evidence-contract.md:28-33`:

- L2: `logs/evidence/YYYY-MM-DD-[slug].md`
- L3/L4: gleicher Pfad + Operator-Freigabe als Anhang (im Markdown-File unter `## Operator-Freigabe`).

### 9.3 Audit-Log-Eintrag

Nach Execution jeder L2+-Aktion erzeugt der `@auditor`-Agent (siehe `AGENTS.md:17`) einen Eintrag in `logs/audit-log.md` nach dem Schema aus `governance/evidence-contract.md:39-42`:

```
YYYY-MM-DD | L2 | [Aktion] | [Author] | [Reviewer] | executed | [evidence-link]
```

### 9.4 Privacy-Hinweis

Bilder können personenbezogene Daten enthalten (Gesichter von Mitarbeitern, Kunden-Tische, Standort-Sichtbarkeit). GPS-Stripping (§8.5) ist die **minimale** Privacy-Maßnahme. **Recommended**: im ADR-XXXX eine Retention-Policy und eine DSGVO-/Compliance-Bewertung (Standort-Bilder) festhalten.

---

## 10. Test-Strategie (Vitest)

Test-Surfaces, jeder mit explizitem TDD-Gate.

| Test-Surface | Was wird getestet? | Wo? (Recommended-Pfad) |
|---|---|---|
| Zod-Schema-Validierung | Allowlist-Mimes, Size-Limits, Tag-Normalisierung, Enum-Werte | `apps/api/tests/images/zod.spec.ts` |
| RLS-Row-Level-Isolation | User A sieht/bearbeitet nur eigene Org-Rows; INSERT mit fremder `organizationId` schlägt fehl; UPDATE mit Cross-Org-`ownerId` schlägt fehl | `apps/api/tests/images/rls.spec.ts` |
| Signed-URL-TTL | Generierte URL ist nach TTL nicht mehr gültig (Test mit `Date.now() + TTL + 1ms`) | `apps/api/tests/images/signed-url.spec.ts` |
| Soft-Delete / Restore Idempotenz | Zweiter `DELETE` auf soft-deleted Row liefert `404`; Restore auf nicht-soft-deleted Row liefert `404`; Audit-Append ist **genau einmal** pro tatsächlicher Mutation | `apps/api/tests/images/lifecycle.spec.ts` |
| Audit-Row Append-Only | Versuch eines `UPDATE`/`DELETE` auf `ItemImageAudit` schlägt fehl (DB-Revoke) | `apps/api/tests/images/audit.spec.ts` |
| Mime-Allowlist-Reject | Jeder Mime außerhalb §8.2 liefert `415` | `apps/api/tests/images/mime.spec.ts` |
| EXIF-GPS-Stripping | Eingehendes JPEG mit GPS-Tag wird ohne GPS-Tag gespeichert (Header-Check auf gespeicherte Bytes) | `apps/api/tests/images/exif.spec.ts` |
| RBAC-Matrix | Pro Aktion die min. Rolle testen: niedrigere Rolle → `403`, höhere Rolle → Erfolg | `apps/api/tests/images/rbac.spec.ts` |
| Primary-Eindeutigkeit | Zwei Bilder als `isPrimary=true` für denselben Owner ist nicht möglich; Setzen von Primary B wechselt Primary A implizit auf `false` (in einer Transaktion) | `apps/api/tests/images/primary.spec.ts` |
| Idempotenz-Key | Gleicher Key + gleicher Body → identische Response; gleicher Key + anderer Body → `409` | `apps/api/tests/images/idempotency.spec.ts` |
| Bulk-Delete-Stufen | 2–9 Bilder: Manager OK; ≥ 10: nur Admin; `allForOwner`: zusätzlich Operator-Freigabe | `apps/api/tests/images/bulk.spec.ts` |

CI-Gate nach `OS.md:128-133` (Repo-Standard): `npm run typecheck && npm run test` muss grün sein, bevor ein PR gemergt wird.

---

## 11. Migration / Rollout

Reihenfolge ist **verbindlich**; jeder Schritt ist Gate, bevor der nächste startet.

1. **ADR-XXXX akzeptiert.** Neuer ADR in `docs/DECISIONS.md` mit `Status: accepted`. Inhalt mindestens: Owner-Polymorphismus, RLS-Politik, Append-only-Audit, Soft-Delete-Konvention, EXIF-GPS-Stripping, Storage-Bucket-Design, Idempotenz-Key-Pattern, RBAC-Matrix §7, Reconciliation mit `docs/ROLE_BASED_UI_UX_PHASE_0.md`.
2. **Prisma-Migration additiv.** Migration erzeugt `ItemImage` und `ItemImageAudit`. Keine Änderung an `InventoryItem` / `StorageLocation`. Keine Lösch-Migrationen. `prisma migrate deploy` auf Staging.
3. **Supabase-Storage-Bucket anlegen.** Bucket `item-images` als **private** im Supabase-Dashboard. Storage-RLS-Policies nach §5.1 deployen. **Außerhalb** der Prisma-Migration, dokumentiert als manuelle Schritte im ADR-XXXX.
4. **RLS-Policies aktivieren.** `GRANT`/`REVOKE` und `CREATE POLICY` auf `ItemImage` und `ItemImageAudit`. Service-Role-Restriktion nach §4.4 und `apps/api/AGENTS.md:36-37, 92-93`.
5. **API + Tests grün.** Fastify-Routen-Plugin + Vitest-Suites nach §10. `npm run ci` grün auf Staging.
6. **UI hinter Feature-Flag.** Cockpit-Routen `apps/cockpit/app/(app)/inventory/items/[id]/images/page.tsx` und `apps/cockpit/app/(app)/storage/[id]/images/page.tsx` (Recommended-Pfade, `Inferred`) hinter einem Env-Flag `NEXT_PUBLIC_FEATURE_ITEM_IMAGES` (Default `false` in Production).
7. **Operator Opt-in.** Operator setzt das Feature-Flag pro Org in den Cockpit-Settings, **nachdem** §12 "Offene Fragen" entschieden sind und ein Smoke-Test auf Staging dokumentiert ist.

**Rollback-Strategie**

- Schritte 1–4: ADR-Status auf `superseded` setzen, Migration in einer Folge-Migration `DROP TABLE item_image_audit, item_image` (nur wenn keine Rows in Produktion).
- Schritte 5–6: Code-Revert, Feature-Flag auf `false`.
- Schritt 7: Feature-Flag auf `false`. Soft-Delete-Rows bleiben für Audit; werden via §5.3-Lifecycle aufgeräumt.

---

## 12. Offene Fragen

`Recommended`-Liste. Keine dieser Fragen wird in dieser Spec entschieden; jede muss vor Implementierungs-Start beantwortet werden.

1. **Bilder-Anhang an `InventoryMovement`?**  
   `apps/api/AGENTS.md:86` verbietet automatische Stock-Mutation. Ein angehängtes Bild an einem Movement ist semantisch verlockend (Foto des Wareneingangs), berührt aber die Append-only-Plane. Soll ein separates opt-in Feld `attachedImageIds` auf `InventoryMovement` erlaubt sein, oder strikt getrennt bleiben? **Empfehlung:** zunächst **strikt getrennt**; Bewegung bleibt bildfrei.

2. **Rollen-Hierarchie abstimmen.**  
   Diese Spec nutzt `Owner / Admin / Manager / Staff / Viewer`; `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` kennt nur `admin / shift_lead / staff`. Soll die Hierarchie erweitert, gemappt oder neu geschnitten werden? **Empfehlung:** im ADR-XXXX explizit dokumentieren und entweder die existierende Taxonomie erweitern oder die Wirkung 1:1 auf die neue Skala abbilden.

3. **Storage-Lifecycle-Policy.**  
   Wann werden soft-deleted Bilder im Storage endgültig gelöscht? Empfehlung: 30 Tage nach `deletedAt`, **wenn** kein Restore-Audit-Eintrag existiert. Bestätigung erforderlich.

4. **EXIF-Transcoding für HEIC.**  
   iOS-Geräte liefern HEIC. Soll die API HEIC on-the-fly zu JPEG/WebP transkodieren? Das würde eine Bild-Pipeline einführen, die in `apps/api/AGENTS.md:86-99` derzeit nicht abgedeckt ist. **Empfehlung:** HEIC in v1 ablehnen, in v2 als separater ADR.

5. **Bild-Pipeline auf Serverless.**  
   Vercel-Funktionen haben Body-Size-Limits (~4.5 MB auf Hobby, 100 MB auf Pro bei direkter Multipart-Annahme). Empfehlung: Pattern A (Signed-Upload-URL + separate `POST /images` für Metadaten) als Default, Multipart-Fallback nur, wenn die Hosting-Constraints es erlauben. Bestätigung erforderlich.

6. **UI-Feature-Flag-Lifecycle.**  
   Wann wird das Feature aus dem Flag genommen? Empfehlung: nach ≥ 4 Wochen stabiler Produktiv-Nutzung in ≥ 2 Orgs. Bestätigung erforderlich.

7. **Datenschutz-/DSGVO-Bewertung.**  
   Bilder können Personen, Kunden-Tische, Standorte zeigen. Soll eine Retention-Policy pro Owner-Typ (item vs. location) eingeführt werden? Empfehlung: im ADR-XXXX eine DSGVO-Bewertung als Anlage verlangen.

---

## 13. Verweise

Exakte Pfade und Zeilennummern zu jeder zitierten Autoritäts-Quelle in dieser Spec.

### 13.1 Identität und Governance

- `IDENTITY.md:108-120` — Risikostufen L0–L4, Matrix und Gastronomie-Beispiele.
- `IDENTITY.md:120` — Klassifikationsregel "Unklare Stufe → eine Stufe höher".
- `IDENTITY.md:148-153` — Liste der Aktionen, die das OS niemals ohne Freigabe ausführen darf.
- `IDENTITY.md:184-193` — Autoritätskette `IDENTITY.md` → `OS.md` → `governance/rules.md` → `AGENTS.md`.
- `OS.md:21-79` — Repo-Struktur (Monorepo-Layout, Apps, docs/, governance/).
- `OS.md:128-133` — `npm`-Skripte `typecheck`, `test`, `ci` (CI-Gate).
- `governance/rules.md:1-49` — Regeln 1–6 (Draft-vor-Commitment, Risikostufe-zuerst, kein-Kontext-aus-dem-Kopf, Audit, Operator-Freigabe, externe Systeme).
- `governance/approval-matrix.md:7-16` — Stufen-×-Approval-Pfad-Matrix.
- `governance/approval-matrix.md:19-26` — Rollen `operator / reviewer / governance / author`.
- `governance/evidence-contract.md:10-22` — Pflichtfelder eines Evidence-Artefakts.
- `governance/evidence-contract.md:28-33` — Ablageort für L2/L3/L4.
- `governance/evidence-contract.md:39-42` — Audit-Log-Eintragsschema.
- `AGENTS.md:6-17` — Agent-Rollen, max. Stufe ohne Freigabe.
- `AGENTS.md:22-27` — Agent-Grenzen.

### 13.2 Repo-API-Guardrails

- `apps/api/AGENTS.md:36-37` — Service-Role nur für Admin/Migration/Cron.
- `apps/api/AGENTS.md:86` — "No automatic stock mutation. Suggestions only; humans approve."
- `apps/api/AGENTS.md:87-88` — Kein Writeback an FoodNotify/Dynamics/DATEV.
- `apps/api/AGENTS.md:89-91` — Keine LLM-gestützte Approval/Ordering/Stock-Mutation.
- `apps/api/AGENTS.md:92-93` — Keine Service-Role in User-Pfaden; RLS ist autoritativ.
- `apps/api/AGENTS.md:95-98` — `InventoryStockSnapshot` read-only; nur `InventoryMovement` (append-only) mutiert Snapshots; Append-only für `AutomationSuggestion`/`AutomationDecision`.
- `apps/api/AGENTS.md:100-103` — Neue Datenmodelle brauchen ADR-Acceptance vor Migration.
- `apps/api/AGENTS.md:129-143` — Autoritäts-Resolution-Order (DECISIONS → Automation-Spec → VISION → agent-team → README/AGENTS).

### 13.3 Existierende ADRs (`docs/DECISIONS.md`)

- `docs/DECISIONS.md:56-61` — ADR-0009 Soft-Deactivation; Pattern-Vorlage für `isActive`.
- `docs/DECISIONS.md:69-75` — ADR-0011 Supabase Postgres kanonisch.
- `docs/DECISIONS.md:77-81` — ADR-0012 Rollenbasiertes UX baut auf DB-Inventory auf.
- `docs/DECISIONS.md:83-98` — ADR-0013 Cockpit ist Next.js (`apps/cockpit/`).
- `docs/DECISIONS.md:100` — ADR-0014 Organisations-Identität aus Supabase-Auth.

### 13.4 Prisma-Schema-Anker

- `apps/api/prisma/schema.prisma:86-120` — `InventoryItem` (kein Bild-Feld, `organizationId` nullable).
- `apps/api/prisma/schema.prisma:226-258` — `StorageLocation` (kein Bild-Feld, `organizationId` nullable).
- `apps/api/prisma/schema.prisma:260-271` — `OrganizationMember` mit `role: OrganizationRole`.
- `apps/api/prisma/schema.prisma:395-429` — `InventoryMovement` (append-only, `idempotencyKey @unique`).
- `apps/api/prisma/schema.prisma:1892-1901` — `BusinessUnitLocation.isPrimary` Pattern-Vorlage.

### 13.5 Cockpit-UI-Anker

- `apps/cockpit/app/(app)/inventory/items/page.tsx:1` — existierende Items-Route.
- `apps/cockpit/app/(app)/storage/page.tsx:1` — existierende Storage-Route.

### 13.6 Rollen-Doku

- `docs/ROLE_BASED_UI_UX_PHASE_0.md:22-24` — kanonische Rollen heute: `admin / shift_lead / staff`.
- `docs/ROLE_BASED_UI_UX_PHASE_0.md:55-62` — Cockpit-UI-Migrationsziel; UI-Erweiterung in `apps/cockpit/`.

### 13.7 Strategie

- `docs/VISION.md` — Produkt-Positionierung Bevero, Phase-Plan, explizite Nicht-Ablösung von FoodNotify/Dynamics/DATEV.
- `docs/RAUSCHENBERGER-OS-SUMMARY.md` — High-Level-Bevero/OS-Übersicht (zur Einordnung, kein normativer Inhalt für diese Spec).

---

## Anhang A — Spec-Selbst-Check (Observed)

- [x] §1 Zweck & Scope vorhanden, in/out-Scope explizit.
- [x] §2 Autorität & Vorbedingungen mit konkreten ADR-Referenzen.
- [x] §3 Risikostufe L0–L4 pro Sub-Aktion, Regel "Unklare Stufe → eine Stufe höher" angewendet.
- [x] §4 Datenmodell als Tabellen (kein DDL/Code), Owner-Polymorphismus ohne FK.
- [x] §5 Storage-Strategie: privater Bucket, Pfad-Konvention, Signed-URL-TTLs.
- [x] §6 API-Kontrakte als Tabellen (kein TypeScript/Prisma DDL/SQL), 9 Endpoints.
- [x] §7 RBAC-Matrix mit min. Rolle pro Aktion; Reconciliation mit `ROLE_BASED_UI_UX_PHASE_0.md` markiert.
- [x] §8 Validierung & Limits (Größe, Mime, Dimensionen, Tags, EXIF).
- [x] §9 Audit & Evidence, Verweis auf `evidence-contract.md`.
- [x] §10 Test-Strategie mit Vitest-Surfaces.
- [x] §11 Migration / Rollout 7-stufig.
- [x] §12 Offene Fragen: 7 (über das Mindestmaß von 3–6 hinaus, alle mit `Recommended`).
- [x] §13 Verweise mit `file_path:line_number` für jede zitierte Stelle.
- [x] Keine Code-Blöcke mit TypeScript/Prisma DDL/SQL.
- [x] Keine bestehende Datei modifiziert (Observed: einziger Write-Target ist `docs/features/item-image-service.md`).
- [x] Hard-Guardrails `apps/api/AGENTS.md:36-37, 86-99` werden respektiert (kein Stock-Writeback, kein Service-Role, RLS-autoritativ, Append-only-Audit, keine LLM-Auswertung).
