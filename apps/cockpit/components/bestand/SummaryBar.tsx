import type { ArticleStatus, ArticleWithStatus } from "../../types/inventory";
import styles from "./BestandTab.module.css";

const LABELS: Record<ArticleStatus, string> = {
  ok: "Ok",
  low: "Knapp",
  critical: "Kritisch"
};

type SummaryBarProps = {
  articles: ArticleWithStatus[];
};

export function SummaryBar({ articles }: SummaryBarProps) {
  const counts = articles.reduce<Record<ArticleStatus, number>>(
    (accumulator, article) => {
      accumulator[article.status] += 1;
      return accumulator;
    },
    { ok: 0, low: 0, critical: 0 }
  );

  return (
    <div className={styles.summaryBar} aria-label="Bestandsstatus Zusammenfassung">
      {(Object.keys(LABELS) as ArticleStatus[]).map((status) => (
        <span className={`${styles.summaryPill} ${styles[status]}`} key={status}>
          <strong>{counts[status]}</strong>
          {LABELS[status]}
        </span>
      ))}
    </div>
  );
}
