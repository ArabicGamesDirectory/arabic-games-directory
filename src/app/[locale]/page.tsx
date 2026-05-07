import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";
import TitleCover from "@/components/TitleCover";
import SortSelect from "@/components/SortSelect";
import FilterSelect from "@/components/FilterSelect";
import SubmitMenu from "@/components/SubmitMenu";
import FilterPill from "@/components/FilterPill";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import { GENRE_VALUES, GENRE_I18N_KEYS } from "@/lib/genres";
import { COMMUNITY_TOPIC_VALUES, COMMUNITY_TOPIC_I18N_KEYS } from "@/lib/communityTopics";

const PLATFORM_GROUPS: Record<string, string[]> = {
  PC: ["Windows", "macOS", "Linux"],
  Mobile: ["iOS", "Android"],
};

const GAMES_SORT_VALUES = ["updated_desc", "updated_asc", "released_desc", "released_asc"] as const;
type GamesSort = (typeof GAMES_SORT_VALUES)[number];
const GAMES_DEFAULT_SORT: GamesSort = "released_desc";
const STUDIOS_SORT_VALUES = ["updated_desc", "updated_asc"] as const;
type StudiosSort = (typeof STUDIOS_SORT_VALUES)[number];
const STUDIOS_DEFAULT_SORT: StudiosSort = "updated_desc";
const COMMUNITIES_SORT_VALUES = ["updated_desc", "updated_asc"] as const;
type CommunitiesSort = (typeof COMMUNITIES_SORT_VALUES)[number];
const COMMUNITIES_DEFAULT_SORT: CommunitiesSort = "updated_desc";
const COMMUNITY_TYPES = ["online", "in_person", "hybrid"] as const;
type CommunityType = (typeof COMMUNITY_TYPES)[number];

const PAGE_SIZE = 10;

