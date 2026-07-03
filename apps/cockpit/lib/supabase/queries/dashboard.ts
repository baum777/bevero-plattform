import { createClient } from "../server";
import { listReviewTasksForCurrentUser } from "../../backend/review-tasks";
import { countOpenAutomationSuggestions } from "./automation-suggestions";
import { countCriticalOpenNotes } from "./operational-notes";
import { listInventoryBalances, listInventoryItems } from "./inventory";
import { listStorageLocations } from "./storage";
import { listWorkspaceSummariesForCurrentUser } from "./workspaces";
import { computeStockInsight, type RiskLevel } from "../../analytics/insight-engine";

export type DashboardCriticalItem = {
  avgDailyConsumption7d: number;
  avgDailyConsumption30d: number;
  category: string | null;
  deviationPercent: number | null;
  difference: number;
  daysUntilEmpty: number | null;
  explanation: string;
  itemId: string;
  itemName: string;
  minStock: number | null;
  quantity: number;
  recommendedAction: { href: string; label: string };
  riskLevel: RiskLevel;
  targetStock: number;
  unit: string;
};

export type DashboardSnapshot = {
  alertsInReview: number | null;
  alertsOpen: number | null;
  alertsResolved: number | null;
  criticalItems: number;
  criticalNotes: number | null;
  hotSpots: DashboardCriticalItem[];
  history: Array<{
    alertsCreated: number;
    alertsResolved: number;
    consumption: number;
    date: string;
    movements: number;
  }>;
  inactiveItems: number;
  itemTotal: number;
  openSuggestions: number | null;
  storageActive: number;
  storageTotal: number;
  warningItems: number;
  workspaceTotal: number | null;
};

