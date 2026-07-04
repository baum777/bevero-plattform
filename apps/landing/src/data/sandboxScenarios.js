// sandboxScenarios.js — deklarative Szenario-Definitionen für die Bevero Sandbox-Demo.
//
// Reine Daten, kein Netzwerk, keine Persistenz. Jeder nutzenbezogene Zahlenwert lebt
// ausschließlich im `assumption`-Objekt mit `isAssumption: true` — die Wirkungsbox
// erzwingt daraus das Badge „Demo-Annahme" (Spec A §4.2, Spec B A5).
//
// Metrik-Meta (`metrics`): key → { label, short, neutral? }.
//   neutral: true  → Nachher-Wert wird NICHT grün markiert (Ehrlichkeits-Prinzip, Spec B A5).
//
// Deep-Link-Schlüssel (`param`): bar | wareneingang | uebergabe (Spec A §2.4).

export const SANDBOX_SECTION = {
  eyebrow: "Bevero Sandbox",
  h2: "Nicht nur Screens ansehen — einen Standortmoment durchspielen.",
  subcopy:
    "Teste mit Demo-Daten, wie Bevero aus Bestand, Auffüllung, Bewegung und Übergabe einen prüfbaren Tagesworkflow macht.",
  meta: "Dauer: ca. 90 Sekunden",
  demoBar: {
    full: "Demo-Daten · Keine echten Kundendaten · Keine Bestellung · Kein produktiver Writeback",
    medium: "Demo-Daten · Kein Writeback",
    minimal: "Demo-Daten",
    label: "Demo-Modus",
  },
  assumptionBadgeAria: "Demo-Annahme — kein gemessener Wert",
};

