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

type LineItem = {
  id: string;
  itemId: string;
  itemName: string;
  defaultUnit: string;
  quantity: string;
  unit: string;
  locationId: string;
  note: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; count: number }
  | { kind: "error"; message: string };

type PickerTarget = string; // lineItem id

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function GoodsReceiptClient({ items, locations }: Props) {
  const { organizationId } = useAuth();
  const [lines, setLines] = useState<LineItem[]>([]);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const filteredPickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    );
  }, [items, pickerSearch]);

  const groupedPickerItems = useMemo(() => {
    const groups = new Map<string, InventoryItemWithStock[]>();
    for (const item of filteredPickerItems) {
      const key = item.category ?? "Sonstiges";
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [filteredPickerItems]);

  const openPicker = useCallback((lineId: PickerTarget) => {
    setPickerTarget(lineId);
    setPickerSearch("");
  }, []);

  const closePicker = useCallback(() => {
    setPickerTarget(null);
    setPickerSearch("");
  }, []);

  const handlePickItem = useCallback(
    (item: InventoryItemWithStock) => {
      if (pickerTarget === "new") {
        setLines((prev) => [
          ...prev,
          {
            id: uid(),
            itemId: item.id,
            itemName: item.name,
            defaultUnit: item.defaultUnit,
            quantity: "1",
            unit: item.defaultUnit,
            locationId: item.storageLocationId ?? "",
            note: ""
          }
        ]);
      } else if (pickerTarget) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === pickerTarget
              ? {
                  ...l,
                  itemId: item.id,
                  itemName: item.name,
                  defaultUnit: item.defaultUnit,
                  unit: item.defaultUnit,
                  locationId: item.storageLocationId ?? l.locationId
                }
              : l
          )
        );
      }
      closePicker();
    },
    [pickerTarget, closePicker]
  );

  const updateLine = useCallback(
    (id: string, field: Partial<Omit<LineItem, "id">>) => {
      setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...field } : l)));
    },
    []
  );

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (lines.length === 0) return;

    const invalid = lines.find((l) => {
      const qty = parseFloat(l.quantity.replace(",", "."));
      return !qty || qty <= 0;
    });
    if (invalid) {
      setState({ kind: "error", message: `Ungültige Menge bei „${invalid.itemName}".` });
      return;
    }

    setState({ kind: "submitting" });
    try {
      const token = await readAccessToken();
      const payload: Record<string, unknown> = {
        items: lines.map((l) => {
          const item: Record<string, unknown> = {
            inventoryItemId: l.itemId,
            quantity: parseFloat(l.quantity.replace(",", ".")),
            unit: l.unit
          };
          if (l.locationId) item.storageLocationId = l.locationId;
          if (l.note.trim()) item.note = l.note.trim();
          return item;
        })
      };
      if (receiptNote.trim()) payload.note = receiptNote.trim();

      await apiJson("/goods-receipts", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: payload
      });

      setState({ kind: "success", count: lines.length });
    } catch (error) {
      setState({
        kind: "error",
        message: apiErrorMessage(error, "Unbekannter Fehler.")
      });
    }
  }, [lines, organizationId, receiptNote]);

  const handleReset = useCallback(() => {
    setLines([]);
    setReceiptNote("");
    setState({ kind: "idle" });
  }, []);

  if (state.kind === "success") {
    return (
      <div className="wd-success">
        <div className="wd-success-icon" aria-hidden="true">✓</div>
        <p className="wd-success-title">Wareneingang gebucht</p>
        <p className="wd-success-detail">
          {state.count} {state.count === 1 ? "Position" : "Positionen"} erfasst
        </p>
        <Button onClick={handleReset} variant="primary">
          Neue Lieferung
        </Button>
      </div>
    );
  }

  if (pickerTarget !== null) {
    return (
      <div className="wd-picker">
        <button className="wd-back" onClick={closePicker} type="button">
          ← Zurück
        </button>
        <input
          autoFocus
          className="wd-search"
          onChange={(e) => setPickerSearch(e.target.value)}
          placeholder="Artikel suchen…"
          type="search"
          value={pickerSearch}
        />
        {groupedPickerItems.length === 0 ? (
          <EmptyState title="Keine Artikel gefunden" description={`Keine Treffer für „${pickerSearch}"`} />
        ) : (
          <div className="wd-list">
            {groupedPickerItems.map(([category, categoryItems]) => (
              <div key={category} className="wd-group">
                <p className="wd-group-label">{category}</p>
                {categoryItems.map((item) => (
                  <button
                    className="wd-item-row"
                    key={item.id}
                    onClick={() => handlePickItem(item)}
                    type="button"
                  >
                    <span className="wd-item-name">{item.name}</span>
                    <span className="wd-item-stock">{item.defaultUnit}</span>
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
    <div className="gr-form">
      {lines.length === 0 ? (
        <EmptyState
          title="Keine Positionen"
          description="Füge Artikel hinzu, die mit dieser Lieferung eingegangen sind."
        />
      ) : (
        <div className="gr-lines">
          {lines.map((line, index) => (
            <div className="gr-line" key={line.id}>
              <div className="gr-line-header">
                <span className="gr-line-num">{index + 1}</span>
                <button
                  className="gr-line-item-btn"
                  disabled={isSubmitting}
                  onClick={() => openPicker(line.id)}
                  type="button"
                >
                  {line.itemName}
                </button>
                <button
                  aria-label="Position entfernen"
                  className="gr-line-remove"
                  disabled={isSubmitting}
                  onClick={() => removeLine(line.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="gr-line-fields">
                <div className="gr-line-field">
                  <label className="wd-label" htmlFor={`gr-qty-${line.id}`}>
                    Menge
                  </label>
                  <input
                    className="wd-input"
                    disabled={isSubmitting}
                    id={`gr-qty-${line.id}`}
                    inputMode="decimal"
                    min="0.01"
                    onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                    step="0.01"
                    type="number"
                    value={line.quantity}
                  />
                </div>

                <div className="gr-line-field">
                  <label className="wd-label" htmlFor={`gr-unit-${line.id}`}>
                    Einheit
                  </label>
                  <input
                    className="wd-input"
                    disabled={isSubmitting}
                    id={`gr-unit-${line.id}`}
                    onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                    type="text"
                    value={line.unit}
                  />
                </div>
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="wd-label" htmlFor={`gr-loc-${line.id}`}>
                    Lagerort
                  </label>
                  <select
                    className="wd-select"
                    disabled={isSubmitting}
                    id={`gr-loc-${line.id}`}
                    onChange={(e) => updateLine(line.id, { locationId: e.target.value })}
                    value={line.locationId}
                  >
                    <option value="">— kein Lagerort —</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="wd-label" htmlFor={`gr-note-${line.id}`}>
                  Positionsnotiz
                </label>
                <input
                  className="wd-input"
                  disabled={isSubmitting}
                  id={`gr-note-${line.id}`}
                  onChange={(e) => updateLine(line.id, { note: e.target.value })}
                  placeholder="optional"
                  type="text"
                  value={line.note}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="gr-add-btn"
        disabled={isSubmitting}
        onClick={() => openPicker("new")}
        type="button"
      >
        + Artikel hinzufügen
      </button>

      {lines.length > 0 && (
        <>
          <div className="gr-receipt-note">
            <label className="wd-label" htmlFor="gr-receipt-note">
              Liefernotiz (optional)
            </label>
            <textarea
              className="wd-textarea"
              disabled={isSubmitting}
              id="gr-receipt-note"
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="z.B. Lieferant, Lieferscheinnummer, Abweichungen…"
              rows={2}
              value={receiptNote}
            />
          </div>

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
            {isSubmitting ? "Wird gebucht…" : `Wareneingang buchen (${lines.length} Position${lines.length !== 1 ? "en" : ""})`}
          </Button>
        </>
      )}
    </div>
  );
}
