import { createClient } from "../server";

type StorageLocationRow = {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean;
  createdAt: string;
};

type InventoryItemStorageRow = {
  storageLocationId: string | null;
  isActive: boolean;
};

type StockSnapshotRow = {
  storageLocationId: string | null;
  quantity: number;
  calculatedAt: string;
};

const EXCLUDED_STORAGE_LOCATION_NAMES = [
  "Trockenlager",
  "Transferpunkt Kühlwagen",
  "Kühlhaus",
  "Gefrierschrank 1",
  "Gefrierschrank 2"
];

export type StorageLocationQuery = {
  q?: string;
  status?: "active" | "inactive" | "all";
  type?: string;
};

export type StorageLocationViewRow = {
  activeItemCount: number;
  createdAt: string;
  id: string;
  isActive: boolean;
  itemCount: number;
  lastSnapshotAt: string | null;
  name: string;
  snapshotCount: number;
  totalQuantity: number;
  type: string | null;
};

export async function listStorageLocations(query: StorageLocationQuery = {}) {
  const supabase = await createClient();
  let builder = supabase
    .from("StorageLocation")
    .select("id,name,type,isActive,createdAt")
    .order("name", { ascending: true })
    .limit(200);

  for (const name of EXCLUDED_STORAGE_LOCATION_NAMES) {
    builder = builder.neq("name", name);
  }

  const status = query.status ?? "all";
  if (status === "active") {
    builder = builder.eq("isActive", true);
  } else if (status === "inactive") {
    builder = builder.eq("isActive", false);
  }

  const q = query.q?.trim();
  if (q) {
    builder = builder.or(`name.ilike.%${q}%,type.ilike.%${q}%`);
  }

  const type = query.type?.trim();
  if (type) {
    builder = builder.eq("type", type);
  }

  const { data: locations, error: locationsError } = await builder.returns<StorageLocationRow[]>();
  if (locationsError) {
    return { data: [] as StorageLocationViewRow[], error: locationsError };
  }

  const rows = locations ?? [];
  if (!rows.length) {
    return { data: [] as StorageLocationViewRow[], error: null };
  }

  const locationIds = rows.map((row) => row.id);

  const { data: items, error: itemsError } = await supabase
    .from("InventoryItem")
    .select("storageLocationId,isActive")
    .in("storageLocationId", locationIds)
    .returns<InventoryItemStorageRow[]>();

  if (itemsError) {
    return { data: [] as StorageLocationViewRow[], error: itemsError };
  }

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("InventoryStockSnapshot")
    .select("storageLocationId,quantity,calculatedAt")
    .in("storageLocationId", locationIds)
    .returns<StockSnapshotRow[]>();

  if (snapshotsError) {
    return { data: [] as StorageLocationViewRow[], error: snapshotsError };
  }

  const itemStats = new Map<string, { total: number; active: number }>();
  for (const item of items ?? []) {
    if (!item.storageLocationId) continue;
    const current = itemStats.get(item.storageLocationId) ?? { total: 0, active: 0 };
    current.total += 1;
    if (item.isActive) current.active += 1;
    itemStats.set(item.storageLocationId, current);
  }

  const snapshotStats = new Map<
    string,
    { count: number; totalQuantity: number; lastSnapshotAt: string | null }
  >();
  for (const snapshot of snapshots ?? []) {
    if (!snapshot.storageLocationId) continue;
    const current = snapshotStats.get(snapshot.storageLocationId) ?? {
      count: 0,
      totalQuantity: 0,
      lastSnapshotAt: null
    };
    current.count += 1;
    current.totalQuantity += snapshot.quantity;
    if (!current.lastSnapshotAt || snapshot.calculatedAt > current.lastSnapshotAt) {
      current.lastSnapshotAt = snapshot.calculatedAt;
    }
    snapshotStats.set(snapshot.storageLocationId, current);
  }

  const data = rows.map((location) => {
    const locationItems = itemStats.get(location.id) ?? { total: 0, active: 0 };
    const locationSnapshots = snapshotStats.get(location.id) ?? {
      count: 0,
      totalQuantity: 0,
      lastSnapshotAt: null
    };

    return {
      activeItemCount: locationItems.active,
      createdAt: location.createdAt,
      id: location.id,
      isActive: location.isActive,
      itemCount: locationItems.total,
      lastSnapshotAt: locationSnapshots.lastSnapshotAt,
      name: location.name,
      snapshotCount: locationSnapshots.count,
      totalQuantity: locationSnapshots.totalQuantity,
      type: location.type
    } as StorageLocationViewRow;
  });

  return { data, error: null };
}
