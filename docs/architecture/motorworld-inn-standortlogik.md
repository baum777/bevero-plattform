# Motorworld-Inn Standortlogik

**Status:** accepted — ADR-0049 (2026-06-09)
**Maintainer:** architect agent / owner

## Übersicht

Motorworld-Inn betreibt 4 Standorte: München, Böblingen, Warthausen, Mallorca. Jeder Standort hat ein anderes Set von Betriebseinheiten (OperationalUnits), Event-Räumen (EventSpaces), Reservation-Connectoren und Sonderregeln (ExceptionRules). Alle 4 Standorte werden auf der bestehenden `Location`/`Area`/`OperationalUnit`/`ServiceSlot`-Hierarchie aus ADR-0031 + Task 01 abgebildet — **kein eigenes Schema, kein eigener Enum-Wert pro Standort**.

## Standort-Matrix

| Feature | München | Böblingen | Warthausen | Mallorca |
|---|---|---|---|---|
| `LocationProfile` | MOTORWORLD_STANDARD | MOTORWORLD_STANDARD | MOTORWORLD_STANDARD | MOTORWORLD_STANDARD |
| Restaurant | ✓ | ✓ | ✓ | ✓ |
| Bar | ✓ | — | — | ✓ |
| Café | — | Motomio Cafébar | — | ✓ |
| Hotel-Kontext | — | ✓ (eviivo) | ✓ (eviivo) | — |
| Outdoor-Bar/Terrasse | — | — | ✓ Biergarten | ✓ |
| Cinema | Movie Cars Cinema | — | — | — |
| Reservation-Connector | gastronaut | gastronaut | gastronovi + eviivo | gastronaut |
| ExceptionRule | — | — | Öchsle-Buffet | weatherSensitive |
| `cinemaAvailable` | true | false | false | false |
| `weatherSensitive` | false | false | false | true |

## OperationalUnit-Typen (brand-übergreifend)

Folgende Typen aus `OperationalUnitType` decken alle 4 Standorte ab:

- `RESTAURANT` — Hauptrestaurant (alle Standorte)
- `BAR` — Bar / Lounge (München, Mallorca)
- `CAFE_BAR` — Cafébar (Böblingen Motomio, Mallorca)
- `OUTDOOR_BAR_TERRACE` — Outdoor-Bar / Biergarten / Terrasse (Warthausen, Mallorca)
- `HOTEL_CONTEXT` — Hotel-Betrieb (Böblingen, Warthausen, kein PMS-Build in dieser Slice)
- `EVENT_BANKETT` — Eventlocation / Bankett (alle Standorte)
- `COLLECTIVE_OTHER` — Sonstige (fallback)

**Anti-Enum-Inflation-Prinzip:** `LocationProfile` bleibt abstrakt (MOTORWORLD_STANDARD / CUBE_PREMIUM / EVENT_BANKETT_FUTURE). Standort-Spezifika hängen ausschließlich an `OperationalUnit.unitType`, `EventSpace.supports`, und `Location`-Feldern (`cinemaAvailable`, `weatherSensitive`, `signatureAssets`).

## Decision Tree: Welches Modell für welches Spezifikum?

```
Standort-Spezifikum
├── Kapazität eines Raumes?
│   → EventSpace.capacitySeated / capacityStanding / Indoor / Outdoor
├── Spezielle Raumfunktion (Cinema, Wedding, Conference)?
│   → EventSpace.supports (EventSpaceSupport Enum)
├── Reservation-Provider (gastronaut, gastronovi, eviivo)?
│   → ReservationConnector.provider + externalUrl
├── Externes System (Gutscheine, PMS, Fahrplan)?
│   → ExternalSystemLink.kind + url
├── Zeitlich begrenzte Override-Regel (Öchsle-Buffet, Holiday)?
│   → ExceptionRule.type + affectedUnitIds + startsAt/endsAt
├── Signature-Assets (25m Bar, 1954 Buick)?
│   → Location.signatureAssets String[]
├── Outdoor-Sensitivität (Mallorca)?
│   → Location.weatherSensitive Boolean
└── Cinema-Verfügbarkeit (München)?
    → Location.cinemaAvailable Boolean
```

## Standort-Details

### München
- **Restaurant** + **Bar** + **EventBankett** (Eventlocation)
- **Movie Cars Cinema** (27 Plätze) → `EventSpace` mit `supports = [CINEMA, DINNER_THEATER]` + `Location.cinemaAvailable = true`
- **Signature Assets:** `["25m Bar", "1954 Buick Super Convertible", "Rennstrecke", "Rennwagen-Sammlung"]`
- **Reservation:** gastronaut

### Böblingen
- **Restaurant** + **Motomio Cafébar** (CAFE_BAR) + **EventBankett** (Eventlocation 300 Plätze) + **Hotel-Context** (eviivo PMS)
- **Signature Assets:** `["Motorworld Village", "Oldtimer-Ausstellung", "Tagungsräume"]`
- **Reservation:** gastronaut
- **External System:** HOTEL_EVIIVO (read-only Link)

