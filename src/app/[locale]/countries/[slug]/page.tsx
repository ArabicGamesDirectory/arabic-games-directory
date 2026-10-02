import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { GENRE_I18N_KEYS } from "@/lib/genres";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import { countryFromSlug, genreFromSlug, genreSlug, tally } from "@/lib/hubs";
import { languageAlternates } from "@/lib/alternates";
import GameTile, { type GameTileData } from "@/components/GameTile";
import HubStats from "@/components/HubStats";

const NEWEST_LIMIT = 12;
const TOP_STUDIOS_LIMIT = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const country = countryFromSlug(slug);
  if (!country) notFound();
  const t = await getTranslations({ locale, namespace: "hubs" });
  const tCountries = await getTranslations({ locale, namespace: "countries" });
  const name = tCountries(COUNTRY_KEY_MAP[country]);
  return {
    title: t("countryTitle", { country: name }),
    description: t("countryDescription", { country: name }),
    alternates: languageAlternates(`/countries/${slug}`),
  };
}

// Country hub — a landing page per MENA country: headline numbers, top genres,
// newest games, its studios and communities. Everything links onward to the
// filtered homepage lists, which remain the full browsable view.
export default async function CountryHub({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const country = countryFromSlug(slug);
  if (!country) notFound();

  const t = await getTranslations("hubs");
  const tCountries = await getTranslations("countries");
  const tGenres = await getTranslations("genres");
  const tStatus = await getTranslations("status");
  const name = tCountries(COUNTRY_KEY_MAP[country]);

  const [
    { data: facts },
    { data: newest },
    { data: studios },
    { data: links },
    { data: communities },
  ] = await Promise.all([
    supabase.from("games").select("genres, status, release_date").contains("country", [country]),
    supabase
      .from("games")
      .select("slug, name, status, thumbnail_url")
      .contains("country", [country])
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(NEWEST_LIMIT),
    supabase.from("studios").select("id, slug, name").contains("country", [country]),
    supabase.from("game_studios").select("studio_id"),
    supabase.from("communities").select("slug, name").contains("country", [country]).order("name"),
  ]);

  const gameRows = facts ?? [];
  const gameCount = gameRows.length;
  const releasedYears = gameRows
    .filter((g) => statusAllowsReleaseDate(g.status) && g.release_date)
    .map((g) => Number((g.release_date as string).slice(0, 4)));
  const earliest = releasedYears.length ? Math.min(...releasedYears) : null;
  const topGenres = tally(gameRows.map((g) => g.genres as string[])).slice(0, 10);

  // Studios ranked by how many games link to them (whole directory), then name.
  const linkCounts = new Map<string, number>();
  for (const l of links ?? []) linkCounts.set(l.studio_id, (linkCounts.get(l.studio_id) ?? 0) + 1);
  const studioList = (studios ?? [])
    .map((s) => ({ ...s, games: linkCounts.get(s.id) ?? 0 }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

  const genreLabel = (g: string) => (GENRE_I18N_KEYS[g] ? tGenres(GENRE_I18N_KEYS[g]) : g);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/countries" className="text-sm text-c-muted hover:text-c-text transition-colors">
        {t("allCountries")}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-c-text mt-4">
        {t("countryTitle", { country: name })}
      </h1>

      <HubStats
        locale={locale}
        items={[
          { label: t("statGames"), value: gameCount },
          { label: t("statStudios"), value: studioList.length },
          { label: t("statCommunities"), value: (communities ?? []).length },
          // Year as a plain string — Intl would print "1,998".
          { label: t("statEarliest"), value: earliest ? String(earliest) : null },
        ]}
      />

      {gameCount === 0 ? (
        <div className="text-center py-12 text-c-muted">
          <p>{t("emptyCountry", { country: name })}</p>
          <Link href="/submit" className="inline-block mt-3 text-indigo-500 hover:underline">
            {t("submitCta")}
          </Link>
        </div>
      ) : (
        <>
          {topGenres.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
                {t("topGenres")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {topGenres.map(([g, count]) => {
                  const pill = (
                    <>
                      {genreLabel(g)} <span className="text-c-faint">· {count}</span>
                    </>
                  );
                  const cls = "text-sm px-3 py-1 rounded-full bg-c-tag text-c-tag-text";
                  return genreFromSlug(genreSlug(g)) ? (
                    <Link key={g} href={`/genres/${genreSlug(g)}`} className={`${cls} hover:text-indigo-500 transition-colors`}>
                      {pill}
                    </Link>
                  ) : (
                    <span key={g} className={cls}>
                      {pill}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
              {t("newestGames")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {((newest ?? []) as GameTileData[]).map((g) => (
                <GameTile key={g.slug} game={g} statusLabel={tStatus(g.status)} />
              ))}
            </div>
            <Link
              href={`/?country=${encodeURIComponent(country)}`}
              className="inline-block mt-4 text-sm text-indigo-500 hover:underline"
            >
              {t("seeAllGames", { count: gameCount })}
            </Link>
          </section>
        </>
      )}

      {studioList.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
            {t("studios")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {studioList.slice(0, TOP_STUDIOS_LIMIT).map((s) => (
              <Link
                key={s.slug}
                href={`/studios/${s.slug}`}
                dir="auto"
                className="text-sm px-3 py-1 rounded-full bg-c-surface border border-c-border text-c-soft hover:text-indigo-500 hover:border-indigo-500/50 transition-colors"
              >
                {s.name}
                {s.games > 0 && <span className="text-c-faint"> · {s.games}</span>}
              </Link>
            ))}
          </div>
          {studioList.length > TOP_STUDIOS_LIMIT && (
            <Link
              href={`/?tab=studios&studioCountry=${encodeURIComponent(country)}`}
              className="inline-block mt-4 text-sm text-indigo-500 hover:underline"
            >
              {t("seeAllStudios", { count: studioList.length })}
            </Link>
          )}
        </section>
      )}

      {(communities ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
            {t("communities")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(communities ?? []).map((c) => (
              <Link
                key={c.slug}
                href={`/communities/${c.slug}`}
                dir="auto"
                className="text-sm px-3 py-1 rounded-full bg-c-surface border border-c-border text-c-soft hover:text-indigo-500 hover:border-indigo-500/50 transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
