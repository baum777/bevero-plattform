const D = "/images/bevero/desktop/";
const M = "/images/bevero/mobile/";

export const SCREENSHOTS = {
  dashboard: {
    owner: "kam",
    src: `${D}01-dashboard.png`,
    alt: "Dashboard mit kritischen Artikeln, Beständen, Standorten und offenen Alerts",
    caption: "Dashboard",
    desc: "Welche Risiken sieht die Leitung sofort?",
  },
  barRefill: {
    owner: "kam",
    src: `${D}06-bar-refill.png`,
    alt: "Auffüllliste Bar mit Soll/Ist-Mengen, Differenzen und Status",
    caption: "Auffüllliste Bar",
    desc: "Welche Auffüllung kostet sonst Suchzeit und Zuruf?",
  },
  goodsReceipt: {
    owner: "kam",
    src: `${D}07-goods-receipt.png`,
    alt: "Wareneingang mit Lieferung, Korrektur und Umbuchung",
    caption: "Wareneingang",
    desc: "Was ist angekommen und wann operativ sichtbar?",
  },
  movements: {
    owner: "kam",
    src: `${D}09-movements.png`,
    alt: "Bewegungshistorie mit Entnahmen, Korrektionen und Verbrauch",
    caption: "Bewegungen",
    desc: "Welche Entnahme, Korrektur oder Umbuchung ist nachvollziehbar?",
  },
  shiftHandover: {
    owner: "kam",
    src: `${D}12-shift-handover.png`,
    alt: "Schichtübergabe mit offenen Punkten und Priorisierung",
    caption: "Schichtübergabe",
    desc: "Welche offenen Punkte gehen nicht verloren?",
  },
  mobileApprovals: {
    owner: "kam",
    src: `${M}mobile-approvals.png`,
    alt: "Mobile Freigaben mit kritischen Bestandsabweichungen und Prüfgrund",
    caption: "Mobile Freigabe",
    desc: "Welche Abweichung braucht Prüfung statt Bauchentscheidung?",
  },
  today: {
    owner: "workflow",
    src: `${D}03-heute.png`,
    alt: "Heute-Ansicht mit Schichtstart, offenen Punkten und Fehlbestand",
    caption: "Schichtstart & Heute",
    desc: "Exemplarischer Einstieg in den Tagesworkflow",
  },
  mobileDashboard: {
    owner: "mobile",
    src: `${M}mobile-dashboard-overview.png`,
    alt: "Mobile Dashboard Übersicht mit kritischen Beständen und Alerts",
    caption: "Mobile Übersicht",
    desc: "Kritische Bestände, Verbrauch und Alerts",
  },
  mobileQuickActions: {
    owner: "mobile",
    src: `${M}mobile-quick-actions.png`,
    alt: "Mobile Schnellaktionen für Notiz, Checkliste, Verbrauch und Wareneingang",
    caption: "Mobile Schnellaktionen",
    desc: "Direkte Aktionen im laufenden Betrieb",
  },
  mobileBarRefill: {
    owner: "mobile",
    src: `${M}mobile-bar-refill.png`,
    alt: "Mobile Auffüllliste Bar mit Sollmenge, Differenz und Mengenbuttons",
    caption: "Mobile Auffüllung",
    desc: "Sollmenge, Differenz und Bestätigung vor Ort",
  },
  alerts: {
    owner: "details",
    src: `${D}16-alerts.png`,
    alt: "Alerts-Übersicht mit offenen Korrektionen und Bestandswarnungen",
    caption: "Alerts",
    desc: "Offene Korrektionen und Warnungen",
  },
  inventoryItems: {
    owner: "details",
    src: `${D}04-inventory-items.png`,
    alt: "Artikelstamm mit Einheit, Mindestbestand und Status",
    caption: "Artikel",
    desc: "Stammdaten, Einheit, Mindestbestand und Status",
  },
  storage: {
    owner: "kitchen",
    src: `${D}10-storage.png`,
    alt: "Lagerorte mit Küchenbereichen, Froster, Kühlhaus, Keller und Live-Bestand",
    caption: "Lagerorte",
    desc: "Küche, Froster, Kühlhaus, Keller und Verbindungsgang",
  },
  workspaces: {
    owner: "vision",
    src: `${D}13-workspaces.png`,
    alt: "Arbeitsbereiche mit Standortmodell und operativen Räumen",
    caption: "Arbeitsbereiche",
    desc: "Standortmodell und operative Räume",
  },
  teamRoles: {
    owner: "it",
    src: `${D}21-settings-team.png`,
    alt: "Teamverwaltung mit Rollen, Einladungen und Status",
    caption: "Team & Rollen",
    desc: "Zugriff, Einladung, Status und Verantwortung",
  },
};

export const SECTION_SCREENSHOT_IDS = {
  kam: [
    "dashboard",
    "barRefill",
    "goodsReceipt",
    "movements",
    "shiftHandover",
    "mobileApprovals",
  ],
  workflow: ["today"],
  mobile: ["mobileDashboard", "mobileQuickActions", "mobileBarRefill"],
  details: ["alerts", "inventoryItems"],
  kitchen: ["storage"],
  vision: ["workspaces"],
  it: ["teamRoles"],
};

export function screensFor(section) {
  return SECTION_SCREENSHOT_IDS[section].map((id) => SCREENSHOTS[id]);
}
