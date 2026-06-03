import * as React from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "foresight-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.classList.add("light");
  else root.classList.remove("light");
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
  });

  React.useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);
  const toggle = React.useCallback(
    () => setThemeState((t) => (t === "light" ? "dark" : "light")),
    [],
  );

  return { theme, setTheme, toggle };
}