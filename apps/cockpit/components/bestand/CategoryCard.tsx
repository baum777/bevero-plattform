import type { CSSProperties } from "react";
import type { Category } from "../../types/inventory";
import { ArticleRow } from "./ArticleRow";
import { SummaryBar } from "./SummaryBar";
import styles from "./BestandTab.module.css";

type CategoryCardProps = {
  carouselPosition: number;
  category: Category;
  isActive: boolean;
  isDragging: boolean;
  onNavigate: (categoryId: string) => void;
};

export function CategoryCard({ carouselPosition, category, isActive, isDragging, onNavigate }: CategoryCardProps) {
  const clampedPosition = Math.max(-3, Math.min(3, carouselPosition));
  const distance = Math.abs(clampedPosition);
  const angle = (clampedPosition * 38 * Math.PI) / 180;
  const x = Math.sin(angle) * 430;
  const y = (1 - Math.cos(angle)) * 54 + Math.min(distance, 2.5) * 4;
  const scale = Math.max(0.7, 1 - distance * 0.12);
  const opacity = distance > 2.65 ? 0 : isActive ? 1 : Math.max(0.24, 1 - distance * 0.32);
  const blur = isActive ? 0 : Math.min(8, distance * 3.5);
  const rotateY = -clampedPosition * 10;

  return (
    <article
      aria-hidden={distance > 2.65}
      className={`${styles.categoryCard} ${isActive ? styles.activeCard : styles.inactiveCard}`}
      style={{
        "--category-color": category.color_hex,
        filter: `blur(${blur}px)`,
        opacity,
        transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotateY(${rotateY}deg) scale(${scale})`,
        transition: isDragging ? "none" : undefined,
        zIndex: Math.round(100 - distance * 12)
      } as CSSProperties}
    >
      <div className={styles.cardGlow} aria-hidden="true" />
      <header className={styles.cardHeader}>
        <div className={styles.cardTitleGroup}>
          <span className={styles.categoryIcon}>{category.icon}</span>
          <div>
            <h2>{category.name}</h2>
            <p>{category.articles.length} Artikel</p>
          </div>
        </div>
        <button
          aria-label={`${category.name} Details öffnen`}
          className={styles.detailButton}
          onClick={() => onNavigate(category.id)}
          type="button"
        >
          ↗
        </button>
      </header>

      <SummaryBar articles={category.articles} />

      <ul className={styles.articleList}>
        {category.articles.map((article) => (
          <ArticleRow article={article} key={article.id} />
        ))}
      </ul>
    </article>
  );
}
