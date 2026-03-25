import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";

type Game = {
  name: string;
  developer: string | null;
  country: string[];
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

const STATUS_CLASSES: Record<string, string> = {
  announced: "bg-blue-100 text-blue-700",
  in_dev: "bg-amber-100 text-amber-700",
  early_access: "bg-purple-100 text-purple-700",
  released: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-c-tag text-c-muted",
};

type Studio = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
};

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    country?: string;
    platform?: string;
    status?: string;
    q?: string;
    tab?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tStatus = await getTranslations("status");
  const tCountries = await getTranslations("countries");
  const tStudio = await getTranslations("studio");

  const sp = await searchParams;
  const tab = sp.tab === "studios" ? "studios" : "games";
  const q = sp.q?.trim() ?? "";

  // Always fetch studios: used for the Studios tab AND to make developer names clickable on game cards.
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, slug, name, type, description, country, website_url")
    .order("name");
  const studios: Studio[] = (studioData as Studio[]) ?? [];

  // name (lowercase) → slug lookup for linking developer names on game cards
  const studioSlugMap = new Map<string, string>(
    studios.map((s) => [s.name.toLowerCase(), s.slug])
  );

  let query = supabase
    .from("games")
    .select(
      "name, developer, country, platforms, genres, gameplay_modes, game_engine, monetization, status, release_date, website_url, store_links, slug, short_description"
    )
    .order("created_at", { ascending: false });

  if (sp.country) query = query.contains("country", [sp.country]);
  if (sp.platform) query = query.contains("platforms", [sp.platform]);
  if (sp.status) query = query.eq("status", sp.status);

  if (q) {
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
  const count = tab === "studios" ? studios.length : typedGames.length;

  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const filters = [
    {
      label: t("filterAll"),
      href: q ? `/?q=${encodeURIComponent(q)}` : "/",
      active: !sp.platform && !sp.status,
    },
    {
      label: t("filterPC"),
      href: `/?platform=PC${qParam}`,
      active: sp.platform === "PC",
    },
    {
      label: t("filterMobile"),
      href: `/?platform=Mobile${qParam}`,
      active: sp.platform === "Mobile",
    },
    {
      label: t("filterReleased"),
      href: `/?status=released${qParam}`,
      active: sp.status === "released",
    },
    {
      label: t("filterInDev"),
      href: `/?status=in_dev${qParam}`,
      active: sp.status === "in_dev",
    },
  ];

  const clearSearchHref = sp.platform
    ? `/?platform=${sp.platform}`
    : sp.status
    ? `/?status=${sp.status}`
    : "/";

  const gameCountText =
    count === 1
      ? t("gameCountSingular", { count })
      : t("gameCountPlural", { count });

  const studioCountText =
    count === 1
      ? t("studioCountSingular", { count })
      : t("studioCountPlural", { count });

  const TYPE_LABELS: Record<string, string> = {
    individual: tStudio("typeIndividual"),
    team: tStudio("typeTeam"),
    studio: tStudio("typeStudio"),
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-c-text">
              {t("title")}
            </h1>
            <p className="text-c-muted mt-1 text-sm">{t("description")}</p>
          </div>
          <Link
            href="/submit"
            className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {tCommon("submitGame")}
          </Link>
        </div>
      </header>

      {/* Games / Studios tab switcher */}
      <div className="flex gap-1 mb-6 bg-c-surface border border-c-border rounded-lg p-1 w-fit">
        <Link
          href="/"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "games" ? "bg-c-bg text-c-text shadow-sm" : "text-c-muted hover:text-c-text"
          }`}
        >
          {t("tabGames")}
        </Link>
        <Link
          href="/?tab=studios"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "studios" ? "bg-c-bg text-c-text shadow-sm" : "text-c-muted hover:text-c-text"
          }`}
        >
          {t("tabStudios")}
        </Link>
      </div>

      {/* Studios tab */}
      {tab === "studios" && (
        <>
          <p className="text-sm text-c-faint mb-6">{studioCountText}</p>
          <div className="grid gap-3">
            {studios.length === 0 ? (
              <div className="text-center py-16 text-c-muted">
                <p>{t("noStudios")}</p>
              </div>
            ) : (
              studios.map((s) => (
                <Link
                  key={s.slug}
                  href={`/studios/${s.slug}`}
                  className="block bg-c-surface border border-c-border rounded-xl p-5 hover:border-c-border-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-c-text leading-snug">
                      {s.name}
                    </h2>
                    <span className="shrink-0 text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[s.type] ?? s.type}
                    </span>
                  </div>
                  <p className="text-sm text-c-muted mt-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {s.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")}
                  </p>
                  {s.description && (
                    <p className="text-sm text-c-soft mt-3 leading-relaxed">{s.description}</p>
                  )}
                  {s.website_url && (
                    <p className="text-sm text-indigo-500 mt-2">{tStudio("websiteLabel")}</p>
                  )}
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {/* Games tab */}
      {tab === "games" && (<>
      {/* Search */}
      <form method="get" action="" className="relative mb-4">
        {sp.platform && (
          <input type="hidden" name="platform" value={sp.platform} />
        )}
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-c-surface border border-c-border rounded-xl px-4 py-2.5 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors pe-20"
        />
        <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {q && (
            <Link
              href={clearSearchHref}
              className="text-xs text-c-faint hover:text-c-muted px-2 py-1 transition-colors"
            >
              {t("clearSearch")}
            </Link>
          )}
          <button
            type="submit"
            className="text-xs bg-c-tag text-c-soft px-3 py-1 rounded-lg hover:bg-c-border transition-colors"
          >
            {t("searchButton")}
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
        <span className="ms-auto text-sm text-c-faint">{gameCountText}</span>
      </div>

      {/* Game list */}
      <div className="grid gap-3">
        {typedGames.length === 0 ? (
          <div className="text-center py-16 text-c-muted">
            <p>{t("noGames")}</p>
            <Link
              href="/"
              className="text-indigo-500 text-sm mt-2 inline-block hover:underline"
            >
              {t("clearFilters")}
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
                    <p className="text-xs text-c-faint mt-0.5">
                      {studioSlugMap.has(g.developer.toLowerCase()) ? (
                        <Link
                          href={`/studios/${studioSlugMap.get(g.developer.toLowerCase())}`}
                          className="hover:text-indigo-500 transition-colors"
                        >
                          {g.developer}
                        </Link>
                      ) : (
                        g.developer
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                  }`}
                >
                  {tStatus(g.status as "announced" | "in_dev" | "early_access" | "released" | "cancelled") ?? g.status}
                </span>
              </div>

              <p className="text-sm text-c-muted mt-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {g.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")} · {g.platforms.join(", ")}
                {g.release_date ? ` · ${g.release_date}` : ""}
              </p>

              <p className="text-sm text-c-soft mt-3 leading-relaxed">
                {g.short_description}
              </p>

              <div className="flex gap-1.5 flex-wrap mt-3">
                {g.genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
                {g.gameplay_modes?.map((m) => (
                  <span
                    key={m}
                    className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full"
                  >
                    {m}
                  </span>
                ))}
                {g.monetization?.map((m) => (
                  <span
                    key={m}
                    className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full"
                  >
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
                      {tCommon("website")}
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
      </>)}

      <footer className="mt-12 pt-8 border-t border-c-border flex gap-6 text-sm text-c-faint">
        <Link href="/stats" className="hover:text-c-muted transition-colors">
          {tCommon("stats")}
        </Link>
        <Link href="/admin" className="hover:text-c-muted transition-colors">
          {tCommon("admin")}
        </Link>
      </footer>
    </main>
  );
}
