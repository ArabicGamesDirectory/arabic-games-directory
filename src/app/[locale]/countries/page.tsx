import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";
import { countrySlug, tally } from "@/lib/hubs";
import { languageAlternates } from "@/lib/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hubs" });
  return {
    title: t("countriesTitle"),
    description: t("countriesSubtitle"),
    alternates: languageAlternates("/countries"),
  };
}

// Index of the country hubs — every MENA country, busiest first.
export default async function CountriesIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hubs");
  const tCountries = await getTranslations("countries");

  const [{ data: games }, { data: studios }] = await Promise.all([
    supabase.from("games").select("country"),
    supabase.from("studios").select("country"),
  ]);
  const gameCounts = new Map(tally((games ?? []).map((g) => g.country as string[])));
  const studioCounts = new Map(tally((studios ?? []).map((s) => s.country as string[])));

  const countries = [...COUNTRY_OPTIONS].sort(
    (a, b) => (gameCounts.get(b) ?? 0) - (gameCounts.get(a) ?? 0) || a.localeCompare(b)
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-c-text">{t("countriesTitle")}</h1>
      <p className="text-c-muted mt-2">{t("countriesSubtitle")}</p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
        {countries.map((c) => {
          const games = gameCounts.get(c) ?? 0;
          const studios = studioCounts.get(c) ?? 0;
          return (
            <li key={c}>
              <Link
                href={`/countries/${countrySlug(c)}`}
                className={`block h-full bg-c-surface border border-c-border rounded-xl px-4 py-3 hover:border-indigo-500/50 transition-colors ${
                  games === 0 ? "opacity-70" : ""
                }`}
              >
                <span className="block font-semibold text-c-text">{tCountries(COUNTRY_KEY_MAP[c])}</span>
                <span className="block text-sm text-c-muted mt-1">
                  {t("gamesCount", { count: games })} · {t("studiosCount", { count: studios })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
