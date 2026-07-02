import { createClient } from "../server";

export type InventoryItemRow = {
  category: string | null;
  categoryId: string | null;
  defaultUnit: string;
  id: string;
  isActive: boolean;
  minStock: number | null;
  name: string;
  sku: string | null;
  storageLocationId: string | null;
  targetStock: number | null;
  displayOrder: number | null;
};

export type InventoryItemQuery = {
  q?: string;
  status?: "active" | "inactive" | "all";
};

export async function listInventoryItems(query: InventoryItemQuery = {}) {
  const supabase = await createClient();
  let builder = supabase
    .from("InventoryItem")
    .select("id,name,sku,category,categoryId:category_id,defaultUnit,minStock,targetStock:target_stock,displayOrder:display_order,isActive")
    .order("name", { ascending: true })
    .limit(100);

  const status = query.status ?? "all";
  if (status === "active") {
    builder = builder.eq("isActive", true);
  } else if (status === "inactive") {
    builder = builder.eq("isActive", false);
  }

  const q = query.q?.trim();
  if (q) {
    builder = builder.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  const { data, error } = await builder.returns<InventoryItemRow[]>();
  return { data: data ?? [], error };
}

type StockSnapshotRow = {
  inventoryItemId: string;
  quantity: number;
  unit: string;
};

export type InventoryItemWithStock = {
  id: string;
  name: string;
  defaultUnit: string;
  category: string | null;
  storageLocationId: string | null;
  targetStock: number | null;
  currentStock: number;
};

/**
 * Active inventory items enriched with their current on-hand quantity (summed
 * from stock snapshots, 0 when none exist yet) and resolved category name.
 * Unlike listInventoryBalances this includes items without any snapshot, which
 * is required for the movements quick-action item picker.
 */
export async function listInventoryItemsWithStock() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("InventoryItem")
    .select("id,name,category,categoryId:category_id,targetStock:target_stock,defaultUnit,storageLocationId,isActive")
    .eq("isActive", true)
    .order("name", { ascending: true })
    .limit(500)
    .returns<
      Array<
        Pick<
          InventoryItemRow,
          | "category"
          | "categoryId"
          | "id"
          | "isActive"
          | "name"
          | "storageLocationId"
          | "targetStock"
          | "defaultUnit"
        >
      >
    >();

  if (error) {
    return { data: [] as InventoryItemWithStock[], error };
  }

  const { data: snapshots } = await supabase
    .from("InventoryStockSnapshot")
    .select("inventoryItemId,quantity,unit")
    .returns<StockSnapshotRow[]>();

  const { data: categories } = await supabase
    .from("inventory_categories")
    .select("id,name,display_order")
    .returns<InventoryCategoryRow[]>();

  const quantityByItemId = new Map<string, number>();
  for (const row of snapshots ?? []) {
    quantityByItemId.set(row.inventoryItemId, (quantityByItemId.get(row.inventoryItemId) ?? 0) + row.quantity);
  }
  const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));

  const data: InventoryItemWithStock[] = (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    defaultUnit: item.defaultUnit,
    category: item.categoryId ? (categoryNameById.get(item.categoryId) ?? item.category ?? null) : item.category,
    storageLocationId: item.storageLocationId,
    targetStock: item.targetStock ?? null,
    currentStock: quantityByItemId.get(item.id) ?? 0
  }));

  return { data, error: null };
}

type InventoryCategoryRow = {
  id: string;
  name: string;
  display_order: number;
};

export type InventoryBalanceRow = {
  category: string | null;
  categoryOrder: number;
  itemId: string;
  itemName: string;
  targetStock: number | null;
  quantity: number;
  difference: number | null;
  status: "aktiv" | "inaktiv";
  unit: string;
  itemOrder: number;
};

export async function listInventoryBalances() {
  const supabase = await createClient();

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("InventoryStockSnapshot")
    .select("inventoryItemId,quantity,unit")
    .order("calculatedAt", { ascending: false })
    .limit(1000)
    .returns<StockSnapshotRow[]>();

  if (snapshotsError) {
    return { data: [] as InventoryBalanceRow[], error: snapshotsError };
  }

  const snapshotRows = snapshots ?? [];
  if (!snapshotRows.length) {
    return { data: [] as InventoryBalanceRow[], error: null };
  }

  const itemIds = Array.from(new Set(snapshotRows.map((row) => row.inventoryItemId)));
  const { data: items, error: itemsError } = await supabase
    .from("InventoryItem")
    .select("id,name,category,categoryId:category_id,targetStock:target_stock,defaultUnit,displayOrder:display_order,isActive")
    .in("id", itemIds)
    .returns<
      Array<
        Pick<
          InventoryItemRow,
          "category" | "categoryId" | "id" | "isActive" | "name" | "targetStock" | "defaultUnit" | "displayOrder"
        >
      >
    >();

  if (itemsError) {
    return { data: [] as InventoryBalanceRow[], error: itemsError };
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("inventory_categories")
    .select("id,name,display_order")
    .returns<InventoryCategoryRow[]>();

  if (categoriesError) {
    return { data: [] as InventoryBalanceRow[], error: categoriesError };
  }

  const quantitiesByItemId = new Map<string, { quantity: number; unit: string }>();
  for (const row of snapshotRows) {
    const existing = quantitiesByItemId.get(row.inventoryItemId);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      quantitiesByItemId.set(row.inventoryItemId, {
        quantity: row.quantity,
        unit: row.unit
      });
    }
  }

  const itemsMap = new Map((items ?? []).map((item) => [item.id, item]));
  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category]));

  const balances = [...quantitiesByItemId.entries()]
    .map(([itemId, quantityRow]) => {
      const item = itemsMap.get(itemId);
      if (!item) return null;

      const linkedCategory = item.categoryId ? categoryMap.get(item.categoryId) : undefined;
      const categoryName = linkedCategory?.name ?? item.category ?? "Ohne Kategorie";
      const categoryOrder = linkedCategory?.display_order ?? 999;
      const targetStock = item.targetStock ?? null;

      return {
        category: categoryName,
        categoryOrder,
        itemId: item.id,
        itemName: item.name,
        targetStock,
        quantity: quantityRow.quantity,
        difference: targetStock === null ? null : targetStock - quantityRow.quantity,
        status: item.isActive ? "aktiv" : "inaktiv",
        unit: quantityRow.unit || item.defaultUnit,
        itemOrder: item.displayOrder ?? 999
      } as InventoryBalanceRow;
    })
    .filter((value): value is InventoryBalanceRow => Boolean(value))
    .sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }
      if (a.category !== b.category) {
        return (a.category ?? "").localeCompare(b.category ?? "");
      }
      if (a.itemOrder !== b.itemOrder) {
        return a.itemOrder - b.itemOrder;
      }
      return a.itemName.localeCompare(b.itemName);
    });

  return { data: balances, error: null };
}
