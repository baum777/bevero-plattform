export type RiskLevel = "critical" | "warning" | "stable" | "overstock";

export type RecommendedAction = {
  href: string;
  label: string;
};

export type StockInsight = {
  avgDailyConsumption30d: number;
  avgDailyConsumption7d: number;
  daysUntilEmpty: number | null;
  deviationPercent: number | null;
  explanation: string;
  recommendedAction: RecommendedAction;
  riskLevel: RiskLevel;
};

export function computeStockInsight({
  consumption30dTotal,
  consumption7dTotal,
  currentStock,
  minStock,
  targetStock,
}: {
  consumption30dTotal: number;
  consumption7dTotal: number;
  currentStock: number;
  minStock: number | null;
  targetStock: number | null;
}): StockInsight {
  const avgDailyConsumption7d = consumption7dTotal / 7;
  const avgDailyConsumption30d = consumption30dTotal / 30;

  const daysUntilEmpty =
    avgDailyConsumption7d > 0.01
      ? Math.round((currentStock / avgDailyConsumption7d) * 10) / 10
      : null;

  const deviationPercent =
    avgDailyConsumption30d > 0.01
      ? Math.round(
          ((avgDailyConsumption7d - avgDailyConsumption30d) / avgDailyConsumption30d) * 1000
        ) / 10
      : null;

  let riskLevel: RiskLevel = "stable";

  if (targetStock !== null && currentStock > targetStock * 1.2) {
    riskLevel = "overstock";
  } else if (
    (minStock !== null && currentStock <= minStock) ||
    (targetStock !== null && currentStock <= targetStock * 0.6) ||
    (daysUntilEmpty !== null && daysUntilEmpty < 2)
  ) {
    riskLevel = "critical";
  } else if (targetStock !== null && currentStock < targetStock) {
    riskLevel = "warning";
  }

  const parts: string[] = [];
  if (targetStock !== null && targetStock > 0) {
    const pct = Math.round((currentStock / targetStock) * 100);
    parts.push(`${pct}% des Sollbestands`);
  }
  if (daysUntilEmpty !== null) {
    parts.push(`Reichweite ${daysUntilEmpty} Tage`);
  }
  if (deviationPercent !== null && Math.abs(deviationPercent) >= 20) {
    const sign = deviationPercent > 0 ? "+" : "";
    parts.push(`Verbrauch ${sign}${deviationPercent}% vs. 30d-Schnitt`);
  }
  const explanation = parts.join(" · ");

  let recommendedAction: RecommendedAction;
  if (riskLevel === "critical") {
    recommendedAction = { href: "/inventory/bar-refill", label: "Auffüllen" };
  } else if (riskLevel === "warning") {
    recommendedAction = { href: "/inventory/balances", label: "Bestand prüfen" };
  } else if (riskLevel === "overstock") {
    recommendedAction = { href: "/inventory/balances", label: "Überbestand prüfen" };
  } else {
    recommendedAction = { href: "/movements", label: "Bewegungen" };
  }

  return {
    avgDailyConsumption30d,
    avgDailyConsumption7d,
    daysUntilEmpty,
    deviationPercent,
    explanation,
    recommendedAction,
    riskLevel,
  };
}

export function riskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    critical: "Kritisch",
    overstock: "Überbestand",
    stable: "Stabil",
    warning: "Warnung",
  };
  return labels[level];
}

export function riskLevelBadgeVariant(level: RiskLevel): "critical" | "warning" | "ok" | "neutral" {
  const map: Record<RiskLevel, "critical" | "warning" | "ok" | "neutral"> = {
    critical: "critical",
    overstock: "neutral",
    stable: "ok",
    warning: "warning",
  };
  return map[level];
}
