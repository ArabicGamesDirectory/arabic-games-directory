import { createClient } from "@supabase/supabase-js";

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron via the shared secret.
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // List all files under the temp/ prefix.
  const { data: files, error } = await supabase.storage
    .from("thumbnails")
    .list("temp", { limit: 1000 });

  if (error) {
    return Response.json({ error: "Failed to list temp files: " + error.message }, { status: 500 });
  }

  if (!files || files.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const now = Date.now();
  const stale = files.filter((f) => {
    // Filename pattern: {slug}-{timestamp}.webp — extract the timestamp.
    const match = f.name.match(/-(\d+)\.webp$/);
    if (!match) return false;
    const uploadedAt = parseInt(match[1], 10);
    return now - uploadedAt > MAX_AGE_MS;
  });

  if (stale.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const paths = stale.map((f) => `temp/${f.name}`);
  const { error: removeError } = await supabase.storage.from("thumbnails").remove(paths);

  if (removeError) {
    return Response.json(
      { error: "Failed to delete stale files: " + removeError.message },
      { status: 500 }
    );
  }

  return Response.json({ deleted: stale.length });
}
