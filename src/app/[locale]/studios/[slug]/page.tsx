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
          <p className="mt-6 text-c-soft leading-relaxed">{studio.description}</p>
        )}

        {studio.website_url && (
          <div className="mt-8 pt-8 border-t border-c-border">
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
    </main>
  );
}
