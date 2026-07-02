"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../providers/auth-provider";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { apiErrorMessage, apiJson } from "../../../lib/backend/api-fetch";
import { createClient } from "../../../lib/supabase/client";
import { Toast } from "../../components/toast";
import { useToast } from "../../../hooks/use-toast";

type ItemOption = {
  id: string;
  name: string;
  defaultUnit: string;
  category: string | null;
  targetStock: number | null;
  currentStock: number;
  storageLocationId: string | null;
};

type LocationOption = { id: string; name: string };
type MovementType = "withdrawal" | "goods_receipt" | "correction" | "transfer";

type MovementRow = {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string;
  type: string;
  quantity: number;
  unit: string;
  actorUserId: string;
  storageLocationName?: string;
  fromStorageLocationName?: string;
  toStorageLocationName?: string;
  sourceType?: string;
  sourceId?: string;
  note?: string;
  createdAt: string;
  optimistic?: boolean;
};

type ApiErrorBody = { message?: string };
type MovementsResponse = { movements?: MovementRow[] };
type MovementWriteResponse = ApiErrorBody & {
  movementId?: string;
  movementIds?: string[];
  stockAfter?: number;
  stockFromAfter?: number;
  stockToAfter?: number;
  correctionRequestId?: string;
  reviewTaskId?: string;
};
type MovementsClientProps = { items: ItemOption[]; locations: LocationOption[] };
type RecentEntry = { itemId: string; type: MovementType; amount: number };
type MovementTableRow = {
  itemId: string;
  itemName: string;
  unit: string;
  movementCount: number;
  totalDelta: number;
  incoming: number;
  outgoing: number;
  latestAt: string;
  latestType: string;
  location: string | null;
  values: number[];
};

const HISTORY_PATH = "/admin/inventory/movements";
const HISTORY_POLL_MS = 30_000;
const HISTORY_LIMIT = 80;
const HISTORY_LIST_LIMIT = 20;
const SIMULATION_WINDOW_DAYS = 28;
const SIMULATION_ITEM_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 200;
const LOW_STOCK_RATIO = 0.2;
const RECENTS_KEY = "bevero-mv-recents";
const MAX_RECENTS = 5;
const movementTypeKeys: MovementType[] = ["withdrawal", "goods_receipt", "correction", "transfer"];

const AMOUNT_PRESETS: Record<MovementType, number[]> = {
  withdrawal: [1, 2, 5, 10, 25],
  goods_receipt: [1, 6, 12, 24],
  correction: [-5, -1, 1, 5],
  transfer: [1, 5, 10, 25],
};

function WithdrawalIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="9" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function GoodsReceiptIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function CorrectionIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="18">
      <line x1="4" x2="20" y1="8" y2="8" />
      <circle cx="8" cy="8" fill="currentColor" r="2" stroke="none" />
      <line x1="4" x2="20" y1="16" y2="16" />
      <circle cx="16" cy="16" fill="currentColor" r="2" stroke="none" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="9" />
      <polyline points="10,8 14,12 10,16" />
    </svg>
  );
}

const MOVEMENT_TYPES: Array<{
  key: MovementType;
  label: string;
  bookLabel: string;
  icon: ReactNode;
}> = [
  { key: "withdrawal", label: "Verbrauch", bookLabel: "Verbrauch buchen", icon: <WithdrawalIcon /> },
  { key: "goods_receipt", label: "Wareneingang", bookLabel: "Wareneingang erfassen", icon: <GoodsReceiptIcon /> },
  { key: "correction", label: "Korrektur", bookLabel: "Korrektur beantragen", icon: <CorrectionIcon /> },
  { key: "transfer", label: "Umbuchung", bookLabel: "Umbuchung buchen", icon: <TransferIcon /> },
];

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitMovementEvidence(type: MovementType, response: MovementWriteResponse) {
  const detail = {
    type,
    movementId: response.movementId,
    movementIds: response.movementIds,
    stockAfter: response.stockAfter,
    stockFromAfter: response.stockFromAfter,
    stockToAfter: response.stockToAfter,
    correctionRequestId: response.correctionRequestId,
    reviewTaskId: response.reviewTaskId,
    recordedAt: new Date().toISOString()
  };
  window.dispatchEvent(new CustomEvent("bevero:movement-evidence", { detail }));
}

function movementBadgeVariant(type: string): "critical" | "info" | "ok" | "warning" | "neutral" {
  if (type === "goods_received") return "ok";
  if (type === "transfer") return "neutral";
  if (type === "item_removed") return "warning";
  if (type === "correction_negative") return "critical";
  if (type === "correction_positive") return "info";
  return "info";
}

