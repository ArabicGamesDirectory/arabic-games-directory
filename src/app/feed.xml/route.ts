import { supabase } from "@/lib/supabase";

const SITE_URL = process.env.SITE_URL || "https://arabicgames.directory";
const SITE_NAME = "Arabic Games Directory";
const SITE_DESCRIPTION =
  "A community-curated archive of games developed in the MENA region.";
// Default to English copy in the feed — most readers don't render Arabic in
// item titles cleanly, and the link points at the EN page anyway.
const FEED_LOCALE = "en";

// Escape the four reserved chars + the apostrophe so the resulting XML is
// always well-formed even if a game name contains `<`, `>`, or `&`.
function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS 2.0 dates are RFC 822: "Mon, 01 Jan 2024 00:00:00 GMT".
function rfc822(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toUTCString();
}

// Public RSS feed listing the most recently approved games in the directory.
// Discoverable via `<link rel="alternate" type="application/rss+xml">` in the
// root layout; intended for power users (devs/journalists) and IFTTT/Discord
// embeds. Locale-agnostic — feed always speaks English so RSS readers can
// render reliably; item URLs point at the EN page.
export async function GET() {
  const { data, error } = await supabase
    .from("games")
    .select("slug, name, short_description, thumbnail_url, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  const games = data ?? [];
  const now = rfc822(null);

  const items = games
    .map((g) => {
      const url = `${SITE_URL}/${FEED_LOCALE}/games/${g.slug}`;
      const desc = g.short_description ?? "";
      const enclosure = g.thumbnail_url
        ? `\n      <enclosure url="${xml(g.thumbnail_url)}" type="image/webp" />`
        : "";
      return `    <item>
      <title>${xml(g.name)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(desc)}</description>
      <pubDate>${rfc822(g.created_at)}</pubDate>${enclosure}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE_NAME)}</title>
    <link>${xml(SITE_URL)}</link>
    <description>${xml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${xml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // 5-minute edge cache — the feed is consulted often by readers but the
      // game list doesn't change minute-to-minute. SWR while a fresh build is
      // generated.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
