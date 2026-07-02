import Link from "next/link";

import { PageScaffold } from "../../components/page-scaffold";
import { ErrorState } from "../../components/ui/error-state";
import { EmptyState } from "../../components/ui/empty-state";
import { Badge } from "../../components/ui/badge";
import { listFoodNotifyPendingReceiptsForCurrentUser } from "../../../lib/backend/procurement-orders";
import { translateStatus } from "../../../lib/language";

export default async function ProcurementPage() {
  const result = await listFoodNotifyPendingReceiptsForCurrentUser();

  return (
    <PageScaffold
      title="Wareneingang"
      description="Aus FoodNotify importierte Bestellungen prüfen, mappen und manuell bestätigen."
    >
      {result.error ? (
        <ErrorState title="Wareneingänge konnten nicht geladen werden" description={result.error} />
      ) : result.access !== "allowed" ? (
        <ErrorState
          title="Kein Zugriff"
          description="FoodNotify-Wareneingänge sind für Leitung und Administration sichtbar."
        />
      ) : result.data.length === 0 ? (
        <EmptyState
          title="Keine offenen FoodNotify-Wareneingänge"
          description="Importierte Bestellbestätigungen erscheinen hier als pending Wareneingang."
        />
      ) : (
        <div className="stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Aus FoodNotify importiert</p>
              <h2>Pending Receipts</h2>
            </div>
            <Badge variant="warning">{result.data.length} offen</Badge>
          </div>
          <div className="table-list">
            {result.data.map((order) => (
              <Link className="table-row-link" href={`/procurement/${order.id}`} key={order.id}>
                <span>
                  <strong>{order.supplierName}</strong>
                  <small>{order.externalOrderNumber}</small>
                </span>
                <span>{translateStatus(order.status)}</span>
                <span>{order.itemCount} Positionen</span>
                <span>{order.unmappedCount} offen</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
