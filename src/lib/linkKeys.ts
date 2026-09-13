// Canonical jsonb keys for games.store_links and communities.social_links.
// The submit forms render inputs from these and the server validator rejects
// anything outside them, so an attacker can't stuff arbitrary keys into the
// jsonb blob that detail pages iterate with Object.entries().

export const STORE_LINK_KEYS = [
  "Steam",
  "Google Play",
  "App Store",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "Itch",
  "Others",
] as const;

export const SOCIAL_LINK_KEYS = [
  "Discord",
  "Telegram",
  "WhatsApp",
  "Reddit",
  "Facebook",
  "X (Twitter)",
  "YouTube",
  "Twitch",
  "Instagram",
  "Others",
] as const;
