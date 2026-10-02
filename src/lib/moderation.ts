import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { validateSubmission, type EntityType } from "@/lib/validateSubmission";
import { slugify } from "@/lib/slug";

// Shared server-side plumbing for the admin moderation routes.

export const QUEUES = {
  game: { table: "submissions", targetColumn: "game_id" },
  studio: { table: "studio_submissions", targetColumn: "studio_id" },
  community: { table: "community_submissions", targetColumn: "community_id" },
} as const satisfies Record<EntityType, { table: string; targetColumn: string }>;

export function isEntityType(v: unknown): v is EntityType {
  return v === "game" || v === "studio" || v === "community";
}

/**
 * Service-role client if the request carries the admin's session cookie, else
 * null. Same check the older approve/reject/delete routes inline.
 */
export async function requireAdmin(): Promise<SupabaseClient | null> {
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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type PendingSubmission = {
  id: string;
  moderation_status: string;
  // The jsonb column. Validated on the way in by /api/submit (or here, for
  // admin edits), but legacy rows predate that, so callers read it loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  game_id?: string | null;
  studio_id?: string | null;
  community_id?: string | null;
};

type LoadResult =
  | { ok: true; submission: PendingSubmission }
  | { ok: false; status: number; error: string };

/**
 * Loads a pending submission by id from the database — the browser's copy is
 * never trusted, so the target row (game_id etc.) and slug always come from the
 * queue row itself.
 *
 * `body.payload`, when present, is the admin's edited version: it goes through
 * the same validateSubmission() as public submissions and is written back to
 * the queue row BEFORE the caller publishes anything, so the row records what
 * was actually approved (and a failed approve doesn't lose the edits).
 *
 * Refuses rows that are no longer pending (409) — a second approve of the same
 * row is how duplicate studios were created before.
 */
export async function loadPendingSubmission(
  supabase: SupabaseClient,
  entity: EntityType,
  body: unknown
): Promise<LoadResult> {
  const { id, payload } = (body ?? {}) as { id?: unknown; payload?: unknown };
  if (typeof id !== "string" || !id) return { ok: false, status: 400, error: "Missing submission id" };

  const { table, targetColumn } = QUEUES[entity];
  const { data: row, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!row) return { ok: false, status: 404, error: "Submission not found" };
  if (row.moderation_status !== "pending") {
    return { ok: false, status: 409, error: `This submission was already ${row.moderation_status}.` };
  }
  if (payload === undefined) return { ok: true, submission: row as PendingSubmission };

  const result = validateSubmission(entity, payload);
  if (!result.ok) return { ok: false, status: 400, error: result.error };

  // Updates keep the live row's slug; new entries follow the (possibly edited)
  // name, exactly as /api/submit derives it.
  const slug = row[targetColumn]
    ? (row.payload as Record<string, unknown>).slug
    : slugify(result.payload.name as string);
  const edited = { ...result.payload, slug };

  const { error: saveError } = await supabase.from(table).update({ payload: edited }).eq("id", id);
  if (saveError) return { ok: false, status: 500, error: saveError.message };

  return { ok: true, submission: { ...(row as PendingSubmission), payload: edited } };
}
