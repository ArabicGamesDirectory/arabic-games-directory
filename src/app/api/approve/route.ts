import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { promoteThumbnail } from "@/lib/promoteThumbnail";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import { normalizeGenres } from "@/lib/genres";

// Read developers list from a submission payload, tolerating legacy single-value
// `developer` strings on rows queued before the multi-developer migration.
function readDevelopers(payload: { developers?: unknown; developer?: unknown }): string[] {
  if (Array.isArray(payload.developers)) {
    return payload.developers.filter((d): d is string => typeof d === "string" && d.trim().length > 0);
  }
  if (typeof payload.developer === "string" && payload.developer.trim()) {
    return [payload.developer.trim()];
  }
  return [];
}

async function syncGameStudios(
  supabase: SupabaseClient,
  gameId: string,
  developers: string[]
): Promise<void> {
  // Look up matching approved studios for each developer name (case-insensitive).
  const matchedStudioIds = new Set<string>();
  for (const devName of developers) {
    const { data: studio } = await supabase
      .from("studios")
      .select("id")
      .ilike("name", devName)
      .maybeSingle();
    if (studio?.id) matchedStudioIds.add(studio.id);
  }

  // Replace the join rows for this game.
  await supabase.from("game_studios").delete().eq("game_id", gameId);
  if (matchedStudioIds.size > 0) {
    await supabase.from("game_studios").insert(
      Array.from(matchedStudioIds).map((sid) => ({ game_id: gameId, studio_id: sid }))
    );
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // Session client — anon key, reads auth cookie to verify identity.
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client — bypasses RLS for privileged writes.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { submission } = body;

  const developers = readDevelopers(submission.payload);

  const gameFields = {
    name: submission.payload.name,
    developers,
    country: submission.payload.country,
    platforms: submission.payload.platforms,
    genres: normalizeGenres(submission.payload.genres ?? []),
    gameplay_modes: submission.payload.gameplay_modes ?? [],
    game_engine: submission.payload.game_engine ?? null,
    monetization: submission.payload.monetization ?? [],
    short_description: submission.payload.short_description,
    status: submission.payload.status,
    release_date: statusAllowsReleaseDate(submission.payload.status)
      ? submission.payload.release_date
      : null,
    website_url: submission.payload.website_url,
    store_links: submission.payload.store_links,
    publishing_type: submission.payload.publishing_type ?? null,
    publisher_name: submission.payload.publisher_name ?? null,
    thumbnail_url: submission.payload.thumbnail_url ?? null,
  };

  let gameId: string;

  if (submission.game_id) {
    // Update submission — patch the existing game row (slug is preserved).
    const permanentUrl = await promoteThumbnail(supabase, gameFields.thumbnail_url);
    const { error } = await supabase
      .from("games")
      .update({ ...gameFields, ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}) })
      .eq("id", submission.game_id);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    gameId = submission.game_id;
  } else {
    // New game submission — resolve slug collisions, then insert.
    const baseSlug = submission.payload.slug as string;
    const { data: existingSlugs } = await supabase
      .from("games")
      .select("slug")
      .like("slug", `${baseSlug}%`);
    const taken = new Set((existingSlugs ?? []).map((r: { slug: string }) => r.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const permanentUrl = await promoteThumbnail(supabase, gameFields.thumbnail_url);
    const { data: insertedGame, error } = await supabase
      .from("games")
      .insert({
        slug,
        ...gameFields,
        ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}),
      })
      .select("id")
      .single();
    if (error || !insertedGame) {
      return Response.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }
    gameId = insertedGame.id;
  }

  // Sync the game_studios join table from the developers list.
  await syncGameStudios(supabase, gameId, developers);

  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      moderation_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateError) {
    return Response.json(
      {
        error:
          "Game approved but submission status update failed: " +
          updateError.message,
      },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
