export type StockByLocationItem = {
  inventoryItemId: string;
  name: string;
  unit: string;
  category: string | null;
  currentStock: number;
  minStock: number | null;
  status: "ok" | "low" | "negative" | "unknown";
};

export type StockByLocationEntry = {
  id: string;
  name: string;
  temperatureZone: string | null;
  floor: number;
  walkOrder: number | null;
  isTransferPoint: boolean;
  items: StockByLocationItem[];
};

export type WalkRouteState = {
  locationIndex: number;
  counts: Record<string, number>;
  paused: boolean;
  startedAt: string;
};
