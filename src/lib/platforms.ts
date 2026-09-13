// Single source of truth for platforms. Previously PLATFORM_OPTIONS lived in
// SubmitForm.tsx and PLATFORM_GROUPS in the homepage, which meant the two could
// drift silently. They're co-located here so a new platform is one edit.

export const PLATFORM_OPTIONS = [
  "iOS",
  "Android",
  "Pocket PC",
  "Nokia Symbian",
  "Windows",
  "macOS",
  "Linux",
  "DOS",
  "MSX",
  "Amstrad CPC",
  "Amiga",
  "Commodore 64",
  "Web",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "Nintendo 64",
  "Nintendo DS",
  "Nintendo 3DS",
  "GameBoy Advance",
  "PSP",
  "PSVITA",
] as const;

export type Platform = (typeof PLATFORM_OPTIONS)[number];

// Umbrella categories used by the homepage `?platform=` filter. No game row
// stores the literal string "PC" or "Mobile" — the query expands these to an
// `.overlaps()` against the group. `Web` is deliberately in neither (it's
// platform-agnostic and would dominate both), and retro/handheld platforms
// stay standalone so the umbrellas remain modern-only.
export const PLATFORM_GROUPS: Record<string, string[]> = {
  PC: ["Windows", "macOS", "Linux"],
  Mobile: ["iOS", "Android"],
};