function movementLabel(type: string) {
  if (type === "goods_received") return "Wareneingang";
  if (type === "transfer") return "Umbuchung";
  if (type === "item_removed") return "Verbrauch";
  if (type === "correction_positive") return "Korrektur +";
  if (type === "correction_negative") return "Korrektur −";
  return type;
}

function signedQuantity(movement: MovementRow) {
  if (movement.type === "goods_received" || movement.type === "correction_positive") return movement.quantity;
  if (movement.type === "transfer") return movement.quantity;
  return movement.quantity * -1;
}

function formatSignedDelta(movement: MovementRow) {
  if (movement.type === "transfer") return `±${movement.quantity}`;
  const signed = signedQuantity(movement);
  return signed > 0 ? `+${signed}` : `${signed}`;
}

function formatRelativeTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const date = new Date(parsed);
  const now = new Date();
  const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (date.toDateString() === now.toDateString()) return `heute, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `gestern, ${time}`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatAbsoluteTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(parsed));
}

function optimisticTypeFor(type: MovementType, amount: number): string {
  if (type === "goods_receipt") return "goods_received";
  if (type === "transfer") return "transfer";
  if (type === "correction") return amount >= 0 ? "correction_positive" : "correction_negative";
  return "item_removed";
}

function nextStockAfterMovement(currentStock: number, type: MovementType, amount: number): number {
  if (type === "withdrawal") return currentStock - amount;
  if (type === "goods_receipt") return currentStock + amount;
  return currentStock;
}

function isMovementType(value: string | null): value is MovementType {
  return movementTypeKeys.some((key) => key === value);
}

function buildMovementTableRows(movements: MovementRow[], items: ItemOption[]): MovementTableRow[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const groups = new Map<string, MovementRow[]>();

  for (const movement of movements) {
    const current = groups.get(movement.inventoryItemId);
    if (current) {
      current.push(movement);
    } else {
      groups.set(movement.inventoryItemId, [movement]);
    }
  }

  return Array.from(groups.entries())
    .map(([itemId, rows]) => {
      const latest = rows[0];
      const item = itemById.get(itemId);
      const values = rows
        .slice()
        .reverse()
        .map((movement) => signedQuantity(movement));
      const incoming = values.reduce((total, value) => total + (value > 0 ? value : 0), 0);
      const outgoing = values.reduce((total, value) => total + (value < 0 ? Math.abs(value) : 0), 0);
      const location =
        latest.storageLocationName ?? latest.fromStorageLocationName ?? latest.toStorageLocationName ?? null;

      return {
        itemId,
        itemName: latest.inventoryItemName ?? item?.name ?? itemId,
        unit: latest.unit || item?.defaultUnit || "",
        movementCount: rows.length,
        totalDelta: values.reduce((total, value) => total + value, 0),
        incoming,
        outgoing,
        latestAt: latest.createdAt,
        latestType: latest.type,
        location,
        values
      };
    })
    .sort((a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt))
    .slice(0, 16);
}

function buildSimulatedMovements(items: ItemOption[], locations: LocationOption[]): MovementRow[] {
  const sourceItems = items.slice(0, SIMULATION_ITEM_LIMIT);
  const fallbackLocation = locations[0]?.name ?? "Demo-Lager";
  const anchor = new Date();
  anchor.setHours(8, 0, 0, 0);

  const rows: MovementRow[] = [];
  for (const [itemIndex, item] of sourceItems.entries()) {
    for (let day = 0; day < SIMULATION_WINDOW_DAYS; day += 1) {
      const createsWithdrawal = (day + itemIndex) % 3 === 0;
      const createsReceipt = day % 7 === 0;
      if (!createsWithdrawal && !createsReceipt) continue;

      const createdAt = new Date(anchor);
      createdAt.setDate(anchor.getDate() - (SIMULATION_WINDOW_DAYS - 1 - day));
      createdAt.setHours(7 + ((day + itemIndex) % 10), itemIndex * 7, 0, 0);

      if (createsReceipt) {
        const quantity = 4 + ((day + itemIndex) % 5);
        rows.push({
          actorUserId: "simulation",
          createdAt: createdAt.toISOString(),
          id: `simulation-${item.id}-${day}-receipt`,
          inventoryItemId: item.id,
          inventoryItemName: item.name,
          note: "Lokale 4-Wochen-Simulation",
          quantity,
          sourceType: "simulation",
          storageLocationName: fallbackLocation,
          type: "goods_received",
          unit: item.defaultUnit
        });
      }

      if (createsWithdrawal) {
        const quantity = 1 + ((day + itemIndex * 2) % 4);
        rows.push({
          actorUserId: "simulation",
          createdAt: createdAt.toISOString(),
          id: `simulation-${item.id}-${day}-withdrawal`,
          inventoryItemId: item.id,
          inventoryItemName: item.name,
          note: "Lokale 4-Wochen-Simulation",
          quantity,
          sourceType: "simulation",
          storageLocationName: fallbackLocation,
          type: "item_removed",
          unit: item.defaultUnit
        });
      }
    }
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, HISTORY_LIMIT);
}

function MovementTrendCanvas({ label, values }: { label: string; values: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 180));
    const height = Math.max(1, Math.round(rect.height || 44));
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const ok = styles.getPropertyValue("--ok").trim() || "#9ece6a";
    const critical = styles.getPropertyValue("--critical").trim() || "#f7768e";
    const muted = styles.getPropertyValue("--text-tertiary").trim() || "#565f89";
    const border = styles.getPropertyValue("--border-base").trim() || "rgba(192, 202, 245, 0.12)";
    const baselineY = Math.round(height / 2);
    const paddingX = 6;
    const max = Math.max(1, ...values.map((value) => Math.abs(value)));

    context.strokeStyle = border;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, baselineY + 0.5);
    context.lineTo(width, baselineY + 0.5);
    context.stroke();

    if (values.length === 0) {
      context.strokeStyle = muted;
      context.beginPath();
      context.moveTo(paddingX, baselineY);
      context.lineTo(width - paddingX, baselineY);
      context.stroke();
      return;
    }

    const barGap = 2;
    const usableBarWidth = width - paddingX * 2 - barGap * (values.length - 1);
    const barWidth = Math.max(2, Math.min(8, usableBarWidth / values.length));
    const startX = paddingX + Math.max(0, (usableBarWidth - barWidth * values.length) / 2);

    values.forEach((value, index) => {
      const x = startX + index * (barWidth + barGap);
      const barHeight = Math.max(2, (Math.abs(value) / max) * (height / 2 - 7));
      context.fillStyle = value >= 0 ? ok : critical;
      context.globalAlpha = 0.9;
      context.fillRect(
        Math.round(x),
        Math.round(value >= 0 ? baselineY - barHeight : baselineY),
        Math.round(barWidth),
        Math.round(barHeight)
      );
    });

    context.globalAlpha = 1;
  }, [values, label]);

  return (
    <canvas
      aria-label={`Bewegungstrend für ${label}`}
      className="mv-trend-canvas"
      height="44"
      ref={canvasRef}
      role="img"
      width="180"
    />
  );
}

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

function loadRecents(): RecentEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function persistRecent(entry: RecentEntry) {
  if (typeof localStorage === "undefined") return;
  try {
    const next = [entry, ...loadRecents().filter((r) => r.itemId !== entry.itemId)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // quota or private mode — ignore
  }
}

export function MovementsClient({ items, locations }: MovementsClientProps) {
  const { hasRole, loading: roleLoading, organizationId } = useAuth();
  const searchParams = useSearchParams();

  const [movementType, setMovementType] = useState<MovementType>("withdrawal");
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [itemRows, setItemRows] = useState(items);

  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [fromLocationId, setFromLocationId] = useState(locations[0]?.id ?? "");
  const [toLocationId, setToLocationId] = useState(locations[1]?.id ?? "");

  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(false);

  const [recents, setRecents] = useState<RecentEntry[]>(() => loadRecents());

  const canViewHistory = hasRole(["owner", "admin", "manager"]);
  const canUseGoodsReceipt = hasRole(["owner", "admin", "manager"]);

  useEffect(() => {
    const requestedType = searchParams?.get("type") ?? null;
    if (isMovementType(requestedType)) {
      setMovementType(requestedType);
      setSelectedItem(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setItemRows(items);
  }, [items]);

  const loadMovements = useCallback(async () => {
    if (!canViewHistory) {
      setMovements([]);
      setHistoryLoading(false);
      setHistoryError("Verlauf ist nur für Manager, Admin oder Owner verfügbar.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = await readAccessToken();
      const body = await apiJson<MovementsResponse>(HISTORY_PATH, {
        accessToken: token,
        organizationId,
        requireOrganization: true
      });
      setMovements((body.movements ?? []).slice(0, HISTORY_LIMIT));
    } catch (error) {
      setHistoryError(apiErrorMessage(error, "Verlauf konnte nicht geladen werden."));
    } finally {
      setHistoryLoading(false);
    }
  }, [canViewHistory, organizationId]);

  useEffect(() => {
    if (roleLoading) return;
    void loadMovements();
  }, [roleLoading, loadMovements]);

  useEffect(() => {
    if (roleLoading || !canViewHistory) return;
    const handle = setInterval(() => void loadMovements(), HISTORY_POLL_MS);
    return () => clearInterval(handle);
  }, [roleLoading, canViewHistory, loadMovements]);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return itemRows;
    return itemRows.filter((item) => item.name.toLowerCase().includes(debouncedSearch));
  }, [itemRows, debouncedSearch]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ItemOption[]>();
    for (const item of filteredItems) {
      const cat = item.category ?? "Sonstige";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [filteredItems]);

  const recentItems = useMemo(
    () =>
      recents
        .map((r) => ({ entry: r, item: items.find((i) => i.id === r.itemId) }))
        .filter((r): r is { entry: RecentEntry; item: ItemOption } => r.item !== undefined),
    [recents, items]
  );

  const simulatedMovements = useMemo(() => buildSimulatedMovements(itemRows, locations), [itemRows, locations]);
  const visibleMovements = simulationEnabled ? simulatedMovements : movements;
  const movementTableRows = useMemo(() => buildMovementTableRows(visibleMovements, itemRows), [visibleMovements, itemRows]);

  const isLowStock = useCallback((item: ItemOption) => {
    if (item.targetStock === null || item.targetStock <= 0) return false;
    return item.currentStock <= item.targetStock * LOW_STOCK_RATIO;
  }, []);

  function stockStatus(item: ItemOption): { label: string; cls: string } {
    if (item.targetStock === null || item.targetStock <= 0) {
      return { label: "Kein Soll", cls: "mv-item-chip-neutral" };
    }
    const ratio = item.currentStock / item.targetStock;
    if (ratio <= 0.6) return { label: "Kritisch", cls: "mv-item-chip-critical" };
    if (ratio < 1) return { label: "Knapp", cls: "mv-item-chip-warning" };
    if (ratio > 1.2) return { label: "Übervoll", cls: "mv-item-chip-neutral" };
    return { label: "OK", cls: "mv-item-chip-ok" };
  }

  function stockBarPct(item: ItemOption): number {
    if (!item.targetStock || item.targetStock <= 0) return 0;
    return Math.min(100, Math.round((item.currentStock / item.targetStock) * 100));
  }

  function stockBarColor(item: ItemOption): string {
    if (!item.targetStock || item.targetStock <= 0) return "var(--text-tertiary)";
    const ratio = item.currentStock / item.targetStock;
    if (ratio <= 0.6) return "var(--critical)";
    if (ratio < 1) return "var(--warning)";
    return "var(--ok)";
  }

  function openItem(item: ItemOption, presetEntry?: RecentEntry) {
    setSelectedItem(item);
    setAmount(presetEntry?.amount ?? 1);
    if (presetEntry?.type) setMovementType(presetEntry.type);
    setNote("");
    setReason("");
    requestAnimationFrame(() => setSheetVisible(true));
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => {
      setSelectedItem(null);
      setAmount(1);
    }, 320);
  }

  const minusDisabled = movementType !== "correction" && amount <= 0;

  function stepAmount(delta: number) {
    setAmount((current) => {
      const next = current + delta;
      if (movementType !== "correction" && next < 0) return 0;
      return next;
    });
  }

  function validate(): string | null {
    if (!selectedItem) return "Bitte einen Artikel wählen.";
    if (movementType === "correction") {
      if (amount === 0) return "Korrekturdelta darf nicht 0 sein.";
      if (!reason.trim()) return "Bitte einen Korrekturgrund angeben.";
      return null;
    }
    if (amount <= 0) return "Menge muss größer als 0 sein.";
    if (movementType === "goods_receipt" && !locationId) return "Bitte einen Lagerort wählen.";
    if (movementType === "transfer") {
      if (!fromLocationId || !toLocationId) return "Bitte Quell- und Ziellagerort wählen.";
      if (fromLocationId === toLocationId) return "Quell- und Ziellagerort müssen unterschiedlich sein.";
    }
    return null;
  }

  async function submitMovement() {
    const item = selectedItem;
    if (!item) return;
    if (movementType === "goods_receipt" && !canUseGoodsReceipt) {
      showToast({ kind: "error", message: "Wareneingang ist nur für Manager/Admin/Owner erlaubt." });
      return;
    }
    const validationError = validate();
    if (validationError) {
      showToast({ kind: "error", message: validationError });
      return;
    }

    const unit = item.defaultUnit;
    let path = "";
    let payload: Record<string, unknown> = {};

    if (movementType === "withdrawal") {
      path = "/withdrawals";
      payload = {
        inventoryItemId: item.id,
        quantity: amount,
        unit,
        storageLocationId: item.storageLocationId ?? undefined,
        idempotencyKey: createIdempotencyKey(),
        note: note.trim() || undefined
      };
    } else if (movementType === "goods_receipt") {
      path = "/goods-receipts";
      payload = {
        note: note.trim() || undefined,
        items: [{ inventoryItemId: item.id, quantity: amount, unit, storageLocationId: locationId || undefined, note: note.trim() || undefined }]
      };
    } else if (movementType === "correction") {
      path = "/correction-requests";
      payload = { inventoryItemId: item.id, expectedDelta: amount, unit, reason: reason.trim() };
    } else {
      path = "/transfers";
      payload = {
        inventoryItemId: item.id,
        quantity: amount,
        unit,
        fromStorageLocationId: fromLocationId,
        toStorageLocationId: toLocationId,
        idempotencyKey: createIdempotencyKey(),
        note: note.trim() || undefined
      };
    }

    const optimisticId = `optimistic-${createIdempotencyKey()}`;
    const insertsOptimistic = canViewHistory && movementType !== "correction";
    if (insertsOptimistic) {
      const optimisticRow: MovementRow = {
        id: optimisticId,
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        type: optimisticTypeFor(movementType, amount),
        quantity: amount,
        unit,
        actorUserId: "—",
        createdAt: new Date().toISOString(),
        optimistic: true
      };
      setMovements((current) => [optimisticRow, ...current].slice(0, HISTORY_LIMIT));
    }

    setSubmitting(true);
    try {
      const token = await readAccessToken();
      const body = await apiJson<MovementWriteResponse>(path, {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: payload
      });
      emitMovementEvidence(movementType, body);

      const typeConfig = MOVEMENT_TYPES.find((e) => e.key === movementType);
      const sign = movementType === "withdrawal" ? "−" : movementType === "goods_receipt" ? "+" : "";
      const successDetail =
        movementType === "correction"
          ? `Δ ${amount >= 0 ? "+" : ""}${amount} ${item.name} ${unit}`
          : `${sign}${amount} ${item.name} ${unit}`;

      if (movementType === "withdrawal" || movementType === "goods_receipt") {
        setItemRows((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, currentStock: nextStockAfterMovement(row.currentStock, movementType, amount) } : row
          )
        );
      }

      persistRecent({ itemId: item.id, type: movementType, amount });
      setRecents(loadRecents());

      showToast({ kind: "ok", message: `${typeConfig?.label ?? "Bewegung"} gebucht — ${successDetail}` });
      closeSheet();
      if (canViewHistory) void loadMovements();
    } catch (error) {
      if (insertsOptimistic) setMovements((current) => current.filter((row) => row.id !== optimisticId));
      showToast({ kind: "error", message: apiErrorMessage(error, "Unbekannter Fehler.") });
    } finally {
      setSubmitting(false);
    }
  }

  const activeType = MOVEMENT_TYPES.find((t) => t.key === movementType);

  return (
    <div className="mv-quick">

      {/* ── Type pill bar (sticky on mobile) ── */}
      <div aria-label="Buchungstyp" className="mv-type-bar" role="group">
        {MOVEMENT_TYPES.map((t) => (
          <button
            aria-pressed={movementType === t.key}
            className={`mv-type-pill${movementType === t.key ? " is-active" : ""}`}
            key={t.key}
            onClick={() => setMovementType(t.key)}
            type="button"
          >
            <span className="mv-type-pill-icon">{t.icon}</span>
            <span className="mv-type-pill-label">{t.label}</span>
          </button>
        ))}
      </div>

      {movementType === "goods_receipt" && !canUseGoodsReceipt ? (
        <p className="field-help field-help-error mv-role-warn">
          Wareneingang ist nur für Manager/Admin/Owner erlaubt.
        </p>
      ) : null}

      {/* ── Recents ── */}
      {recentItems.length > 0 && (
        <div className="mv-recents">
          <span className="mv-recents-label">Zuletzt</span>
          <div className="mv-recents-chips">
            {recentItems.map(({ entry, item }) => (
              <button
                className="mv-recent-chip"
                key={item.id}
                onClick={() => openItem(item, entry)}
                type="button"
              >
                <span className="mv-recent-name">{item.name}</span>
                <span className="mv-recent-badge">{entry.amount} {item.defaultUnit}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="mv-search-wrap">
        <input
          autoComplete="off"
          className="toolbar-input"
          id="mv-search"
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Artikel suchen…"
          type="search"
          value={search}
        />
      </div>

      {canViewHistory && movementTableRows.length > 0 ? (
        <section aria-labelledby="mv-table-title" className="mv-table-section">
          <div className="mv-table-head">
            <div>
              <h2 className="mv-table-title" id="mv-table-title">Artikelübersicht</h2>
              <p className="mv-table-desc">Verdichtung der letzten {visibleMovements.length} Bewegungen</p>
            </div>
            <div className="mv-table-actions">
              <Button onClick={() => setSimulationEnabled((current) => !current)} size="sm" variant="outline">
                {simulationEnabled ? "Echte Bewegungen" : "Simulation 4 Wochen"}
              </Button>
              <Button disabled={historyLoading || simulationEnabled} onClick={() => void loadMovements()} size="sm" variant="outline">
                Aktualisieren
              </Button>
            </div>
          </div>
          {simulationEnabled ? (
            <p className="mv-simulation-note">
              Lokale Simulation: {SIMULATION_WINDOW_DAYS} Tage, keine API-Schreibvorgänge.
            </p>
          ) : null}

          <div className="table-wrap table-wrap-tight mv-movement-table-wrap">
            <table className="table-ui mv-movement-table">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Trend</th>
                  <th>Bestand / Soll</th>
                  <th>Saldo</th>
                  <th>Eingang</th>
                  <th>Ausgang</th>
                  <th>Letzte Bewegung</th>
                  <th>Buchen</th>
                </tr>
              </thead>
              <tbody>
                {movementTableRows.map((row) => {
                  const item = itemRows.find((candidate) => candidate.id === row.itemId);
                  const pct = item ? stockBarPct(item) : 0;
                  const barColor = item ? stockBarColor(item) : "var(--text-tertiary)";
                  const status = item ? stockStatus(item) : null;
                  return (
                    <tr key={row.itemId}>
                      <td>
                        <strong>{row.itemName}</strong>
                        <div className="table-subline">
                          {row.movementCount} Bewegungen{row.location ? ` · ${row.location}` : ""}
                        </div>
                      </td>
                      <td>
                        <MovementTrendCanvas label={row.itemName} values={row.values} />
                      </td>
                      <td>
                        {item?.targetStock ? (
                          <div className="mv-stock-cell">
                            <div className="mv-stock-bar">
                              <div className="mv-stock-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <div className="mv-stock-cell-foot">
                              <span className="mv-stock-label mono">
                                {item.currentStock} / {item.targetStock} {row.unit}
                              </span>
                              {status ? (
                                <span className={`mv-item-chip ${status.cls}`}>{status.label}</span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="mono">{item?.currentStock ?? "—"} {row.unit}</span>
                        )}
                      </td>
                      <td className={`mono mv-table-delta${row.totalDelta < 0 ? " is-negative" : " is-positive"}`}>
                        {row.totalDelta > 0 ? "+" : ""}{row.totalDelta} {row.unit}
                      </td>
                      <td className="mono">{row.incoming} {row.unit}</td>
                      <td className="mono">{row.outgoing} {row.unit}</td>
                      <td>
                        <Badge variant={movementBadgeVariant(row.latestType)}>{movementLabel(row.latestType)}</Badge>
                        <div className="table-subline">{formatAbsoluteTime(row.latestAt)}</div>
                      </td>
                      <td>
                        <Button
                          disabled={!item}
                          onClick={() => { if (item) openItem(item); }}
                          size="sm"
                          variant="outline"
                        >
                          Buchen
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mv-table-mobile-cards">
            {movementTableRows.map((row) => {
              const item = itemRows.find((candidate) => candidate.id === row.itemId);
              const pct = item ? stockBarPct(item) : 0;
              const barColor = item ? stockBarColor(item) : "var(--text-tertiary)";
              return (
                <button
                  className="mv-table-mobile-card"
                  disabled={!item}
                  key={row.itemId}
                  onClick={() => { if (item) openItem(item); }}
                  type="button"
                >
                  <span className="mv-table-mobile-main">
                    <strong>{row.itemName}</strong>
                    <span>{row.movementCount} Bewegungen · {formatAbsoluteTime(row.latestAt)}</span>
                  </span>
                  <MovementTrendCanvas label={row.itemName} values={row.values} />
                  <span className="mv-stock-bar mv-stock-bar-mobile">
                    <span className="mv-stock-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </span>
                  <span className={`mono mv-table-delta${row.totalDelta < 0 ? " is-negative" : " is-positive"}`}>
                    {row.totalDelta > 0 ? "+" : ""}{row.totalDelta} {row.unit}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Grouped item list ── */}
      {filteredItems.length === 0 ? (
        <EmptyState description="Keine Artikel gefunden." title="Keine Treffer" />
      ) : (
        <div className="mv-item-groups">
          {groupedItems.map(([cat, catItems]) => (
            <div className="mv-cat-group" key={cat}>
              <div className="mv-cat-label">{cat}</div>
              <ul className="mv-item-list">
                {catItems.map((item) => {
                  const low = isLowStock(item);
                  const pct = stockBarPct(item);
                  const barColor = stockBarColor(item);
                  const status = stockStatus(item);
                  return (
                    <li key={item.id}>
                      <button className="mv-item" onClick={() => openItem(item)} type="button">
                        {/* Col 1: Name + meta */}
                        <span className="mv-item-main">
                          <span className="mv-item-name">{item.name}</span>
                          <span className="mv-item-meta">
                            {item.defaultUnit}{item.category ? ` · ${item.category}` : ""}
                          </span>
                        </span>

                        {/* Col 2: Progress bar + Soll */}
                        {item.targetStock !== null && item.targetStock > 0 ? (
                          <span className="mv-item-bar-col" aria-hidden="true">
                            <span className="mv-item-bar">
                              <span className="mv-item-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                            </span>
                            <span className="mv-item-soll">Soll {item.targetStock}</span>
                          </span>
                        ) : null}

                        {/* Col 3: Status chip */}
                        <span className={`mv-item-chip ${status.cls}`} aria-label={`Status: ${status.label}`}>
                          {status.label}
                        </span>

                        {/* Col 4: Stock value */}
                        <span className={`mv-item-stock${low ? " is-low" : ""}`}>
                          {item.currentStock}
                          <span className="mv-item-stock-unit"> {item.defaultUnit}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── History (collapsible) ── */}
      <section className="mv-history">
        <div className="mv-history-head">
          <button
            className="mv-history-toggle"
            onClick={() => setHistoryExpanded((x) => !x)}
            type="button"
          >
            <span className="mv-history-toggle-label">Letzte Bewegungen</span>
            {visibleMovements.length > 0 && (
              <span className="mv-history-count">{visibleMovements.length}</span>
            )}
            <span aria-hidden="true" className="mv-history-chevron">
              {historyExpanded ? "▲" : "▼"}
            </span>
          </button>
          {canViewHistory && (
            <button
              aria-label="Verlauf aktualisieren"
              className="mv-history-refresh"
              disabled={historyLoading}
              onClick={() => void loadMovements()}
              type="button"
            >
              ↻
            </button>
          )}
        </div>

        {historyExpanded && (
          <div className="mv-history-body">
            {!simulationEnabled && historyError ? (
              <ErrorState
                action={
                  canViewHistory ? (
                    <Button onClick={() => void loadMovements()} size="sm" variant="primary">
                      Erneut versuchen
                    </Button>
                  ) : null
                }
                description={historyError}
                title="Verlauf konnte nicht geladen werden"
              />
            ) : null}

            {!simulationEnabled && !historyError && historyLoading && visibleMovements.length === 0 ? (
              <div className="stack-sm">
                <div className="skeleton-block" />
                <div className="skeleton-block" />
                <div className="skeleton-block" />
              </div>
            ) : null}

            {!historyError && !historyLoading && visibleMovements.length === 0 ? (
              <EmptyState description="Noch keine Bewegungen." title="Leerer Verlauf" />
            ) : null}

            {!historyError && visibleMovements.length > 0 ? (
              <ul className="mv-history-list">
                {visibleMovements.slice(0, HISTORY_LIST_LIMIT).map((movement) => (
                  <li className={`mv-history-row${movement.optimistic ? " is-optimistic" : ""}`} key={movement.id}>
                    <Badge variant={movementBadgeVariant(movement.type)}>{movementLabel(movement.type)}</Badge>
                    <span className="mv-history-name">{movement.inventoryItemName ?? movement.inventoryItemId}</span>
                    <span className="mv-history-time">{formatRelativeTime(movement.createdAt)}</span>
                    <span
                      className={`mv-history-delta mono${
                        signedQuantity(movement) < 0 ? " is-negative" : " is-positive"
                      }`}
                    >
                      {formatSignedDelta(movement)} {movement.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Bottom Sheet (confirm step) ── */}
      {selectedItem !== null && (
        <>
          <div
            aria-hidden="true"
            className={`mv-sheet-backdrop${sheetVisible ? " is-open" : ""}`}
            onClick={closeSheet}
          />
          <div
            aria-modal="true"
            className={`mv-sheet${sheetVisible ? " is-open" : ""}`}
            role="dialog"
          >
            <div aria-hidden="true" className="mv-sheet-handle" />
            <div className="mv-sheet-content">

              {/* Header */}
              <div className="mv-sheet-head">
                <button aria-label="Schließen" className="mv-back" onClick={closeSheet} type="button">
                  <span aria-hidden="true">←</span> Zurück
                </button>
                <span className="mv-step-indicator">{activeType?.label}</span>
              </div>

              {/* Item preview */}
              <div className="mv-preview">
                <span className="mv-type-icon">{activeType?.icon}</span>
                <div className="mv-preview-text">
                  <strong>{selectedItem.name}</strong>
                  <span className="mv-item-meta">
                    Bestand: {selectedItem.currentStock} {selectedItem.defaultUnit}
                  </span>
                </div>
              </div>

              {/* Amount block */}
              <div className="mv-amount-block">
                <div className="mv-stepper">
                  <button
                    aria-label="Weniger"
                    className="mv-step-btn"
                    disabled={minusDisabled}
                    onClick={() => stepAmount(-1)}
                    type="button"
                  >
                    −
                  </button>
                  <input
                    aria-label="Menge"
                    className="mv-step-input mono"
                    inputMode="numeric"
                    onChange={(e) => {
                      const raw = e.currentTarget.value.trim();
                      const parsed = raw === "" || raw === "-" ? 0 : Number(raw);
                      setAmount(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    type="number"
                    value={amount}
                  />
                  <button aria-label="Mehr" className="mv-step-btn" onClick={() => stepAmount(1)} type="button">
                    +
                  </button>
                </div>
                <p className="mv-step-unit">{selectedItem.defaultUnit}</p>

                {/* Quick presets */}
                <div aria-label="Schnellwahl" className="mv-presets">
                  {AMOUNT_PRESETS[movementType].map((preset) => (
                    <button
                      className={`mv-preset-btn${amount === preset ? " is-active" : ""}`}
                      key={preset}
                      onClick={() => setAmount(preset)}
                      type="button"
                    >
                      {preset > 0 ? `+${preset}` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra fields */}
              {movementType === "goods_receipt" ? (
                <div className="field-stack">
                  <label htmlFor="mv-location">Lagerort</label>
                  <select
                    className="toolbar-input"
                    id="mv-location"
                    onChange={(e) => setLocationId(e.currentTarget.value)}
                    value={locationId}
                  >
                    <option value="">Lagerort wählen</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {movementType === "transfer" ? (
                <div className="field-row-2">
                  <div className="field-stack">
                    <label htmlFor="mv-from">Quelle</label>
                    <select
                      className="toolbar-input"
                      id="mv-from"
                      onChange={(e) => setFromLocationId(e.currentTarget.value)}
                      value={fromLocationId}
                    >
                      <option value="">Quelle wählen</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="field-stack">
                    <label htmlFor="mv-to">Ziel</label>
                    <select
                      className="toolbar-input"
                      id="mv-to"
                      onChange={(e) => setToLocationId(e.currentTarget.value)}
                      value={toLocationId}
                    >
                      <option value="">Ziel wählen</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : null}

              {movementType === "correction" ? (
                <div className="field-stack">
                  <label htmlFor="mv-reason">Grund</label>
                  <input
                    className="toolbar-input"
                    id="mv-reason"
                    onChange={(e) => setReason(e.currentTarget.value)}
                    placeholder="z. B. Inventurdifferenz"
                    value={reason}
                  />
                </div>
              ) : null}

              <div className="field-stack">
                <label htmlFor="mv-note">Notiz</label>
                <input
                  className="toolbar-input"
                  id="mv-note"
                  onChange={(e) => setNote(e.currentTarget.value)}
                  placeholder="Optional"
                  value={note}
                />
              </div>

              <Button
                className="btn-block mv-book"
                disabled={submitting}
                loading={submitting}
                onClick={() => void submitMovement()}
                variant="primary"
              >
                {activeType?.bookLabel ?? "Buchen"}
              </Button>

            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <Toast toast={toast} />

    </div>
  );
}
