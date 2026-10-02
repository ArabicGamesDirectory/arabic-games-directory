import { ImageResponse } from "next/og";
import { hashString } from "@/components/TitleCover";
import { hasArabic, reshapeWord } from "@/lib/arabicReshape";

// Social share images (1200×630) for pages without an uploaded thumbnail —
// WhatsApp, X, Discord, etc. Same deterministic gradient as <TitleCover>, so
// the shared card matches what the entry looks like on the site.

export const OG_SIZE = { width: 1200, height: 630 };

// Hex equivalents of TitleCover's PALETTE, same order (Tailwind 500/600 tones).
const PALETTE: [string, string][] = [
  ["#6366f1", "#9333ea"], // indigo-500 → purple-600
  ["#10b981", "#0d9488"], // emerald-500 → teal-600
  ["#f43f5e", "#f97316"], // rose-500 → orange-500
  ["#06b6d4", "#2563eb"], // cyan-500 → blue-600
  ["#f59e0b", "#ef4444"], // amber-500 → red-500
  ["#d946ef", "#db2777"], // fuchsia-500 → pink-600
  ["#8b5cf6", "#4f46e5"], // violet-500 → indigo-600
  ["#0ea5e9", "#0891b2"], // sky-500 → cyan-600
];

// Same mark as src/app/icon.svg (inlined: a runtime fs read of src/ isn't
// guaranteed to be bundled into the serverless function).
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#9333ea"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#bg)"/><path fill="#fff" d="M20 20h24c7.2 0 11.6 5.2 12.6 12.4l1.3 9.6c.6 4.4-2.6 8-6.6 8-2.4 0-4.3-1.2-5.6-3.2L42.6 43H21.4l-3.1 3.8C17 48.8 15.1 50 12.7 50c-4 0-7.2-3.6-6.6-8l1.3-9.6C8.4 25.2 12.8 20 20 20z"/><path fill="#6366f1" d="M18 27h4v4h4v4h-4v4h-4v-4h-4v-4h4z"/><circle cx="43" cy="30" r="2.6" fill="#9333ea"/><circle cx="48" cy="35.5" r="2.6" fill="#9333ea"/></svg>`;
const LOGO_SRC = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

const SITE_HOST = "arabicgames.directory";

/**
 * Cairo (the site's Arabic font) subset to exactly the glyphs being drawn.
 * The default next/og font is Latin-only, so Arabic names would render as
 * boxes without this. Returns null on any network failure — the image still
 * renders (Latin text in the default font) rather than erroring.
 */
async function loadCairo(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Cairo:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl, { next: { revalidate: 86400 } })).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const res = await fetch(fontUrl, { next: { revalidate: 86400 } });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function wordDir(word: string): "rtl" | "ltr" | null {
  if (hasArabic(word)) return "rtl";
  if (/[A-Za-z\u00C0-\u024F]/.test(word)) return "ltr";
  return null; // digits, punctuation — take the surrounding direction
}

/**
 * Word-level bidi for Satori, which has none of its own. The paragraph
 * direction comes from the first strong word. Words in that direction become
 * separate flex items (the row is `row-reverse` for RTL, so lines also wrap
 * from the right); a run in the opposite direction stays one item, so it never
 * splits across lines — e.g. the Arabic half of "Mule of graves بغلة القبور".
 * Arabic words are reshaped (see arabicReshape.ts) into visual order, so an
 * Arabic run inside an item is just its words in reverse.
 */
function bidiItems(text: string): { dir: "rtl" | "ltr"; items: string[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const dir = words.map(wordDir).find((d) => d !== null) ?? "ltr";
  const items: string[] = [];
  let run: string[] = [];
  let current: "rtl" | "ltr" = dir;
  const flush = () => {
    if (!run.length) return;
    const visual = run.map((w) => (hasArabic(w) ? reshapeWord(w) : w));
    if (current === dir) items.push(...visual);
    else items.push((current === "rtl" ? visual.reverse() : visual).join(" "));
    run = [];
  };
  for (const w of words) {
    const d = wordDir(w) ?? current;
    if (d !== current) {
      flush();
      current = d;
    }
    run.push(w);
  }
  flush();
  return { dir, items };
}

/**
 * Text rendered item-by-item in bidi-correct order (see bidiItems). `align`
 * pins the block to one side regardless of its own direction, so a subtitle
 * lines up with the title above it.
 */
function BidiText({
  text,
  align,
  style,
}: {
  text: string;
  align: "left" | "right";
  style: React.CSSProperties;
}) {
  const { dir, items } = bidiItems(text);
  const startsRight = dir === "rtl";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        flexDirection: startsRight ? "row-reverse" : "row",
        justifyContent: startsRight === (align === "right") ? "flex-start" : "flex-end",
        columnGap: "0.28em",
        overflow: "hidden",
        ...style,
      }}
    >
      {items.map((w, i) => (
        <span key={i}>{w}</span>
      ))}
    </div>
  );
}

export type OgCard = {
  /** Small uppercase pill, e.g. "Game". */
  kind: string;
  title: string;
  /** Line under the title, e.g. developer names. */
  subtitle?: string;
  /** Short facts beside the pill, e.g. "Released · Egypt". */
  meta?: string;
  /** Picks the gradient — pass the slug, as <TitleCover> does. */
  seed: string;
};

export async function renderOgImage(card: OgCard): Promise<ImageResponse> {
  const [from, to] = PALETTE[hashString(card.seed) % PALETTE.length];
  // Uppercased here rather than via CSS: the font is subset to `text`, so a
  // CSS transform would ask for capitals the subset doesn't contain.
  const kind = card.kind.toUpperCase();
  // Glyphs to subset the font to — the reshaped forms, not the source letters.
  const shaped = [card.title, card.subtitle ?? ""].map((t) => bidiItems(t).items.join(" "));
  const text = [kind, ...shaped, card.meta, SITE_HOST].filter(Boolean).join(" ");
  const font = await loadCairo(text);
  const align = bidiItems(card.title).dir === "rtl" ? "right" : "left";
  const titleSize = card.title.length > 60 ? 56 : card.title.length > 30 ? 68 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          color: "#fff",
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
          fontFamily: font ? "Cairo" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28 }}>
          <div
            style={{
              display: "flex",
              padding: "4px 22px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.22)",
              letterSpacing: 2,
            }}
          >
            {kind}
          </div>
          {card.meta ? <div style={{ display: "flex", opacity: 0.92 }}>{card.meta}</div> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <BidiText
            text={card.title}
            align={align}
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.2,
              maxHeight: titleSize * 1.2 * 3,
              textShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          />
          {card.subtitle ? (
            <BidiText
              text={card.subtitle}
              align={align}
              style={{ fontSize: 34, lineHeight: 1.3, maxHeight: 34 * 1.3, marginTop: 14, opacity: 0.92 }}
            />
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders <img>, not next/image */}
          <img src={LOGO_SRC} width={52} height={52} alt="" />
          <div style={{ display: "flex" }}>{SITE_HOST}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font ? [{ name: "Cairo", data: font, weight: 700, style: "normal" }] : undefined,
      headers: {
        // Crawlers fetch these once per share; an hour of edge caching keeps
        // renames reasonably fresh without re-rendering on every request.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
