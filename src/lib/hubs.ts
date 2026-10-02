import { COUNTRY_OPTIONS } from "@/lib/countries";
import { GENRE_VALUES } from "@/lib/genres";
import { slugify } from "@/lib/slug";

// URL slugs for the country and genre hub pages (/countries/[slug],
// /genres/[slug]). Derived from the stored English values, so a new country or
// genre gets a hub automatically: "Saudi Arabia" → "saudi-arabia",
// "Card / Board Game" → "card-board-game".

export function countrySlug(country: string): string {
  return slugify(country);
}

export function genreSlug(genre: string): string {
  return slugify(genre);
}

const COUNTRY_BY_SLUG = new Map<string, string>(COUNTRY_OPTIONS.map((c) => [countrySlug(c), c]));
const GENRE_BY_SLUG = new Map<string, string>(GENRE_VALUES.map((g) => [genreSlug(g), g]));

/** Stored country name for a hub slug, or null for an unknown slug. */
export function countryFromSlug(slug: string): string | null {
  return COUNTRY_BY_SLUG.get(slug) ?? null;
}

/** Canonical genre for a hub slug, or null. Only canonical genres get hubs. */
export function genreFromSlug(slug: string): string | null {
  return GENRE_BY_SLUG.get(slug) ?? null;
}

/** Counts how often each value occurs across rows' array fields, most common first. */
export function tally(lists: (string[] | null | undefined)[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const list of lists) {
    for (const v of new Set(list ?? [])) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
