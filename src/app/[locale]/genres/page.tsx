import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { GENRE_VALUES, GENRE_I18N_KEYS } from "@/lib/genres";
import { genreSlug, tally } from "@/lib/hubs";
import { languageAlternates } from "@/lib/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hubs" });
  return {
    title: t("genresTitle"),
    description: t("genresSubtitle"),
    alternates: languageAlternates("/genres"),
  };
}

// Index of the genre hubs. Only canonical genres (GENRE_VALUES) get a hub;
// free-text "Other" genres stay reachable through the homepage filter.
export default async function GenresIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hubs");
  const tGenres = await getTranslations("genres");

  const { data: games } = await supabase.from("games").select("genres");
  const counts = new Map(tally((games ?? []).map((g) => g.genres as string[])));
  const genres = [...GENRE_VALUES].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b)
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-c-text">{t("genresTitle")}</h1>
      <p className="text-c-muted mt-2">{t("genresSubtitle")}</p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
        {genres.map((g) => {
          const count = counts.get(g) ?? 0;
          return (
            <li key={g}>
              <Link
                href={`/genres/${genreSlug(g)}`}
                className={`block h-full bg-c-surface border border-c-border rounded-xl px-4 py-3 hover:border-indigo-500/50 transition-colors ${
                  count === 0 ? "opacity-70" : ""
                }`}
              >
                <span className="block font-semibold text-c-text">{tGenres(GENRE_I18N_KEYS[g])}</span>
                <span className="block text-sm text-c-muted mt-1">
                  {t("gamesCount", { count })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
