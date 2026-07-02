import { PageScaffold } from "../../components/page-scaffold";
import { ErrorState } from "../../components/ui/error-state";
import { listInventoryItemsWithStock } from "../../../lib/supabase/queries/inventory";
import { listStorageLocations } from "../../../lib/supabase/queries/storage";
import { MovementsClient } from "./movements-client";

export default async function MovementsPage() {
  const { data: items, error } = await listInventoryItemsWithStock();
  const { data: storageLocations, error: storageError } = await listStorageLocations({
    status: "active"
  });

  return (
    <PageScaffold
      title="Bewegungen"
      description="Schnell buchen: Typ wählen, Artikel antippen, Menge bestätigen."
    >
      {error || storageError ? (
        <ErrorState
          description={error?.message ?? storageError?.message ?? "Unbekannter Fehler"}
          title="Stammdaten für Bewegungen konnten nicht geladen werden"
        />
      ) : (
        <MovementsClient
          items={items}
          locations={storageLocations.map((location) => ({
            id: location.id,
            name: location.name
          }))}
        />
      )}
    </PageScaffold>
  );
}
