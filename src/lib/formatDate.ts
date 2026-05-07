// Format an ISO timestamp as a locale-aware medium date (e.g. "May 4, 2026"
// in en, "٤ مايو ٢٠٢٦" in ar). Returns null when the input is null/invalid so
// callers can short-circuit without rendering a stale "Invalid Date" string.
export function formatDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
