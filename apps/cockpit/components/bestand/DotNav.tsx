import type { Category } from "../../types/inventory";
import styles from "./BestandTab.module.css";

type DotNavProps = {
  activeIdx: number;
  categories: Category[];
  onSelect: (index: number) => void;
};

export function DotNav({ activeIdx, categories, onSelect }: DotNavProps) {
  return (
    <div className={styles.dotNav} aria-label="Kategorie Navigation">
      {categories.map((category, index) => (
        <button
          aria-label={`${category.name} anzeigen`}
          aria-current={index === activeIdx ? "true" : undefined}
          className={styles.dot}
          key={category.id}
          onClick={() => onSelect(index)}
          type="button"
        />
      ))}
    </div>
  );
}
