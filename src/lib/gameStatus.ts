export const STATUSES_WITH_RELEASE_DATE = new Set([
  "prototype",
  "early_access",
  "released",
  "delisted",
]);

export function statusAllowsReleaseDate(status: string | null | undefined): boolean {
  return !!status && STATUSES_WITH_RELEASE_DATE.has(status);
}
