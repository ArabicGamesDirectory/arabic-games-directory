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
  announced: "bg-blue-500/15 text-blue-500",
  in_dev: "bg-amber-500/15 text-amber-500",
  prototype: "bg-cyan-500/15 text-cyan-500",
  early_access: "bg-purple-500/15 text-purple-500",
  released: "bg-emerald-500/15 text-emerald-500",
  on_hold: "bg-orange-500/15 text-orange-500",
  cancelled: "bg-c-tag text-c-muted",
  delisted: "bg-c-tag text-c-muted",
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

  // Build tab URLs that preserve current filter/search state (#10)
  const gameParams = new URLSearchParams();
  if (sp.platform) gameParams.set("platform", sp.platform);
  if (sp.status) gameParams.set("status", sp.status);
  if (q) gameParams.set("q", q);
  const gamesTabHref = gameParams.size > 0 ? `/?${gameParams}` : "/";

  const studioParams = new URLSearchParams({ tab: "studios" });
  if (sp.platform) studioParams.set("platform", sp.platform);
  if (sp.status) studioParams.set("status", sp.status);
  if (q) studioParams.set("q", q);
  const studiosTabHref = `/?${studioParams}`;

  // Always fetch studios: used for the Studios tab AND to make developer names clickable on game cards.
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, slug, name, type, description, country, website_url")
    .order("name");
  const studios: Studio[] = (studioData as Studio[]) ?? [];

  // Filter studios by search query when on studios tab (client-side on already-fetched data)
  const filteredStudios =
    q && tab === "studios"
      ? studios.filter(
          (s) =>
            s.name.toLowerCase().includes(q.toLowerCase()) ||
            (s.description ?? "").toLowerCase().includes(q.toLowerCase())
        )
      : studios;

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
  const count = tab === "studios" ? filteredStudios.length : typedGames.length;

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

  const clearSearchHref =
    tab === "studios"
      ? "/?tab=studios"
      : sp.platform
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

      {/* Tab switcher + Stats link (#9, #10) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-c-surface border border-c-border rounded-lg p-1">
          <Link
            href={gamesTabHref}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "games" ? "bg-c-bg text-c-text shadow-sm" : "text-c-muted hover:text-c-text"
            }`}
          >
            {t("tabGames")}
          </Link>
          <Link
            href={studiosTabHref}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "studios" ? "bg-c-bg text-c-text shadow-sm" : "text-c-muted hover:text-c-text"
            }`}
          >
            {t("tabStudios")}
          </Link>
        </div>
        <Link
          href="/stats"
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {tCommon("stats")} →
        </Link>
      </div>

      {/* Studios tab */}
      {tab === "studios" && (
        <>
          {/* Studios search */}
          <form method="get" action="" className="relative mb-4">
            <input type="hidden" name="tab" value="studios" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("searchStudiosPlaceholder")}
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

          <p className="text-sm text-c-faint mb-6">{studioCountText}</p>
          <div className="grid gap-3">
            {studios.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🏢</p>
                <p className="text-c-muted font-medium">{t("noStudios")}</p>
                <p className="text-c-faint text-sm mt-1">{t("noStudiosHint")}</p>
              </div>
            ) : filteredStudios.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-c-muted font-medium">{t("noStudiosFound")}</p>
                <p className="text-c-faint text-sm mt-1">{t("noGamesHint")}</p>
                <Link
                  href="/?tab=studios"
                  className="text-indigo-500 text-sm mt-3 inline-block hover:underline"
                >
                  {t("clearFilters")}
                </Link>
              </div>
            ) : (
              filteredStudios.map((s) => (
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
                    <p className="text-sm text-c-soft mt-3 leading-relaxed" dir="auto">{s.description}</p>
                  )}
                  {s.website_url && (
                    <p className="text-sm text-indigo-500 mt-2">{tStudio("websiteLabel")}</p>
                  )}
                </Link>
              ))
            )}
          </div>
          {/* CTA hint (#14) */}
          <p className="text-xs text-c-faint text-center mt-6 px-4">
            {t("studiosCta")}
          </p>
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
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-c-muted font-medium">{t("noGames")}</p>
            <p className="text-c-faint text-sm mt-1">{t("noGamesHint")}</p>
            <Link
              href="/"
              className="text-indigo-500 text-sm mt-3 inline-block hover:underline"
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
                  {tStatus(g.status as "announced" | "in_dev" | "prototype" | "early_access" | "released" | "on_hold" | "cancelled" | "delisted") ?? g.status}
                </span>
              </div>

              <p className="text-sm text-c-muted mt-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {g.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")} · {g.platforms.join(", ")}
                {g.release_date ? ` · ${g.release_date}` : ""}
              </p>

              <p className="text-sm text-c-soft mt-3 leading-relaxed line-clamp-3" dir="auto">
                {g.short_description}
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
                  <div className="flex gap-1.5 flex-wrap mt-3">
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

              {(g.website_url ||
                Object.values(g.store_links ?? {}).some(Boolean)) && (
                <div className="flex items-center gap-3 flex-wrap mt-4 pt-4 border-t border-c-border">
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
                  {(() => {
                    const storeNames = Object.entries(g.store_links ?? {})
                      .filter(([, val]) => typeof val === "string" && val)
                      .map(([key]) => key);
                    if (storeNames.length === 0) return null;
                    const shown = storeNames.slice(0, 2);
                    const extra = storeNames.length - shown.length;
                    return (
                      <Link
                        href={`/games/${g.slug}`}
                        className="text-sm text-c-faint hover:text-c-muted transition-colors"
                      >
                        {shown.join(" · ")}{extra > 0 ? ` +${extra}` : ""}
                      </Link>
                    );
                  })()}
                </div>
              )}
            </article>
          ))
        )}
      </div>
      </>)}

      <footer className="mt-12 pt-8 border-t border-c-border flex gap-6 text-sm text-c-faint">
        <Link href="/admin" className="hover:text-c-muted transition-colors">
          {tCommon("admin")}
        </Link>
      </footer>
    </main>
  );
}
