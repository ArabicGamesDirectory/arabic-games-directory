import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { promoteThumbnail } from "@/lib/promoteThumbnail";

// Walk every game's developers[] and insert a join row for any name that
// matches this studio (case-insensitive) but isn't already linked. Postgres
// doesn't have an indexed case-insensitive array containment operator, so we
// scan in JS — fine at directory scale.
async function retroLinkGames(
  supabase: SupabaseClient,
  studioId: string,
  studioName: string
): Promise<void> {
  const { data: games } = await supabase.from("games").select("id, developers");
  if (!games) return;
  const target = studioName.toLowerCase();
  const matchingIds = (games as { id: string; developers: string[] | null }[])
    .filter((g) => (g.developers ?? []).some((d) => d.toLowerCase() === target))
    .map((g) => g.id);
  if (matchingIds.length === 0) return;
  await supabase.from("game_studios").upsert(
    matchingIds.map((gid) => ({ game_id: gid, studio_id: studioId })),
    { onConflict: "game_id,studio_id", ignoreDuplicates: true }
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // Session client — verifies admin identity via cookie.
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

  const studioFields = {
    name: submission.payload.name,
    type: submission.payload.type,
    description: submission.payload.description ?? null,
    country: submission.payload.country,
    website_url: submission.payload.website_url ?? null,
    thumbnail_url: submission.payload.thumbnail_url ?? null,
  };

  let studioError: { message: string } | null = null;

  if (submission.studio_id) {
    // Update submission — patch the existing studio row (slug preserved).
    const permanentUrl = await promoteThumbnail(supabase, studioFields.thumbnail_url);
    const { error } = await supabase
      .from("studios")
      .update({ ...studioFields, ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}) })
      .eq("id", submission.studio_id);
    studioError = error;

    // Retroactively link any games whose developers[] mentions this studio name.
    if (!error) {
      await retroLinkGames(supabase, submission.studio_id, studioFields.name);
    }
  } else {
    // New studio submission — resolve slug collisions, then insert.
    const baseSlug = submission.payload.slug as string;
    const { data: existingSlugs } = await supabase
      .from("studios")
      .select("slug")
      .like("slug", `${baseSlug}%`);
    const taken = new Set((existingSlugs ?? []).map((r: { slug: string }) => r.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const permanentUrl = await promoteThumbnail(supabase, studioFields.thumbnail_url);
    const { data: insertedStudio, error } = await supabase
      .from("studios")
      .insert({
        slug,
        ...studioFields,
        ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}),
      })
      .select("id")
      .single();
    studioError = error;

    // Retroactively link any games whose developers[] mentions this studio name.
    if (!error && insertedStudio) {
      await retroLinkGames(supabase, insertedStudio.id, studioFields.name);
    }
  }

  if (studioError) {
    return Response.json({ error: studioError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("studio_submissions")
    .update({
      moderation_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateError) {
    return Response.json(
      {
        error:
          "Studio approved but submission status update failed: " +
          updateError.message,
      },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
