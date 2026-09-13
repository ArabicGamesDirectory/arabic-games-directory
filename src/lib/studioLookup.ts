import { SupabaseClient } from "@supabase/supabase-js";

// Case-insensitive exact lookup of an approved studio by display name.
//
// Studio names are unique under lower(btrim(name)) (unique index
// `studios_name_unique`), and game↔studio linking matches developers[] strings
// against studios.name — so "same name" means "same studio" throughout.
//
// Two things the plain `.ilike("name", name).maybeSingle()` pattern got wrong:
//   - `%` and `_` are ILIKE wildcards, so a name containing them could match
//     other studios. We escape them.
//   - `.maybeSingle()` returns an ERROR (not a row) when more than one row
//     matches, so duplicate studio rows made linking fail silently — 12 games
//     were left unlinked that way. We fetch a few and pick in JS instead.
export async function findStudioByName<T extends { id: string; name: string }>(
  supabase: SupabaseClient,
  name: string,
  columns = "id, name"
): Promise<T | null> {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  const escaped = name.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await supabase
    .from("studios")
    .select(columns)
    .ilike("name", escaped)
    .limit(5);
  const rows = (data ?? []) as unknown as T[];
  return rows.find((r) => r.name.trim().toLowerCase() === target) ?? null;
}
