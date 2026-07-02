"use client";

import { useSearchParams } from "next/navigation";
import { useMenuCatalog } from "../../../../../../lib/cube-hooks";

const PRICE_MODE_LABELS: Record<string, string> = {
  PER_PERSON: "Pro Person",
  FLAT: "Pauschal",
  A_LA_CARTE: "À la carte"
};

const SCOPE_LABELS: Record<string, string> = {
  UNIT: "Unit",
  LOCATION: "Standort",
  GLOBAL: "Global"
};

export default function CubeMenusPage() {
  const params = useSearchParams();
  const unitId = params?.get("unitId") ?? null;
  const { menus, loading, error } = useMenuCatalog(unitId);

  if (!unitId) {
    return (
      <main>
        <h1>Menü-Matrix</h1>
        <p className="text-muted">Keine Unit ausgewählt.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Menü-Matrix</h1>

      {loading && <p>Lade Menüs…</p>}
      {error && <p className="text-error">Fehler: {error}</p>}

      {!loading && menus.length === 0 && (
        <p className="text-muted">Keine aktiven Menüs konfiguriert.</p>
      )}

      {menus.length > 0 && (
        <table className="menu-matrix-table" aria-label="Menü-Matrix">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Slot</th>
              <th scope="col">Preismodus</th>
              <th scope="col">Scope</th>
              <th scope="col">Gänge</th>
              <th scope="col">Gültig von</th>
              <th scope="col">Gültig bis</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id}>
                <td>{menu.name}</td>
                <td>
                  <span className="badge badge-default">{menu.slotKind}</span>
                </td>
                <td>{PRICE_MODE_LABELS[menu.priceMode] ?? menu.priceMode}</td>
                <td>{SCOPE_LABELS[menu.scope] ?? menu.scope}</td>
                <td>{menu.courseCount ?? "—"}</td>
                <td>
                  {menu.validFrom
                    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(
                        new Date(menu.validFrom)
                      )
                    : "—"}
                </td>
                <td>
                  {menu.validUntil
                    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(
                        new Date(menu.validUntil)
                      )
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
