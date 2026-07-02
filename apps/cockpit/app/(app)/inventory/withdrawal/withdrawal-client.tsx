"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiJson } from "../../../../lib/backend/api-fetch";
import type { InventoryItemWithStock } from "../../../../lib/supabase/queries/inventory";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/ui/empty-state";
import { useAuth } from "../../../providers/auth-provider";

type LocationOption = { id: string; name: string };

type Props = {
  items: InventoryItemWithStock[];
  locations: LocationOption[];
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; stockAfter: number; itemName: string; unit: string }
  | { kind: "error"; message: string };

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

export function WithdrawalClient({ items, locations }: Props) {
  const { organizationId } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [locationId, setLocationId] = useState<string>("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, InventoryItemWithStock[]>();
    for (const item of filteredItems) {
      const key = item.category ?? "Sonstiges";
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [filteredItems]);

  const handleSelect = useCallback(
    (item: InventoryItemWithStock) => {
      setSelectedItemId(item.id);
      setQuantity("1");
      setLocationId(item.storageLocationId ?? "");
      setNote("");
      setState({ kind: "idle" });
    },
    []
  );

  const handleReset = useCallback(() => {
    setSelectedItemId(null);
    setSearch("");
    setQuantity("1");
    setLocationId("");
    setNote("");
    setState({ kind: "idle" });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity.replace(",", "."));
    if (!qty || qty <= 0) {
      setState({ kind: "error", message: "Bitte eine gültige Menge größer 0 eingeben." });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const token = await readAccessToken();
      const payload: Record<string, unknown> = {
        inventoryItemId: selectedItem.id,
        quantity: qty,
        unit: selectedItem.defaultUnit
      };
      if (locationId) payload.storageLocationId = locationId;
      if (note.trim()) payload.note = note.trim();

      const body = await apiJson<{
        stockAfter?: number;
      }>("/withdrawals", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: payload
      });

      setState({
        kind: "success",
        stockAfter: body.stockAfter ?? 0,
        itemName: selectedItem.name,
        unit: selectedItem.defaultUnit
      });
    } catch (error) {
      setState({
        kind: "error",
        message: apiErrorMessage(error, "Unbekannter Fehler.")
      });
    }
  }, [selectedItem, quantity, locationId, note, organizationId]);

  if (state.kind === "success") {
    return (
      <div className="wd-success">
        <div className="wd-success-icon" aria-hidden="true">✓</div>
        <p className="wd-success-title">Verbrauch gebucht</p>
        <p className="wd-success-detail">
          {state.itemName} — Bestand jetzt: {state.stockAfter} {state.unit}
        </p>
        <Button onClick={handleReset} variant="primary">
          Weiteren buchen
        </Button>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="wd-picker">
        <input
          autoFocus
          className="wd-search"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Artikel suchen…"
          type="search"
          value={search}
        />

        {groupedItems.length === 0 ? (
          <EmptyState
            title="Keine Artikel gefunden"
            description={search ? `Keine Treffer für „${search}"` : "Es sind noch keine aktiven Artikel vorhanden."}
          />
        ) : (
          <div className="wd-list">
            {groupedItems.map(([category, categoryItems]) => (
              <div key={category} className="wd-group">
                <p className="wd-group-label">{category}</p>
                {categoryItems.map((item) => (
                  <button
                    className="wd-item-row"
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    type="button"
                  >
                    <span className="wd-item-name">{item.name}</span>
                    <span className="wd-item-stock">
                      {item.currentStock} {item.defaultUnit}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSubmitting = state.kind === "submitting";

  return (
    <div className="wd-form">
      <button className="wd-back" onClick={handleReset} type="button">
        ← Anderer Artikel
      </button>

      <div className="wd-form-item">
        <p className="wd-form-item-name">{selectedItem.name}</p>
        <p className="wd-form-item-stock">
          Aktuell: {selectedItem.currentStock} {selectedItem.defaultUnit}
        </p>
      </div>

      <label className="wd-label" htmlFor="wd-qty">
        Menge ({selectedItem.defaultUnit})
      </label>
      <input
        className="wd-input"
        disabled={isSubmitting}
        id="wd-qty"
        inputMode="decimal"
        min="0.01"
        onChange={(e) => setQuantity(e.target.value)}
        step="0.01"
        type="number"
        value={quantity}
      />

      {locations.length > 0 && (
        <>
          <label className="wd-label" htmlFor="wd-loc">
            Lagerort (optional)
          </label>
          <select
            className="wd-select"
            disabled={isSubmitting}
            id="wd-loc"
            onChange={(e) => setLocationId(e.target.value)}
            value={locationId}
          >
            <option value="">— kein Lagerort —</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="wd-label" htmlFor="wd-note">
        Notiz (optional)
      </label>
      <textarea
        className="wd-textarea"
        disabled={isSubmitting}
        id="wd-note"
        onChange={(e) => setNote(e.target.value)}
        placeholder="z.B. Schichtende, Veranstaltung…"
        rows={2}
        value={note}
      />

      {state.kind === "error" && (
        <p className="wd-error" role="alert">
          {state.message}
        </p>
      )}

      <Button
        disabled={isSubmitting}
        onClick={() => void handleSubmit()}
        variant="primary"
      >
        {isSubmitting ? "Wird gebucht…" : "Verbrauch buchen"}
      </Button>
    </div>
  );
}
