import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  country: string;
  platforms: string[];
  genres: string[];
  status: string;
};

export default async function StatsPage() {
  const { data, error } = await supabase
    .from("games")
    .select("country, platforms, genres, status");

  if (error) {
    return <main style={{ padding: 24 }}>Error: {error.message}</main>;
  }

  const games: Game[] = data ?? [];

  const byCountry: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const byGenre: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const game of games) {
    byCountry[game.country] = (byCountry[game.country] || 0) + 1;
    byStatus[game.status] = (byStatus[game.status] || 0) + 1;

    for (const p of game.platforms) {
      byPlatform[p] = (byPlatform[p] || 0) + 1;
    }

    for (const g of game.genres) {
      byGenre[g] = (byGenre[g] || 0) + 1;
    }
  }

  function renderList(obj: Record<string, number>) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => (
        <li key={key}>
          {key}: {count}
        </li>
      ));
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <Link href="/" style={{ textDecoration: "underline" }}>
        ← Back to directory
      </Link>

      <h1 style={{ fontSize: 30, fontWeight: 700, marginTop: 16 }}>Statistics</h1>

      <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
        <section>
          <h2>By country</h2>
          <ul>{renderList(byCountry)}</ul>
        </section>

        <section>
          <h2>By platform</h2>
          <ul>{renderList(byPlatform)}</ul>
        </section>

        <section>
          <h2>By genre</h2>
          <ul>{renderList(byGenre)}</ul>
        </section>

        <section>
          <h2>By status</h2>
          <ul>{renderList(byStatus)}</ul>
        </section>
      </div>
    </main>
  );
}