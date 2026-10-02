import { isEntityType, loadPendingSubmission, requireAdmin } from "@/lib/moderation";

// POST { entity: "game" | "studio" | "community", id, payload } — admin only.
// Validates and saves an edited payload onto a pending queue row WITHOUT
// approving it, so imported or messy submissions can be fixed now and approved
// later. Approving with edits goes through the approve routes instead, which
// share loadPendingSubmission().
export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!isEntityType(body?.entity)) {
    return Response.json({ error: "Unknown entity" }, { status: 400 });
  }
  if (body.payload === undefined) {
    return Response.json({ error: "Missing payload" }, { status: 400 });
  }

  const loaded = await loadPendingSubmission(supabase, body.entity, body);
  if (!loaded.ok) return Response.json({ error: loaded.error }, { status: loaded.status });

  return Response.json({ success: true, payload: loaded.submission.payload });
}
