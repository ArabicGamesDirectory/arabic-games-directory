import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  slug: string;
  name: string;
  country: string;
  platforms: string[];
  genres: string[];
  short_description: string;
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
};

export default async function GameDetails({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        <p>Game not found.</p>
        <Link href="/">Back to directory</Link>
      </main>
    );
  }

  const game = data as Game;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <Link href="/" style={{ textDecoration: "underline" }}>
        ← Back to directory
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 16 }}>
        {game.name}
      </h1>

      <div style={{ opacity: 0.7, marginTop: 8 }}>
        {game.country} • {game.platforms.join(", ")} • {game.status}
        {game.release_date ? ` • ${game.release_date}` : ""}
      </div>

      <div style={{ marginTop: 20 }}>
        <strong>Genres:</strong> {game.genres.join(", ")}
      </div>

      <p style={{ marginTop: 20, lineHeight: 1.6 }}>
        {game.short_description}
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {game.website_url && (
          <a
            href={game.website_url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            Official Website
          </a>
        )}

        {game.store_links &&
          Object.entries(game.store_links).map(([key, val]) =>
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
    </main>
  );
}