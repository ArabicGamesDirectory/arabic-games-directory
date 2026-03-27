import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";

type Studio = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
};

type Game = {
  slug: string;
  name: string;
  status: string;
  short_description: string;
  platforms: string[];
  genres: string[];
  release_date: string | null;
};

const STATUS_CLASSES: Record<string, string> = {
  announced: "bg-blue-500/15 text-blue-500",
  in_dev: "bg-amber-500/15 text-amber-500",
  early_access: "bg-purple-500/15 text-purple-500",
  released: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-c-tag text-c-muted",
};

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("studio");
  const tCommon = await getTranslations("common");
  const tCountries = await getTranslations("countries");
  const tStatus = await getTranslations("status");

  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/?tab=studios" className="text-sm text-c-muted hover:text-c-text transition-colors">
          {tCommon("backToDirectory")}
        </Link>
        <p className="mt-8 text-c-muted">{t("notFound")}</p>
      </main>
    );
  }

  const studio = data as Studio;

  // Fetch games by this studio (case-insensitive name match)
  const { data: gamesData } = await supabase
    .from("games")
    .select("slug, name, status, short_description, platforms, genres, release_date")
    .ilike("developer", studio.name)
    .order("created_at", { ascending: false });
  const studioGames: Game[] = (gamesData as Game[]) ?? [];

  const TYPE_LABELS: Record<string, string> = {
    individual: t("typeIndividual"),
    team: t("typeTeam"),
    studio: t("typeStudio"),
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/?tab=studios"
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {tCommon("backToDirectory")}
        </Link>
        <Link
          href={`/update-studio/${studio.slug}`}
          className="text-sm text-c-muted hover:text-c-text border border-c-border hover:border-c-border-hover px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("suggestUpdate")}
        </Link>
      </div>

      <div className="mt-8">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-c-text w-full">
            {studio.name}
          </h1>
          <span className="text-xs font-medium bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full">
            {TYPE_LABELS[studio.type] ?? studio.type}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {studio.country.map((c) => (
            <span key={c} className="text-sm bg-c-tag text-c-tag-text px-3 py-1 rounded-full">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tCountries(COUNTRY_KEY_MAP[c] as any) ?? c}
            </span>
          ))}
        </div>

        {studio.description && (
          <p className="mt-6 text-c-soft leading-relaxed" dir="auto">{studio.description}</p>
        )}

        {studio.website_url && (
          <div className="mt-6">
            <a
              href={studio.website_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center bg-c-surface border border-c-border hover:border-c-border-hover text-sm text-c-text px-4 py-2 rounded-lg transition-colors"
            >
              {t("websiteLabel")}
            </a>
          </div>
        )}
      </div>

      {/* Games by this studio */}
      <section className="mt-10 pt-8 border-t border-c-border">
        <h2 className="text-lg font-semibold text-c-text mb-4">{t("gamesSection")}</h2>
        {studioGames.length === 0 ? (
          <p className="text-sm text-c-muted">{t("noGamesYet")}</p>
        ) : (
          <div className="grid gap-3">
            {studioGames.map((g) => (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="block bg-c-surface border border-c-border rounded-xl p-4 hover:border-c-border-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium text-c-text leading-snug">{g.name}</h3>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                    }`}
                  >
                    {tStatus(g.status as "announced" | "in_dev" | "early_access" | "released" | "cancelled") ?? g.status}
                  </span>
                </div>
                <p className="text-xs text-c-muted mt-1">
                  {g.platforms.join(", ")}
                  {g.release_date ? ` · ${g.release_date}` : ""}
                </p>
                <p className="text-sm text-c-soft mt-2 leading-relaxed line-clamp-2" dir="auto">
                  {g.short_description}
                </p>
                {g.genres.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {g.genres.slice(0, 4).map((genre) => (
                      <span key={genre} className="text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                        {genre}
                      </span>
                    ))}
                    {g.genres.length > 4 && (
                      <span className="text-xs bg-c-tag text-c-faint px-2 py-0.5 rounded-full">
                        +{g.genres.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
