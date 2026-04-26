// Fire-and-forget Discord webhook notifying admin of new submissions/updates.
// Called by SubmitForm, StudioSubmitForm, CommunitySubmitForm after a successful
// insert into the `*_submissions` table. Never blocks the user — failures are
// swallowed silently. The webhook URL lives in DISCORD_SUBMISSIONS_WEBHOOK_URL
// (server-only env var); if unset, the route is a no-op so dev environments
// without webhook config don't error out.

const SITE_URL = process.env.SITE_URL ?? "https://arabicgames.directory";

// Discord embed colors (decimal RGB)
const COLOR_NEW = 0x58a6ff;     // blue
const COLOR_UPDATE = 0xf1c40f;  // amber

type EntityType = "game" | "studio" | "community";

const ADMIN_TAB: Record<EntityType, string> = {
  game: "games",
  studio: "studios",
  community: "communities",
};

const TYPE_LABEL: Record<EntityType, string> = {
  game: "Game",
  studio: "Studio",
  community: "Community",
};

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  const webhookUrl = process.env.DISCORD_SUBMISSIONS_WEBHOOK_URL;
  if (!webhookUrl) return Response.json({ ok: true, skipped: true });

  let body: { entityType?: string; name?: string; country?: string[]; isUpdate?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const entityType = body.entityType as EntityType;
  if (!entityType || !["game", "studio", "community"].includes(entityType)) {
    return Response.json({ ok: false, error: "Invalid entityType" }, { status: 400 });
  }

  const name = (body.name ?? "").trim() || "(no name)";
  const country = Array.isArray(body.country) && body.country.length > 0
    ? body.country.join(", ")
    : "—";
  const isUpdate = !!body.isUpdate;

  const ip = getClientIp(req);
  const title = isUpdate
    ? `📝 ${TYPE_LABEL[entityType]} update suggested`
    : `🆕 New ${TYPE_LABEL[entityType].toLowerCase()} submission`;
  const adminUrl = `${SITE_URL}/admin?tab=${ADMIN_TAB[entityType]}`;

  const embed = {
    title,
    url: adminUrl,
    color: isUpdate ? COLOR_UPDATE : COLOR_NEW,
    fields: [
      { name: "Name", value: name, inline: true },
      { name: "Type", value: TYPE_LABEL[entityType], inline: true },
      { name: "Country", value: country, inline: true },
      { name: "IP", value: ip, inline: false },
    ],
    footer: { text: "→ Review in admin" },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    // Fire-and-forget — silently ignore webhook failures
  }

  return Response.json({ ok: true });
}
