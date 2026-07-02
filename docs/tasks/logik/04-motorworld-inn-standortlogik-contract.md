# Task: Motorworld-Inn Standortlogik Phase A Contract

**Working title:** `motorworld-inn-standortlogik-contract`

**Status:** `IMPLEMENTED` — ADR-0049 drafted (proposed 2026-06-09); docs landed.
**Owner-ADR:** ADR-0049 (proposed) — *(renumbered 2026-06-09: war ADR-0038, jetzt ADR-0049 in Implementations-Reihenfolge)*
**Depends on:** ADR-0030 (accepted), ADR-0031 (accepted), ADR-0034-Substrate (Tasks 01+02), Cockpit-CUBE-Dashboard (Task 08) — *(Tippfehler-Korrektur 2026-06-09: L7 sagte fälschlich „Task 07"; gemeint ist das CUBE-Cockpit-Dashboard = Task 08 / ADR-0053)*
**Source spec:** Motorworld-Inn-Website Deepdive (4 Standorte: München, Böblingen, Warthausen, Mallorca), User-Pitch "Motorworld-Inn Standortlogik für Bevero"
**Target repo state:** docs-only contract, 2 neue Architektur-Dokumente + ADR-Block + MSPR.

## Decision

Motorworld-Inn 4 Standorte (München, Böblingen, Warthausen, Mallorca) erhalten **kein eigenes Schema**, sondern Location-spezifische Konfiguration auf der bestehenden `Location`/`Area`/`LocationInventoryConfig`/`OperationalUnit`/`ServiceSlot`-Hierarchie aus ADR-0031 + Task 01. Spezifika werden wie folgt modelliert:

- **Movie Cars Cinema** (München) → `EventSpace.support = CINEMA` + `Location.cinemaAvailable Boolean = true` (neues Feld auf `Location`).
- **Motomio Cafébar** (Böblingen) → `OperationalUnit.type = CAFE_BAR` (Erweiterung in Task 01) + `EventSpace` für Café-Bereich.
- **Öchsle-Buffet-Override** (Warthausen) → `ExceptionRule.type = OECHSLE_BUFFET_OVERRIDE` (neues Modell, siehe Task 04).
- **25m Bar, 1954 Buick, Windmühlen, Hebebühne, etc.** → `Location.signatureAssets String[]` (neues Feld, read-only Display, nicht Workflow-Quelle).
- **Hotel-Kontext** (Böblingen, Warthausen) → `OperationalUnit.type = HOTEL_CONTEXT` (Erweiterung in Task 01), `ExternalSystemLink.kind = HOTEL_EVIIVO` für PMS-Link.
- **Outdoor-Bar/Terrasse** (Mallorca) → `OperationalUnit.type = OUTDOOR_BAR_TERRACE` + `Location.weatherSensitive Boolean = true` (neues Feld).

**Anti-Enum-Inflation:** **Keine** neuen `LocationProfile`-Enum-Werte (`MOTORWORLD_MALLORCA` etc.). Profil bleibt abstrakt (MOTORWORLD_STANDARD / CUBE_PREMIUM / EVENT_BANKETT_FUTURE). Spezifika hängen an `OperationalUnit.type` + `EventSpace.support` + `Location`/`ExternalCatalogEntry`-Feldern. Begründung: OperationalUnit-Typen sind **brand-übergreifend** wiederverwendbar (CUBE o.T. Bar = OUTDOOR_BAR_TERRACE, Mallorca Outdoor-Bar = OUTDOOR_BAR_TERRACE).

**Standort-Spezifika, die KEIN Schema brauchen:**
- Reservation-Provider (gastronaut / gastronovi / phone) → `ReservationConnector` Tabelle, separate Spalte nicht auf `Location` (siehe Task 04).
- Hotel-Zimmer-Anzahl / Themenzimmer-Namen → `ExternalCatalogEntry.metadata Json?` (Partner-Asset) oder read-only Cockpit-Tile.
- Event-Räume-Kapazität (Rennstall 100/40, Museum 150–200, etc.) → `EventSpace.capacitySeated/Standing/Indoor/Outdoor`.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `docs/architecture/motorworld-inn-standortlogik.md` | new | ~500 Zeilen: Standort-Matrix 4×4, Decision-Tree, OperationalUnit-Type-Liste brand-übergreifend, Anti-Enum-Inflation-Begründung, Open Questions |
| `docs/architecture/exception-calendar.md` | new | ~200 Zeilen: ExceptionRule-Konzept, Warthausen Öchsle-Beispiel, manuelle Kurations-Disziplin |
| `docs/DECISIONS.md` | edit | ADR-0049 Block (Status: proposed) — *(war ADR-0038, renumbered 2026-06-09)* |
| `docs/agent-team/agent_teamplan.md` | edit | WS-006 Pointer |
| `docs/agent-team/mspr_logbook/2026-06-08-motorworld-inn-standortlogik-contract.md` | new | closure MSPR |

## Open Questions

1. Soll `Location.signatureAssets` als `String[]` oder eigene `LocationSignatureAsset`-Tabelle modelliert werden? — **Empfehlung: `String[]`**, weil rein Read-Display, nie Workflow-Quelle.
2. Soll `Location.weatherSensitive` / `cinemaAvailable` dedizierte Booleans oder in `metadata Json?` sein? — **Empfehlung: Booleans**, weil Cockpit-Tile-Filter sie indizieren will.
3. Soll `Movie Cars Cinema` als eigener `OperationalUnit.type` (`CINEMA_LOUNGE`) oder als `EventSpace.support = CINEMA` modelliert werden? — **Empfehlung: `EventSpace.support = CINEMA`** + `Location.cinemaAvailable=true`, weil Cinema keine eigene operative Einheit ist sondern ein Event-Space innerhalb Restaurant-Kontext.
4. Soll `Hotel-Kontext` (`eviivo`) ein `ExternalSystemLink.kind = HOTEL_EVIIVO` sein oder eigener `HotelProvider`-Connector? — **Empfehlung: `ExternalSystemLink`**, weil ADR-0002 + ADR-0021 echte Connector-Logik verbieten.
5. Soll Warthausen `Öchsle-Buffet-Override` als `ExceptionRule` mit `type=OECHSLE_BUFFET_OVERRIDE` oder als eigene Rule-Engine modelliert werden? — **Empfehlung: `ExceptionRule`**, manuell kuratiert vom Manager, Fahrplan-Live-Sync eigenes späteres ADR.

## Bindings

- ADR-0021 §3 (no writeback, no LLM)
- ADR-0030 §Decisions §1 (Profil-Discriminator)
- ADR-0031 (Location/Area-Substrate)
- Task 01 (`OperationalUnit`/`ServiceSlot` brand-übergreifend)
- VISION §6/§7/§9 (Phase 2/3/5)

## Gate (Definition of Done)

- `git diff --stat` zeigt nur `docs/architecture/` + `docs/DECISIONS.md` + `docs/agent-team/*`
- `prisma validate` / `typecheck` / `vitest` unverändert grün
- Owner-Review

## Next gate

Task 04 (`04-motorworld-inn-data-model.md`) operationalisiert den Contract in Schema + Migration + Seed.
