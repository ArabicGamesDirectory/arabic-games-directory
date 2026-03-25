import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";

type Game = {
  country: string;
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

  const { data, error } = await supabase
    .from("games")
    .select("country, platforms, genres, status");

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </main>
    );
  }

  const games: Game[] = data ?? [];
  const count = games.length;

  const byCountry: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const byGenre: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const game of games) {
    byCountry[game.country] = (byCountry[game.country] || 0) + 1;
    byStatus[game.status] = (byStatus[game.status] || 0) + 1;
    for (const p of game.platforms) byPlatform[p] = (byPlatform[p] || 0) + 1;
    for (const g of game.genres) byGenre[g] = (byGenre[g] || 0) + 1;
  }

  const subtitleText =
    count === 1
      ? t("subtitleSingular", { count })
      : t("subtitlePlural", { count });

  function StatCard({
    title,
    data,
    translateKey,
  }: {
    title: string;
    data: Record<string, number>;
    translateKey?: (key: string) => string;
  }) {
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] ?? 1;

    return (
      <div className="bg-c-surface border border-c-border rounded-xl p-5">
        <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-4">
          {title}
        </h2>
        <div className="space-y-3">
          {sorted.map(([key, count]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-c-soft">
                  {translateKey ? translateKey(key) : key}
                </span>
                <span className="text-c-faint tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 bg-c-tag rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-c-faint text-sm">{t("noData")}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title={t("byCountry")} data={byCountry} />
        <StatCard
          title={t("byStatus")}
          data={byStatus}
          translateKey={(key) =>
            tStatus(
              key as
                | "announced"
                | "in_dev"
                | "early_access"
                | "released"
                | "cancelled"
            ) ?? key
          }
        />
        <StatCard title={t("byPlatform")} data={byPlatform} />
        <StatCard title={t("byGenre")} data={byGenre} />
      </div>
    </main>
  );
}
