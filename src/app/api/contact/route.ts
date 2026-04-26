// Contact form → Discord webhook (fire-and-forget, no DB persistence).
// Honeypot field name is "website_url_extra" — invisible field that bots fill in.
// If filled, return 200 without forwarding (so the bot thinks it succeeded but
// the message never reaches the channel). The webhook URL lives in
// DISCORD_CONTACT_WEBHOOK_URL (server-only env var); if unset, the route
// validates input but skips the webhook call.

const CATEGORIES = ["feedback", "suggestion", "bug", "studio_claim", "other"] as const;
type Category = (typeof CATEGORIES)[number];

// Discord embed colors per category
const CATEGORY_COLOR: Record<Category, number> = {
  feedback: 0x5865f2,      // Discord blue
  suggestion: 0x57f287,    // green
  bug: 0xed4245,           // red
  studio_claim: 0xf1c40f,  // amber
  other: 0x95a5a6,         // gray
};

const CATEGORY_LABEL: Record<Category, string> = {
  feedback: "Feedback",
  suggestion: "Suggestion",
  bug: "Bug report",
  studio_claim: "Studio claim",
  other: "Other",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_MESSAGE = 2000;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  let body: {
    name?: string;
    email?: string;
    category?: string;
    message?: string;
    website_url_extra?: string; // honeypot
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — silently succeed without forwarding.
  if (body.website_url_extra && body.website_url_extra.trim().length > 0) {
    return Response.json({ ok: true });
  }

  const name = (body.name ?? "").trim().slice(0, MAX_NAME);
  const email = (body.email ?? "").trim();
  const category = body.category as Category;
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE);

  // Validation
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (!message) {
    return Response.json({ ok: false, error: "Message required" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return Response.json({ ok: false, error: "Invalid category" }, { status: 400 });
  }

  const webhookUrl = process.env.DISCORD_CONTACT_WEBHOOK_URL;
  if (!webhookUrl) return Response.json({ ok: true, skipped: true });

  const ip = getClientIp(req);
  const fromValue = name
    ? `${name} <[${email}](mailto:${email})>`
    : `[${email}](mailto:${email})`;

  const embed = {
    title: `📨 New ${CATEGORY_LABEL[category].toLowerCase()}`,
    color: CATEGORY_COLOR[category],
    description: message,
    fields: [
      { name: "From", value: fromValue, inline: false },
      { name: "Category", value: CATEGORY_LABEL[category], inline: true },
      { name: "IP", value: ip, inline: true },
    ],
    footer: { text: "via arabicgames.directory" },
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