### Warthausen
- **Restaurant** + **Biergarten** (OUTDOOR_BAR_TERRACE) + **Tagungsräume** + **EventBankett** + **Hotel-Context** (8 Themenzimmer)
- **EventSpaces:** Rennstall (100 sitzend / 40 Cocktail), Museum (150–200), Sieben Schwaben & Hubertuskeller (20), Tagungsräume Museum & Tüftler
- **Öchsle-Buffet-Override:** `ExceptionRule.type = OECHSLE_BUFFET_OVERRIDE` + `requiresConfirmation = true` (Warthausen liegt an Öchsle-Schmalspurbahn; Fahrplan-Events lösen Buffet-Override aus)
- **Signature Assets:** `["Öchsle Schmalspurbahn", "Rennstall", "Museum", "Hubertuskeller", "8 Themenzimmer"]`
- **Reservation:** gastronovi + eviivo

### Mallorca
- **Café** + **Restaurant** + **Outdoor-Bar** + **Terrasse** (OUTDOOR_BAR_TERRACE) + **EventBankett**
- **EventSpaces:** Innen (230), Außen (220), Eventhalle (450), Seminarwelt (2.000 auf 80.000 m²)
- `Location.weatherSensitive = true` → Cockpit-Tile zeigt Weather-Hinweis wenn `OUTDOOR_BAR_TERRACE`-Slot aktiv
- **Signature Assets:** `["Eventhalle", "Seminarwelt", "Mallorca Outdoor Terrasse"]`
- **Reservation:** gastronaut

## Was KEIN eigenes Schema braucht

- Reservation-Provider → `ReservationConnector`-Tabelle
- Hotel-Zimmer-Anzahl / Themenzimmer-Namen → `ExternalCatalogEntry.metadata Json?`
- Event-Räume-Kapazität → `EventSpace.capacitySeated/Standing/Indoor/Outdoor`

## Erweiterung (proposed, ungelandet): Küche & Lagerhaltung Böblingen

**Status:** proposed — kein ADR, kein Migration-Eintrag. Quelle: Org-Spec "MW Inn Böblingen · Küche & Lagerhaltung" (2026-06-16, eingebracht von Produktseite, nicht vom Architekten verfasst).

Die Spec fordert eine eigenständige Küchen-/Lager-Organisationseinheit unter Böblingen mit eigenem Dropdown-Eintrag, eigenen KPIs, physischer Lagerstruktur (Produktionsküche, Kühlhäuser, Froster, Keller-Trockenlager, Transferpunkte) und rollenbasierter Sichtbarkeit. Das Zielbild ist architektonisch sinnvoll — die vorgeschlagenen Typnamen kollidieren aber mit bestehenden Modellen aus §1–§2. Diese Sektion mappt die Spec auf das existierende Substrat, statt ein paralleles Schema einzuführen.

### Mapping: Spec-Begriff → existierendes Modell

| Spec-Begriff | Spec-Feld/Typ | Existierendes Modell | Hinweis |
|---|---|---|---|
| Organisation "Küche & Lagerhaltung" | `Organization.type = "kitchen_storage"` | **Kollision.** `Organization` ist bereits belegt — Mother-Concern-Ebene (`Rauschenberger GmbH`, `prisma/schema.prisma:1770-1787`, §1 Hierarchie-Diagramm). Eine zweite, Standort-lokale Bedeutung von "Organization" widerspricht ADR-0030 §1 und der Hierarchie `Organization → Brand → Location → Area`. Richtige Abbildung: **`OperationalUnit`** mit `unitType` + `inventoryScopes: ["kitchen", "storage"]` (`operational-unit.types.ts:40`, bereits vorhanden), gescoped auf `locationId` = Böblingen. |
| `KitchenLocationType` (production_kitchen, cooling_room, freezer_chest, freezer_upright, dry_storage, passage, stair_access, transfer_point) | neuer Enum | **`Area.type`** (freitext String, `prisma/schema.prisma:1017`) für die grobe Gliederung (Küche, Keller), **`StorageLocation.type`** (freitext String, `prisma/schema.prisma:230`) für den einzelnen Lagerpunkt (Kühlhaus Links 1, Froster stehend 2, …). Kein neuer Enum nötig — beide Felder sind bereits `String?`, kein RLS- oder Trigger-Aufwand. |
| `Location.floor`, `walk_order`, `temperature_zone`, `is_countable`, `is_transfer_point` | neue Felder auf `Location` | Gehören fachlich auf **`StorageLocation`**, nicht auf `Location` (= Standort, hier bereits "MW Inn Böblingen"). Wären additive Spalten auf `StorageLocation`; aktuell nicht vorhanden — **Gap**, kein Blocker (kein Verbraucher heute). `walk_order` deckt sich konzeptionell mit `Area.sortOrder` (`prisma/schema.prisma:1020`), müsste für die Lagerpunkt-Ebene aber auf `StorageLocation` ergänzt werden. |
| `InventoryItem`, `StockBalance`, `StockMovement` | neue Tabellen | **Bereits vorhanden** unter anderem Namen: `InventoryItem`, `InventoryStockSnapshot` (≈ StockBalance), `InventoryMovement` (≈ StockMovement) — alle aktuell `organizationId`-scoped auf Mother-Concern-Ebene (`StorageLocation` model, `prisma/schema.prisma:226-249`), nicht auf `locationId`/Standort-Ebene. Die Spec-Felder `movement_type: goods_receipt\|transfer\|consumption\|correction\|inventory_adjustment` decken sich mit dem bestehenden Movement-Reason-Vokabular in `src/modules/inventory/` (nicht im Detail gegengeprüft — bei Umsetzung verifizieren, nicht annehmen). |
| Wareneingang/Umlagerung/Entnahme/Korrektur-Workflows (§7.1–7.5) | neue Endpunkte | Decken sich konzeptionell mit den vorhandenen `GoodsReceiptItem`, `InventoryMovement` (inkl. `fromLocation`/`toLocation`-Relation, `prisma/schema.prisma:238-239`) — kein neuer Workflow-Typ, sondern Anwendung des bestehenden Movement-Modells auf den neuen Area/StorageLocation-Baum unter Böblingen. |
| `UserOrganizationMembership` mit Rollen `kitchen_lead`, `inventory_controller`, `kitchen_staff` | neues Membership-Modell | **`LocationMember.role`** (freitext String, `prisma/schema.prisma:1039`) ist bereits Standort-scoped und rollenoffen — neue Rollenwerte sind reine Daten, kein Schema-Change. Mother-Concern-weite Rollen bleiben `OrganizationMember.role` (Enum `OrganizationRole`). |
| Top-Right-Dropdown "Standort/Organisation" filtert nach Membership | UI-Kontext-Switch | Entspricht dem bestehenden `LocationContextProvider`-Muster (§2.5, `apps/cockpit/lib/location-context.tsx`) plus einer neuen Auswahl-Ebene **innerhalb** der Location (Area-Gruppe statt eigene Location/Organization). Erfordert Erweiterung der Cockpit-Picker-Logik, kein Backend-Strukturwechsel. |

