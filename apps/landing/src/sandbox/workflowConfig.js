export const WORKFLOWS = [
  {
    id: "goodsReceipt",
    name: "Warenannahme",
    purpose: "Lieferung prüfen und Abweichungen sichtbar machen.",
    duration: "ca. 2 Min.",
    role: "Mitarbeiter",
    steps: ["Lieferant", "Positionen", "Beleg"],
  },
  {
    id: "transfer",
    name: "Umlagerung",
    purpose: "Bestand kontrolliert zwischen Bereichen bewegen.",
    duration: "ca. 1 Min.",
    role: "Mitarbeiter",
    steps: ["Auswahl", "Prüfung"],
  },
  {
    id: "refill",
    name: "Auffüllung / Entnahme",
    purpose: "Bedarf vor Ort mit dem Lagerbestand verbinden.",
    duration: "ca. 1 Min.",
    role: "Mitarbeiter",
    steps: ["Menge", "Wirkung"],
  },
  {
    id: "handover",
    name: "Schichtübergabe",
    purpose: "Offene Punkte strukturiert und bestätigt übergeben.",
    duration: "ca. 3 Min.",
    role: "Schichtleitung",
    steps: ["Schicht", "Checkliste", "Bestätigung", "Export"],
  },
  {
    id: "correction",
    name: "Korrektur / Freigabe",
    purpose: "Abweichung begründen und menschlich entscheiden.",
    duration: "ca. 2 Min.",
    role: "Mitarbeiter + Manager",
    steps: ["Vorgang", "Grund", "Freigabe", "Ergebnis"],
  },
];

export const WORKFLOW_BY_ID = Object.fromEntries(WORKFLOWS.map((workflow) => [workflow.id, workflow]));
