import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
    const { error } = await supabase
      .from("studios")
      .update(studioFields)
      .eq("id", submission.studio_id);
    studioError = error;
  } else {
    // New studio submission — insert a fresh row.
    const { error } = await supabase
      .from("studios")
      .insert({ slug: submission.payload.slug, submitted_by: submission.submitter_name ?? null, ...studioFields });
    studioError = error;
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
