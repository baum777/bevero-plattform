import Link from "next/link";

import { PageScaffold } from "../../../components/page-scaffold";
import { ErrorState } from "../../../components/ui/error-state";
import { Badge } from "../../../components/ui/badge";
import { getProcurementOrderForCurrentUser } from "../../../../lib/backend/procurement-orders";
import { ProcurementConfirmButton } from "./procurement-confirm-button";

type ProcurementDetailPageProps = {
  params: Promise<{ id: string }>;
};

const readyStatuses = new Set(["mapped", "auto_mapped", "ignored"]);

export default async function ProcurementDetailPage({ params }: ProcurementDetailPageProps) {
  const { id } = await params;
  const result = await getProcurementOrderForCurrentUser(id);
  const detail = result.data;
  const confirmable =
    detail?.items.every((item) => readyStatuses.has(item.mappingStatus) && item.inventoryItemId) ?? false;

  return (
    <PageScaffold
      title="FoodNotify Wareneingang"
      description="Positionen prüfen. Bestand wird erst nach manueller Bestätigung erhöht."
    >
      {result.error ? (
        <ErrorState title="Wareneingang konnte nicht geladen werden" description={result.error} />
      ) : result.access !== "allowed" || !detail ? (
        <ErrorState title="Kein Zugriff" description="Dieser Wareneingang ist nicht verfügbar." />
      ) : (
        <div className="stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{detail.order.source}</p>
              <h2>{detail.order.supplierName}</h2>
              <p className="muted">{detail.order.externalOrderNumber}</p>
            </div>
            <Badge variant={confirmable ? "ok" : "warning"}>{detail.order.status}</Badge>
          </div>

          <div className="table-list">
            {detail.items.map((item) => (
              <div className="table-row-link" key={item.id}>
                <span>
                  <strong>{item.productNameRaw}</strong>
                  <small>{item.supplierSku ?? "keine externe Artikelnummer"}</small>
                </span>
                <span>
                  {item.orderedQty} {item.unit}
                </span>
                <span>{item.mappingStatus}</span>
                <span>{item.inventoryItemId ? "gemappt" : "manuell erforderlich"}</span>
              </div>
            ))}
          </div>

          <div className="action-row">
            <Link className="btn btn-secondary" href="/procurement">
              Zurück
            </Link>
            <ProcurementConfirmButton
              disabled={!confirmable}
              items={detail.items.map((item) => ({
                id: item.id,
                orderedQty: item.orderedQty
              }))}
              orderId={detail.order.id}
            />
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
