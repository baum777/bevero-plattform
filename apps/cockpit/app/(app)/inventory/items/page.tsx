import { PageScaffold } from "../../../components/page-scaffold";
import { Button } from "../../../components/ui/button";
import { ErrorState } from "../../../components/ui/error-state";
import { listInventoryItems } from "../../../../lib/supabase/queries/inventory";
import { ItemsClient } from "./items-client";

type InventoryItemsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: "active" | "all" | "inactive";
  }>;
};

export default async function InventoryItemsPage({ searchParams }: InventoryItemsPageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";
  const { data: rows, error } = await listInventoryItems({ q, status });

  const statusFilters = [
    { label: "Alle", value: "all" },
    { label: "Aktiv", value: "active" },
    { label: "Inaktiv", value: "inactive" },
  ] as const;

  return (
    <PageScaffold
      description="Artikelstammdaten verwalten: anlegen, bearbeiten und deaktivieren."
      title="Artikel"
    >
      <form className="toolbar-row" method="GET">
        <input
          className="toolbar-input"
          defaultValue={q}
          name="q"
          placeholder="Suche nach Name oder SKU"
          type="search"
        />
        <select className="toolbar-input" defaultValue={status} name="status">
          {statusFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtern
        </Button>
      </form>

      {error ? (
        <ErrorState
          action={<Button variant="outline">Erneut versuchen</Button>}
          description={error.message}
          title="Artikeldaten konnten nicht geladen werden"
        />
      ) : (
        <ItemsClient initialRows={rows} />
      )}
    </PageScaffold>
  );
}
