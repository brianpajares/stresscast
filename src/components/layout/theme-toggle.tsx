"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark" | "system";
const ORDER: Theme[] = ["system", "light", "dark"];
const KEY = "sc-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** Selector manual de tema (ux/components.md · Dark mode): respeta prefers-color-scheme por defecto. */
export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leer preferencia persistida tras hidratar
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      /* sin storage: usa el tema del sistema */
    }
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    apply(next);
    try {
      if (next === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, next);
    } catch {
      /* noop */
    }
  }

  const label = theme === "light" ? t("themeLight") : theme === "dark" ? t("themeDark") : t("themeSystem");
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex size-11 items-center justify-center rounded-md border border-border text-text transition-colors hover:bg-surface-alt"
      aria-label={`${t("theme")}: ${label}`}
      title={`${t("theme")}: ${label}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
