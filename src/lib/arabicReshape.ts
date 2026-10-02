// Arabic "reshaping" for the share-image renderer (src/lib/ogImage.tsx).
//
// next/og (Satori) has no bidi algorithm and measures Arabic words using the
// unjoined letter widths, so it lays words out backwards with large gaps
// between them. The classic workaround: replace every letter with its
// contextual Unicode presentation form (isolated / final / initial / medial),
// which are pre-joined glyphs with their own correct widths, then put the
// characters in visual (left-to-right) order. Satori then just draws glyphs.
//
// Only for image rendering — never store or display reshaped text in HTML.

// [isolated, final, initial, medial]; two-entry rows are right-joining only
// (they connect to the letter before them, never the one after).
const FORMS: Record<string, number[]> = {
  "ء": [0xfe80],
  "آ": [0xfe81, 0xfe82],
  "أ": [0xfe83, 0xfe84],
  "ؤ": [0xfe85, 0xfe86],
  "إ": [0xfe87, 0xfe88],
  "ئ": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  "ا": [0xfe8d, 0xfe8e],
  "ب": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "ة": [0xfe93, 0xfe94],
  "ت": [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  "ث": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "ج": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  "ح": [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  "خ": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "د": [0xfea9, 0xfeaa],
  "ذ": [0xfeab, 0xfeac],
  "ر": [0xfead, 0xfeae],
  "ز": [0xfeaf, 0xfeb0],
  "س": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  "ش": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  "ص": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "ض": [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  "ط": [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  "ظ": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "ع": [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  "غ": [0xfecd, 0xfece, 0xfecf, 0xfed0],
  "ف": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "ق": [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  "ك": [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  "ل": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "م": [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  "ن": [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  "ه": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "و": [0xfeed, 0xfeee],
  "ى": [0xfeef, 0xfef0],
  "ي": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  // Persian/Kurdish letters that turn up in Iraqi and Iranian-diaspora names.
  "پ": [0xfb56, 0xfb57, 0xfb58, 0xfb59],
  "چ": [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
  "ژ": [0xfb8a, 0xfb8b],
  "ک": [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
  "گ": [0xfb92, 0xfb93, 0xfb94, 0xfb95],
  "ی": [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
};

// Lam followed by one of these alefs becomes a single ligature: [isolated, final].
const LAM = "ل";
const LAM_ALEF: Record<string, number[]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};

const TATWEEL = "ـ";
// Tashkeel and superscript alef — dropped: presentation forms carry no marks
// and Satori would place combining marks wrongly anyway.
const MARKS_RE = /[ً-ٰٟ]/g;
const ARABIC_RE = /[؀-ۿﭐ-﷿ﹰ-﻿]/;

function joinsForward(ch: string | undefined): boolean {
  if (ch === TATWEEL) return true;
  return !!ch && FORMS[ch]?.length === 4;
}

function isJoining(ch: string | undefined): boolean {
  return !!ch && (ch === TATWEEL || ch in FORMS);
}

/** Contextual forms in logical order. */
function shape(word: string): string[] {
  const chars = [...word.replace(MARKS_RE, "")];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const forms = FORMS[ch];
    if (!forms) {
      out.push(ch);
      continue;
    }
    const joinPrev = joinsForward(chars[i - 1]);
    if (ch === LAM && LAM_ALEF[chars[i + 1]]) {
      out.push(String.fromCodePoint(LAM_ALEF[chars[i + 1]][joinPrev ? 1 : 0]));
      i++;
      continue;
    }
    const joinNext = forms.length === 4 && isJoining(chars[i + 1]);
    const form = joinPrev ? (joinNext ? 3 : 1) : joinNext ? 2 : 0;
    out.push(String.fromCodePoint(forms[form] ?? forms[joinPrev ? 1 : 0] ?? forms[0]));
  }
  return out;
}

export function hasArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}

/**
 * One Arabic word → presentation forms in visual (left-to-right) order.
 * Runs of Latin letters/digits inside the word keep their own order, so
 * "لعبة12" doesn't come out as "21".
 */
export function reshapeWord(word: string): string {
  const shaped = shape(word);
  const segments: string[] = [];
  for (const ch of shaped) {
    const last = segments[segments.length - 1];
    if (/[0-9A-Za-z]/.test(ch) && last && /[0-9A-Za-z]$/.test(last)) {
      segments[segments.length - 1] = last + ch;
    } else {
      segments.push(ch);
    }
  }
  return segments.reverse().join("");
}
