import { createClient } from "../server";
import type {
  KitchenDashboardKpis,
  KitchenDashboardResult
} from "../types/kitchen-kpis";

const DEFAULT_LIMIT = 25;

type StorageLocationRow = {
  id: string;
  name: string;
  isCountable: boolean;
  isTransferPoint: boolean;
  walkOrder: number | null;
  workspaceGroupId: string | null;
};

type StockSnapshotRow = {
  storageLocationId: string | null;
  quantity: number;
};

type InventoryMovementRow = {
  id: string;
  type: string;
  createdAt: string;
  storageLocationId: string | null;
  toStorageLocationId: string | null;
  fromStorageLocationId: string | null;
};

type CorrectionRequestRow = {
  id: string;
  status: string;
  storageLocationId: string | null;
};

const ZERO_KPIS: KitchenDashboardKpis = {
  countableLocations: 0,
  transferPoints: 0,
  locationsWithCriticalStock: 0,
  locationsWithNegativeStock: 0,
  openCorrectionRequests: 0,
  recentWithdrawals24h: 0,
  recentTransfers24h: 0,
  walkRouteProgress: null
};

export async function getKitchenDashboardKpis(
  workspaceGroupId: string
): Promise<KitchenDashboardResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { access: "unauthenticated", data: null, error: userError?.message ?? null };
  }

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [locationsResult, snapshotsResult, movementsResult, correctionsResult] = await Promise.all([
    supabase
      .from("StorageLocation")
      .select("id,name,isCountable,isTransferPoint,walkOrder,workspaceGroupId")
      .eq("workspaceGroupId", workspaceGroupId)
      .order("walkOrder", { ascending: true })
      .returns<StorageLocationRow[]>(),
    supabase
      .from("InventoryStockSnapshot")
      .select("storageLocationId,quantity")
      .returns<StockSnapshotRow[]>(),
    supabase
      .from("InventoryMovement")
      .select("id,type,createdAt,storageLocationId,toStorageLocationId,fromStorageLocationId")
      .gte("createdAt", sinceIso)
      .order("createdAt", { ascending: false })
      .limit(DEFAULT_LIMIT)
      .returns<InventoryMovementRow[]>(),
    supabase
      .from("InventoryCorrectionRequest")
      .select("id,status,storageLocationId")
      .eq("status", "open")
      .returns<CorrectionRequestRow[]>()
  ]);

  if (locationsResult.error) {
    return { access: "forbidden", data: null, error: locationsResult.error.message };
  }
  if (snapshotsResult.error) {
    return { access: "allowed", data: null, error: snapshotsResult.error.message };
  }
  if (movementsResult.error) {
    return { access: "allowed", data: null, error: movementsResult.error.message };
  }
  if (correctionsResult.error) {
    return { access: "allowed", data: null, error: correctionsResult.error.message };
  }

  const locations = locationsResult.data ?? [];
  const locationIds = new Set(locations.map((loc) => loc.id));
  const snapshots = (snapshotsResult.data ?? []).filter(
    (snap) => snap.storageLocationId !== null && locationIds.has(snap.storageLocationId)
  );
  const movements = (movementsResult.data ?? []).filter(
    (movement) =>
      (movement.storageLocationId !== null && locationIds.has(movement.storageLocationId)) ||
      (movement.toStorageLocationId !== null && locationIds.has(movement.toStorageLocationId)) ||
      (movement.fromStorageLocationId !== null && locationIds.has(movement.fromStorageLocationId))
  );
  const corrections = (correctionsResult.data ?? []).filter(
    (correction) =>
      correction.storageLocationId === null || locationIds.has(correction.storageLocationId)
  );

  const countableLocations = locations.filter((loc) => loc.isCountable).length;
  const transferPoints = locations.filter((loc) => loc.isTransferPoint).length;

  const locationStockTotals = new Map<string, number>();
  for (const snap of snapshots) {
    if (snap.storageLocationId === null) continue;
    const previous = locationStockTotals.get(snap.storageLocationId) ?? 0;
    locationStockTotals.set(snap.storageLocationId, previous + snap.quantity);
  }

  let negativeStocks = 0;
  for (const quantity of locationStockTotals.values()) {
    if (quantity < 0) negativeStocks += 1;
  }

  const recentWithdrawals24h = movements.filter((row) => row.type === "item_removed").length;
  const recentTransfers24h = movements.filter((row) => row.type === "transfer").length;
  const openCorrectionRequests = corrections.length;

  const countableLocationIds = locations
    .filter((loc) => loc.isCountable && loc.walkOrder !== null)
    .sort((a, b) => (a.walkOrder ?? 0) - (b.walkOrder ?? 0))
    .map((loc) => loc.id);
  const walkRouteProgress = countableLocationIds.length === 0
    ? null
    : {
        completed: countableLocationIds.filter((id) => locationStockTotals.has(id)).length,
        total: countableLocationIds.length
      };

  return {
    access: "allowed",
    data: {
      countableLocations,
      transferPoints,
      locationsWithCriticalStock: 0,
      locationsWithNegativeStock: negativeStocks,
      openCorrectionRequests,
      recentWithdrawals24h,
      recentTransfers24h,
      walkRouteProgress
    },
    error: null
  };
}

export function emptyKitchenDashboardKpis(): KitchenDashboardKpis {
  return { ...ZERO_KPIS };
}
