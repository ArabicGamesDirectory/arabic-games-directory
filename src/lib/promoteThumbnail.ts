import { SupabaseClient } from "@supabase/supabase-js";

/**
 * If the given thumbnail_url points to a temp/ path, copies it to the
 * permanent path (same filename, no temp/ prefix), deletes the temp file,
 * and returns the new permanent public URL.
 * Returns null if the URL is already permanent, empty, or the move fails.
 */
export async function promoteThumbnail(
  supabase: SupabaseClient,
  thumbnailUrl: string | null | undefined
): Promise<string | null> {
  if (!thumbnailUrl) return null;

  // Extract the path portion after the bucket public URL base.
  // Supabase public URLs look like: .../storage/v1/object/public/thumbnails/temp/foo.webp
  const marker = "/object/public/thumbnails/";
  const markerIdx = thumbnailUrl.indexOf(marker);
  if (markerIdx === -1) return null;

  const storagePath = thumbnailUrl.slice(markerIdx + marker.length); // e.g. "temp/slug-123.webp"
  if (!storagePath.startsWith("temp/")) return null; // already permanent

  const permanentPath = storagePath.replace(/^temp\//, ""); // e.g. "slug-123.webp"

  // Copy to permanent path.
  const { error: copyError } = await supabase.storage
    .from("thumbnails")
    .copy(storagePath, permanentPath);

  if (copyError) return null; // leave temp in place; cron will clean up

  // Remove the temp file.
  await supabase.storage.from("thumbnails").remove([storagePath]);

  // Return permanent public URL.
  const { data } = supabase.storage.from("thumbnails").getPublicUrl(permanentPath);
  return data.publicUrl;
}
