import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import FilterPill from "@/components/FilterPill";
import TitleCover from "@/components/TitleCover";
import { formatDate } from "@/lib/formatDate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("games")
    .select("name, short_description, thumbnail_url")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Game not found" };
  const title = data.name as string;
  const description = (data.short_description as string | null) ?? undefined;
  const image = (data.thumbnail_url as string | null) ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

type Game = {
  id: string;
  slug: string;
  name: string;
  developers: string[];
  country: string[];
  platforms: string[];
  genres: string[];
  gameplay_modes: string[] | null;
  game_engine: string | null;
  monetization: string[] | null;
  short_description: string;
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
  publishing_type: string | null;
  publisher_name: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
  updated_at: string | null;
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

export default async function GameDetails({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("gameDetail");
  const tCommon = await getTranslations("common");
  const tStatus = await getTranslations("status");
  const tCountries = await getTranslations("countries");

  const { data, error } = await supabase
    .from("games")
    .select("*, game_studios(studios(slug, name))")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {tCommon("backToDirectory")}
        </Link>
        <p className="mt-8 text-c-muted">{t("notFound")}</p>
      </main>
    );
  }

  const game = data as unknown as Game;

  // Related games — two parallel queries:
  //   1) "More from this developer" — uses the FIRST developer name (covers
  //      the common case; multi-dev collabs still link via the same primary).
  //   2) "Similar games" — shares the first genre AND overlaps on country,
  //      excluding the current row and anything already in the dev set.
  // Both capped at 4. Sections are independent — either may render alone.
  const primaryDev = game.developers?.[0];
  const primaryGenre = game.genres?.[0];
  const [{ data: moreFromDevData }, { data: similarData }] = await Promise.all([
    primaryDev
      ? supabase
          .from("games")
          .select("slug, name, status, thumbnail_url")
          .contains("developers", [primaryDev])
          .neq("id", game.id)
          .order("updated_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as { slug: string; name: string; status: string; thumbnail_url: string | null }[] }),
    primaryGenre && game.country.length > 0
      ? supabase
          .from("games")
          .select("slug, name, status, thumbnail_url")
          .contains("genres", [primaryGenre])
          .overlaps("country", game.country)
          .neq("id", game.id)
          .order("updated_at", { ascending: false })
          .limit(8) // fetch more so we can dedupe and still have ~4
      : Promise.resolve({ data: [] as { slug: string; name: string; status: string; thumbnail_url: string | null }[] }),
  ]);

  type RelatedGame = { slug: string; name: string; status: string; thumbnail_url: string | null };
  const moreFromDev: RelatedGame[] = (moreFromDevData ?? []) as RelatedGame[];
  const devSlugs = new Set(moreFromDev.map((g) => g.slug));
  const similarGames: RelatedGame[] = ((similarData ?? []) as RelatedGame[])
    .filter((g) => !devSlugs.has(g.slug))
    .slice(0, 4);

  const storeLinks = game.store_links
    ? Object.entries(game.store_links).filter(
        ([, val]) => typeof val === "string" && val
      )
    : [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Top nav row */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {tCommon("backToDirectory")}
        </Link>
        <Link
          href={`/update/${game.slug}`}
          className="text-sm text-c-muted hover:text-c-text border border-c-border hover:border-c-border-hover px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("suggestUpdate")}
        </Link>
      </div>

      {/* Hero block */}
      <div className="mt-8">
        {game.thumbnail_url && (
          <img
            src={game.thumbnail_url}
            alt={game.name}
            width={460}
            height={215}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[460/215] object-cover rounded-xl mb-6"
          />
        )}

        {/* Title row */}
        <h1 className="text-3xl font-bold text-c-text">
          {game.name}
        </h1>

        {game.developers.length > 0 && (
          <p className="text-sm text-c-muted mt-1">
            {game.developers.map((dev, i) => {
              const link = (game.game_studios ?? []).find(
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

        {/* Status + meta pills — each one (except release date) links to the
            homepage filtered by that dimension. */}
        <div className="flex gap-2 flex-wrap mt-3">
          <FilterPill
            param="status"
            value={game.status}
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              STATUS_CLASSES[game.status] ?? "bg-c-tag text-c-muted"
            }`}
          >
            {tStatus(game.status as "announced" | "in_dev" | "prototype" | "early_access" | "released" | "on_hold" | "cancelled" | "delisted") ?? game.status}
          </FilterPill>
          {game.country.map((c) => (
            <FilterPill
              key={c}
              param="country"
              value={c}
              className="text-xs bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tCountries(COUNTRY_KEY_MAP[c] as any) ?? c}
            </FilterPill>
          ))}
          {game.platforms.map((p) => (
            <FilterPill
              key={p}
              param="platform"
              value={p}
              className="text-xs bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full"
            >
              {p}
            </FilterPill>
          ))}
          {game.release_date && statusAllowsReleaseDate(game.status) && (
            <span className="text-xs bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full">
              {game.release_date}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mt-4 text-c-soft leading-relaxed whitespace-pre-wrap" dir="auto">
          {game.short_description}
        </p>

      </div>

      {/* Two-column details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {game.genres.length > 0 && (
          <DetailCell label={t("genres")}>
            <div className="flex gap-1.5 flex-wrap">
              {game.genres.map((g) => (
                <FilterPill
                  key={g}
                  param="genre"
                  value={g}
                  className="text-sm px-2.5 py-1 rounded-full bg-c-tag text-c-tag-text"
                >
                  {g}
                </FilterPill>
              ))}
            </div>
          </DetailCell>
        )}

        {(game.gameplay_modes?.length ?? 0) > 0 && (
          <DetailCell label={t("gameplayModes")}>
            <div className="flex gap-1.5 flex-wrap">
              {game.gameplay_modes!.map((m) => (
                <Tag key={m} color="blue">{m}</Tag>
              ))}
            </div>
          </DetailCell>
        )}

        {(game.monetization?.length ?? 0) > 0 && (
          <DetailCell label={t("monetization")}>
            <div className="flex gap-1.5 flex-wrap">
              {game.monetization!.map((m) => (
                <Tag key={m} color="amber">{m}</Tag>
              ))}
            </div>
          </DetailCell>
        )}

        {game.game_engine && (
          <DetailCell label={t("gameEngine")}>
            <p className="text-sm text-c-text">{game.game_engine}</p>
          </DetailCell>
        )}
      </div>

      {/* Links section */}
      {(game.website_url || storeLinks.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold tracking-wider text-c-faint uppercase">
              {t("links")}
            </p>
            {game.publishing_type && (
              <span className="text-xs text-c-faint">
                ·{" "}
                {game.publishing_type === "self_published"
                  ? t("publishingSelf")
                  : game.publisher_name || t("publishingWith")}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {game.website_url && (
              <a
                href={game.website_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-c-border bg-c-surface hover:bg-c-bg text-c-text transition-colors"
              >
                {tCommon("officialWebsite")}
              </a>
            )}
            {storeLinks.map(([key, val]) => (
              <a
                key={key}
                href={val as string}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-c-border bg-c-surface hover:bg-c-bg text-c-text transition-colors"
              >
                {key} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related games — two independent strips. Either may render alone if
          the other is empty. Skipped entirely when both are empty. */}
      {(moreFromDev.length > 0 || similarGames.length > 0) && (
        <div className="mt-12 space-y-8">
          {moreFromDev.length > 0 && primaryDev && (
            <RelatedStrip
              title={t("moreFromDev", { name: primaryDev })}
              games={moreFromDev}
              tStatus={tStatus}
            />
          )}
          {similarGames.length > 0 && (
            <RelatedStrip
              title={t("similarGames")}
              games={similarGames}
              tStatus={tStatus}
            />
          )}
        </div>
      )}

      {/* Provenance footer — small, subtle, builds trust by showing the entry
          is actively maintained. Hidden if the row predates these columns. */}
      {(game.updated_at || game.created_at) && (
        <p className="mt-10 text-xs text-c-faint">
          {game.updated_at && (
            <>
              {tCommon("lastUpdated")}: {formatDate(game.updated_at, locale)}
            </>
          )}
          {game.created_at && game.updated_at && " · "}
          {game.created_at && (
            <>
              {tCommon("addedOn")}: {formatDate(game.created_at, locale)}
            </>
          )}
        </p>
      )}
    </main>
  );
}

function DetailCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: "blue" | "amber";
}) {
  const cls =
    color === "blue"
      ? "bg-blue-500/10 text-blue-600"
      : color === "amber"
      ? "bg-amber-500/10 text-amber-600"
      : "bg-c-tag text-c-tag-text";
  return (
    <span className={`text-sm px-2.5 py-1 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

// Compact horizontal strip used by both "More from this developer" and
// "Similar games" sections. Mirrors the homepage Recently Added strip's card
// shape (180px wide, thumbnail/TitleCover + name + status badge).
function RelatedStrip({
  title,
  games,
  tStatus,
}: {
  title: string;
  games: { slug: string; name: string; status: string; thumbnail_url: string | null }[];
  tStatus: (key: string) => string;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="group block shrink-0 w-[180px] bg-c-surface border border-c-border rounded-lg overflow-hidden hover:border-indigo-500/50 transition-colors"
          >
            {g.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.thumbnail_url}
                alt={g.name}
                width={180}
                height={84}
                loading="lazy"
                decoding="async"
                className="w-full aspect-[460/215] object-cover"
              />
            ) : (
              <TitleCover
                name={g.name}
                seed={g.slug}
                className="w-full aspect-[460/215]"
              />
            )}
            <div className="p-2.5">
              <p
                className="text-sm font-medium text-c-text truncate group-hover:text-indigo-500 transition-colors"
                dir="auto"
              >
                {g.name}
              </p>
              <span
                className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  STATUS_CLASSES[g.status] ?? "bg-c-tag text-c-muted"
                }`}
              >
                {tStatus(g.status) ?? g.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