export const sandboxScenarios = [
  // ─────────────────────────────────────────────────────────────────────────
  // A — Bar auffüllen (Default)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "bar-refill",
    param: "bar",
    icon: "🍸",
    navLabel: "Bar auffüllen",
    entryLine: "Vor der Barschicht fehlen Artikel",
    area: "Bar",
    headline: "Die Schicht startet. Drei Bar-Artikel sind kritisch.",
    subcopy:
      "Simuliere, wie Bevero aus Bestand, Sollmenge und Standortlogik eine konkrete Auffüllliste macht.",

    metricsBefore: { criticalItems: 3, openHandoverItems: 2, confirmedMovements: 0 },
    metrics: [
      { key: "criticalItems", label: "Kritische Artikel", short: "Kritische Artikel" },
      { key: "openHandoverItems", label: "Offene Übergabepunkte", short: "Offene Übergabe", neutral: true },
      { key: "confirmedMovements", label: "Bestätigte Bewegungen", short: "Bestätigte Beweg." },
    ],
    assumption: { label: "Suchzeit vermieden", value: "ca. 12–18 Min.", isAssumption: true },

    steps: [
      {
        id: "detect",
        title: "Kritische Artikel erkennen",
        view: "stock-table",
        cta: "Auffüllliste erzeugen",
        effects: [],
        viewData: {
          columns: ["Artikel", "Soll", "Ist", "Differenz", "Status"],
          rows: [
            { name: "Aperol", target: 8, actual: 3, status: "kritisch" },
            { name: "Tonic Water", target: 24, actual: 9, status: "kritisch" },
            { name: "Limetten", target: 40, actual: 12, status: "kritisch" },
            { name: "Gin London Dry", target: 6, actual: 6, status: "ok" },
            { name: "Sodawasser", target: 18, actual: 16, status: "ok" },
          ],
          footnote: "Sollmengen aus Standortprofil · Bestand aus letzter Zählung + Bewegungen",
        },
      },
      {
        id: "confirm",
        title: "Auffüllung bestätigen",
        view: "refill-checklist",
        cta: "Auffüllung bestätigen",
        requiresAllConfirmed: true,
        tickMetric: "confirmedMovements",
        effects: [
          { metric: "criticalItems", to: 0 },
          { metric: "confirmedMovements", to: 3 },
          { metric: "openHandoverItems", to: 1 },
        ],
        viewData: {
          title: "Auffüllliste · 3 Positionen",
          items: [
            { key: "aperol", name: "Aperol", qty: "+5 Flaschen", source: "aus Bar Hauptlager" },
            { key: "tonic", name: "Tonic Water", qty: "+15 Flaschen", source: "aus Bar Hauptlager" },
            { key: "limetten", name: "Limetten", qty: "+28 Stück", source: "aus Kühlraum" },
          ],
          confirmLabel: "Bestätigen",
          confirmedLabel: "Bestätigt",
        },
      },
      {
        id: "result",
        title: "Wirkung sehen",
        view: "result-summary",
        cta: null,
        viewData: {
          checks: [
            "Bewegung gespeichert",
            "Kritische Artikel reduziert",
            "Übergabe aktualisiert",
            "Bar für Schicht vorbereitet",
          ],
          logLabel: "Bewegungslog",
          log: [
            { time: "09:41", text: "+5 Aperol · Hauptlager → Bar" },
            { time: "09:41", text: "+15 Tonic Water · Hauptlager → Bar" },
            { time: "09:42", text: "+28 Limetten · Kühlraum → Bar" },
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // B — Wareneingang sichtbar machen
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "goods-receipt",
    param: "wareneingang",
    icon: "📦",
    navLabel: "Wareneingang",
    entryLine: "Lieferung da, aber nicht operativ sichtbar",
    area: "Wareneingang",
    headline: "Die Lieferung ist da — aber operativ noch unsichtbar.",
    subcopy:
      "Simuliere, wie eine Lieferung zu sichtbarem, nutzbarem Bestand mit Bewegungslog wird.",

    metricsBefore: { invisiblePositions: 3, confirmedMovements: 0, criticalItems: 1 },
    metrics: [
      { key: "invisiblePositions", label: "Unsichtbare Positionen", short: "Unsichtbare Pos." },
      { key: "confirmedMovements", label: "Bestätigte Bewegungen", short: "Bestätigte Beweg." },
      { key: "criticalItems", label: "Kritische Artikel", short: "Kritische Artikel" },
    ],
    assumption: { label: "Sichtbarkeit erreicht", value: "ca. 30–45 Min. früher", isAssumption: true },

    steps: [
      {
        id: "inspect",
        title: "Lieferung prüfen",
        view: "delivery-list",
        cta: "Wareneingang öffnen",
        effects: [],
        viewData: {
          deliveryHead: "Lieferung #L-2417 · Getränke Müller GmbH · heute 09:40",
          columns: ["Position", "Menge", "Status"],
          rows: [
            { name: "Gin London Dry 0,7l", qty: "12 Fl.", status: "nicht sichtbar" },
            { name: "Ginger Beer 0,2l", qty: "24 Fl.", status: "nicht sichtbar" },
            { name: "Sirup Holunder", qty: "2 Fl.", status: "nicht sichtbar" },
          ],
          warning: "Gin London Dry ist aktuell als kritisch markiert.",
        },
      },
      {
        id: "book",
        title: "Positionen einbuchen",
        view: "booking-confirm",
        cta: "Eingang bestätigen",
        requiresAllConfirmed: true,
        tickMetric: "confirmedMovements",
        effects: [
          { metric: "invisiblePositions", to: 0 },
          { metric: "confirmedMovements", to: 3 },
          { metric: "criticalItems", to: 0 },
        ],
        viewData: {
          title: "Einbuchen · 3 Positionen",
          items: [
            { key: "gin", name: "Gin London Dry 0,7l · 12 Fl.", target: "→ Spirituosenlager", note: "hebt kritischen Bestand auf" },
            { key: "ginger", name: "Ginger Beer 0,2l · 24 Fl.", target: "→ Getränkelager" },
            { key: "sirup", name: "Sirup Holunder · 2 Fl.", target: "→ Barlager" },
          ],
          confirmLabel: "Einbuchen",
          confirmedLabel: "Eingebucht",
          badgeBefore: "nicht sichtbar",
          badgeAfter: "verfügbar",
        },
      },
      {
        id: "result",
        title: "Wirkung sehen",
        view: "result-summary",
        cta: null,
        viewData: {
          checks: [
            "Lieferung erfasst",
            "Bestand aktualisiert",
            "Bewegungslog geschrieben",
            "Artikel operativ verfügbar",
          ],
          logLabel: "Bewegungslog",
          log: [
            { time: "09:44", text: "+12 Gin London Dry · Wareneingang → Spirituosenlager" },
            { time: "09:44", text: "+24 Ginger Beer · Wareneingang → Getränkelager" },
            { time: "09:45", text: "+2 Sirup Holunder · Wareneingang → Barlager" },
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // C — Schichtübergabe klären (abgeleitete Metriken)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "shift-handover",
    param: "uebergabe",
    icon: "🔄",
    navLabel: "Schichtübergabe",
    entryLine: "Offene Punkte dürfen nicht verloren gehen",
    area: "Übergabe Spät → Nacht",
    headline: "Schichtende. Drei Punkte dürfen nicht verloren gehen.",
    subcopy:
      "Simuliere, wie offene Punkte erledigt oder sauber an die nächste Schicht übergeben werden.",

    metricsBefore: { openItems: 3, documentedItems: 0, assignedResponsibility: 0 },
    metrics: [
      { key: "openItems", label: "Offene Punkte", short: "Offene Punkte", neutral: true },
      { key: "documentedItems", label: "Dokumentierte Punkte", short: "Dokumentierte P." },
      { key: "assignedResponsibility", label: "Zugewiesene Verantwortung", short: "Verantwortung" },
    ],
    assumption: { label: "Rückfragen am Folgetag vermieden", value: "ca. 2–3", isAssumption: true },
    derived: true, // after-Metriken werden aus `choices` berechnet (Spec B B3)

    steps: [
      {
        id: "review",
        title: "Offene Punkte sichten",
        view: "handover-board",
        cta: "Übergabe bearbeiten",
        effects: [],
        viewData: {
          cards: [
            { key: "kuehlraum", prio: "hoch", responsibility: "Technik", text: "Kühlraum-Tür schließt schwer", meta: "gemeldet 17:20 · Frühschicht" },
            { key: "aperol", prio: "mittel", responsibility: "Standortleitung", text: "Aperol-Nachbestellung noch offen", meta: "gemeldet 15:05 · Frühschicht" },
            { key: "limetten", prio: "mittel", responsibility: "Bar", text: "Inventurdifferenz Limetten (−6)", meta: "gemeldet 16:40 · Spätschicht" },
          ],
        },
      },
      {
        id: "resolve",
        title: "Punkte auflösen oder übergeben",
        view: "handover-resolve",
        cta: "Übergabe abschließen",
        requiresAllChoices: true,
        viewData: {
          title: "Übergabe bearbeiten · 3 Punkte",
          question: "Wie damit umgehen?",
          options: [
            { value: "done", label: "Erledigt" },
            { value: "handover", label: "An nächste Schicht" },
          ],
          cards: [
            {
              key: "kuehlraum",
              text: "Kühlraum-Tür schließt schwer",
              prio: "hoch",
              responsibility: "Technik",
              logLabel: "Kühlraum-Tür",
              consequences: { done: "↳ als erledigt dokumentiert", handover: "↳ übergeben an: Nachtschicht · Technik" },
              logDone: "erledigt",
            },
            {
              key: "aperol",
              text: "Aperol-Nachbestellung offen",
              prio: "mittel",
              responsibility: "Standortleitung",
              logLabel: "Aperol-Nachbestellung",
              consequences: { done: "↳ als erledigt dokumentiert", handover: "↳ übergeben an: Nachtschicht · Standortleitung" },
              logDone: "erledigt",
            },
            {
              key: "limetten",
              text: "Inventurdifferenz Limetten",
              prio: "mittel",
              responsibility: "Bar",
              logLabel: "Inventurdifferenz",
              consequences: { done: "↳ Korrektur dokumentiert", handover: "↳ übergeben an: Nachtschicht · Bar" },
              logDone: "Korrektur dokumentiert",
            },
          ],
        },
      },
      {
        id: "result",
        title: "Wirkung sehen",
        view: "result-summary",
        cta: null,
        viewData: {
          // checks + log werden in Schritt 3 dynamisch aus `choices` abgeleitet
          logLabel: "Übergabe-Log",
          logTimes: ["22:02", "22:02", "22:03"],
          baseChecks: ["Übergabe dokumentiert", "Nichts geht verloren", "Nächste Schicht startklar"],
          checkAnyHandover: "Verantwortlichkeiten zugewiesen",
          checkAllDone: "Alle Punkte abgeschlossen",
          extraNote:
            "Ein übergebener Punkt ist kein verlorener Punkt — er ist sichtbar, zugeordnet und nachverfolgbar.",
        },
      },
    ],
  },
];

export const DEFAULT_SCENARIO_ID = "bar-refill";

export function scenarioByParam(param) {
  return sandboxScenarios.find((s) => s.param === param) ?? null;
}

export function scenarioById(id) {
  return sandboxScenarios.find((s) => s.id === id) ?? null;
}
