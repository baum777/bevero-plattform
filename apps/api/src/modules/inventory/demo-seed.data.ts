export const demoSuppliers = [
  { id: "demo-supplier-frischemarkt-sued", organizationId: "demo-organization-main", name: "Frischemarkt Süd" },
  { id: "demo-supplier-gastro-mueller", organizationId: "demo-organization-main", name: "Gastro Großhandel Müller" },
  { id: "demo-supplier-getraenke-berlin", organizationId: "demo-organization-main", name: "Getränkelogistik Berlin" }
];

export const demoStorageLocations = [
  { id: "demo-location-hauptlager", name: "Hauptlager", type: "warehouse" },
  { id: "demo-location-kuehlhaus", name: "Kühlhaus", type: "cold_storage" },
  { id: "demo-location-bar", name: "Bar", type: "bar" },
  { id: "demo-location-kueche", name: "Küche", type: "kitchen" }
];

export const demoItems = [
  {
    id: "demo-item-tomaten",
    name: "Tomaten",
    sku: "DEMO-TOM",
    category: "Frische",
    defaultUnit: "kg",
    minStock: 5,
    storageLocationId: "demo-location-kuehlhaus"
  },
  {
    id: "demo-item-mozzarella",
    name: "Mozzarella",
    sku: "DEMO-MOZ",
    category: "Molkerei",
    defaultUnit: "kg",
    minStock: 4,
    storageLocationId: "demo-location-kuehlhaus"
  },
  {
    id: "demo-item-rinderhack",
    name: "Rinderhack",
    sku: "DEMO-RIN",
    category: "Fleisch",
    defaultUnit: "kg",
    minStock: 6,
    storageLocationId: "demo-location-kuehlhaus"
  },
  {
    id: "demo-item-pasta",
    name: "Pasta",
    sku: "DEMO-PAS",
    category: "Trockenware",
    defaultUnit: "kg",
    minStock: 12,
    storageLocationId: "demo-location-hauptlager"
  },
  {
    id: "demo-item-olivenoel",
    name: "Olivenöl",
    sku: "DEMO-OEL",
    category: "Trockenware",
    defaultUnit: "l",
    minStock: 8,
    storageLocationId: "demo-location-hauptlager"
  },
  {
    id: "demo-item-kaffeebohnen",
    name: "Kaffeebohnen",
    sku: "DEMO-KAF",
    category: "Getränke",
    defaultUnit: "kg",
    minStock: 5,
    storageLocationId: "demo-location-bar"
  },
  {
    id: "demo-item-milch",
    name: "Milch",
    sku: "DEMO-MIL",
    category: "Molkerei",
    defaultUnit: "l",
    minStock: 10,
    storageLocationId: "demo-location-kuehlhaus"
  },
  {
    id: "demo-item-servietten",
    name: "Servietten",
    sku: "DEMO-SER",
    category: "Verbrauchsmaterial",
    defaultUnit: "Packung",
    minStock: 6,
    storageLocationId: "demo-location-hauptlager"
  },
  {
    id: "demo-item-reinigungsmittel",
    name: "Reinigungsmittel",
    sku: "DEMO-REI",
    category: "Hygiene",
    defaultUnit: "Flasche",
    minStock: 4,
    storageLocationId: "demo-location-hauptlager"
  }
];
