import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import { StatsCharts, type ChartEntry, type StudioRank } from "@/components/StatsCharts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stats" });
  return { title: t("title") };
}

const STATUS_COLORS: Record<string, string> = {
  announced: "#3b82f6",
  in_dev: "#f59e0b",
  prototype: "#06b6d4",
  early_access: "#8b5cf6",
  released: "#10b981",
  on_hold: "#f97316",
  cancelled: "#71717a",
  delisted: "#71717a",
};

type Game = {
  country: string[];
  platforms: string[];
  genres: string[];
  status: string;
  release_date: string | null;
  game_engine: string | null;
  monetization: string[] | null;
  created_at: string | null;
};

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("stats");
  const tCommon = await getTranslations("common");
  const tStatus = await getTranslations("status");
  const tCountries = await getTranslations("countries");

  const [
    { data: gamesData, error },
    { count: communitiesCount },
    { data: studiosData },
    { data: studioGameLinks },
  ] = await Promise.all([
    supabase
      .from("games")
      .select("country, platforms, genres, status, release_date, game_engine, monetization, created_at"),
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("studios").select("id, slug, name"),
    supabase.from("game_studios").select("studio_id"),
  ]);

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </main>
    );
  }

  const games: Game[] = gamesData ?? [];
  const studios = studiosData ?? [];
  const links = studioGameLinks ?? [];

  const rawCountry: Record<string, number> = {};
  const rawPlatform: Record<string, number> = {};
  const rawGenre: Record<string, number> = {};
  const rawStatus: Record<string, number> = {};
  const rawYear: Record<number, number> = {};
  const rawEngine: Record<string, number> = {};
  const rawMonetization: Record<string, number> = {};
  // Submissions over time — bucket created_at by `YYYY-MM` so the chart can
  // gap-fill empty months later. Sortable lexicographically thanks to padding.
  const rawMonth: Record<string, number> = {};

  const currentYear = new Date().getFullYear();
  for (const game of games) {
    for (const c of game.country) rawCountry[c] = (rawCountry[c] || 0) + 1;
    rawStatus[game.status] = (rawStatus[game.status] || 0) + 1;
    for (const p of game.platforms) rawPlatform[p] = (rawPlatform[p] || 0) + 1;
    for (const g of game.genres) rawGenre[g] = (rawGenre[g] || 0) + 1;
    if (game.release_date && statusAllowsReleaseDate(game.status)) {
      const year = new Date(game.release_date).getFullYear();
      // Sanity-bound: drop obvious data errors (no real game in this directory pre-1970, no future dates beyond +5y).
      if (year >= 1970 && year <= currentYear + 5) {
        rawYear[year] = (rawYear[year] || 0) + 1;
      }
    }
    // Engine: trim + dedupe minor whitespace; skip empty so the chart isn't
    // dominated by a "no engine specified" bucket. Free-text values land here
    // verbatim — the form has a datalist but submitters can type anything.
    if (game.game_engine) {
      const engine = game.game_engine.trim();
      if (engine) rawEngine[engine] = (rawEngine[engine] || 0) + 1;
    }
    for (const m of game.monetization ?? []) {
      const trimmed = m?.trim();
      if (trimmed) rawMonetization[trimmed] = (rawMonetization[trimmed] || 0) + 1;
    }
    if (game.created_at) {
      const d = new Date(game.created_at);
      if (!Number.isNaN(d.getTime())) {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        rawMonth[key] = (rawMonth[key] || 0) + 1;
      }
    }
  }

  function toSortedEntries(
    raw: Record<string, number>,
    translateKey?: (k: string) => string,
    colorMap?: Record<string, string>
  ): ChartEntry[] {
    return Object.entries(raw)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        name: translateKey ? translateKey(key) : key,
        value,
        ...(colorMap ? { color: colorMap[key] } : {}),
      }));
  }

  const byCountry = toSortedEntries(rawCountry, (k) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tCountries(COUNTRY_KEY_MAP[k] as any) ?? k
  );
  const byStatus = toSortedEntries(
    rawStatus,
    (k) =>
      tStatus(
        k as
          | "announced"
          | "in_dev"
          | "prototype"
          | "early_access"
          | "released"
          | "on_hold"
          | "cancelled"
          | "delisted"
      ) ?? k,
    STATUS_COLORS
  );
  const byPlatform = toSortedEntries(rawPlatform);
  const byGenre = toSortedEntries(rawGenre);
  const byEngine = toSortedEntries(rawEngine);
  const byMonetization = toSortedEntries(rawMonetization);

  // Build release-year histogram, gap-filled across the min→max year range so
  // empty years still render as zero-bars (otherwise a quiet year disappears).
  const yearKeys = Object.keys(rawYear).map(Number);
  let byReleaseYear: ChartEntry[] = [];
  if (yearKeys.length > 0) {
    const min = Math.min(...yearKeys);
    const max = Math.max(...yearKeys);
    for (let y = min; y <= max; y++) {
      byReleaseYear.push({ name: String(y), value: rawYear[y] || 0 });
    }
  }

  // Submissions-over-time — gap-fill across the min→max month range so silent
  // months render as zero-bars, otherwise the line would compress visually.
  // Labels are locale-aware short month + year ("May 2026" / "مايو 2026").
  const monthKeys = Object.keys(rawMonth).sort();
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
  const submissionsOverTime: ChartEntry[] = [];
  if (monthKeys.length > 0) {
    const [minY, minM] = monthKeys[0].split("-").map(Number);
    const [maxY, maxM] = monthKeys[monthKeys.length - 1].split("-").map(Number);
    let y = minY;
    let m = minM;
    while (y < maxY || (y === maxY && m <= maxM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      // Construct UTC date pinned to day 1 to avoid TZ-induced drift.
      const date = new Date(Date.UTC(y, m - 1, 1));
      submissionsOverTime.push({
        name: monthFmt.format(date),
        value: rawMonth[key] || 0,
      });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  // Top 10 studios by game count via the game_studios join table.
  const linkCounts = new Map<string, number>();
  for (const link of links) {
    linkCounts.set(link.studio_id, (linkCounts.get(link.studio_id) ?? 0) + 1);
  }
  const topStudios: StudioRank[] = studios
    .map((s) => ({ slug: s.slug, name: s.name, count: linkCounts.get(s.id) ?? 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);

  const counters = {
    games: games.length,
    studios: studios.length,
    communities: communitiesCount ?? 0,
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="text-sm text-c-muted hover:text-c-text transition-colors"
      >
        {tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">
          {t("title")}
        </h1>
      </div>

      <StatsCharts
        counters={counters}
        topStudios={topStudios}
        byCountry={byCountry}
        byStatus={byStatus}
        byPlatform={byPlatform}
        byGenre={byGenre}
        byEngine={byEngine}
        byMonetization={byMonetization}
        byReleaseYear={byReleaseYear}
        submissionsOverTime={submissionsOverTime}
        labels={{
          totalGames: t("totalGames"),
          totalStudios: t("totalStudios"),
          totalCommunities: t("totalCommunities"),
          topStudios: t("topStudios"),
          byCountry: t("byCountry"),
          byStatus: t("byStatus"),
          byPlatform: t("byPlatform"),
          byGenre: t("byGenre"),
          byEngine: t("byEngine"),
          byMonetization: t("byMonetization"),
          byReleaseYear: t("byReleaseYear"),
          submissionsOverTime: t("submissionsOverTime"),
          noData: t("noData"),
          noStudios: t("noStudios"),
        }}
      />
    </main>
  );
}
