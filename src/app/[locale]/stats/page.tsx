import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { StatsCharts, type ChartEntry } from "@/components/StatsCharts";

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

  const { data, error } = await supabase
    .from("games")
    .select("country, platforms, genres, status");

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </main>
    );
  }

  const games: Game[] = data ?? [];
  const count = games.length;

  const rawCountry: Record<string, number> = {};
  const rawPlatform: Record<string, number> = {};
  const rawGenre: Record<string, number> = {};
  const rawStatus: Record<string, number> = {};

  for (const game of games) {
    for (const c of game.country) rawCountry[c] = (rawCountry[c] || 0) + 1;
    rawStatus[game.status] = (rawStatus[game.status] || 0) + 1;
    for (const p of game.platforms) rawPlatform[p] = (rawPlatform[p] || 0) + 1;
    for (const g of game.genres) rawGenre[g] = (rawGenre[g] || 0) + 1;
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

  const subtitleText =
    count === 1
      ? t("subtitleSingular", { count })
      : t("subtitlePlural", { count });

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
        <p className="text-c-muted text-sm mt-1">{subtitleText}</p>
      </div>

      <StatsCharts
        byCountry={byCountry}
        byStatus={byStatus}
        byPlatform={byPlatform}
        byGenre={byGenre}
        labels={{
          byCountry: t("byCountry"),
          byStatus: t("byStatus"),
          byPlatform: t("byPlatform"),
          byGenre: t("byGenre"),
          noData: t("noData"),
        }}
      />
    </main>
  );
}
