import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "bevero-theme";

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${theme}`);
}

/**
 * Light/dark theme state backed by localStorage ("bevero-theme") and the
 * `theme-*` class on <html>. The no-flash bootstrap script in layout.tsx sets
 * the initial class before hydration; this hook syncs React state with it and
 * persists toggles.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : document.documentElement.classList.contains("theme-light")
          ? "light"
          : "dark";
    setTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyThemeClass(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures (private mode, quota); the class still applies.
      }
      return next;
    });
  };

  return { theme, toggle };
}
