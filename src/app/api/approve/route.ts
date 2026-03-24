import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { submission } = body;

  const { error: insertError } = await supabase.from("games").insert({
    slug: submission.payload.slug,
    name: submission.payload.name,
    country: submission.payload.country,
    platforms: submission.payload.platforms,
    genres: submission.payload.genres,
    short_description: submission.payload.short_description,
    status: submission.payload.status,
    release_date: submission.payload.release_date,
    website_url: submission.payload.website_url,
    store_links: submission.payload.store_links,
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
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
