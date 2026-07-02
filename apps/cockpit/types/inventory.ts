export type ArticleStatus = "ok" | "low" | "critical";

export interface Article {
  id: string;
  category_id: string;
  name: string;
  bestand: number;
  einheit: string;
  min_bestand: number;
}

export interface ArticleWithStatus extends Article {
  status: ArticleStatus;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color_hex: string;
  sort_order: number;
  articles: ArticleWithStatus[];
}
