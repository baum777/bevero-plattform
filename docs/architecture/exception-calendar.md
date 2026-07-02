# Exception-Calendar: ExceptionRule-Konzept

**Status:** accepted — ADR-0049 (2026-06-09)
**Maintainer:** architect agent / owner

## Konzept

`ExceptionRule` ist ein zeitlich begrenzter Override auf dem normalen Betriebskalender eines Standorts. Sie wird **manuell vom Manager kuratiert** und ist **kein Sync** von externen Systemen (außer `source = oechsle_schedule`, welches einen Sync-ADR vorbehält).

## Regel-Typen (`ExceptionRuleType`)

| Typ | Beschreibung | Beispiel |
|---|---|---|
| `EXCLUSIVE_EVENT_CLOSURE` | Komplette Schließung für ein exklusives Event | Warthausen Rennstall für Firmen-Feier gebucht |
| `BRUNCH_BLOCKS_REGULAR_SERVICE` | Brunch-Betrieb sperrt Regular-Service | Sonntag-Brunch, kein à-la-carte |
| `OECHSLE_BUFFET_OVERRIDE` | Öchsle-Fahrplan-Gäste lösen Buffet aus | Warthausen: Dampfzug kommt an |
| `WEATHER_OUTDOOR_CHANGE` | Outdoor-Bereich wegen Wetter gesperrt/geöffnet | Mallorca: Sturm → Terrasse gesperrt |
| `HOLIDAY_SCHEDULE` | Abweichender Feiertagsbetrieb | Weihnachten: Sonder-Menü, andere Zeiten |
| `HOTEL_OPERATIONAL_HOLIDAY` | Hotel-Betrieb eingestellt | Böblingen: Wartungspause |
| `BRUNCH_SUNDAY_LATE_START` | Sonntag-Spätstart für Brunch-Setup | Restaurant öffnet erst 10:30 statt 09:00 |
| `EVENT_CLOSURE_PRIVATE` | Standort für Private-Event gesperrt | Mallorca komplett für Hochzeit |

## Warthausen: Öchsle-Buffet-Override (Leitbeispiel)

```
ExceptionRule {
  type: OECHSLE_BUFFET_OVERRIDE
  title: "Öchsle-Dampfzug Ausflug — Buffet-Override"
  description: "Anlässlich des Öchsle-Ausflugs von Bad Buchau: ~120 Gäste erwartet. Regular-Menü ersetzt durch Buffet."
  affectedUnitIds: ["ou-warthausen-restaurant"]
  startsAt: "2026-07-12T11:00:00.000Z"
  endsAt: "2026-07-12T15:00:00.000Z"
  source: "oechsle_schedule"
  requiresConfirmation: true
  confirmedByUserId: null  ← Manager muss bestätigen
  confirmedAt: null
  isActive: true
}
```

Das `requiresConfirmation = true` Flag ist ein **Sicherheits-Gate**: Cockpit zeigt ein gelbes Banner solange `confirmedAt = null`. Workflow-Trigger (WorkflowTask erstellen, Push-Notification) ist ADR-0061 vorbehalten.

## Manuelle Kuration

- **Wer kuratiert?** Manager (Rolle `manager` oder `admin` in `LocationMember`)
- **Wann?** Manuell, zeitig vor dem Event
- **Wie?** Cockpit-Mutation-Surface in ADR-0061 (noch nicht implementiert)
- **Auditierung?** Standard `updatedAt` + `confirmedByUserId`/`confirmedAt` Trail

In dieser Read-Slice (ADR-0050 bis ADR-0054) ist keine Mutation vorgesehen. Mutation ist explizit ADR-0061 vorbehalten.

## Cockpit-Display (90-Tage-Kalender)

Der Exception-Calendar im Cockpit zeigt:
- **Timeline** über 90 Tage
- **Farbkodierung:** EXCLUSIVE_EVENT_CLOSURE (rot), OECHSLE_BUFFET_OVERRIDE (gelb), HOLIDAY_SCHEDULE (blau), sonstige (grau)
- **Hinweis-Banner** für `requiresConfirmation = true` Regeln: "Manuelle Bestätigung erforderlich"
- **Filter** nach `ExceptionRuleType` und `source`

## Caching

Read-Endpoint `GET /admin/location/locations/:id/exception-rules` liefert Regeln im `dateFrom`-`dateTo`-Zeitfenster. Kein Server-seitiger Cache — Cockpit cached client-seitig im `LocationContextProvider`.

## Binding-ADRs

- ADR-0021 §3 (read-only, no writeback in dieser Slice)
- ADR-0049 (Phase A Contract: ExceptionRule als `ExceptionRule.type = OECHSLE_BUFFET_OVERRIDE`)
- ADR-0050 (Phase B Schema: ExceptionRule-Modell)
- ADR-0061 (Mutations-Surface, vorbehalten)
