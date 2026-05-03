// Single source of truth for game genres. Stored in DB as the English value.
// i18n keys live under the `genres` namespace and are resolved via GENRE_I18N_KEYS.
export const GENRE_VALUES = [
  "Action",
  "Adventure",
  "Arcade",
  "Card / Board Game",
  "Casual",
  "Dress up",
  "Educational",
  "Endless Runner",
  "Family",
  "Fighting",
  "Horror",
  "Idle / Clicker",
  "Made for Kids",
  "Platformer",
  "Puzzle",
  "Racing",
  "Resource Management",
  "Rogue-lite",
  "Roguelike",
  "RPG",
  "Shooter FPS",
  "Simulation",
  "Sports",
  "Strategy",
  "Tower Defense",
  "Visual Novel",
] as const;

export type GenreValue = (typeof GENRE_VALUES)[number];

// Case-insensitive lookup table: lowercase variant → canonical value.
// Used by normalizeGenres() to fold freetext "Other" entries that match a
// canonical genre (e.g. "card game" → "Card / Board Game") and to dedup.
const CANONICAL_GENRE_BY_LOWER: Record<string, string> = Object.fromEntries(
  GENRE_VALUES.map((g) => [g.toLowerCase(), g])
);

// Normalizes a genres array:
// - trims each entry, drops empty strings and the literal "Other"
// - case-insensitive maps to canonical when matched (e.g. "PUZZLE" → "Puzzle")
// - dedups case-insensitively (preserves first occurrence)
export function normalizeGenres(input: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "other") continue;
    const canonical = CANONICAL_GENRE_BY_LOWER[trimmed.toLowerCase()] ?? trimmed;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

export const GENRE_I18N_KEYS: Record<string, string> = {
  "Action": "action",
  "Adventure": "adventure",
  "Arcade": "arcade",
  "Card / Board Game": "cardBoardGame",
  "Casual": "casual",
  "Dress up": "dressUp",
  "Educational": "educational",
  "Endless Runner": "endlessRunner",
  "Family": "family",
  "Fighting": "fighting",
  "Horror": "horror",
  "Idle / Clicker": "idleClicker",
  "Made for Kids": "madeForKids",
  "Platformer": "platformer",
  "Puzzle": "puzzle",
  "Racing": "racing",
  "Resource Management": "resourceManagement",
  "Rogue-lite": "rogueLite",
  "Roguelike": "roguelike",
  "RPG": "rpg",
  "Shooter FPS": "shooterFPS",
  "Simulation": "simulation",
  "Sports": "sports",
  "Strategy": "strategy",
  "Tower Defense": "towerDefense",
  "Visual Novel": "visualNovel",
};
