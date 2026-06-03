import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={toggle}
      className="theme-pill"
      data-state={isLight ? "light" : "dark"}
    >
      <span className="theme-pill-thumb" aria-hidden />
      <span className="theme-pill-icon">
        <Sun className="h-3.5 w-3.5" />
      </span>
      <span className="theme-pill-icon">
        <Moon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}