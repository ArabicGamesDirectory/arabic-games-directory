"use client";

import { useSyncExternalStore } from "react";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const ICONS: Record<Theme, string> = {
  light: "☀︎",
  dark: "☾",
};

// The theme lives outside React: the `theme-dark` class on <html> (applied
// pre-hydration by the inline script in the root layout) plus the localStorage
// mirror it reads from. So we subscribe to it rather than copying it into
// state in an effect — the copy caused a cascading render on every mount.
function subscribe(onChange: () => void) {
  // `storage` fires in OTHER tabs, which gets us cross-tab sync for free;
  // the custom event covers changes made in this one.
  window.addEventListener("storage", onChange);
  window.addEventListener("themechange", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("themechange", onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("theme-dark")
    ? "dark"
    : "light";
}

// The server can't know the visitor's stored theme, so it renders the light
// icon. By the time this hydrates the inline script has already set the class,
// and useSyncExternalStore re-renders us with the real value.
function getServerSnapshot(): Theme {
  return "light";
}

function apply(t: Theme) {
  document.documentElement.classList.toggle("theme-dark", t === "dark");
  try {
    localStorage.setItem("theme", t);
  } catch {}
  window.dispatchEvent(new Event("themechange"));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function cycle() {
    apply(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} — click to cycle`}
      aria-label={`Theme: ${theme}`}
      className="w-8 h-8 rounded-full bg-c-surface border border-c-border flex items-center justify-center text-base text-c-muted hover:text-c-text hover:border-c-border-hover transition-colors"
    >
      {ICONS[theme]}
    </button>
  );
}
