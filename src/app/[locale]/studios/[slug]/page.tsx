import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import TitleCover from "@/components/TitleCover";

type Studio = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
  thumbnail_url: string | null;
};

type Game = {
  slug: string;
  name: string;
  developer: string | null;
  status: string;
  country: string[];
  platforms: string[];
  genres: string[];
  gameplay_modes: string[] | null;
  monetization: string[] | null;
  game_engine: string | null;
  release_date: string | null;
  thumbnail_url: string | null;
};

const STATUS_CLASSES: Record<string, string> = {
  announced: "bg-blue-500/15 text-blue-500",
  in_dev: "bg-amber-500/15 text-amber-500",
  prototype: "bg-cyan-500/15 text-cyan-500",
  early_access: "bg-purple-500/15 text-purple-500",
  released: "bg-emerald-500/15 text-emerald-500",
  on_hold: "bg-orange-500/15 text-orange-500",
  cancelled: "bg-c-tag text-c-muted",
  delisted: "bg-c-tag text-c-muted",
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

  // Fetch games linked to this studio via FK
  const { data: gamesData } = await supabase
    .from("games")
    .select("slug, name, developer, status, country, platforms, genres, gameplay_modes, monetization, game_engine, release_date, thumbnail_url")
    .eq("studio_id", studio.id)
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
        {studio.thumbnail_url && (
          <img
            src={studio.thumbnail_url}
            alt={studio.name}
            width={460}
            height={215}
            loading="lazy"
            decoding="async"
            className="w-full max-w-[460px] h-[215px] object-cover rounded-xl mb-6"
          />
        )}

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
          <p className="mt-6 text-c-soft leading-relaxed whitespace-pre-wrap" dir="auto">{studio.description}</p>
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
              <article
                key={g.slug}
                className="bg-c-surface border border-c-border rounded-xl overflow-hidden hover:border-c-border-hover transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start">
                  {/* Thumbnail */}
                  {g.thumbnail_url ? (
                    <img
                      src={g.thumbnail_url}
                      alt={g.name}
                      width={230}
                      height={108}
                      loading="lazy"
                      decoding="async"
                      className="w-full sm:w-[230px] shrink-0 object-cover self-stretch"
                    />
                  ) : (
                    <TitleCover
                      name={g.name}
                      seed={g.slug}
                      className="w-full sm:w-[230px] shrink-0 self-stretch aspect-[460/215] sm:aspect-auto"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-c-text leading-snug">
                          <Link
                            href={`/games/${g.slug}`}
                            className="hover:text-indigo-500 transition-colors"
                          >
                            {g.name}
                          </Link>
                        </h3>
                        {g.developer && (
                          <p className="text-xs text-c-faint mt-0.5">{g.developer}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                        }`}
                      >
                        {tStatus(g.status as "announced" | "in_dev" | "prototype" | "early_access" | "released" | "on_hold" | "cancelled" | "delisted") ?? g.status}
                      </span>
                    </div>

                    <p className="text-xs text-c-muted mt-1">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {g.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")} · {g.platforms.join(", ")}
                      {g.release_date ? ` · ${g.release_date}` : ""}
                    </p>

                    {(() => {
                      const allTags = [
                        ...g.genres.map((v) => ({ v, cls: "bg-c-tag text-c-tag-text" })),
                        ...(g.gameplay_modes ?? []).map((v) => ({ v, cls: "bg-blue-500/10 text-blue-500" })),
                        ...(g.monetization ?? []).map((v) => ({ v, cls: "bg-amber-500/10 text-amber-500" })),
                        ...(g.game_engine ? [{ v: g.game_engine, cls: "bg-c-tag text-c-faint" }] : []),
                      ];
                      const visible = allTags.slice(0, 5);
                      const extra = allTags.length - visible.length;
                      return (
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {visible.map(({ v, cls }) => (
                            <span key={v} className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{v}</span>
                          ))}
                          {extra > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-c-tag text-c-faint">
                              +{extra}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