type Game = {
  name: string;
  developers: string[];
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
  game_studios: { studios: { slug: string; name: string } | null }[] | null;
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
  created_at: string;
  updated_at: string;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
  social_links: Record<string, string | null> | null;
  topics: string[] | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
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
    genre?: string;
    q?: string;
    tab?: string;
    page?: string;
    studiosPage?: string;
    communitiesPage?: string;
    sort?: string;
    studiosSort?: string;
    communitiesSort?: string;
    studioType?: string;
    studioCountry?: string;
    communityType?: string;
    communityTopic?: string;
    communityCountry?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tStatus = await getTranslations("status");
  const tCountries = await getTranslations("countries");
  const tStudio = await getTranslations("studio");
  const tCommunity = await getTranslations("community");
  const tGenres = await getTranslations("genres");

  const sp = await searchParams;
  const tab: "games" | "studios" | "communities" =
    sp.tab === "studios" ? "studios" : sp.tab === "communities" ? "communities" : "games";
  const q = sp.q?.trim() ?? "";

  // Reset to page 1 when filters/search are active
  const gamesPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const studiosPage = Math.max(1, parseInt(sp.studiosPage ?? "1", 10) || 1);
  const communitiesPage = Math.max(1, parseInt(sp.communitiesPage ?? "1", 10) || 1);

  const gamesSort: GamesSort = (GAMES_SORT_VALUES as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as GamesSort)
    : GAMES_DEFAULT_SORT;
  const studiosSort: StudiosSort = (STUDIOS_SORT_VALUES as readonly string[]).includes(sp.studiosSort ?? "")
    ? (sp.studiosSort as StudiosSort)
    : STUDIOS_DEFAULT_SORT;
  const communitiesSort: CommunitiesSort = (COMMUNITIES_SORT_VALUES as readonly string[]).includes(sp.communitiesSort ?? "")
    ? (sp.communitiesSort as CommunitiesSort)
    : COMMUNITIES_DEFAULT_SORT;
  const communityType: CommunityType | null = (COMMUNITY_TYPES as readonly string[]).includes(sp.communityType ?? "")
    ? (sp.communityType as CommunityType)
    : null;

  // Validated filter selections (null = "All")
  const COUNTRY_VALUE_SET = new Set<string>(COUNTRY_OPTIONS as readonly string[]);
  const GENRE_VALUE_SET = new Set<string>(GENRE_VALUES as readonly string[]);
  const TOPIC_VALUE_SET = new Set<string>(COMMUNITY_TOPIC_VALUES as readonly string[]);
  const STUDIO_TYPE_SET = new Set(["individual", "team", "studio"]);

  const gamesCountry = sp.country && COUNTRY_VALUE_SET.has(sp.country) ? sp.country : null;
  const gamesGenre = sp.genre && GENRE_VALUE_SET.has(sp.genre) ? sp.genre : null;
  const studiosType = sp.studioType && STUDIO_TYPE_SET.has(sp.studioType) ? sp.studioType : null;
  const studiosCountry = sp.studioCountry && COUNTRY_VALUE_SET.has(sp.studioCountry) ? sp.studioCountry : null;
  const communitiesCountry = sp.communityCountry && COUNTRY_VALUE_SET.has(sp.communityCountry) ? sp.communityCountry : null;
  const communitiesTopic = sp.communityTopic && TOPIC_VALUE_SET.has(sp.communityTopic) ? sp.communityTopic : null;

  // Build tab URLs that preserve search across tab switches.
  // Per-tab filters (country, genre, type, topic) stay tab-scoped — not carried.
  const gameParams = new URLSearchParams();
  if (q) gameParams.set("q", q);
  const gamesTabHref = gameParams.size > 0 ? `/?${gameParams}` : "/";

  const studioParams = new URLSearchParams({ tab: "studios" });
  if (q) studioParams.set("q", q);
  const studiosTabHref = `/?${studioParams}`;

  const communityParams = new URLSearchParams({ tab: "communities" });
  if (q) communityParams.set("q", q);
  const communitiesTabHref = `/?${communityParams}`;

  // Fetch all studios — used by the Studios tab listing.
  const { data: allStudioData } = await supabase
    .from("studios")
    .select("id, slug, name, type, description, country, website_url, thumbnail_url, created_at, updated_at")
    .order("name");
  const allStudios: Studio[] = (allStudioData as Studio[]) ?? [];

  // --- Studios tab: server-side filtered + paginated ---
  let filteredStudios: Studio[] = allStudios;
  if (tab === "studios") {
    if (q) {
      const ql = q.toLowerCase();
      filteredStudios = filteredStudios.filter(
        (s) =>
          s.name.toLowerCase().includes(ql) ||
          (s.description ?? "").toLowerCase().includes(ql)
      );
    }
    if (studiosType) {
      filteredStudios = filteredStudios.filter((s) => s.type === studiosType);
    }
    if (studiosCountry) {
      filteredStudios = filteredStudios.filter((s) => s.country.includes(studiosCountry));
    }
  }
  // Apply studios sort (in-memory since the studios list is filtered + paginated client-side)
  filteredStudios = [...filteredStudios].sort((a, b) => {
    const cmp = a.updated_at.localeCompare(b.updated_at);
    return studiosSort === "updated_asc" ? cmp : -cmp;
  });
  const studiosTotalCount = filteredStudios.length;
  const studiosTotalPages = Math.max(1, Math.ceil(studiosTotalCount / PAGE_SIZE));
  const studiosPageClamped = Math.min(studiosPage, studiosTotalPages);
  const studiosSlice = filteredStudios.slice(
    (studiosPageClamped - 1) * PAGE_SIZE,
    studiosPageClamped * PAGE_SIZE
  );

  // --- Communities tab: only fetched when needed ---
  let allCommunities: Community[] = [];
  let filteredCommunities: Community[] = [];
  let communitiesTotalCount = 0;
  let communitiesTotalPages = 1;
  let communitiesPageClamped = 1;
  let communitiesSlice: Community[] = [];
  if (tab === "communities") {
    const { data: communityData } = await supabase
      .from("communities")
      .select("id, slug, name, type, description, country, website_url, social_links, topics, thumbnail_url, created_at, updated_at")
      .order("name");
    allCommunities = (communityData as Community[]) ?? [];

    filteredCommunities = allCommunities;
    if (q) {
      const ql = q.toLowerCase();
      filteredCommunities = filteredCommunities.filter(
        (c) =>
          c.name.toLowerCase().includes(ql) ||
          (c.description ?? "").toLowerCase().includes(ql)
      );
    }
    if (communityType) {
      filteredCommunities = filteredCommunities.filter((c) => c.type === communityType);
    }
    if (communitiesTopic) {
      filteredCommunities = filteredCommunities.filter((c) => (c.topics ?? []).includes(communitiesTopic));
    }
    if (communitiesCountry) {
      filteredCommunities = filteredCommunities.filter((c) => c.country.includes(communitiesCountry));
    }
    filteredCommunities = [...filteredCommunities].sort((a, b) => {
      const cmp = a.updated_at.localeCompare(b.updated_at);
      return communitiesSort === "updated_asc" ? cmp : -cmp;
    });
    communitiesTotalCount = filteredCommunities.length;
    communitiesTotalPages = Math.max(1, Math.ceil(communitiesTotalCount / PAGE_SIZE));
    communitiesPageClamped = Math.min(communitiesPage, communitiesTotalPages);
    communitiesSlice = filteredCommunities.slice(
      (communitiesPageClamped - 1) * PAGE_SIZE,
      communitiesPageClamped * PAGE_SIZE
    );
  }

  // --- Games tab: server-side filtered + paginated ---
  let gamesQuery = supabase
    .from("games")
    .select(
      "name, developers, country, platforms, genres, gameplay_modes, game_engine, monetization, status, release_date, website_url, store_links, slug, short_description, thumbnail_url, game_studios(studios(slug, name))",
      { count: "exact" }
    );

  switch (gamesSort) {
    case "updated_desc":
      gamesQuery = gamesQuery.order("updated_at", { ascending: false });
      break;
    case "updated_asc":
      gamesQuery = gamesQuery.order("updated_at", { ascending: true });
      break;
    case "released_asc":
      gamesQuery = gamesQuery.order("release_date", { ascending: true, nullsFirst: false });
      break;
    case "released_desc":
    default:
      gamesQuery = gamesQuery.order("release_date", { ascending: false, nullsFirst: false });
      break;
  }

  if (gamesCountry) gamesQuery = gamesQuery.contains("country", [gamesCountry]);
  if (sp.platform) {
    const group = PLATFORM_GROUPS[sp.platform];
    if (group) {
      gamesQuery = gamesQuery.overlaps("platforms", group);
    } else {
      gamesQuery = gamesQuery.contains("platforms", [sp.platform]);
    }
  }
  if (sp.status) gamesQuery = gamesQuery.eq("status", sp.status);
  if (gamesGenre) gamesQuery = gamesQuery.contains("genres", [gamesGenre]);

  if (q) {
    gamesQuery = gamesQuery.or(
      `name.ilike.%${q}%,short_description.ilike.%${q}%`
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

  const count =
    tab === "studios"
      ? studiosTotalCount
      : tab === "communities"
      ? communitiesTotalCount
      : (gamesTotalCount ?? 0);

  function buildGamesFilterHref(extra: Record<string, string | null>) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (gamesSort !== GAMES_DEFAULT_SORT) p.set("sort", gamesSort);
    if (gamesCountry) p.set("country", gamesCountry);
    if (gamesGenre) p.set("genre", gamesGenre);
    if (sp.platform) p.set("platform", sp.platform);
    if (sp.status) p.set("status", sp.status);
    // `extra` overrides preserved values (null removes a key)
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return p.size > 0 ? `/?${p}` : "/";
  }


  // Clear-search resets q but keeps current filter + sort context for that tab
  const clearSearchHref = (() => {
    if (tab === "studios") {
      const p = new URLSearchParams({ tab: "studios" });
      if (studiosType) p.set("studioType", studiosType);
      if (studiosCountry) p.set("studioCountry", studiosCountry);
      if (studiosSort !== STUDIOS_DEFAULT_SORT) p.set("studiosSort", studiosSort);
      return `/?${p}`;
    }
    if (tab === "communities") {
      const p = new URLSearchParams({ tab: "communities" });
      if (communityType) p.set("communityType", communityType);
      if (communitiesTopic) p.set("communityTopic", communitiesTopic);
      if (communitiesCountry) p.set("communityCountry", communitiesCountry);
      if (communitiesSort !== COMMUNITIES_DEFAULT_SORT) p.set("communitiesSort", communitiesSort);
      return `/?${p}`;
    }
    const p = new URLSearchParams();
    if (sp.platform) p.set("platform", sp.platform);
    if (sp.status) p.set("status", sp.status);
    if (gamesCountry) p.set("country", gamesCountry);
    if (gamesGenre) p.set("genre", gamesGenre);
    if (gamesSort !== GAMES_DEFAULT_SORT) p.set("sort", gamesSort);
    return p.size > 0 ? `/?${p}` : "/";
  })();

  const gameCountText =
    count === 1
      ? t("gameCountSingular", { count })
      : t("gameCountPlural", { count });

  const studioCountText =
    count === 1
      ? t("studioCountSingular", { count })
      : t("studioCountPlural", { count });

  const communityCountText =
    count === 1
      ? t("communityCountSingular", { count })
      : t("communityCountPlural", { count });

  const TYPE_LABELS: Record<string, string> = {
    individual: tStudio("typeIndividual"),
    team: tStudio("typeTeam"),
    studio: tStudio("typeStudio"),
  };

  const COMMUNITY_TYPE_LABELS: Record<string, string> = {
    online: tCommunity("typeOnline"),
    in_person: tCommunity("typeInPerson"),
    hybrid: tCommunity("typeHybrid"),
  };

  // Build pagination href helpers
  function gamesPaginationHref(page: number) {
    const p = new URLSearchParams();
    if (sp.platform) p.set("platform", sp.platform);
    if (sp.status) p.set("status", sp.status);
    if (gamesCountry) p.set("country", gamesCountry);
    if (gamesGenre) p.set("genre", gamesGenre);
    if (q) p.set("q", q);
    if (gamesSort !== GAMES_DEFAULT_SORT) p.set("sort", gamesSort);
    if (page > 1) p.set("page", String(page));
    return p.size > 0 ? `/?${p}` : "/";
  }

  function studiosPaginationHref(page: number) {
    const p = new URLSearchParams({ tab: "studios" });
    if (q) p.set("q", q);
    if (studiosType) p.set("studioType", studiosType);
    if (studiosCountry) p.set("studioCountry", studiosCountry);
    if (studiosSort !== STUDIOS_DEFAULT_SORT) p.set("studiosSort", studiosSort);
    if (page > 1) p.set("studiosPage", String(page));
    return `/?${p}`;
  }

  function communitiesPaginationHref(page: number) {
    const p = new URLSearchParams({ tab: "communities" });
    if (q) p.set("q", q);
    if (communityType) p.set("communityType", communityType);
    if (communitiesTopic) p.set("communityTopic", communitiesTopic);
    if (communitiesCountry) p.set("communityCountry", communitiesCountry);
    if (communitiesSort !== COMMUNITIES_DEFAULT_SORT) p.set("communitiesSort", communitiesSort);
    if (page > 1) p.set("communitiesPage", String(page));
    return `/?${p}`;
  }

  function buildCommunitiesFilterHref(extra: Record<string, string | null>) {
    const p = new URLSearchParams({ tab: "communities" });
    if (q) p.set("q", q);
    if (communitiesSort !== COMMUNITIES_DEFAULT_SORT) p.set("communitiesSort", communitiesSort);
    if (communityType) p.set("communityType", communityType);
    if (communitiesTopic) p.set("communityTopic", communitiesTopic);
    if (communitiesCountry) p.set("communityCountry", communitiesCountry);
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/?${p}`;
  }

  function buildStudiosFilterHref(extra: Record<string, string | null>) {
    const p = new URLSearchParams({ tab: "studios" });
    if (q) p.set("q", q);
    if (studiosSort !== STUDIOS_DEFAULT_SORT) p.set("studiosSort", studiosSort);
    if (studiosType) p.set("studioType", studiosType);
    if (studiosCountry) p.set("studioCountry", studiosCountry);
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/?${p}`;
  }


  const STUDIO_TYPE_LABELS: Record<string, string> = {
    individual: tStudio("typeIndividual"),
    team: tStudio("typeTeam"),
    studio: tStudio("typeStudio"),
  };

  // Translated dropdown options
  const countryOptions = (COUNTRY_OPTIONS as readonly string[]).map((value) => ({
    value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label: (tCountries(COUNTRY_KEY_MAP[value] as any) as string) ?? value,
  }));

  const genreOptions = GENRE_VALUES.map((value) => ({
    value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label: (tGenres(GENRE_I18N_KEYS[value] as any) as string) ?? value,
  }));

  // Translated label helpers for active-filter chips
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countryLabel = (c: string) => (tCountries(COUNTRY_KEY_MAP[c] as any) as string) ?? c;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genreLabel = (g: string) => (tGenres(GENRE_I18N_KEYS[g] as any) as string) ?? g;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusLabel = (s: string) => (tStatus(s as any) as string) ?? s;

  // Dropdown option lists for pill→dropdown conversions
  const platformOptions = [
    { value: "PC", label: t("filterPC") },
    { value: "Mobile", label: t("filterMobile") },
  ];
  const STATUS_VALUES = [
    "announced", "in_dev", "prototype", "early_access", "released", "on_hold", "cancelled", "delisted",
  ];
  const statusOptions = STATUS_VALUES.map((s) => ({ value: s, label: statusLabel(s) }));
  const studioTypeOptions = [
    { value: "individual", label: tStudio("typeIndividual") },
    { value: "team", label: tStudio("typeTeam") },
    { value: "studio", label: tStudio("typeStudio") },
  ];
  const communityTypeOptions = (COMMUNITY_TYPES as readonly string[]).map((v) => ({
    value: v,
    label: COMMUNITY_TYPE_LABELS[v] ?? v,
  }));
  const communityTopicOptions = COMMUNITY_TOPIC_VALUES.map((v) => ({
    value: v,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label: (tCommunity(COMMUNITY_TOPIC_I18N_KEYS[v] as any) as string) ?? v,
  }));

  // Active-filter chips per tab — { label, removeHref } each
  const gamesChips: { label: string; removeHref: string }[] = [];
  if (sp.platform) gamesChips.push({ label: sp.platform, removeHref: buildGamesFilterHref({ platform: null }) });
  if (sp.status) gamesChips.push({ label: statusLabel(sp.status), removeHref: buildGamesFilterHref({ status: null }) });
  if (gamesCountry) gamesChips.push({ label: countryLabel(gamesCountry), removeHref: buildGamesFilterHref({ country: null }) });
  if (gamesGenre) gamesChips.push({ label: genreLabel(gamesGenre), removeHref: buildGamesFilterHref({ genre: null }) });

  const studiosChips: { label: string; removeHref: string }[] = [];
  if (studiosType) studiosChips.push({ label: STUDIO_TYPE_LABELS[studiosType] ?? studiosType, removeHref: buildStudiosFilterHref({ studioType: null }) });
  if (studiosCountry) studiosChips.push({ label: countryLabel(studiosCountry), removeHref: buildStudiosFilterHref({ studioCountry: null }) });

  const communitiesChips: { label: string; removeHref: string }[] = [];
  if (communityType) communitiesChips.push({ label: COMMUNITY_TYPE_LABELS[communityType] ?? communityType, removeHref: buildCommunitiesFilterHref({ communityType: null }) });
  if (communitiesTopic) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    communitiesChips.push({ label: (tCommunity(COMMUNITY_TOPIC_I18N_KEYS[communitiesTopic] as any) as string) ?? communitiesTopic, removeHref: buildCommunitiesFilterHref({ communityTopic: null }) });
  }
  if (communitiesCountry) communitiesChips.push({ label: countryLabel(communitiesCountry), removeHref: buildCommunitiesFilterHref({ communityCountry: null }) });


  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-c-text">
              <Link href="/" className="hover:text-indigo-500 transition-colors">
                {t("title")}
              </Link>
            </h1>
            <p className="text-c-muted mt-1 text-sm">{t("description")}</p>
          </div>
          <div className="shrink-0">
            <SubmitMenu
              buttonLabel={tCommon("submit")}
              gameLabel={tCommon("submitGame")}
              communityLabel={tCommon("submitCommunity")}
            />
          </div>
        </div>
      </header>

      {/* Tab switcher + Stats link */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
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
          <Link
            href={communitiesTabHref}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "communities" ? "bg-c-bg text-c-text shadow-sm" : "text-c-muted hover:text-c-text"
            }`}
          >
            {t("tabCommunities")}
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
            {studiosType && <input type="hidden" name="studioType" value={studiosType} />}
            {studiosCountry && <input type="hidden" name="studioCountry" value={studiosCountry} />}
            {studiosSort !== STUDIOS_DEFAULT_SORT && (
              <input type="hidden" name="studiosSort" value={studiosSort} />
            )}
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

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <FilterSelect
              paramName="studioType"
              pageParamName="studiosPage"
              current={studiosType ?? ""}
              defaultLabel={t("filterAllTypes")}
              options={studioTypeOptions}
            />
            <FilterSelect
              paramName="studioCountry"
              pageParamName="studiosPage"
              current={studiosCountry ?? ""}
              defaultLabel={t("filterAllCountries")}
              options={countryOptions}
            />
          </div>

          {studiosChips.length > 0 && <ActiveFilterChips chips={studiosChips} />}

          <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
            <SortSelect
              paramName="studiosSort"
              pageParamName="studiosPage"
              current={studiosSort}
              label={t("sortLabel")}
              options={[
                { value: "updated_desc", label: t("sortRecentlyUpdated") },
                { value: "updated_asc", label: t("sortLeastRecentlyUpdated") },
              ]}
            />
            <p className="text-sm text-c-faint">{studioCountText}</p>
          </div>
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
                        className="w-full sm:w-[230px] shrink-0 object-cover rounded-s-lg self-stretch"
                      />
                    ) : (
                      <TitleCover
                        name={s.name}
                        seed={s.slug}
                        className="w-full sm:w-[230px] shrink-0 self-stretch aspect-[460/215] sm:aspect-auto rounded-s-lg"
                      />
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

      {/* Communities tab */}
      {tab === "communities" && (
        <>
          {/* Communities search */}
          <form method="get" action="" className="relative mb-4">
            <input type="hidden" name="tab" value="communities" />
            {communityType && (
              <input type="hidden" name="communityType" value={communityType} />
            )}
            {communitiesTopic && (
              <input type="hidden" name="communityTopic" value={communitiesTopic} />
            )}
            {communitiesCountry && (
              <input type="hidden" name="communityCountry" value={communitiesCountry} />
            )}
            {communitiesSort !== COMMUNITIES_DEFAULT_SORT && (
              <input type="hidden" name="communitiesSort" value={communitiesSort} />
            )}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={tCommunity("searchPlaceholder")}
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

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <FilterSelect
              paramName="communityType"
              pageParamName="communitiesPage"
              current={communityType ?? ""}
              defaultLabel={t("filterAllTypes")}
              options={communityTypeOptions}
            />
            <FilterSelect
              paramName="communityTopic"
              pageParamName="communitiesPage"
              current={communitiesTopic ?? ""}
              defaultLabel={t("filterAllTopics")}
              options={communityTopicOptions}
            />
            <FilterSelect
              paramName="communityCountry"
              pageParamName="communitiesPage"
              current={communitiesCountry ?? ""}
              defaultLabel={t("filterAllCountries")}
              options={countryOptions}
            />
          </div>

          {communitiesChips.length > 0 && <ActiveFilterChips chips={communitiesChips} />}

          {/* Sort + count */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
            <SortSelect
              paramName="communitiesSort"
              pageParamName="communitiesPage"
              current={communitiesSort}
              label={t("sortLabel")}
              options={[
                { value: "updated_desc", label: t("sortRecentlyUpdated") },
                { value: "updated_asc", label: t("sortLeastRecentlyUpdated") },
              ]}
            />
            <p className="text-sm text-c-faint">{communityCountText}</p>
          </div>

          <div className="grid gap-3">
            {allCommunities.length === 0 && !communityType && !q ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-c-muted font-medium">{tCommunity("noCommunities")}</p>
                <p className="text-c-faint text-sm mt-1">{tCommunity("noCommunitiesHint")}</p>
                <Link
                  href="/submit-community"
                  className="text-indigo-500 text-sm mt-3 inline-block hover:underline"
                >
                  {tCommon("submitCommunity")}
                </Link>
              </div>
            ) : filteredCommunities.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-c-muted font-medium">{tCommunity("noCommunitiesFound")}</p>
                <p className="text-c-faint text-sm mt-1">{t("noGamesHint")}</p>
                <Link
                  href="/?tab=communities"
                  className="text-indigo-500 text-sm mt-3 inline-block hover:underline"
                >
                  {t("clearFilters")}
                </Link>
              </div>
            ) : (
              communitiesSlice.map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/communities/${c.slug}`}
                  className="block bg-c-surface border border-c-border rounded-xl overflow-hidden hover:border-c-border-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={t("thumbnailAlt", { name: c.name })}
                        width={230}
                        height={108}
                        loading={i === 0 && communitiesPageClamped === 1 ? "eager" : "lazy"}
                        decoding="async"
                        className="w-full sm:w-[230px] shrink-0 object-cover rounded-s-lg self-stretch"
                      />
                    ) : (
                      <TitleCover
                        name={c.name}
                        seed={c.slug}
                        className="w-full sm:w-[230px] shrink-0 self-stretch aspect-[460/215] sm:aspect-auto rounded-s-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-c-text leading-snug">
                          {c.name}
                        </h2>
                        <span className="shrink-0 text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                          {COMMUNITY_TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </div>
                      <p className="text-xs text-c-muted mt-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {c.country.map((co) => tCountries(COUNTRY_KEY_MAP[co] as any) ?? co).join(", ")}
                      </p>
                      {c.description && (
                        <p className="text-sm text-c-soft mt-2 leading-relaxed line-clamp-2" dir="auto">{c.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Communities pagination */}
          {communitiesTotalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 mt-8">
              {communitiesPageClamped > 1 ? (
                <Link
                  href={communitiesPaginationHref(communitiesPageClamped - 1)}
                  className="text-sm text-indigo-500 hover:underline"
                >
                  {t("paginationPrev")}
                </Link>
              ) : (
                <span className="text-sm text-c-faint">{t("paginationPrev")}</span>
              )}
              <span className="text-sm text-c-muted">
                {t("paginationPage", { current: communitiesPageClamped, total: communitiesTotalPages })}
              </span>
              {communitiesPageClamped < communitiesTotalPages ? (
                <Link
                  href={communitiesPaginationHref(communitiesPageClamped + 1)}
                  className="text-sm text-indigo-500 hover:underline"
                >
                  {t("paginationNext")}
                </Link>
              ) : (
                <span className="text-sm text-c-faint">{t("paginationNext")}</span>
              )}
            </nav>
          )}
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
        {gamesCountry && <input type="hidden" name="country" value={gamesCountry} />}
        {gamesGenre && <input type="hidden" name="genre" value={gamesGenre} />}
        {gamesSort !== GAMES_DEFAULT_SORT && (
          <input type="hidden" name="sort" value={gamesSort} />
        )}
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

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <FilterSelect
          paramName="platform"
          pageParamName="page"
          current={sp.platform ?? ""}
          defaultLabel={t("filterAllPlatforms")}
          options={platformOptions}
        />
        <FilterSelect
          paramName="status"
          pageParamName="page"
          current={sp.status ?? ""}
          defaultLabel={t("filterAllStatuses")}
          options={statusOptions}
        />
        <FilterSelect
          paramName="country"
          pageParamName="page"
          current={gamesCountry ?? ""}
          defaultLabel={t("filterAllCountries")}
          options={countryOptions}
        />
        <FilterSelect
          paramName="genre"
          pageParamName="page"
          current={gamesGenre ?? ""}
          defaultLabel={t("filterAllGenres")}
          options={genreOptions}
        />
      </div>

      {/* Active filter chips */}
      {gamesChips.length > 0 && <ActiveFilterChips chips={gamesChips} />}

      {/* Sort + count */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
        <SortSelect
          paramName="sort"
          pageParamName="page"
          current={gamesSort}
          label={t("sortLabel")}
          options={[
            { value: "updated_desc", label: t("sortRecentlyUpdated") },
            { value: "updated_asc", label: t("sortLeastRecentlyUpdated") },
            { value: "released_desc", label: t("sortReleaseDateNewest") },
            { value: "released_asc", label: t("sortReleaseDateOldest") },
          ]}
        />
        <span className="text-sm text-c-faint">{gameCountText}</span>
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
                      <h2 className="text-base font-semibold text-c-text leading-snug">
                        <Link
                          href={`/games/${g.slug}`}
                          className="hover:text-indigo-500 transition-colors"
                        >
                          {g.name}
                        </Link>
                      </h2>
                      {g.developers.length > 0 && (
                        <p className="text-xs text-c-faint mt-0.5">
                          {g.developers.map((dev, i) => {
                            const link = (g.game_studios ?? []).find(
                              (gs) => gs.studios?.name?.toLowerCase() === dev.toLowerCase()
                            );
                            return (
                              <span key={dev}>
                                {i > 0 && ", "}
                                {link?.studios?.slug ? (
                                  <Link
                                    href={`/studios/${link.studios.slug}`}
                                    className="hover:text-indigo-500 transition-colors"
                                  >
                                    {dev}
                                  </Link>
                                ) : (
                                  dev
                                )}
                              </span>
                            );
                          })}
                        </p>
                      )}
                    </div>
                    <FilterPill
                      param="status"
                      value={g.status}
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                      }`}
                    >
                      {tStatus(g.status as "announced" | "in_dev" | "prototype" | "early_access" | "released" | "on_hold" | "cancelled" | "delisted") ?? g.status}
                    </FilterPill>
                  </div>

                  <p className="text-xs text-c-muted mt-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {g.country.map((c) => tCountries(COUNTRY_KEY_MAP[c] as any) ?? c).join(", ")} · {g.platforms.join(", ")}
                    {g.release_date && statusAllowsReleaseDate(g.status) ? ` · ${g.release_date}` : ""}
                  </p>

                  {(() => {
                    // `kind: "genre"` tags become FilterPill links (clicking
                    // filters the homepage); the rest are plain visual spans
                    // since there's no equivalent homepage filter for them.
                    type TagItem = { v: string; cls: string; kind: "genre" | "plain" };
                    const allTags: TagItem[] = [
                      ...g.genres.map((v): TagItem => ({ v, cls: "bg-c-tag text-c-tag-text", kind: "genre" })),
                      ...(g.gameplay_modes ?? []).map((v): TagItem => ({ v, cls: "bg-blue-500/10 text-blue-500", kind: "plain" })),
                      ...(g.monetization ?? []).map((v): TagItem => ({ v, cls: "bg-amber-500/10 text-amber-500", kind: "plain" })),
                      ...(g.game_engine ? [{ v: g.game_engine, cls: "bg-c-tag text-c-faint", kind: "plain" as const }] : []),
                    ];
                    const visible = allTags.slice(0, 5);
                    const extra = allTags.length - visible.length;
                    return (
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {visible.map(({ v, cls, kind }) =>
                          kind === "genre" ? (
                            <FilterPill
                              key={v}
                              param="genre"
                              value={v}
                              className={`text-xs px-2 py-0.5 rounded-full ${cls}`}
                            >
                              {v}
                            </FilterPill>
                          ) : (
                            <span key={v} className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{v}</span>
                          )
                        )}
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

function ActiveFilterChips({ chips }: { chips: { label: string; removeHref: string }[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-3">
      {chips.map((c) => (
        <Link
          key={c.label + c.removeHref}
          href={c.removeHref}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/15 transition-colors"
        >
          <span>{c.label}</span>
          <span aria-hidden className="text-sm leading-none">×</span>
        </Link>
      ))}
    </div>
  );
}
