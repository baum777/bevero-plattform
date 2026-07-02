import { PageScaffold } from "../../components/page-scaffold";

export default function AlertsLoading() {
  return (
    <PageScaffold
      title="Alerts"
      description="Offene, bestätigte und gelöste Alerts mit Severity- und Workspace-Filtern."
    >
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </PageScaffold>
  );
}
