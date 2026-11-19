import { useEffect, useState } from "react";
import { useTranslate } from "../i18n.jsx";

const STORAGE_KEY = "queueless.theme";

function initialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "light";
}

export default function ThemeToggle() {
  const t = useTranslate();
  const [theme, setTheme] = useState(initialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = isDark ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${t("Switch to")} ${t(isDark ? "Light mode" : "Dark mode")}`}
      title={`${t("Switch to")} ${t(isDark ? "Light mode" : "Dark mode")}`}
      onClick={() => setTheme(nextTheme)}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.6 15.7A8.5 8.5 0 0 1 8.3 3.4 8.5 8.5 0 1 0 20.6 15.7Z" />
        </svg>
      )}
      <span>{t(isDark ? "Light mode" : "Dark mode")}</span>
    </button>
  );
}
