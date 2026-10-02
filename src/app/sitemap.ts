import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { GENRE_VALUES } from "@/lib/genres";
import { countrySlug, genreSlug } from "@/lib/hubs";

const SITE_URL = process.env.SITE_URL || "https://arabicgames.directory";
const LOCALES = ["en", "ar"] as const;

// Build locale alternates for a given path (e.g. "/games/foo").
// Used so Google knows /en/games/foo and /ar/games/foo are translations.
function alternates(path: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `${SITE_URL}/${l}${path}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    { data: games },
    { data: studios },
    { data: communities },
  ] = await Promise.all([
    supabase.from("games").select("slug, updated_at"),
    supabase.from("studios").select("slug, updated_at"),
    supabase.from("communities").select("slug, updated_at"),
  ]);

  const now = new Date();

  // Static routes — one entry per locale.
  const staticPaths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/stats", priority: 0.7, changeFrequency: "daily" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/countries", priority: 0.7, changeFrequency: "weekly" },
    { path: "/genres", priority: 0.7, changeFrequency: "weekly" },
    // Hub pages — one per country and per canonical genre (see src/lib/hubs.ts).
    ...COUNTRY_OPTIONS.map((c) => ({
      path: `/countries/${countrySlug(c)}`,
      priority: 0.7,
      changeFrequency: "weekly" as const,
    })),
    ...GENRE_VALUES.map((g) => ({
      path: `/genres/${genreSlug(g)}`,
      priority: 0.6,
      changeFrequency: "weekly" as const,
    })),
    { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
    { path: "/submit", priority: 0.5, changeFrequency: "yearly" },
    { path: "/submit-community", priority: 0.4, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    staticPaths.map((s) => ({
      url: `${SITE_URL}/${locale}${s.path}`,
      lastModified: now,
      changeFrequency: s.changeFrequency,
      priority: s.priority,
      alternates: alternates(s.path),
    }))
  );

  const dynamicEntries: MetadataRoute.Sitemap = [];
  for (const g of games ?? []) {
    for (const locale of LOCALES) {
      dynamicEntries.push({
        url: `${SITE_URL}/${locale}/games/${g.slug}`,
        lastModified: g.updated_at ? new Date(g.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: alternates(`/games/${g.slug}`),
      });
    }
  }
  for (const s of studios ?? []) {
    for (const locale of LOCALES) {
      dynamicEntries.push({
        url: `${SITE_URL}/${locale}/studios/${s.slug}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: alternates(`/studios/${s.slug}`),
      });
    }
  }
  for (const c of communities ?? []) {
    for (const locale of LOCALES) {
      dynamicEntries.push({
        url: `${SITE_URL}/${locale}/communities/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: alternates(`/communities/${c.slug}`),
      });
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
