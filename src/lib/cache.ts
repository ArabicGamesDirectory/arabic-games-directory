// Shared by the anon client (`lib/supabase.ts`, which is also bundled into the
// browser) and the server-only invalidation helper — so no `next/cache` here.

// Tag on every public read made through the anon client.
export const DIRECTORY_CACHE_TAG = "directory";

// Upper bound on how stale public pages can get if an invalidation is missed
// (e.g. a row edited directly in the Supabase dashboard).
export const DIRECTORY_REVALIDATE_SECONDS = 300;
