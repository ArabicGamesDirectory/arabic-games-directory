import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";

const PAGE_SIZE = 10;

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
  thumbnail_url: string | null;
  studios: { slug: string } | null;
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
  thumbnail_url: string | null;
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
    page?: string;
    studiosPage?: string;
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

  // Reset to page 1 when filters/search are active
  const gamesPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const studiosPage = Math.max(1, parseInt(sp.studiosPage ?? "1", 10) || 1);

  // Build tab URLs that preserve current filter/search state
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

  // Always fetch all studios for the studioSlugMap (needed for developer name linking on game cards)
  const { data: allStudioData } = await supabase
    .from("studios")
    .select("id, slug, name, type, description, country, website_url, thumbnail_url")
    .order("name");
  const allStudios: Studio[] = (allStudioData as Studio[]) ?? [];

  // --- Studios tab: server-side filtered + paginated ---
  let filteredStudios: Studio[] = allStudios;
  if (q && tab === "studios") {
    const ql = q.toLowerCase();
    filteredStudios = allStudios.filter(
      (s) =>
        s.name.toLowerCase().includes(ql) ||
        (s.description ?? "").toLowerCase().includes(ql)
    );
  }
  const studiosTotalCount = filteredStudios.length;
  const studiosTotalPages = Math.max(1, Math.ceil(studiosTotalCount / PAGE_SIZE));
  const studiosPageClamped = Math.min(studiosPage, studiosTotalPages);
  const studiosSlice = filteredStudios.slice(
    (studiosPageClamped - 1) * PAGE_SIZE,
    studiosPageClamped * PAGE_SIZE
  );

  // --- Games tab: server-side filtered + paginated ---
  let gamesQuery = supabase
    .from("games")
    .select(
      "name, developer, country, platforms, genres, gameplay_modes, game_engine, monetization, status, release_date, website_url, store_links, slug, short_description, thumbnail_url, studios(slug)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (sp.country) gamesQuery = gamesQuery.contains("country", [sp.country]);
  if (sp.platform) gamesQuery = gamesQuery.contains("platforms", [sp.platform]);
  if (sp.status) gamesQuery = gamesQuery.eq("status", sp.status);

  if (q) {
    gamesQuery = gamesQuery.or(
      `name.ilike.%${q}%,developer.ilike.%${q}%,genres.cs.{${q}}`
    );
  }

  // Paginate
  const gamesFrom = (gamesPage - 1) * PAGE_SIZE;
  gamesQuery = gamesQuery.range(gamesFrom, gamesFrom + PAGE_SIZE - 1);

  const { data: games, error, count: gamesTotalCount } = await gamesQuery;

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </main>
    );
  }

  const typedGames: Game[] = (games as unknown as Game[]) ?? [];
  const gamesTotalPages = Math.max(1, Math.ceil((gamesTotalCount ?? 0) / PAGE_SIZE));
  const gamesPageClamped = Math.min(gamesPage, gamesTotalPages);

  const count = tab === "studios" ? studiosTotalCount : (gamesTotalCount ?? 0);

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

  // Build pagination href helpers
  function gamesPaginationHref(page: number) {
    const p = new URLSearchParams();
    if (sp.platform) p.set("platform", sp.platform);
    if (sp.status) p.set("status", sp.status);
    if (q) p.set("q", q);
    if (page > 1) p.set("page", String(page));
    return p.size > 0 ? `/?${p}` : "/";
  }

  function studiosPaginationHref(page: number) {
    const p = new URLSearchParams({ tab: "studios" });
    if (q) p.set("q", q);
    if (page > 1) p.set("studiosPage", String(page));
    return `/?${p}`;
  }

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

      {/* Tab switcher + Stats link */}
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
            {allStudios.length === 0 ? (
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
              studiosSlice.map((s, i) => (
                <Link
                  key={s.slug}
                  href={`/studios/${s.slug}`}
                  className="block bg-c-surface border border-c-border rounded-xl overflow-hidden hover:border-c-border-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start">
                    {/* Thumbnail */}
                    {s.thumbnail_url ? (
                      <img
                        src={s.thumbnail_url}
                        alt={t("thumbnailAlt", { name: s.name })}
                        width={230}
                        height={108}
                        loading={i === 0 && studiosPageClamped === 1 ? "eager" : "lazy"}
                        decoding="async"
                        className="w-full sm:w-[230px] shrink-0 h-[108px] object-cover rounded-s-lg self-stretch sm:self-center"
                      />
                    ) : (
                      <div className="w-full sm:w-[230px] shrink-0 h-[108px] bg-c-surface flex items-center justify-center rounded-s-lg self-stretch sm:self-center">
                        <span className="text-3xl text-c-faint">🏢</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-c-text leading-snug">
                          {s.name}
                        </h2>
                        <span className="shrink-0 text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[s.type] ?? s.type}
                        </span>
                      </div>
                      <p className="text-xs text-c-muted mt-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {s.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")}
                        {s.website_url && ` · ${tStudio("websiteLabel")}`}
                      </p>
                      {s.description && (
                        <p className="text-sm text-c-soft mt-2 leading-relaxed line-clamp-2" dir="auto">{s.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Studios pagination */}
          {studiosTotalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 mt-8">
              {studiosPageClamped > 1 ? (
                <Link
                  href={studiosPaginationHref(studiosPageClamped - 1)}
                  className="text-sm text-indigo-500 hover:underline"
                >
                  {t("paginationPrev")}
                </Link>
              ) : (
                <span className="text-sm text-c-faint">{t("paginationPrev")}</span>
              )}
              <span className="text-sm text-c-muted">
                {t("paginationPage", { current: studiosPageClamped, total: studiosTotalPages })}
              </span>
              {studiosPageClamped < studiosTotalPages ? (
                <Link
                  href={studiosPaginationHref(studiosPageClamped + 1)}
                  className="text-sm text-indigo-500 hover:underline"
                >
                  {t("paginationNext")}
                </Link>
              ) : (
                <span className="text-sm text-c-faint">{t("paginationNext")}</span>
              )}
            </nav>
          )}

          {/* CTA hint */}
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
          typedGames.map((g, i) => (
            <article
              key={g.slug}
              className="bg-c-surface border border-c-border rounded-xl overflow-hidden hover:border-c-border-hover transition-colors"
            >
              <div className="flex flex-col sm:flex-row items-start">
                {/* Thumbnail */}
                {g.thumbnail_url ? (
                  <img
                    src={g.thumbnail_url}
                    alt={t("thumbnailAlt", { name: g.name })}
                    width={230}
                    height={108}
                    loading={i === 0 && gamesPageClamped === 1 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full sm:w-[230px] shrink-0 h-[108px] object-cover self-start"
                  />
                ) : (
                  <div className="w-full sm:w-[230px] shrink-0 h-[108px] bg-c-surface flex items-center justify-center self-start">
                    <span className="text-3xl text-c-faint">🎮</span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-c-text leading-snug">
                        <Link
                          href={`/games/${g.slug}`}
                          className="hover:text-indigo-500 transition-colors"
                        >
                          {g.name}
                        </Link>
                      </h2>
                      {g.developer && (
                        <p className="text-xs text-c-faint mt-0.5">
                          {g.studios?.slug ? (
                            <Link
                              href={`/studios/${g.studios.slug}`}
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
          ))
        )}
      </div>

      {/* Games pagination */}
      {gamesTotalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 mt-8">
          {gamesPageClamped > 1 ? (
            <Link
              href={gamesPaginationHref(gamesPageClamped - 1)}
              className="text-sm text-indigo-500 hover:underline"
            >
              {t("paginationPrev")}
            </Link>
          ) : (
            <span className="text-sm text-c-faint">{t("paginationPrev")}</span>
          )}
          <span className="text-sm text-c-muted">
            {t("paginationPage", { current: gamesPageClamped, total: gamesTotalPages })}
          </span>
          {gamesPageClamped < gamesTotalPages ? (
            <Link
              href={gamesPaginationHref(gamesPageClamped + 1)}
              className="text-sm text-indigo-500 hover:underline"
            >
              {t("paginationNext")}
            </Link>
          ) : (
            <span className="text-sm text-c-faint">{t("paginationNext")}</span>
          )}
        </nav>
      )}
      </>)}

    </main>
  );
}