export type DashboardSnapshotResult = {
  data: DashboardSnapshot | null;
  error: string | null;
  warnings: string[];
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshotResult> {
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sinceDate = new Date(today);
  sinceDate.setDate(today.getDate() - (days - 1));
  const sinceIso = sinceDate.toISOString();
  const since7dDate = new Date(today);
  since7dDate.setDate(today.getDate() - 6);
  const since7dIso = since7dDate.toISOString().slice(0, 10);
  const supabase = await createClient();

  const [itemsResult, balancesResult, storageResult, workspacesResult, alertsResult] =
    await Promise.all([
      listInventoryItems({ status: "all" }),
      listInventoryBalances(),
      listStorageLocations({ status: "all" }),
      listWorkspaceSummariesForCurrentUser(),
      listReviewTasksForCurrentUser({ windowDays: days })
    ]);
  const [openSuggestions, criticalNotesCount] = await Promise.all([
    countOpenAutomationSuggestions(workspacesResult.organizationId ?? ""),
    countCriticalOpenNotes(workspacesResult.organizationId ?? ""),
  ]);
  // WorkflowTask has no organization column, so it must not be read directly
  // with the user session; alert history comes from the org-scoped
  // review-task backend proxy (alertsResult) instead.
  const { data: movementRows, error: movementError } = await supabase
    .from("InventoryMovement")
    .select("inventoryItemId,type,quantity,createdAt")
    .gte("createdAt", sinceIso)
    .order("createdAt", { ascending: true })
    .limit(5000);

  const warnings: string[] = [];
  if (workspacesResult.access !== "allowed") {
    warnings.push("Arbeitsbereiche konnten nicht vollständig geladen werden.");
  }
  if (alertsResult.access !== "allowed") {
    warnings.push("Alerts sind für deine Rolle nicht vollständig verfügbar.");
  }

  if (itemsResult.error) {
    return { data: null, error: itemsResult.error.message, warnings };
  }
  if (balancesResult.error) {
    return { data: null, error: balancesResult.error.message, warnings };
  }
  if (storageResult.error) {
    return { data: null, error: storageResult.error.message, warnings };
  }
  if (workspacesResult.error) {
    return { data: null, error: workspacesResult.error, warnings };
  }
  if (alertsResult.error && alertsResult.access === "allowed") {
    warnings.push(alertsResult.error);
  }
  if (movementError) {
    return { data: null, error: movementError.message, warnings };
  }

  const itemTotal = itemsResult.data.length;
  const inactiveItems = itemsResult.data.filter((item) => !item.isActive).length;

  // Build per-item consumption maps from movement rows
  const consumption30dByItem = new Map<string, number>();
  const consumption7dByItem = new Map<string, number>();
  for (const movement of movementRows ?? []) {
    const m = movement as { inventoryItemId?: string; type?: string; quantity?: number; createdAt?: string };
    if (m.type !== "item_removed" || !m.inventoryItemId) continue;
    const qty = Number(m.quantity ?? 0);
    const itemId = m.inventoryItemId;
    consumption30dByItem.set(itemId, (consumption30dByItem.get(itemId) ?? 0) + qty);
    const date = String(m.createdAt ?? "").slice(0, 10);
    if (date >= since7dIso) {
      consumption7dByItem.set(itemId, (consumption7dByItem.get(itemId) ?? 0) + qty);
    }
  }

  const minStockByItemId = new Map(itemsResult.data.map((item) => [item.id, item.minStock ?? null]));

  const riskRows = balancesResult.data
    .map((row) => {
      if (row.targetStock === null || row.difference === null || row.difference <= 0) {
        return null;
      }
      const criticalThreshold = row.targetStock * 0.6;
      return {
        ...row,
        level: row.quantity <= criticalThreshold ? "critical" : "warning"
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const criticalRows = riskRows.filter((row) => row.level === "critical");
  const warningRows = riskRows.filter((row) => row.level === "warning");

  const hotSpots = criticalRows
    .map((row) => {
      const minStock = minStockByItemId.get(row.itemId) ?? null;
      const consumption7dTotal = consumption7dByItem.get(row.itemId) ?? 0;
      const consumption30dTotal = consumption30dByItem.get(row.itemId) ?? 0;
      const insight = computeStockInsight({
        consumption30dTotal,
        consumption7dTotal,
        currentStock: row.quantity,
        minStock,
        targetStock: row.targetStock ?? null,
      });
      return {
        avgDailyConsumption30d: insight.avgDailyConsumption30d,
        avgDailyConsumption7d: insight.avgDailyConsumption7d,
        category: row.category,
        deviationPercent: insight.deviationPercent,
        difference: row.difference ?? 0,
        daysUntilEmpty: insight.daysUntilEmpty,
        explanation: insight.explanation,
        itemId: row.itemId,
        itemName: row.itemName,
        minStock,
        quantity: row.quantity,
        recommendedAction: insight.recommendedAction,
        riskLevel: insight.riskLevel,
        targetStock: row.targetStock ?? 0,
        unit: row.unit,
      } satisfies DashboardCriticalItem;
    })
    .sort((a, b) => b.difference - a.difference)
    .slice(0, 6);

  const storageTotal = storageResult.data.length;
  const storageActive = storageResult.data.filter((row) => row.isActive).length;
  const workspaceTotal =
    workspacesResult.access === "allowed" ? workspacesResult.data.length : null;

  let alertsOpen: number | null = null;
  let alertsInReview: number | null = null;
  let alertsResolved: number | null = null;
  if (alertsResult.access === "allowed") {
    alertsOpen = alertsResult.data.filter((task) => task.status === "open").length;
    alertsInReview = alertsResult.data.filter((task) => task.status === "in_review").length;
    alertsResolved = alertsResult.data.filter((task) => task.status === "resolved").length;
  }

  const historyMap = new Map<
    string,
    { alertsCreated: number; alertsResolved: number; consumption: number; movements: number }
  >();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(sinceDate);
    date.setDate(sinceDate.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    historyMap.set(key, {
      alertsCreated: 0,
      alertsResolved: 0,
      consumption: 0,
      movements: 0
    });
  }

  for (const movement of movementRows ?? []) {
    const date = String((movement as { createdAt?: string }).createdAt ?? "").slice(0, 10);
    const bucket = historyMap.get(date);
    if (!bucket) continue;
    bucket.movements += 1;
    const type = String((movement as { type?: string }).type ?? "");
    const quantity = Number((movement as { quantity?: number }).quantity ?? 0);
    if (type === "item_removed") {
      bucket.consumption += quantity;
    }
  }

  const reviewTasksForHistory = alertsResult.access === "allowed" ? alertsResult.data : [];
  for (const task of reviewTasksForHistory) {
    const createdDate = task.createdAt.slice(0, 10);
    const createdBucket = historyMap.get(createdDate);
    if (createdBucket) {
      createdBucket.alertsCreated += 1;
    }

    if (task.resolvedAt) {
      const resolvedDate = task.resolvedAt.slice(0, 10);
      const resolvedBucket = historyMap.get(resolvedDate);
      if (resolvedBucket) {
        resolvedBucket.alertsResolved += 1;
      }
    }
  }

  const history = Array.from(historyMap.entries()).map(([date, value]) => ({
    alertsCreated: value.alertsCreated,
    alertsResolved: value.alertsResolved,
    consumption: value.consumption,
    date,
    movements: value.movements
  }));

  return {
    data: {
      alertsInReview,
      alertsOpen,
      alertsResolved,
      criticalItems: criticalRows.length,
      history,
      hotSpots,
      inactiveItems,
      itemTotal,
      criticalNotes: workspacesResult.organizationId ? criticalNotesCount : null,
      openSuggestions: workspacesResult.organizationId ? openSuggestions : null,
      storageActive,
      storageTotal,
      warningItems: warningRows.length,
      workspaceTotal
    },
    error: null,
    warnings
  };
}
