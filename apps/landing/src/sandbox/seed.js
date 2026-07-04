export const SANDBOX_VERSION = 1;

export const LOCATIONS = [
  { id: "hauptlager", name: "Hauptlager" },
  { id: "bar", name: "Bar" },
  { id: "kueche", name: "Küche" },
  { id: "kuehlhaus", name: "Kühlhaus" },
];

export const SUPPLIERS = [
  { id: "frischewerk", name: "Frischewerk Süd", rating: "4,8" },
  { id: "gastroquelle", name: "Gastroquelle Neckar", rating: "4,6" },
  { id: "getraenkehaus", name: "Getränkehaus Böblingen", rating: "4,9" },
];

export const INVENTORY_SEED = {
  mineralwasser: {
    id: "mineralwasser",
    name: "Mineralwasser 0,75 l",
    unit: "Flaschen",
    locations: { hauptlager: 48, bar: 12, kueche: 0, kuehlhaus: 6 },
  },
  tomaten: {
    id: "tomaten",
    name: "Tomaten",
    unit: "kg",
    locations: { hauptlager: 0, bar: 0, kueche: 4, kuehlhaus: 18 },
  },
  kaffeebohnen: {
    id: "kaffeebohnen",
    name: "Kaffeebohnen",
    unit: "kg",
    locations: { hauptlager: 12, bar: 3, kueche: 0, kuehlhaus: 0 },
  },
};

export const CHECKLIST_ITEMS = [
  { id: "temperatur", category: "Hygiene", label: "Kühltemperaturen geprüft" },
  { id: "offene-bestellung", category: "Warenfluss", label: "Offene Lieferung dokumentiert" },
  { id: "bar-bestand", category: "Bestand", label: "Bar-Bestand übergeben" },
  { id: "reinigung", category: "Hygiene", label: "Reinigungsnachweis kontrolliert" },
];

export function createDrafts() {
  return {
    goodsReceipt: {
      step: 0,
      supplierId: "",
      targetId: "hauptlager",
      note: "",
      positions: [
        { itemId: "mineralwasser", expected: 24, actual: 24, checked: false },
        { itemId: "kaffeebohnen", expected: 6, actual: 6, checked: false },
        { itemId: "tomaten", expected: 10, actual: 10, checked: false },
      ],
    },
    transfer: {
      step: 0,
      sourceId: "hauptlager",
      targetId: "bar",
      itemId: "mineralwasser",
      quantity: 6,
    },
    refill: {
      step: 0,
      sourceId: "hauptlager",
      areaId: "bar",
      itemId: "mineralwasser",
      quantity: 6,
    },
    handover: {
      step: 0,
      shiftType: "",
      outgoingName: "",
      incomingName: "",
      areaId: "bar",
      note: "",
      checklist: Object.fromEntries(CHECKLIST_ITEMS.map((item) => [item.id, "open"])),
      outgoingSignature: "",
      incomingSignature: "",
    },
    correction: {
      step: 0,
      movementId: "movement-001",
      itemId: "mineralwasser",
      locationId: "bar",
      delta: 0,
      reason: "",
      decision: null,
    },
  };
}
