"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Badge } from "../../../components/ui/badge";
import { useAuth } from "../../../providers/auth-provider";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch, apiJson } from "../../../../lib/backend/api-fetch";
import { Toast } from "../../../components/toast";
import { useToast } from "../../../../hooks/use-toast";

type RunItemStatus = "open" | "pending" | "confirmed" | "cancelled";
type RunStatus = "open" | "partially_confirmed" | "completed";

type BarRefillRunItem = {
  id: string;
  displayOrder: number;
  productName: string;
  unit?: string;
  targetQuantity?: number;
  requestedQuantity?: number;
  status: RunItemStatus;
};

type BarRefillRun = {
  runId: string;
  status: RunStatus;
  timezone: string;
  runDateLocal: string;
  items: BarRefillRunItem[];
};

type ConfirmResponse = {
  run: BarRefillRun;
  movementId: string;
  stockAfter: number;
};

type ConfirmEvidence = {
  itemId: string;
  movementId: string;
  stockAfter: number;
  confirmedAt: string;
};

const BAR_REFILL_RUNS_ENDPOINT = "/bar-refill/runs";
const BAR_REFILL_TODAY_ENDPOINT = "/bar-refill/runs/today";
const BAR_REFILL_QUANTITY_PRESETS = [-5, -2, -1, 1, 2, 5] as const;

// ── localStorage SWR cache ────────────────────────────────────────────────────

function todayCacheKey(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  return `bevero-bar-refill-run:${today}`;
}

