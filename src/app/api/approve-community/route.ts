import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { promoteThumbnail } from "@/lib/promoteThumbnail";

export async function POST(request: Request) {
  const cookieStore = await cookies();

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { submission } = body;

  const communityFields = {
    name: submission.payload.name,
    type: submission.payload.type,
    description: submission.payload.description ?? null,
    country: submission.payload.country,
    website_url: submission.payload.website_url ?? null,
    social_links: submission.payload.social_links ?? {},
    topics: submission.payload.topics ?? [],
    thumbnail_url: submission.payload.thumbnail_url ?? null,
  };

  let communityError: { message: string } | null = null;

  if (submission.community_id) {
    const permanentUrl = await promoteThumbnail(supabase, communityFields.thumbnail_url);
    const { error } = await supabase
      .from("communities")
      .update({ ...communityFields, ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}) })
      .eq("id", submission.community_id);
    communityError = error;
  } else {
    // New community submission — resolve slug collisions, then insert.
    const baseSlug = submission.payload.slug as string;
    const { data: existingSlugs } = await supabase
      .from("communities")
      .select("slug")
      .like("slug", `${baseSlug}%`);
    const taken = new Set((existingSlugs ?? []).map((r: { slug: string }) => r.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const permanentUrl = await promoteThumbnail(supabase, communityFields.thumbnail_url);
    const { error } = await supabase
      .from("communities")
      .insert({
        slug,
        ...communityFields,
        ...(permanentUrl ? { thumbnail_url: permanentUrl } : {}),
      });
    communityError = error;
  }

  if (communityError) {
    return Response.json({ error: communityError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("community_submissions")
    .update({
      moderation_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateError) {
    return Response.json(
      {
        error:
          "Community approved but submission status update failed: " +
          updateError.message,
      },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
