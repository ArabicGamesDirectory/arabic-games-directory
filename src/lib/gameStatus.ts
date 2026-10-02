export const STATUSES_WITH_RELEASE_DATE = new Set([
  "prototype",
  "early_access",
  "released",
  "delisted",
]);

export function statusAllowsReleaseDate(status: string | null | undefined): boolean {
  return !!status && STATUSES_WITH_RELEASE_DATE.has(status);
}

// Badge colours per game status — opacity-based so they work in both themes.
// cancelled / delisted are deliberately muted.
export const STATUS_CLASSES: Record<string, string> = {
  announced: "bg-blue-500/15 text-blue-500",
  in_dev: "bg-amber-500/15 text-amber-500",
  prototype: "bg-cyan-500/15 text-cyan-500",
  early_access: "bg-purple-500/15 text-purple-500",
  released: "bg-emerald-500/15 text-emerald-500",
  on_hold: "bg-orange-500/15 text-orange-500",
  cancelled: "bg-c-tag text-c-muted",
  delisted: "bg-c-tag text-c-muted",
};