function loadCachedRun(): BarRefillRun | null {
  try {
    const raw = localStorage.getItem(todayCacheKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBarRefillRun(parsed) ? (parsed as BarRefillRun) : null;
  } catch {
    return null;
  }
}

function persistRunToCache(run: BarRefillRun): void {
  try {
    localStorage.setItem(todayCacheKey(), JSON.stringify(run));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

// The run item DTO carries no category, so grouping mirrors the seed mapping
// in prisma/seeds/bar_inventory_items.sql (display order -> bar category).
const CATEGORY_ORDER = [
  "Softdrinks klein",
  "Energy & Wasser",
  "Mixgetränke 0,33l",
  "Fass",
  "Alkoholfrei",
  "Softdrinks 1l",
  "Mixer & Säfte",
  "Sonstiges"
] as const;

function categoryForDisplayOrder(order: number): (typeof CATEGORY_ORDER)[number] {
  if ([1, 2, 3, 4, 5, 6, 7, 8].includes(order)) return "Softdrinks klein";
  if ([9, 10, 11, 12, 13, 41, 42].includes(order)) return "Energy & Wasser";
  if ([14, 15, 16, 17, 18, 19, 24].includes(order)) return "Mixgetränke 0,33l";
  if ([20, 21].includes(order)) return "Fass";
  if ([22, 23].includes(order)) return "Alkoholfrei";
  if ([25, 26, 27, 28, 37, 38, 39, 40].includes(order)) return "Softdrinks 1l";
  if ([29, 30, 31, 32, 33, 34, 35, 36].includes(order)) return "Mixer & Säfte";
  return "Sonstiges";
}

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Keine aktive Session gefunden.");
  }
  return data.session.access_token;
}

function statusBadge(status: RunItemStatus) {
  if (status === "confirmed") return "ok";
  if (status === "pending") return "warning";
  if (status === "cancelled") return "neutral";
  return "info";
}

function statusLabel(status: RunItemStatus) {
  if (status === "confirmed") return "Erledigt";
  if (status === "pending") return "Ausstehend";
  if (status === "cancelled") return "Storniert";
  return "Offen";
}

function runItemEndpoint(runId: string, itemId: string, command?: "confirm" | "cancel") {
  const base = `${BAR_REFILL_RUNS_ENDPOINT}/${encodeURIComponent(runId)}/items/${encodeURIComponent(itemId)}`;
  return command ? `${base}/${command}` : base;
}

function toFriendlyBarRefillMessage(error: unknown, fallback = "Auffüllliste konnte nicht geladen werden.") {
  const message = apiErrorMessage(error, fallback);

  if (!message || /failed to fetch|load failed|networkerror|fetch failed|next_public_api_base_url/i.test(message)) {
    return "Auffüllliste ist aktuell nicht erreichbar. Bitte Backend-API-Verbindung prüfen und erneut versuchen.";
  }

  return message || fallback;
}

function isBarRefillRun(value: unknown): value is BarRefillRun {
  const candidate = value as BarRefillRun | null;
  return Boolean(
    candidate &&
      typeof candidate.runId === "string" &&
      typeof candidate.runDateLocal === "string" &&
      Array.isArray(candidate.items)
  );
}

async function requestBarRefillRun(endpoint: string, options: Parameters<typeof apiJson>[1]) {
  const body = await apiJson<BarRefillRun>(endpoint, options);
  if (!isBarRefillRun(body)) {
    throw new Error("Die Auffüllliste kam unvollständig aus der API zurück.");
  }

  return body;
}

async function requestConfirmedRun(endpoint: string, options: Parameters<typeof apiJson>[1]) {
  const body = await apiJson<ConfirmResponse>(endpoint, options);
  if (!isBarRefillRun(body.run)) {
    throw new Error("Die bestätigte Auffüllliste kam unvollständig aus der API zurück.");
  }
  if (!body.movementId || typeof body.stockAfter !== "number") {
    throw new Error("Die Bestätigung kam ohne Bewegungsnachweis aus der API zurück.");
  }

  return body;
}

export function BarRefillClient() {
  const { hasRole, loading: roleLoading, organizationId } = useAuth();
  const [run, setRun] = useState<BarRefillRun | null>(null);
  const [confirmEvidence, setConfirmEvidence] = useState<ConfirmEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItems, setBusyItems] = useState<Record<string, boolean>>({});
  const { toast, showToast } = useToast();

  const canUseBarRefill = useMemo(
    () => hasRole(["owner", "admin", "manager", "staff"]),
    [hasRole]
  );

  const loadRun = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      const token = await readAccessToken();
      const authOptions = { accessToken: token, organizationId, requireOrganization: true };

      // GET first — avoids the expensive Serializable transaction when the run
      // already exists (the common case after the first visit of the day).
      let nextRun: BarRefillRun;
      const getResponse = await apiFetch(BAR_REFILL_TODAY_ENDPOINT, {
        ...authOptions,
        throwOnError: false
      });

      if (getResponse.status === 404) {
        // No run yet for today — create it.
        nextRun = await requestBarRefillRun(
          BAR_REFILL_RUNS_ENDPOINT,
          { method: "POST", ...authOptions }
        );
      } else if (!getResponse.ok) {
        const body = (await getResponse.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Auffülllauf konnte nicht geladen werden.");
      } else {
        const body = await getResponse.json();
        if (!isBarRefillRun(body)) {
          throw new Error("Die Auffüllliste kam unvollständig aus der API zurück.");
        }
        nextRun = body;
      }

      persistRunToCache(nextRun);
      setRun(nextRun);
    } catch (requestError) {
      if (!background) {
        setRun(null);
        setError(toFriendlyBarRefillMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (roleLoading) return;
    if (!canUseBarRefill) {
      setLoading(false);
      setError("Auffüllliste ist nur für Staff, Manager oder Admin verfügbar.");
      return;
    }

    // Show cached data immediately so there's no loading spinner for returning
    // users, then refresh in the background.
    const cached = loadCachedRun();
    if (cached) {
      setRun(cached);
      setLoading(false);
      void loadRun(true);
    } else {
      void loadRun(false);
    }
  }, [canUseBarRefill, roleLoading, loadRun]);

  const setItemBusy = useCallback((itemId: string, value: boolean) => {
    setBusyItems((current) => {
      if (value) {
        return { ...current, [itemId]: true };
      }
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }, []);

  // Optimistic patch of a single item, with rollback on API failure.
  const patchQuantity = useCallback(
    async (itemId: string, nextValue: number | null) => {
      if (!run) return;
      const snapshot = run.items.find((item) => item.id === itemId);
      if (!snapshot) return;

      const optimisticStatus: RunItemStatus =
        nextValue !== null && nextValue > 0 ? "pending" : "open";

      setRun((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId
                  ? { ...item, requestedQuantity: nextValue ?? undefined, status: optimisticStatus }
                  : item
              )
            }
          : current
      );
      setItemBusy(itemId, true);

      try {
        const token = await readAccessToken();
        const nextRun = await requestBarRefillRun(
          runItemEndpoint(run.runId, itemId),
          {
            method: "PATCH",
            accessToken: token,
            organizationId,
            requireOrganization: true,
            body: { requestedQuantity: nextValue }
          }
        );
        persistRunToCache(nextRun);
        setRun(nextRun);
      } catch (requestError) {
        setRun((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === itemId ? snapshot : item))
              }
            : current
        );
        showToast(toFriendlyBarRefillMessage(requestError, "Differenz konnte nicht gespeichert werden."), "error");
      } finally {
        setItemBusy(itemId, false);
      }
    },
    [organizationId, run, setItemBusy, showToast]
  );

  // Optimistic confirm of a single item, with rollback on failure.
  const confirmItem = useCallback(
    async (itemId: string) => {
      if (!run) return;
      const snapshot = run.items.find((item) => item.id === itemId);
      if (!snapshot || snapshot.status !== "pending") return;

      setRun((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId ? { ...item, status: "confirmed" } : item
              )
            }
          : current
      );
      setItemBusy(itemId, true);

      try {
        const token = await readAccessToken();
        const result = await requestConfirmedRun(
          runItemEndpoint(run.runId, itemId, "confirm"),
          {
            method: "POST",
            accessToken: token,
            organizationId,
            requireOrganization: true
          }
        );
        const nextRun = result.run;
        setConfirmEvidence((current) => [
          {
            itemId,
            movementId: result.movementId,
            stockAfter: result.stockAfter,
            confirmedAt: new Date().toISOString()
          },
          ...current
        ].slice(0, 20));
        persistRunToCache(nextRun);
        setRun(nextRun);
      } catch (requestError) {
        setRun((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === itemId ? snapshot : item))
              }
            : current
        );
        showToast(toFriendlyBarRefillMessage(requestError, "Bestätigung konnte nicht gespeichert werden."), "error");
      } finally {
        setItemBusy(itemId, false);
      }
    },
    [organizationId, run, setItemBusy, showToast]
  );

  const cancelItem = useCallback(
    async (itemId: string) => {
      if (!run) return;
      const snapshot = run.items.find((item) => item.id === itemId);
      if (!snapshot || snapshot.status === "confirmed" || snapshot.status === "cancelled") return;

      setRun((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId ? { ...item, requestedQuantity: 0, status: "cancelled" } : item
              )
            }
          : current
      );
      setItemBusy(itemId, true);

      try {
        const token = await readAccessToken();
        const nextRun = await requestBarRefillRun(
          runItemEndpoint(run.runId, itemId, "cancel"),
          {
            method: "POST",
            accessToken: token,
            organizationId,
            requireOrganization: true
          }
        );
        persistRunToCache(nextRun);
        setRun(nextRun);
        showToast("Position storniert.");
      } catch (requestError) {
        setRun((current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === itemId ? snapshot : item))
              }
            : current
        );
        showToast(toFriendlyBarRefillMessage(requestError, "Position konnte nicht storniert werden."), "error");
      } finally {
        setItemBusy(itemId, false);
      }
    },
    [organizationId, run, setItemBusy, showToast]
  );

  const confirmAllPending = useCallback(async () => {
    if (!run) return;
    const pendingIds = run.items.filter((item) => item.status === "pending").map((item) => item.id);
    for (const itemId of pendingIds) {
      // Sequential to keep run-status updates consistent on the backend.
      // eslint-disable-next-line no-await-in-loop
      await confirmItem(itemId);
    }
  }, [run, confirmItem]);

  const setRequestedQuantity = useCallback(
    (itemId: string, nextValue: number) => {
      void patchQuantity(itemId, nextValue > 0 ? nextValue : null);
    },
    [patchQuantity]
  );

  const counts = useMemo(() => {
    const items = run?.items ?? [];
    const relevant = items.filter((item) => item.status !== "cancelled");
    return {
      total: relevant.length,
      open: relevant.filter((item) => item.status === "open").length,
      pending: relevant.filter((item) => item.status === "pending").length,
      done: relevant.filter((item) => item.status === "confirmed").length
    };
  }, [run]);

  const groups = useMemo(() => {
    const items = run?.items ?? [];
    const byCategory = new Map<string, BarRefillRunItem[]>();
    for (const item of items) {
      const category = categoryForDisplayOrder(item.displayOrder);
      const bucket = byCategory.get(category) ?? [];
      bucket.push(item);
      byCategory.set(category, bucket);
    }
    return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
      category,
      items: (byCategory.get(category) ?? []).sort((a, b) => a.displayOrder - b.displayOrder)
    }));
  }, [run]);

  if ((loading || roleLoading) && !run) {
    return <p className="bar-refill-loading">Lade Auffülllauf...</p>;
  }

  if (!run) {
    const emptyTitle = error ? "Auffüllliste nicht erreichbar" : "Kein aktiver Auffülllauf";
    const emptyDescription = error ?? "Starte einen neuen Lauf für die heutige Auffüllrunde.";
    const actionLabel = error ? "Erneut versuchen" : "Neuen Lauf starten";

    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          canUseBarRefill ? (
            <Button loading={loading} onClick={() => void loadRun()} variant="primary">
              {actionLabel}
            </Button>
          ) : null
        }
      />
    );
  }

  const progressPercent = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  return (
    <div className="bar-refill-wrap">
      <header className="bar-refill-sticky">
        <div className="bar-refill-sticky-top">
          <strong>Auffüllliste Bar</strong>
          <Badge variant="info">{run.runDateLocal}</Badge>
        </div>
        <div className="bar-refill-progress" aria-label={`${counts.done} von ${counts.total} erledigt`}>
          <div className="bar-refill-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="bar-refill-chips">
          <span className="bar-refill-chip bar-refill-chip-open">Offen · {counts.open}</span>
          <span className="bar-refill-chip bar-refill-chip-pending">Ausstehend · {counts.pending}</span>
          <span className="bar-refill-chip bar-refill-chip-done">Erledigt · {counts.done}</span>
        </div>
      </header>

      {error ? <ErrorState title="Hinweis" description={error} /> : null}

      <div className="bar-refill-groups">
        {groups.map((group) => (
          <section className="bar-refill-group" key={group.category}>
            <h3 className="bar-refill-group-title">{group.category}</h3>
            <div className="bar-refill-list">
              {group.items.map((item) => {
                const busy = Boolean(busyItems[item.id]);
                const quantity = item.requestedQuantity ?? 0;
                const disabledControls = item.status === "confirmed" || busy;
                const minusDisabled = disabledControls || quantity <= 0;
                return (
                  <article
                    className={`bar-refill-item bar-refill-item-${item.status}`}
                    key={item.id}
                  >
                    <div className="bar-refill-item-head">
                      <span className="bar-refill-item-no mono">{item.displayOrder}</span>
                      <span className="bar-refill-item-name">{item.productName}</span>
                      {item.unit ? <span className="bar-refill-unit-badge">{item.unit}</span> : null}
                      <span className="bar-refill-item-target mono">Soll: {item.targetQuantity ?? "—"}</span>
                    </div>
                    <div className="bar-refill-item-controls">
                      <div aria-label={`Differenz ${item.productName}`} className="bar-refill-diff">
                        <span>Differenz</span>
                        <div className="bar-refill-stepper">
                          <Badge variant={statusBadge(item.status)}>{statusLabel(item.status)}</Badge>
                          <div aria-live="polite" className="bar-refill-step-value mono">
                            {quantity}
                          </div>
                          <button
                            aria-label={`${item.productName} bestätigen`}
                            className={`bar-refill-confirm-btn${item.status === "confirmed" ? " is-confirmed" : ""}`}
                            disabled={item.status !== "pending" || busy}
                            onClick={() => void confirmItem(item.id)}
                            type="button"
                          >
                            {item.status === "confirmed" ? (
                              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                              </svg>
                            ) : (
                              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {item.unit ? <span className="bar-refill-step-unit">{item.unit}</span> : null}
                        <div aria-label="Schnellwahl Differenz" className="bar-refill-presets">
                          {BAR_REFILL_QUANTITY_PRESETS.map((preset) => (
                            <button
                              className="bar-refill-preset-btn"
                              disabled={disabledControls || (preset < 0 && quantity + preset < 0)}
                              key={preset}
                              onClick={() => setRequestedQuantity(item.id, Math.max(0, quantity + preset))}
                              type="button"
                            >
                              {preset > 0 ? `+${preset}` : preset}
                            </button>
                          ))}
                          <button
                            className="bar-refill-preset-btn"
                            disabled={disabledControls || item.status === "open"}
                            onClick={() => void cancelItem(item.id)}
                            type="button"
                          >
                            Stornieren
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {counts.pending > 0 ? (
        <button
          className="bar-refill-fab"
          onClick={() => void confirmAllPending()}
          type="button"
        >
          Alle bestätigen ({counts.pending})
        </button>
      ) : null}

      <Toast toast={toast} />
      {confirmEvidence.length > 0 ? (
        <output aria-live="polite" className="sr-only">
          Letzte Bestätigung: Bewegung {confirmEvidence[0].movementId}, Bestand {confirmEvidence[0].stockAfter}
        </output>
      ) : null}
    </div>
  );
}
