import { PageScaffold } from "../../../components/page-scaffold";

export default function InventoryBalancesLoading() {
  return (
    <PageScaffold title="Bestände" description="Bestandsübersicht mit Workspace-, Lagerort- und Risikofiltern.">
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </PageScaffold>
  );
}