### Resultierende Struktur (TO-BE, ungelandet)

```
Organization (Rauschenberger GmbH)
└─ Brand (Motorworld)
   └─ Location "MW Inn Böblingen"   [profile = MOTORWORLD_STANDARD]
      ├─ Area "Bar / Getränke"                 (type = "bar")
      ├─ Area "Service / Front of House"       (type = "service")
      └─ Area "Küche & Lagerhaltung"            (type = "kitchen_storage")
         ├─ StorageLocation "Produktionsküche Mitte"   (type = "production_kitchen")
         ├─ StorageLocation "Kühlhaus Links 1"          (type = "cooling_room")
         ├─ StorageLocation "Froster stehend 1"         (type = "freezer_upright")
         ├─ StorageLocation "Keller-Trockenlager"       (type = "dry_storage")
         └─ StorageLocation "Kellertreppe"              (type = "transfer_point")
```

Die Sichtbarkeits-/Rollenlogik aus §5 der Spec (Küchenleitung sieht nur Küche, Standortleitung sieht alles) ist mit `LocationMember` + einer zusätzlichen Area-Scope-Prüfung im Service-Layer abbildbar — analog zu M4/M5 in `docs/architecture/phase2-phase3-mapping.md` (per-Location-Narrowing ist dort bereits als offene Lücke dokumentiert, nicht erst hier neu).

### Was diese Sektion NICHT tut

- Kein neues `Organization.type`-Feld, keine neue Migration, kein neuer Enum — alles oben ist Mapping-Vorschlag, nicht Implementierungsstatus.
- Dashboard-KPIs aus Spec §6 (Lagerwert, Inventurabweichung, Verderbsquote) sind nicht gegen `src/modules/organization/organization.service.ts` (`getOverview`, M6/M7-Caveats) geprüft — bei Umsetzung mit der dortigen Drift-Liste abgleichen, nicht doppelt bauen.
- Vor Umsetzung: ADR nötig, das (a) die Organization-Namenskollision auflöst (Empfehlung: Spec-Begriff "Organisation" im Produkt-UI beibehalten, technisch aber als `Area`/`OperationalUnit`-Gruppe unter der bestehenden Location implementieren) und (b) entscheidet, ob `StorageLocation` Standort-scoped (`locationId`) statt nur `organizationId`-scoped wird — aktuell fehlt dort die FK auf `Location`.

## Binding-ADRs

- ADR-0021 §3 (no writeback, no LLM)
- ADR-0030 §Decisions §1 (Profil-Discriminator: kein `name === "MOTORWORLD_MÜNCHEN"`)
- ADR-0031 (Location/Area-Substrate)
- ADR-0049 (Phase A Contract)
- Task 01 (OperationalUnit brand-übergreifend)
- Task 05 (Phase B Implementierung)
- Küche & Lagerhaltung Böblingen — proposed, kein ADR (siehe Erweiterungs-Sektion oben)
