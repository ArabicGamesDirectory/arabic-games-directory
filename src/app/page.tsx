import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  name: string;
  country: string;
  platforms: string[];
  genres: string[];
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
  slug: string;
  short_description: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    platform?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  let query = supabase
    .from("games")
    .select(
      "name, country, platforms, genres, status, release_date, website_url, store_links, slug, short_description"
    )
    .order("created_at", { ascending: false });

  if (params.country) {
    query = query.eq("country", params.country);
  }

  if (params.platform) {
    query = query.contains("platforms", [params.platform]);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: games, error } = await query;

  if (error) {
    return <main style={{ padding: 24 }}>Error: {error.message}</main>;
  }

  const typedGames: Game[] = games ?? [];

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
              Arabic Games Directory
            </h1>
            <p style={{ opacity: 0.7, marginTop: 6 }}>
              A simple directory of games developed in the MENA region.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/submit" style={{ textDecoration: "underline" }}>
              Submit a game
            </Link>
            <Link href="/admin" style={{ textDecoration: "underline" }}>
              Admin
            </Link>
          </div>
        </div>
      </header>

      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <Link href="/" style={{ textDecoration: "underline" }}>All</Link>
          <Link href="/?platform=PC" style={{ textDecoration: "underline" }}>PC</Link>
          <Link href="/?platform=Mobile" style={{ textDecoration: "underline" }}>Mobile</Link>
          <Link href="/?status=released" style={{ textDecoration: "underline" }}>Released</Link>
          <Link href="/?status=in_dev" style={{ textDecoration: "underline" }}>In Dev</Link>
        </div>

        <strong>Total results:</strong> {typedGames.length}
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        {typedGames.length === 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 20 }}>
            No games found.
          </div>
        ) : (
          typedGames.map((g) => (
            <article
              key={g.slug}
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                padding: 18,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                <Link href={`/games/${g.slug}`} style={{ textDecoration: "underline" }}>
                  {g.name}
                </Link>
              </h2>

              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 14 }}>
                {g.country} • {g.platforms.join(", ")} • {g.status}
                {g.release_date ? ` • ${g.release_date}` : ""}
              </div>

              <div style={{ marginTop: 8, fontSize: 14 }}>
                <strong>Genres:</strong> {g.genres.join(", ")}
              </div>

              <p style={{ marginTop: 12, lineHeight: 1.6 }}>{g.short_description}</p>

              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {g.website_url && (
                  <a href={g.website_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                    Website
                  </a>
                )}

                {g.store_links &&
                  Object.entries(g.store_links).map(([key, val]) =>
                    typeof val === "string" && val ? (
                      <a
                        key={key}
                        href={val}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "underline" }}
                      >
                        {key}
                      </a>
                    ) : null
                  )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}