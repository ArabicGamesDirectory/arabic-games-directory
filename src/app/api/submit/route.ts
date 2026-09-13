// Public submission endpoint for games, studios, and communities.
//
// This route exists so the `*_submissions` tables are NOT writable with the
// anon key. It validates every field server-side, rate-limits by IP, drops
// honeypot hits, and inserts with the service-role client.
//
// TODO(manual): requires the `rate_limits` table + `check_rate_limit()`
// function from the "Migration: submission hardening" section of CLAUDE.md,
// and anon INSERT must be revoked on submissions / studio_submissions /
// community_submissions AFTER this is deployed and verified working.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateSubmission, type EntityType } from "@/lib/validateSubmission";
import { slugify } from "@/lib/slug";
import { findStudioByName, escapeIlike } from "@/lib/studioLookup";

const ENTITY_TABLE: Record<EntityType, string> = {
  game: "submissions",
  studio: "studio_submissions",
  community: "community_submissions",
};

// The column linking an update submission back to the live row it patches.
const ENTITY_FK: Record<EntityType, string> = {
  game: "game_id",
  studio: "studio_id",
  community: "community_id",
};

const ENTITY_TARGET_TABLE: Record<EntityType, string> = {
  game: "games",
  studio: "studios",
  community: "communities",
};

// 10 submissions per IP per hour. High enough that a person filling in several
// games in one sitting never notices; low enough that a script can't bury the
// moderation queue.
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 3600;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * For a NEW game submission, queue a studio submission for every developer
 * name that is neither an approved studio nor already waiting in the queue.
 *
 * This runs inside the game's own request, so a game costs ONE rate-limit hit
 * however many developers it lists. It used to be a client-side loop of extra
 * /api/submit calls: each consumed the 10/hour budget, and once it ran out the
 * remaining studios were dropped with only a console.error.
 *
 * Checking the pending queue (which only the server can read) also stops the
 * same developer being queued once per game — the main way duplicate studios
 * were created before /api/approve-studio learned to merge.
 *
 * Best-effort: a failure here is logged and never fails the game submission,
 * which has already been saved.
 */
async function queueUnknownDevelopers(
  supabase: SupabaseClient,
  developers: string[],
  country: string[]
): Promise<number> {
  let queued = 0;
  const seen = new Set<string>();
  for (const raw of developers) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);

    if (await findStudioByName(supabase, name)) continue;

    const { data: pending, error: pendingError } = await supabase
      .from("studio_submissions")
      .select("id")
      .eq("moderation_status", "pending")
      .ilike("payload->>name", escapeIlike(name))
      .limit(1);
    if (pendingError) {
      // Can't tell whether it's queued — skip rather than risk a duplicate.
      console.error("[submit] pending-studio check failed:", pendingError.message);
      continue;
    }
    if (pending && pending.length > 0) continue;

    // Same validator as a hand-submitted studio. The auto-created entry
    // inherits the game's countries (already validated) and the form's
    // default type; the moderator refines both on review.
    const result = validateSubmission("studio", {
      name,
      type: "studio",
      description: null,
      country,
      website_url: null,
    });
    if (!result.ok) {
      console.error(`[submit] auto-studio "${name}" failed validation:`, result.error);
      continue;
    }

    const { error } = await supabase.from("studio_submissions").insert({
      payload: { ...result.payload, slug: slugify(name) },
      moderation_status: "pending",
    });
    if (error) {
      console.error(`[submit] auto-studio "${name}" insert failed:`, error.message);
    } else {
      queued++;
    }
  }
  return queued;
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit backed by the `check_rate_limit` Postgres function.
 * The increment happens inside the function so concurrent requests can't both
 * read a stale count — doing this as read-then-write from JS would race.
 *
 * FAILS OPEN. If the RPC is missing (code not yet migrated) or the DB is
 * briefly unreachable, we allow the request rather than taking submissions
 * offline. That makes the deploy order safe: ship this route first, apply the
 * SQL second, revoke anon INSERT last.
 */
async function withinRateLimit(supabase: SupabaseClient, key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) {
      console.warn("[submit] rate limit unavailable, failing open:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("[submit] rate limit threw, failing open:", e);
    return true;
  }
}

export async function POST(req: Request) {
  let body: {
    entityType?: string;
    payload?: unknown;
    targetId?: unknown;
    website_url_extra?: unknown; // honeypot
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — a hidden field no human fills in. Return success so the bot
  // believes it worked and doesn't retry with a different shape.
  if (typeof body.website_url_extra === "string" && body.website_url_extra.trim()) {
    return Response.json({ ok: true });
  }

  const entityType = body.entityType as EntityType;
  if (!entityType || !["game", "studio", "community"].includes(entityType)) {
    return Response.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const result = validateSubmission(entityType, body.payload);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const payload = result.payload;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ip = getClientIp(req);
  if (!(await withinRateLimit(supabase, `submit:${ip}`))) {
    return Response.json(
      { error: "Too many submissions from this address. Please try again later." },
      { status: 429 }
    );
  }

  // Update submissions carry the id of the row they patch. Validate it's a real
  // UUID pointing at an existing row, and take the slug FROM THAT ROW rather
  // than from the request — otherwise a crafted submission could rewrite a
  // live entry's slug on approve.
  let targetId: string | null = null;
  let slug: string;
  if (body.targetId !== null && body.targetId !== undefined && body.targetId !== "") {
    if (typeof body.targetId !== "string" || !UUID_RE.test(body.targetId)) {
      return Response.json({ error: "Invalid target id" }, { status: 400 });
    }
    const { data: target } = await supabase
      .from(ENTITY_TARGET_TABLE[entityType])
      .select("id, slug")
      .eq("id", body.targetId)
      .maybeSingle();
    if (!target) {
      return Response.json({ error: "Target not found" }, { status: 400 });
    }
    targetId = target.id as string;
    slug = target.slug as string;
  } else {
    // New submission — always derive the slug server-side. The client's value
    // is ignored entirely.
    slug = slugify(payload.name as string);
  }

  const { error } = await supabase.from(ENTITY_TABLE[entityType]).insert({
    payload: { ...payload, slug },
    moderation_status: "pending",
    ...(targetId ? { [ENTITY_FK[entityType]]: targetId } : {}),
  });

  if (error) {
    // Log the real reason, return a generic one — raw Postgres errors leak
    // schema details to the browser.
    console.error("[submit] insert failed:", error.message);
    return Response.json({ error: "Could not save submission." }, { status: 500 });
  }

  // Update suggestions don't queue studios — same rule the client applied.
  const studiosQueued =
    entityType === "game" && !targetId
      ? await queueUnknownDevelopers(
          supabase,
          payload.developers as string[],
          payload.country as string[]
        )
      : 0;

  return Response.json({ ok: true, isUpdate: !!targetId, studiosQueued });
}
