import type { Metadata } from "next";

const LOCALES = ["en", "ar"] as const;
const DEFAULT_LOCALE = "en";

// Build the `alternates.languages` block for a given path so each page emits
// `<link rel="alternate" hreflang="en" href=".../en/path">` plus the matching
// `ar` and `x-default` links. Without this Google can't tell that
// /en/games/foo and /ar/games/foo are translations of each other.
//
// Pass `path` WITHOUT the locale prefix. e.g. for /en/games/hydrogen →
// languageAlternates("/games/hydrogen"). For the homepage pass "" or "/".
export function languageAlternates(path: string): NonNullable<Metadata["alternates"]> {
  // Normalize: ensure leading slash, drop trailing slash unless root.
  let p = path.startsWith("/") ? path : `/${path}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `/${locale}${p === "/" ? "" : p}`;
  }
  // x-default points at the default locale — Google falls back to this when
  // no language match is found (uncommon spider, region with no preference).
  languages["x-default"] = `/${DEFAULT_LOCALE}${p === "/" ? "" : p}`;

  return { languages };
}
