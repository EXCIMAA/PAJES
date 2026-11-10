import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-app-tertiary text-app-secondary hover:text-app-primary"
      aria-label={t("theme.toggle")}
      title={theme === "dark" ? t("theme.light") : t("theme.dark")}
      type="button"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
