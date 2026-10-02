import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { GENRE_I18N_KEYS } from "@/lib/genres";
import { countryFromSlug, countrySlug, genreFromSlug, tally } from "@/lib/hubs";
import { languageAlternates } from "@/lib/alternates";
import GameTile, { type GameTileData } from "@/components/GameTile";
import HubStats from "@/components/HubStats";

const NEWEST_LIMIT = 12;

// "{genre} games" would read "Card / Board Game games" — drop the trailing
// "Game" for the heading/title only.
function titleName(label: string): string {
  return label.replace(/ Game$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = genreFromSlug(slug);
  if (!genre) notFound();
  const t = await getTranslations({ locale, namespace: "hubs" });
  const tGenres = await getTranslations({ locale, namespace: "genres" });
  const name = titleName(tGenres(GENRE_I18N_KEYS[genre]));
  return {
    title: t("genreTitle", { genre: name }),
    description: t("genreDescription", { genre: name }),
    alternates: languageAlternates(`/genres/${slug}`),
  };
}

// Genre hub — headline numbers, where the genre is made, newest games.
export default async function GenreHub({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const genre = genreFromSlug(slug);
  if (!genre) notFound();

  const t = await getTranslations("hubs");
  const tGenres = await getTranslations("genres");
  const tCountries = await getTranslations("countries");
  const tStatus = await getTranslations("status");
  const name = titleName(tGenres(GENRE_I18N_KEYS[genre]));

  const [{ data: facts }, { data: newest }] = await Promise.all([
    supabase.from("games").select("country, status").contains("genres", [genre]),
    supabase
      .from("games")
      .select("slug, name, status, thumbnail_url")
      .contains("genres", [genre])
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(NEWEST_LIMIT),
  ]);

  const gameRows = facts ?? [];
  const gameCount = gameRows.length;
  const released = gameRows.filter((g) => g.status === "released").length;
  const byCountry = tally(gameRows.map((g) => g.country as string[]));

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/genres" className="text-sm text-c-muted hover:text-c-text transition-colors">
        {t("allGenres")}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-c-text mt-4">
        {t("genreTitle", { genre: name })}
      </h1>

      <HubStats
        locale={locale}
        items={[
          { label: t("statGames"), value: gameCount },
          { label: t("statReleased"), value: released },
          { label: t("statCountries"), value: byCountry.length },
        ]}
      />

      {gameCount === 0 ? (
        <div className="text-center py-12 text-c-muted">
          <p>{t("emptyGenre", { genre: name })}</p>
          <Link href="/submit" className="inline-block mt-3 text-indigo-500 hover:underline">
            {t("submitCta")}
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
              {t("topCountries")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {byCountry.map(([c, count]) =>
                countryFromSlug(countrySlug(c)) ? (
                  <Link
                    key={c}
                    href={`/countries/${countrySlug(c)}`}
                    className="text-sm px-3 py-1 rounded-full bg-c-tag text-c-tag-text hover:text-indigo-500 transition-colors"
                  >
                    {tCountries(COUNTRY_KEY_MAP[c])} <span className="text-c-faint">· {count}</span>
                  </Link>
                ) : null
              )}
            </div>
          </section>

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
              href={`/?genre=${encodeURIComponent(genre)}`}
              className="inline-block mt-4 text-sm text-indigo-500 hover:underline"
            >
              {t("seeAllGames", { count: gameCount })}
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
