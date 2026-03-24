import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  name: string;
  developer: string | null;
  country: string;
  platforms: string[];
  genres: string[];
  gameplay_modes: string[] | null;
  game_engine: string | null;
  monetization: string[] | null;
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
  slug: string;
  short_description: string;
};

const STATUS_LABELS: Record<string, string> = {
  announced: "Announced",
  in_dev: "In Dev",
  early_access: "Early Access",
  released: "Released",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  announced: "bg-blue-100 text-blue-700",
  in_dev: "bg-amber-100 text-amber-700",
  early_access: "bg-purple-100 text-purple-700",
  released: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-c-tag text-c-muted",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    platform?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  let query = supabase
    .from("games")
    .select(
      "name, developer, country, platforms, genres, gameplay_modes, game_engine, monetization, status, release_date, website_url, store_links, slug, short_description"
    )
    .order("created_at", { ascending: false });

  if (params.country) query = query.eq("country", params.country);
  if (params.platform) query = query.contains("platforms", [params.platform]);
  if (params.status) query = query.eq("status", params.status);

  if (q) {
    // name + developer: case-insensitive partial match
    // genres: exact element match (controlled vocabulary)
    query = query.or(
      `name.ilike.%${q}%,developer.ilike.%${q}%,genres.cs.{${q}}`
    );
  }

  const { data: games, error } = await query;

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </main>
    );
  }

  const typedGames: Game[] = games ?? [];

  // Filter links preserve the active search query
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const filters = [
    { label: "All", href: q ? `/?q=${encodeURIComponent(q)}` : "/", active: !params.platform && !params.status },
    { label: "PC", href: `/?platform=PC${qParam}`, active: params.platform === "PC" },
    { label: "Mobile", href: `/?platform=Mobile${qParam}`, active: params.platform === "Mobile" },
    { label: "Released", href: `/?status=released${qParam}`, active: params.status === "released" },
    { label: "In Dev", href: `/?status=in_dev${qParam}`, active: params.status === "in_dev" },
  ];

  // Clear-search href preserves active filter
  const clearSearchHref =
    params.platform ? `/?platform=${params.platform}`
    : params.status ? `/?status=${params.status}`
    : "/";

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-c-text">
              Arabic Games Directory
            </h1>
            <p className="text-c-muted mt-1 text-sm">
              Games developed in the MENA region.
            </p>
          </div>
          <Link
            href="/submit"
            className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Submit a game
          </Link>
        </div>
      </header>

      {/* Search */}
      <form method="get" action="/" className="relative mb-4">
        {params.platform && (
          <input type="hidden" name="platform" value={params.platform} />
        )}
        {params.status && (
          <input type="hidden" name="status" value={params.status} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, developer, or genre…"
          className="w-full bg-c-surface border border-c-border rounded-xl px-4 py-2.5 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {q && (
            <Link
              href={clearSearchHref}
              className="text-xs text-c-faint hover:text-c-muted px-2 py-1 transition-colors"
            >
              Clear
            </Link>
          )}
          <button
            type="submit"
            className="text-xs bg-c-tag text-c-soft px-3 py-1 rounded-lg hover:bg-c-border transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filters + count */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              f.active
                ? "bg-c-text text-c-bg"
                : "bg-c-surface text-c-soft border border-c-border hover:border-c-border-hover hover:bg-c-surface-hover"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-c-faint">
          {typedGames.length} game{typedGames.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Game list */}
      <div className="grid gap-3">
        {typedGames.length === 0 ? (
          <div className="text-center py-16 text-c-muted">
            <p>No games found.</p>
            <Link
              href="/"
              className="text-indigo-500 text-sm mt-2 inline-block hover:underline"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          typedGames.map((g) => (
            <article
              key={g.slug}
              className="bg-c-surface border border-c-border rounded-xl p-5 hover:border-c-border-hover transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-c-text leading-snug">
                    <Link
                      href={`/games/${g.slug}`}
                      className="hover:text-indigo-500 transition-colors"
                    >
                      {g.name}
                    </Link>
                  </h2>
                  {g.developer && (
                    <p className="text-xs text-c-faint mt-0.5">{g.developer}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                  }`}
                >
                  {STATUS_LABELS[g.status] ?? g.status}
                </span>
              </div>

              <p className="text-sm text-c-muted mt-1">
                {g.country} · {g.platforms.join(", ")}
                {g.release_date ? ` · ${g.release_date}` : ""}
              </p>

              <p className="text-sm text-c-soft mt-3 leading-relaxed">
                {g.short_description}
              </p>

              <div className="flex gap-1.5 flex-wrap mt-3">
                {g.genres.map((genre) => (
                  <span key={genre} className="text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                    {genre}
                  </span>
                ))}
                {g.gameplay_modes?.map((m) => (
                  <span key={m} className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
                {g.monetization?.map((m) => (
                  <span key={m} className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
                {g.game_engine && (
                  <span className="text-xs bg-c-tag text-c-faint px-2 py-0.5 rounded-full">
                    {g.game_engine}
                  </span>
                )}
              </div>

              {(g.website_url ||
                Object.values(g.store_links ?? {}).some(Boolean)) && (
                <div className="flex gap-4 flex-wrap mt-4 pt-4 border-t border-c-border">
                  {g.website_url && (
                    <a
                      href={g.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-500 hover:underline"
                    >
                      Website ↗
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
                          className="text-sm text-indigo-500 hover:underline"
                        >
                          {key} ↗
                        </a>
                      ) : null
                    )}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <footer className="mt-12 pt-8 border-t border-c-border flex gap-6 text-sm text-c-faint">
        <Link href="/stats" className="hover:text-c-muted transition-colors">
          Stats
        </Link>
        <Link href="/admin" className="hover:text-c-muted transition-colors">
          Admin
        </Link>
      </footer>
    </main>
  );
}
