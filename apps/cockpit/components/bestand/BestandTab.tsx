"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBestandCategories } from "../../lib/inventory";
import type { ArticleWithStatus, Category } from "../../types/inventory";
import { CategoryCard } from "./CategoryCard";
import { DotNav } from "./DotNav";
import styles from "./BestandTab.module.css";

const DRAG_STEP = 260;
const THRESHOLD = 60;

type StatusFilter = "all" | "critical" | "low";

const STATUS_SORT: Record<string, number> = { critical: 0, low: 1, ok: 2 };
const STATUS_LABELS: Record<string, string> = { ok: "Ok", low: "Knapp", critical: "Kritisch" };
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = { all: "Alle", critical: "Kritisch", low: "Knapp" };

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function getCircularPosition(index: number, activeIndex: number, length: number) {
  if (length <= 1) return 0;
  let position = index - activeIndex;
  const half = length / 2;
  if (position > half) position -= length;
  if (position < -half) position += length;
  return position;
}

function criticalCount(articles: ArticleWithStatus[]) {
  return articles.filter((a) => a.status === "critical").length;
}

function lowCount(articles: ArticleWithStatus[]) {
  return articles.filter((a) => a.status === "low").length;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}

export function BestandTab() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Desktop state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const startX = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setLoading(true);
      setError(null);
      try {
        const nextCategories = await fetchBestandCategories();
        if (!cancelled) {
          setCategories(nextCategories);
          setActiveIdx(0);
          setUpdatedAt(new Date());
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Bestände konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadCategories();
    return () => { cancelled = true; };
  }, []);

  // ── Carousel drag (mobile) ────────────────────────────────────────────────

  const finishDrag = useCallback(() => {
    if (startX.current === null) return;
    const delta = dragDeltaRef.current;
    if (categories.length > 1 && delta < -THRESHOLD) {
      setActiveIdx((i) => wrapIndex(i + 1, categories.length));
    } else if (categories.length > 1 && delta > THRESHOLD) {
      setActiveIdx((i) => wrapIndex(i - 1, categories.length));
    }
    startX.current = null;
    dragDeltaRef.current = 0;
    setDragDelta(0);
    setIsDragging(false);
  }, [categories.length]);

  useEffect(() => {
    if (!isDragging) return undefined;
    const handlePointerMove = (e: PointerEvent) => updateDrag(e.clientX);
    const handleMouseMove = (e: MouseEvent) => updateDrag(e.clientX);
    const handleTouchMove = (e: TouchEvent) => updateDrag(e.touches[0]?.clientX ?? 0);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", finishDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", finishDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", finishDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", finishDrag);
    };
  }, [finishDrag, isDragging]);

  function beginDrag(clientX: number) {
    startX.current = clientX;
    dragDeltaRef.current = 0;
    setDragDelta(0);
    setIsDragging(true);
  }

  function updateDrag(clientX: number) {
    if (startX.current === null) return;
    const nextDelta = clientX - startX.current;
    dragDeltaRef.current = nextDelta;
    setDragDelta(nextDelta);
  }

  function rotateCarousel(direction: -1 | 1) {
    if (categories.length <= 1) return;
    setActiveIdx((i) => wrapIndex(i + direction, categories.length));
  }

  function isCarouselControl(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("[data-carousel-control]"));
  }

  function navigateToCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    // Sync carousel index so mobile view matches
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx >= 0) setActiveIdx(idx);
  }

  // ── Desktop derived data ──────────────────────────────────────────────────

  const allArticles = useMemo<ArticleWithStatus[]>(
    () => categories.flatMap((c) => c.articles),
    [categories]
  );

  const globalCounts = useMemo(
    () => ({
      critical: allArticles.filter((a) => a.status === "critical").length,
      low: allArticles.filter((a) => a.status === "low").length,
      ok: allArticles.filter((a) => a.status === "ok").length
    }),
    [allArticles]
  );

  const visibleArticles = useMemo(() => {
    const categoryArticles = selectedCategoryId
      ? (categories.find((c) => c.id === selectedCategoryId)?.articles ?? [])
      : allArticles;

    const q = search.trim().toLowerCase();
    return categoryArticles
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const statusDiff = (STATUS_SORT[a.status] ?? 2) - (STATUS_SORT[b.status] ?? 2);
        if (statusDiff !== 0) return statusDiff;
        return a.name.localeCompare(b.name, "de");
      });
  }, [allArticles, categories, selectedCategoryId, statusFilter, search]);

  const formattedTime = updatedAt
    ? updatedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.bestandTab}>

      {/* ── Desktop layout ── */}
      <div className={styles.desktopLayout}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.toolbarMeta}>
              {categories.length} Kategorien · {allArticles.length} Artikel · {formattedTime}
            </span>
            {globalCounts.critical > 0 && (
              <span className={`${styles.globalBadge} ${styles.globalBadgeCritical}`}>
                {globalCounts.critical} kritisch
              </span>
            )}
            {globalCounts.low > 0 && (
              <span className={`${styles.globalBadge} ${styles.globalBadgeLow}`}>
                {globalCounts.low} knapp
              </span>
            )}
          </div>
          <div className={styles.toolbarRight}>
            <input
              className={styles.searchInput}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Artikel suchen…"
              type="search"
              value={search}
            />
            <div className={styles.filterPills} role="group" aria-label="Statusfilter">
              {(["all", "critical", "low"] as StatusFilter[]).map((f) => (
                <button
                  aria-pressed={statusFilter === f}
                  className={`${styles.filterPill} ${statusFilter === f ? styles.filterPillActive : ""} ${f !== "all" ? styles[`filterPill_${f}`] : ""}`}
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  type="button"
                >
                  {STATUS_FILTER_LABELS[f]}
                  {f === "critical" && globalCounts.critical > 0 && (
                    <span className={styles.filterPillCount}>{globalCounts.critical}</span>
                  )}
                  {f === "low" && globalCounts.low > 0 && (
                    <span className={styles.filterPillCount}>{globalCounts.low}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className={styles.skeletonWrap} aria-label="Bestände werden geladen">
            <div className={styles.skeletonSidebar}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span className={styles.skeletonSidebarRow} key={i} />
              ))}
            </div>
            <div className={styles.skeletonTable}>
              {Array.from({ length: 8 }).map((_, i) => (
                <span className={styles.skeletonTableRow} key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorPanel}>
            <strong>Fehler beim Laden</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className={styles.errorPanel}>
            <strong>Keine Bestandsdaten</strong>
            <p>Noch keine kategorisierten Live-Bestände gefunden.</p>
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className={styles.contentArea}>
            {/* Category sidebar */}
            <nav className={styles.categorySidebar} aria-label="Kategorien">
              <button
                aria-pressed={selectedCategoryId === null}
                className={`${styles.sidebarItem} ${selectedCategoryId === null ? styles.sidebarItemActive : ""}`}
                onClick={() => setSelectedCategoryId(null)}
                type="button"
              >
                <span className={styles.sidebarIcon}>□</span>
                <span className={styles.sidebarLabel}>Alle</span>
                {(globalCounts.critical > 0 || globalCounts.low > 0) && (
                  <span className={styles.sidebarAlerts}>
                    {globalCounts.critical > 0 && (
                      <span className={styles.sidebarBadgeCritical}>{globalCounts.critical}</span>
                    )}
                    {globalCounts.low > 0 && (
                      <span className={styles.sidebarBadgeLow}>{globalCounts.low}</span>
                    )}
                  </span>
                )}
              </button>
              {categories.map((cat) => {
                const crit = criticalCount(cat.articles);
                const lows = lowCount(cat.articles);
                return (
                  <button
                    aria-pressed={selectedCategoryId === cat.id}
                    className={`${styles.sidebarItem} ${selectedCategoryId === cat.id ? styles.sidebarItemActive : ""}`}
                    key={cat.id}
                    onClick={() => navigateToCategory(cat.id)}
                    style={{ "--cat-color": cat.color_hex } as React.CSSProperties}
                    type="button"
                  >
                    <span className={styles.sidebarIcon}>{cat.icon}</span>
                    <span className={styles.sidebarLabel}>{cat.name}</span>
                    {(crit > 0 || lows > 0) && (
                      <span className={styles.sidebarAlerts}>
                        {crit > 0 && <span className={styles.sidebarBadgeCritical}>{crit}</span>}
                        {lows > 0 && <span className={styles.sidebarBadgeLow}>{lows}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Article table */}
            <div className={styles.articlePanel}>
              <div className={styles.articlePanelHead}>
                <h2 className={styles.articlePanelTitle}>
                  {selectedCategory ? (
                    <><span>{selectedCategory.icon}</span> {selectedCategory.name}</>
                  ) : "Alle Artikel"}
                </h2>
                <span className={styles.articlePanelCount}>
                  {visibleArticles.length} Artikel
                </span>
              </div>

              {visibleArticles.length === 0 ? (
                <p className={styles.emptyHint}>
                  {search ? `Keine Treffer für „${search}"` : "Keine Artikel für diesen Filter."}
                </p>
              ) : (
                <table className={styles.articleTable}>
                  <thead>
                    <tr>
                      <th className={styles.colName}>Artikel</th>
                      <th className={styles.colCat}>Kategorie</th>
                      <th className={styles.colNum}>Bestand</th>
                      <th className={styles.colNum}>Min</th>
                      <th className={styles.colStatus}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleArticles.map((article) => {
                      const denominator = article.min_bestand > 0 ? article.min_bestand : Math.max(article.bestand, 1);
                      const pct = Math.min(100, Math.max(0, (article.bestand / denominator) * 100));
                      const cat = categories.find((c) => c.id === article.category_id);
                      return (
                        <tr className={`${styles.tableRow} ${styles[`tableRow_${article.status}`]}`} key={article.id}>
                          <td className={styles.colName}>
                            <span className={styles.articleName}>{article.name}</span>
                            <span
                              className={`${styles.miniBar} ${styles[`miniBar_${article.status}`]}`}
                              aria-hidden="true"
                              style={{ "--pct": `${pct}%` } as React.CSSProperties}
                            />
                          </td>
                          <td className={styles.colCat}>
                            {cat ? (
                              <span className={styles.catTag} style={{ "--cat-color": cat.color_hex } as React.CSSProperties}>
                                {cat.icon} {cat.name}
                              </span>
                            ) : null}
                          </td>
                          <td className={`${styles.colNum} ${styles.monoCell}`}>
                            {formatAmount(article.bestand)} <span className={styles.unit}>{article.einheit}</span>
                          </td>
                          <td className={`${styles.colNum} ${styles.monoCell} ${styles.dimCell}`}>
                            {article.min_bestand > 0 ? `${formatAmount(article.min_bestand)} ${article.einheit}` : "—"}
                          </td>
                          <td className={styles.colStatus}>
                            <span className={`${styles.statusPill} ${styles[`statusPill_${article.status}`]}`}>
                              {STATUS_LABELS[article.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile carousel (unchanged) ── */}
      <div className={styles.mobileLayout}>
        <header className={styles.header}>
          <div>
            <h1>Bestand</h1>
            <span>{categories.length} Kategorien · letzte Aktualisierung {formattedTime}</span>
          </div>
        </header>

        {loading ? <BestandSkeleton /> : null}

        {!loading && error ? (
          <section className={styles.errorPanel}>
            <h2>Daten konnten nicht geladen werden</h2>
            <p>{error}</p>
          </section>
        ) : null}

        {!loading && !error && categories.length === 0 ? (
          <section className={styles.errorPanel}>
            <h2>Keine Bestandsdaten</h2>
            <p>Noch keine kategorisierten Live-Bestände gefunden.</p>
          </section>
        ) : null}

        {!loading && !error && categories.length > 0 ? (
          <>
            <section
              aria-label="Swipebare Bestandskarten"
              className={`${styles.swipeContainer} ${isDragging ? styles.swipeContainerDragging : ""}`}
              onDragStart={(e) => e.preventDefault()}
              onMouseDown={(e) => { if (isCarouselControl(e.target)) return; e.preventDefault(); beginDrag(e.clientX); }}
              onMouseMove={(e) => updateDrag(e.clientX)}
              onMouseUp={finishDrag}
              onPointerCancel={finishDrag}
              onPointerDown={(e) => { if (isCarouselControl(e.target)) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); beginDrag(e.clientX); }}
              onPointerMove={(e) => updateDrag(e.clientX)}
              onPointerUp={finishDrag}
              onTouchMove={(e) => updateDrag(e.touches[0]?.clientX ?? 0)}
              onTouchStart={(e) => { if (isCarouselControl(e.target)) return; beginDrag(e.touches[0]?.clientX ?? 0); }}
            >
              <button aria-label="Vorherige Kategorie anzeigen" className={`${styles.carouselButton} ${styles.carouselButtonPrev}`} data-carousel-control="true" onClick={(e) => { e.stopPropagation(); rotateCarousel(-1); }} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} type="button">‹</button>
              <button aria-label="Nächste Kategorie anzeigen" className={`${styles.carouselButton} ${styles.carouselButtonNext}`} data-carousel-control="true" onClick={(e) => { e.stopPropagation(); rotateCarousel(1); }} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} type="button">›</button>
              {categories.map((category, index) => {
                const carouselPosition = getCircularPosition(index, activeIdx, categories.length) + dragDelta / DRAG_STEP;
                return (
                  <CategoryCard
                    carouselPosition={carouselPosition}
                    category={category}
                    isActive={Math.abs(carouselPosition) < 0.5}
                    isDragging={isDragging}
                    key={category.id}
                    onNavigate={navigateToCategory}
                  />
                );
              })}
            </section>
            <DotNav activeIdx={activeIdx} categories={categories} onSelect={setActiveIdx} />
          </>
        ) : null}
      </div>

    </div>
  );
}

function BestandSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-label="Bestände werden geladen">
      <div className={styles.skeletonPills}>
        {Array.from({ length: 5 }).map((_, i) => <span className={styles.skeletonPill} key={i} />)}
      </div>
      <div className={styles.skeletonCard}>
        <span className={styles.skeletonLineWide} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLineShort} />
      </div>
    </div>
  );
}
