"use client";

import { riskLevelLabel, riskLevelBadgeVariant, type RiskLevel } from "../../../lib/analytics/insight-engine";
import { Badge } from "../../components/ui/badge";

type StockRiskItem = {
  avgDailyConsumption7d: number;
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

type StockRiskCardsProps = {
  items: StockRiskItem[];
};

function StockProgressBar({ quantity, targetStock }: { quantity: number; targetStock: number }) {
  const pct = targetStock > 0 ? Math.min(100, Math.round((quantity / targetStock) * 100)) : 0;
  const fillColor =
    pct <= 30 ? "var(--critical)" : pct <= 60 ? "var(--warning)" : "var(--ok)";
  return (
    <div className="sri-progress">
      <div
        className="sri-progress-fill"
        style={{ width: `${pct}%`, background: fillColor }}
      />
    </div>
  );
}

function DaysUntilEmptyBadge({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="sri-chip sri-chip-neutral">Ø Verbrauch</span>;
  }
  const variant =
    days < 2 ? "sri-chip-critical" : days < 5 ? "sri-chip-warning" : "sri-chip-neutral";
  return (
    <span className={`sri-chip ${variant}`}>
      {days < 999 ? `${days}d Reichweite` : "Kein Verbrauch"}
    </span>
  );
}

function DeviationBadge({ deviationPercent }: { deviationPercent: number | null }) {
  if (deviationPercent === null || Math.abs(deviationPercent) < 10) return null;
  const sign = deviationPercent > 0 ? "+" : "";
  const variant = Math.abs(deviationPercent) >= 40 ? "sri-chip-critical" : "sri-chip-warning";
  return (
    <span className={`sri-chip ${variant}`}>
      {sign}{deviationPercent}% Verbrauch
    </span>
  );
}

export function StockRiskCards({ items }: StockRiskCardsProps) {
  if (items.length === 0) return null;

  return (
    <div className="sri-grid">
      {items.map((item) => (
        <article className="sri-card" key={item.itemId}>
          <div className="sri-card-header">
            <div className="sri-card-title-row">
              <h4 className="sri-card-title">{item.itemName}</h4>
              <Badge variant={riskLevelBadgeVariant(item.riskLevel)}>
                {riskLevelLabel(item.riskLevel)}
              </Badge>
            </div>
            {item.category && <p className="sri-card-category">{item.category}</p>}
          </div>

          <div className="sri-stock-row">
            <span className="mono sri-stock-value">
              {item.quantity} <span className="sri-stock-unit">{item.unit}</span>
            </span>
            <span className="sri-stock-target">
              Soll: {item.targetStock} {item.unit}
            </span>
          </div>

          <StockProgressBar quantity={item.quantity} targetStock={item.targetStock} />

          <div className="sri-chips">
            <DaysUntilEmptyBadge days={item.daysUntilEmpty} />
            <DeviationBadge deviationPercent={item.deviationPercent} />
            {item.minStock !== null && item.quantity <= item.minStock && (
              <span className="sri-chip sri-chip-critical">Unter Mindestbestand</span>
            )}
          </div>

          {item.explanation ? (
            <p className="sri-explanation">{item.explanation}</p>
          ) : null}

          <div className="sri-actions">
            <a className="btn btn-sm btn-primary" href={item.recommendedAction.href}>
              {item.recommendedAction.label}
            </a>
            <a
              className="btn btn-sm btn-ghost"
              href={`/movements?item=${item.itemId}`}
            >
              Bewegungen
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
