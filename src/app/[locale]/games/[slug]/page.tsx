import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";

type Game = {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
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
    .select("*, studios(slug)")
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

        {game.developer && (
          <p className="text-sm text-c-muted mt-1">
            {game.studios?.slug ? (
              <Link
                href={`/studios/${game.studios.slug}`}
                className="hover:text-indigo-500 transition-colors"
              >
                {game.developer}
              </Link>
            ) : (
              game.developer
            )}
          </p>
        )}

        {/* Status + meta pills */}
        <div className="flex gap-2 flex-wrap mt-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              STATUS_CLASSES[game.status] ?? "bg-c-tag text-c-muted"
            }`}
          >
            {tStatus(game.status as "announced" | "in_dev" | "prototype" | "early_access" | "released" | "on_hold" | "cancelled" | "delisted") ?? game.status}
          </span>
          {game.country.map((c) => (
            <span key={c} className="text-xs bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tCountries(COUNTRY_KEY_MAP[c] as any) ?? c}
            </span>
          ))}
          {game.platforms.map((p) => (
            <span key={p} className="text-xs bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full">
              {p}
            </span>
          ))}
          {game.release_date && (
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
                <Tag key={g}>{g}</Tag>
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
