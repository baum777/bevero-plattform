"use client";

import { createClient } from "./supabase/client";
import type { ArticleStatus, ArticleWithStatus, Category } from "../types/inventory";

type StockSnapshotRow = {
  quantity: number | string | null;
  unit: string | null;
};

type InventoryItemRow = {
  id: string;
  category_id: string | null;
  name: string;
  defaultUnit: string | null;
  minStock: number | string | null;
  target_stock: number | string | null;
  display_order: number | null;
  isActive: boolean | null;
  stockSnapshots: StockSnapshotRow[] | null;
};

type InventoryCategoryRow = {
  id: string;
  name: string;
  display_order: number;
  articles: InventoryItemRow[] | null;
};

const CATEGORY_META = [
  { match: "wasser", icon: "💧", color: "#38BDF8" },
  { match: "soft", icon: "🥤", color: "#3B82F6" },
  { match: "saft", icon: "🍊", color: "#F97316" },
  { match: "safte", icon: "🍊", color: "#F97316" },
  { match: "bier", icon: "🍺", color: "#F59E0B" },
  { match: "fass", icon: "🍺", color: "#D97706" },
  { match: "mixer", icon: "🧊", color: "#06B6D4" },
  { match: "energy", icon: "⚡", color: "#A3E635" },
  { match: "wein", icon: "🍷", color: "#E879F9" },
  { match: "schaum", icon: "🥂", color: "#FBBF24" },
  { match: "kaffee", icon: "☕", color: "#A16207" },
  { match: "tee", icon: "🍵", color: "#84CC16" },
  { match: "sirup", icon: "🧃", color: "#EC4899" },
  { match: "aperitif", icon: "🍹", color: "#F97316" },
  { match: "gin", icon: "🍸", color: "#22C55E" },
  { match: "rum", icon: "🥃", color: "#F97316" },
  { match: "martini", icon: "🍸", color: "#A78BFA" },
  { match: "vodka", icon: "🧊", color: "#60A5FA" },
  { match: "likör", icon: "🍹", color: "#FB7185" },
  { match: "likor", icon: "🍹", color: "#FB7185" },
  { match: "schnaps", icon: "🥃", color: "#F43F5E" },
  { match: "schnapse", icon: "🥃", color: "#F43F5E" },
  { match: "tequila", icon: "🥃", color: "#FBBF24" },
  { match: "cachaca", icon: "🥃", color: "#FBBF24" },
  { match: "whiskey", icon: "🥃", color: "#B45309" }
];

const FALLBACK_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export function getStatus(bestand: number, min: number): ArticleStatus {
  if (min <= 0) {
    return bestand <= 0 ? "critical" : "ok";
  }
  if (bestand <= min / 2) return "critical";
  if (bestand < min) return "low";
  return "ok";
}

export async function fetchBestandCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_categories")
    .select(
      `
        id,
        name,
        display_order,
        articles:InventoryItem (
          id,
          category_id,
          name,
          defaultUnit,
          minStock,
          target_stock,
          display_order,
          isActive,
          stockSnapshots:InventoryStockSnapshot (
            quantity,
            unit
          )
        )
      `
    )
    .order("display_order", { ascending: true })
    .returns<InventoryCategoryRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCategory).filter((category) => category.articles.length > 0);
}

function mapCategory(row: InventoryCategoryRow, index: number): Category {
  const meta = getCategoryMeta(row.name, index);
  const articles = (row.articles ?? [])
    .filter((item) => item.isActive !== false)
    .map((item) => mapArticle(item, row.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return {
    id: row.id,
    name: row.name,
    icon: meta.icon,
    color_hex: meta.color,
    sort_order: row.display_order,
    articles
  };
}

function mapArticle(item: InventoryItemRow, fallbackCategoryId: string): ArticleWithStatus {
  const bestand = sumSnapshots(item.stockSnapshots ?? []);
  const firstUnit = item.stockSnapshots?.find((snapshot) => snapshot.unit)?.unit;
  const min = toNumber(item.minStock ?? item.target_stock ?? 0);

  return {
    id: item.id,
    category_id: item.category_id ?? fallbackCategoryId,
    name: item.name,
    bestand,
    einheit: firstUnit ?? item.defaultUnit ?? "Stk.",
    min_bestand: min,
    status: getStatus(bestand, min)
  };
}

function sumSnapshots(rows: StockSnapshotRow[]): number {
  return rows.reduce((sum, row) => sum + toNumber(row.quantity ?? 0), 0);
}

function toNumber(value: number | string | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getCategoryMeta(name: string, index: number) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
  const match = CATEGORY_META.find((entry) => normalized.includes(entry.match));
  if (match) {
    return { icon: match.icon, color: match.color };
  }

  return {
    icon: "□",
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  };
}
