import { createClient } from "@supabase/supabase-js";
import { DIRECTORY_CACHE_TAG, DIRECTORY_REVALIDATE_SECONDS } from "@/lib/cache";

// Public (anon) client. Reads go through Next's data cache: identical queries
// within DIRECTORY_REVALIDATE_SECONDS are served from cache instead of hitting
// Supabase, and every admin write (approve/delete) expires the tag so changes
// show up immediately. Only GET/HEAD are cached — anything else passes through.
// In the browser (SubmitForm's studio autocomplete) the `next` option is ignored.
const cachedFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return fetch(input, init);
  return fetch(input, {
    ...init,
    next: { revalidate: DIRECTORY_REVALIDATE_SECONDS, tags: [DIRECTORY_CACHE_TAG] },
  });
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: cachedFetch } }
);
