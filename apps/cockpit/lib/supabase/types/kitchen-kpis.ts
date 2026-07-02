export type KitchenDashboardKpis = {
  countableLocations: number;
  transferPoints: number;
  locationsWithCriticalStock: number;
  locationsWithNegativeStock: number;
  openCorrectionRequests: number;
  recentWithdrawals24h: number;
  recentTransfers24h: number;
  walkRouteProgress: { completed: number; total: number } | null;
};

export type KitchenDashboardResult = {
  access: "allowed" | "forbidden" | "unauthenticated";
  data: KitchenDashboardKpis | null;
  error: string | null;
};
