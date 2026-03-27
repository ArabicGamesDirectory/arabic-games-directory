import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

  const gameFields = {
    name: submission.payload.name,
    developer: submission.payload.developer ?? null,
    country: submission.payload.country,
    platforms: submission.payload.platforms,
    genres: submission.payload.genres,
    gameplay_modes: submission.payload.gameplay_modes ?? [],
    game_engine: submission.payload.game_engine ?? null,
    monetization: submission.payload.monetization ?? [],
    short_description: submission.payload.short_description,
    status: submission.payload.status,
    release_date: submission.payload.release_date,
    website_url: submission.payload.website_url,
    store_links: submission.payload.store_links,
    publishing_type: submission.payload.publishing_type ?? null,
    publisher_name: submission.payload.publisher_name ?? null,
  };

  let gameError: { message: string } | null = null;

  if (submission.game_id) {
    // Update submission — patch the existing game row (slug is preserved).
    const { error } = await supabase
      .from("games")
      .update(gameFields)
      .eq("id", submission.game_id);
    gameError = error;
  } else {
    // New game submission — insert a fresh row.
    const { error } = await supabase
      .from("games")
      .insert({
        slug: submission.payload.slug,
        submitted_by: submission.submitter_name ?? null,
        submitted_by_email: submission.submitter_email ?? null,
        ...gameFields,
      });
    gameError = error;
  }

  if (gameError) {
    return Response.json({ error: gameError.message }, { status: 500 });
  }

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
