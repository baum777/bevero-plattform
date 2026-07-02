"use client";

type DashboardHistoryPoint = {
  alertsCreated: number;
  alertsResolved: number;
  consumption: number;
  date: string;
  movements: number;
};

type DashboardHistoryChartsProps = {
  points: DashboardHistoryPoint[];
};

function normalize(values: number[], height: number) {
  const max = Math.max(1, ...values);
  return values.map((value) => height - (value / max) * height);
}

function linePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  if (values.length === 1) return `M 0 ${height / 2}`;
  const yValues = normalize(values, height);
  const stepX = width / (values.length - 1);
  return yValues
    .map((y, index) => `${index === 0 ? "M" : "L"} ${Math.round(index * stepX)} ${Math.round(y)}`)
    .join(" ");
}

function baselinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const max = Math.max(1, ...values);
  const y = Math.round(height - (avg / max) * height);
  return `M 0 ${y} L ${width} ${y}`;
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export function DashboardHistoryCharts({ points }: DashboardHistoryChartsProps) {
  const labels = points.map((point) => point.date.slice(5));
  const movementValues = points.map((point) => point.movements);
  const consumptionValues = points.map((point) => point.consumption);
  const alertsCreatedValues = points.map((point) => point.alertsCreated);
  const alertsResolvedValues = points.map((point) => point.alertsResolved);

  const avgConsumption = avg(consumptionValues);
  const avgMovements = avg(movementValues);

  return (
    <div className="grid-2 dashboard-grid-3">
      <article className="card-ui">
        <h3 className="card-ui-title">Movements (30 Tage)</h3>
        <div className="chart-wrap">
          <svg className="line-chart" viewBox="0 0 300 120">
            <path
              d={baselinePath(movementValues, 300, 110)}
              fill="none"
              stroke="#3b82f630"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            <path d={linePath(movementValues, 300, 110)} fill="none" stroke="#3b82f6" strokeWidth="3" />
          </svg>
        </div>
        <p className="chart-caption">
          {labels[0]} bis {labels[labels.length - 1]} · Ø {avgMovements}/Tag
        </p>
      </article>

      <article className="card-ui">
        <h3 className="card-ui-title">Verbrauch (30 Tage)</h3>
        <div className="chart-wrap">
          <svg className="line-chart" viewBox="0 0 300 120">
            <path
              d={baselinePath(consumptionValues, 300, 110)}
              fill="none"
              stroke="#f59e0b30"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            <path d={linePath(consumptionValues, 300, 110)} fill="none" stroke="#f59e0b" strokeWidth="3" />
          </svg>
        </div>
        <p className="chart-caption">Entnahmen aggregiert · Ø {avgConsumption}/Tag</p>
      </article>

      <article className="card-ui">
        <h3 className="card-ui-title">Alerts (30 Tage)</h3>
        <div className="chart-wrap">
          <svg className="line-chart" viewBox="0 0 300 120">
            <path d={linePath(alertsCreatedValues, 300, 110)} fill="none" stroke="#ef4444" strokeWidth="3" />
            <path d={linePath(alertsResolvedValues, 300, 110)} fill="none" stroke="#22c55e" strokeWidth="3" />
          </svg>
        </div>
        <p className="chart-caption">Rot: erstellt · Grün: gelöst</p>
      </article>
    </div>
  );
}
