// Discord webhook notifying the admin of a new submission or update suggestion.
//
// SERVER-ONLY. Called by /api/submit after a row is actually saved. This used to
// be a public route (/api/notify-submission) that the forms called from the
// browser, with no validation or rate limit — anyone could post arbitrary
// names into the admin Discord channel, and a honeypot "success" still pinged.
// Now a notification can only follow a real, validated, rate-limited insert.
//
// Best-effort: failures are swallowed. The webhook URL lives in
// DISCORD_SUBMISSIONS_WEBHOOK_URL; when unset this is a no-op so dev
// environments without Discord configured work unchanged.
//
// Embed payload is deliberately minimal (per the owner's spec): title, color,
// Name, Type, Country, IP, footer, timestamp.

const SITE_URL = process.env.SITE_URL ?? "https://arabicgames.directory";

const COLOR_NEW = 0x58a6ff; // blue
const COLOR_UPDATE = 0xf1c40f; // amber

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

export async function notifySubmission(args: {
  entityType: EntityType;
  name: string;
  country: string[];
  isUpdate: boolean;
  ip: string;
}): Promise<void> {
  const webhookUrl = process.env.DISCORD_SUBMISSIONS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { entityType, isUpdate, ip } = args;
  const name = args.name.trim() || "(no name)";
  const country = args.country.length > 0 ? args.country.join(", ") : "—";

  const embed = {
    title: isUpdate
      ? `📝 ${TYPE_LABEL[entityType]} update suggested`
      : `🆕 New ${TYPE_LABEL[entityType].toLowerCase()} submission`,
    url: `${SITE_URL}/admin?tab=${ADMIN_TAB[entityType]}`,
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
      // Names are submitter-controlled. Mentions inside embeds don't ping today,
      // but disabling mention parsing keeps it that way if a `content` line is
      // ever added.
      body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    });
  } catch {
    // Best-effort — never surface webhook failures.
  }
}
