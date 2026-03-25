"use client";

import { useEffect, useState } from "react";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const ICONS: Record<Theme, string> = {
  light: "☀︎",
  dark: "☾",
};

function apply(t: Theme) {
  const el = document.documentElement;
  el.classList.remove("theme-dark");
  if (t === "dark") el.classList.add("theme-dark");
  try {
    localStorage.setItem("theme", t);
  } catch {}
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved && THEMES.includes(saved)) {
        setTheme(saved);
        apply(saved);
      }
    } catch {}
  }, []);

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    apply(next);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} — click to cycle`}
      className="fixed bottom-4 end-4 z-50 w-9 h-9 rounded-full bg-c-surface border border-c-border shadow-sm flex items-center justify-center text-base text-c-muted hover:text-c-text hover:border-c-border-hover transition-colors"
    >
      {ICONS[theme]}
    </button>
  );
}
