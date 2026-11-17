import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
type Theme = "light" | "dark";
export default function ThemeSelect() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (meta) meta.content = theme === "dark" ? "#181818" : "#ffffff";
    try {
      localStorage.setItem("cifraclub-helper-theme", theme);
    } catch {
      /* Theme still works when browser preferences cannot be stored. */
    }
  }, [theme]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (
        e.key === "cifraclub-helper-theme" &&
        (e.newValue === "light" || e.newValue === "dark")
      )
        setTheme(e.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const label = theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro";
  return (
    <button
      className="theme-toggle"
      title={label}
      aria-label={label}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
