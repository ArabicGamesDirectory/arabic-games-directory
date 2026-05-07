import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTRY_KEY_MAP } from "@/lib/countries";
import { formatDate } from "@/lib/formatDate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("communities")
    .select("name, description, thumbnail_url")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Community not found" };
  const title = data.name as string;
  const description = (data.description as string | null) ?? undefined;
  const image = (data.thumbnail_url as string | null) ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
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
  created_at: string | null;
  updated_at: string | null;
};

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("community");
  const tCommon = await getTranslations("common");
  const tCountries = await getTranslations("countries");

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/?tab=communities" className="text-sm text-c-muted hover:text-c-text transition-colors">
          {tCommon("backToDirectory")}
        </Link>
        <p className="mt-8 text-c-muted">{t("notFound")}</p>
      </main>
    );
  }

  const community = data as Community;

  const TYPE_LABELS: Record<string, string> = {
    online: t("typeOnline"),
    in_person: t("typeInPerson"),
    hybrid: t("typeHybrid"),
  };

  const TOPIC_LABELS: Record<string, string> = {
    "Game Development": t("topicGameDevelopment"),
    "Game Programming": t("topicGameProgramming"),
    "Game Art": t("topicGameArt"),
    "Game Design": t("topicGameDesign"),
  };

  const socialLinkEntries = Object.entries(community.social_links ?? {}).filter(
    ([, url]) => !!url
  ) as [string, string][];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/?tab=communities"
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {tCommon("backToDirectory")}
        </Link>
        <Link
          href={`/update-community/${community.slug}`}
          className="text-sm text-c-muted hover:text-c-text border border-c-border hover:border-c-border-hover px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("suggestUpdate")}
        </Link>
      </div>

      <div className="mt-8">
        {community.thumbnail_url && (
          <img
            src={community.thumbnail_url}
            alt={community.name}
            width={460}
            height={215}
            loading="lazy"
            decoding="async"
            className="w-full max-w-[460px] h-[215px] object-cover rounded-xl mb-6"
          />
        )}

        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-c-text w-full">
            {community.name}
          </h1>
          <span className="text-xs font-medium bg-c-tag text-c-tag-text px-2.5 py-1 rounded-full">
            {TYPE_LABELS[community.type] ?? community.type}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          {community.country.map((c) => (
            <span key={c} className="text-sm bg-c-tag text-c-tag-text px-3 py-1 rounded-full">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tCountries(COUNTRY_KEY_MAP[c] as any) ?? c}
            </span>
          ))}
        </div>

        {community.description && (
          <p className="mt-6 text-c-soft leading-relaxed whitespace-pre-wrap" dir="auto">
            {community.description}
          </p>
        )}

        {community.topics && community.topics.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-2">
              {t("fieldTopics")}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {community.topics.map((topic) => (
                <span key={topic} className="text-sm bg-c-tag text-c-tag-text px-3 py-1 rounded-full">
                  {TOPIC_LABELS[topic] ?? topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {(community.website_url || socialLinkEntries.length > 0) && (
          <div className="mt-8">
            <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-3">
              {t("linksLabel")}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {community.website_url && (
                <a
                  href={community.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center bg-c-surface border border-c-border hover:border-c-border-hover text-sm text-c-text px-4 py-2 rounded-lg transition-colors"
                >
                  {tCommon("website")}
                </a>
              )}
              {socialLinkEntries.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center bg-c-surface border border-c-border hover:border-c-border-hover text-sm text-c-text px-4 py-2 rounded-lg transition-colors"
                >
                  {key} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Provenance footer — same pattern as game/studio detail. */}
      {(community.updated_at || community.created_at) && (
        <p className="mt-10 text-xs text-c-faint">
          {community.updated_at && (
            <>
              {tCommon("lastUpdated")}: {formatDate(community.updated_at, locale)}
            </>
          )}
          {community.created_at && community.updated_at && " · "}
          {community.created_at && (
            <>
              {tCommon("addedOn")}: {formatDate(community.created_at, locale)}
            </>
          )}
        </p>
      )}
    </main>
  );
}
