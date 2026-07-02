import type { ArticleWithStatus } from "../../types/inventory";
import styles from "./BestandTab.module.css";

type ArticleRowProps = {
  article: ArticleWithStatus;
};

const STATUS_LABELS = {
  ok: "Ok",
  low: "Knapp",
  critical: "Kritisch"
} as const;

export function ArticleRow({ article }: ArticleRowProps) {
  const denominator = article.min_bestand > 0 ? article.min_bestand * 2 : Math.max(article.bestand, 1);
  const progress = Math.min(100, Math.max(0, (article.bestand / denominator) * 100));

  return (
    <li className={styles.articleRow}>
      <div className={styles.articleMain}>
        <span className={styles.articleName}>{article.name}</span>
        <span className={`${styles.statusBadge} ${styles[article.status]}`}>
          {STATUS_LABELS[article.status]}
        </span>
      </div>
      <div className={styles.articleMeta}>
        <div className={styles.progressTrack} aria-hidden="true">
          <span
            className={`${styles.progressFill} ${styles[article.status]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={styles.articleAmount}>
          {formatAmount(article.bestand)} {article.einheit}
        </span>
      </div>
    </li>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}
