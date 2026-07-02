import { PageScaffold } from "../../components/page-scaffold";

export default function DashboardLoading() {
  return (
    <PageScaffold
      title="Dashboard"
      description="Operativer Überblick über kritische Bestände, Verbrauch und Alerts."
    >
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </PageScaffold>
  );
}
