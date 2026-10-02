import { supabase } from "@/lib/supabase";
import { renderOgImage, type OgCard } from "@/lib/ogImage";
import en from "../../../../../messages/en.json";

// GET /og/{games|studios|communities}/{slug}.png — share image for a detail
// page whose entry has no uploaded thumbnail (detail pages point og:image here).
// Lives outside /api/ because robots.txt disallows /api/ and X's crawler
// honours that; the ".png" keeps it out of the locale proxy (its matcher skips
// dotted paths), the same trick as /feed.xml. Labels are English: one image is
// shared by the /en and /ar page.

const STATUS_LABELS: Record<string, string> = en.status;
const STUDIO_TYPE_LABELS: Record<string, string> = {
  individual: en.studio.typeIndividual,
  team: en.studio.typeTeam,
  studio: en.studio.typeStudio,
};
const COMMUNITY_TYPE_LABELS: Record<string, string> = {
  online: en.community.typeOnline,
  in_person: en.community.typeInPerson,
  hybrid: en.community.typeHybrid,
};

function meta(...parts: (string | null | undefined)[]): string | undefined {
  const s = parts.filter(Boolean).join(" · ");
  return s || undefined;
}

// Long country lists would push the meta line off the card.
function countries(list: string[] | null): string | undefined {
  if (!list?.length) return undefined;
  return list.length > 2 ? `${list.slice(0, 2).join(", ")} +${list.length - 2}` : list.join(", ");
}

async function loadCard(kind: string, slug: string): Promise<OgCard | null> {
  if (kind === "games") {
    const { data } = await supabase
      .from("games")
      .select("name, developers, country, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    return {
      kind: "Game",
      title: data.name,
      subtitle: (data.developers as string[] | null)?.join(", ") || undefined,
      meta: meta(STATUS_LABELS[data.status], countries(data.country)),
      seed: slug,
    };
  }
  if (kind === "studios") {
    const { data } = await supabase
      .from("studios")
      .select("name, type, country")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    return {
      kind: "Studio",
      title: data.name,
      meta: meta(STUDIO_TYPE_LABELS[data.type], countries(data.country)),
      seed: slug,
    };
  }
  if (kind === "communities") {
    const { data } = await supabase
      .from("communities")
      .select("name, type, country")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    return {
      kind: "Community",
      title: data.name,
      meta: meta(COMMUNITY_TYPE_LABELS[data.type], countries(data.country)),
      seed: slug,
    };
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; file: string }> }
) {
  const { kind, file } = await params;
  if (!file.endsWith(".png")) return new Response("Not found", { status: 404 });
  const card = await loadCard(kind, decodeURIComponent(file.slice(0, -4)));
  if (!card) return new Response("Not found", { status: 404 });
  return renderOgImage(card);
}
