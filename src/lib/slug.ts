export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  // For non-Latin names (e.g. Arabic), fall back to a timestamp-based slug
  if (!slug) {
    return `game-${Date.now()}`;
  }

  return slug;
}