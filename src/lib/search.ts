// Arabic-aware search helpers.
//
// Arabic is spelled inconsistently in practice: hamza on alef or not (أ/إ/آ/ا),
// taa marbuta vs haa (ة/ه), final yaa vs alef maqsura (ي/ى), optional tashkeel
// and tatweel. A plain ILIKE treats "ابو حديد" and "أبو حديد" as different
// strings, so searches silently miss. Two helpers cover both search paths:
//
//   - normalizeForSearch(): folds a string to one canonical spelling. Used for
//     the in-memory studio/community filters (both sides get folded).
//   - buildSearchRegex(): turns the query into a Postgres regex where each
//     foldable letter becomes a character class and tashkeel is optional
//     between letters. Used for the games query (`imatch`), where the stored
//     side can't be folded without a DB migration.

const MAX_QUERY_LENGTH = 100;

// Tashkeel (U+064B–U+065F), superscript alef (U+0670), tatweel (U+0640).
const DIACRITICS = "ً-ٰٟـ";
const DIACRITICS_RE = new RegExp(`[${DIACRITICS}]`, "g");

// Every variant folds to the first letter of its group.
const LETTER_GROUPS = ["اأإآٱ", "هة", "يىئ", "وؤ"];

const FOLD = new Map<string, string>();
const VARIANTS = new Map<string, string>();
for (const group of LETTER_GROUPS) {
  for (const ch of group) FOLD.set(ch, group[0]);
  VARIANTS.set(group[0], group);
}

const ARABIC_LETTER_RE = /[ء-يٱ]/;
const REGEX_SPECIAL_RE = /[\\^$.|?*+()[\]{}]/;

/** Lowercases, strips tashkeel, and folds Arabic letter variants. */
export function normalizeForSearch(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase().replace(DIACRITICS_RE, "")) {
    out += FOLD.get(ch) ?? ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** True when `haystack` contains `needle` after normalizing both. */
export function searchMatches(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return normalizeForSearch(haystack).includes(normalizeForSearch(needle));
}

/**
 * Postgres ARE pattern (for PostgREST `imatch`) matching `query` regardless of
 * Arabic spelling variants and tashkeel. Regex metacharacters in the query are
 * escaped, so user input can't change the pattern's meaning.
 */
export function buildSearchRegex(query: string): string {
  const folded = normalizeForSearch(query.slice(0, MAX_QUERY_LENGTH));
  let pattern = "";
  for (const ch of folded) {
    if (ch === " ") {
      pattern += "\\s+";
    } else if (VARIANTS.has(ch)) {
      pattern += `[${VARIANTS.get(ch)}]`;
    } else if (REGEX_SPECIAL_RE.test(ch)) {
      pattern += `\\${ch}`;
    } else {
      pattern += ch;
    }
    if (ARABIC_LETTER_RE.test(ch)) pattern += `[${DIACRITICS}]*`;
  }
  return pattern;
}

/**
 * Wraps a value in PostgREST's double-quoted syntax so commas, parentheses and
 * dots inside it can't break out of an `.or()` filter string.
 */
export function postgrestQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
