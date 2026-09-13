// Server-side validation for public submissions.
//
// Until this existed, the submit forms wrote straight into the `*_submissions`
// tables with the anon key and the ONLY validation was client-side — so any
// script could insert arbitrary payload shapes, unbounded strings, unknown
// jsonb keys, or a thumbnail_url pointing anywhere on the internet.
//
// Every validator here returns a FRESHLY BUILT object. Client input is never
// spread into the result, so a field we don't know about cannot reach the DB
// no matter what the request body contains.

import { COUNTRY_OPTIONS } from "@/lib/countries";
import { PLATFORM_OPTIONS } from "@/lib/platforms";
import { STORE_LINK_KEYS, SOCIAL_LINK_KEYS } from "@/lib/linkKeys";
import { normalizeGenres } from "@/lib/genres";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";

export type EntityType = "game" | "studio" | "community";

export const GAME_STATUSES = [
  "announced", "in_dev", "prototype", "early_access",
  "released", "on_hold", "cancelled", "delisted",
] as const;
export const STUDIO_TYPES = ["individual", "team", "studio"] as const;
export const COMMUNITY_TYPES = ["online", "in_person", "hybrid"] as const;

// Generous caps — they exist to stop a 10 MB payload, not to second-guess a
// legitimate submitter.
const MAX_NAME = 200;
const MAX_DESCRIPTION = 5000;
const MAX_URL = 500;
const MAX_TAG = 100;
const MAX_ARRAY = 40;
const MAX_DEVELOPERS = 20;

class Invalid extends Error {}
function fail(msg: string): never {
  throw new Invalid(msg);
}

function reqStr(v: unknown, max: number, field: string): string {
  if (typeof v !== "string") fail(`${field} must be a string`);
  const s = (v as string).trim();
  if (!s) fail(`${field} is required`);
  if (s.length > max) fail(`${field} exceeds ${max} characters`);
  return s;
}

function optStr(v: unknown, max: number, field: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") fail(`${field} must be a string`);
  const s = (v as string).trim();
  if (!s) return null;
  if (s.length > max) fail(`${field} exceeds ${max} characters`);
  return s;
}

// Only http(s). Rejects javascript:, data:, file: etc. — these URLs are
// rendered as hrefs on public detail pages.
function optUrl(v: unknown, field: string): string | null {
  const s = optStr(v, MAX_URL, field);
  if (s === null) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    fail(`${field} is not a valid URL`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    fail(`${field} must be an http(s) URL`);
  }
  return s;
}

function strArray(
  v: unknown,
  field: string,
  opts: { min?: number; max?: number; maxLen?: number; allowed?: readonly string[] } = {}
): string[] {
  const { min = 0, max = MAX_ARRAY, maxLen = MAX_TAG, allowed } = opts;
  if (v === null || v === undefined) {
    if (min > 0) fail(`${field} is required`);
    return [];
  }
  if (!Array.isArray(v)) fail(`${field} must be an array`);
  if (v.length > max) fail(`${field} has too many entries (max ${max})`);
  const out: string[] = [];
  for (const raw of v) {
    if (typeof raw !== "string") fail(`${field} entries must be strings`);
    const s = raw.trim();
    if (!s) continue;
    if (s.length > maxLen) fail(`${field} entry exceeds ${maxLen} characters`);
    if (allowed && !allowed.includes(s)) fail(`${field} contains an unknown value`);
    if (!out.includes(s)) out.push(s);
  }
  if (out.length < min) fail(`${field} needs at least ${min} entry/entries`);
  return out;
}

function enumVal<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) {
    fail(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return v as T;
}

// A thumbnail_url is client-supplied, so without this check a submission could
// point the site's <img> at any host (tracking pixel, hotlink, NSFW bait). It
// must live in our own Supabase Storage bucket, which is only writable through
// /api/upload-thumbnail.
function optThumbnailUrl(v: unknown): string | null {
  const s = optStr(v, MAX_URL, "thumbnail_url");
  if (s === null) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) fail("server misconfigured");
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/thumbnails/`;
  if (!s.startsWith(prefix)) fail("thumbnail_url must be an uploaded thumbnail");
  return s;
}

function linkMap(v: unknown, keys: readonly string[], field: string): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (v === null || v === undefined) return out;
  if (typeof v !== "object" || Array.isArray(v)) fail(`${field} must be an object`);
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    // Unknown keys are dropped rather than rejected — the forms and the DB may
    // legitimately be a release apart on the key list.
    if (!keys.includes(k)) continue;
    out[k] = optUrl(val, `${field}.${k}`);
  }
  return out;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optReleaseDate(v: unknown, status: string): string | null {
  const s = optStr(v, 20, "release_date");
  if (s === null) return null;
  if (!DATE_RE.test(s)) fail("release_date must be YYYY-MM-DD");
  if (Number.isNaN(new Date(s).getTime())) fail("release_date is not a real date");
  // Mirrors the coercion in /api/approve so a disallowed status can never
  // carry a date through the queue in the first place.
  if (!statusAllowsReleaseDate(status)) return null;
  return s;
}

export type ValidationResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

function validateGame(p: Record<string, unknown>): Record<string, unknown> {
  const status = enumVal(p.status, GAME_STATUSES, "status");
  const genres = normalizeGenres(strArray(p.genres, "genres", { min: 1, max: 30 }));
  if (genres.length === 0) fail("genres needs at least 1 entry");
  return {
    name: reqStr(p.name, MAX_NAME, "name"),
    developers: strArray(p.developers, "developers", { min: 1, max: MAX_DEVELOPERS, maxLen: MAX_NAME }),
    country: strArray(p.country, "country", { min: 1, allowed: COUNTRY_OPTIONS }),
    platforms: strArray(p.platforms, "platforms", { min: 1, allowed: PLATFORM_OPTIONS }),
    genres,
    gameplay_modes: strArray(p.gameplay_modes, "gameplay_modes"),
    monetization: strArray(p.monetization, "monetization"),
    game_engine: optStr(p.game_engine, MAX_TAG, "game_engine"),
    short_description: reqStr(p.short_description, MAX_DESCRIPTION, "short_description"),
    status,
    release_date: optReleaseDate(p.release_date, status),
    website_url: optUrl(p.website_url, "website_url"),
    store_links: linkMap(p.store_links, STORE_LINK_KEYS, "store_links"),
    publishing_type:
      p.publishing_type === null || p.publishing_type === undefined || p.publishing_type === ""
        ? null
        : enumVal(p.publishing_type, ["self_published", "with_publisher"] as const, "publishing_type"),
    publisher_name:
      p.publishing_type === "with_publisher" ? optStr(p.publisher_name, MAX_NAME, "publisher_name") : null,
    thumbnail_url: optThumbnailUrl(p.thumbnail_url),
  };
}

function validateStudio(p: Record<string, unknown>): Record<string, unknown> {
  return {
    name: reqStr(p.name, MAX_NAME, "name"),
    // Enforced at the boundary so the auto-submit path can never reintroduce a
    // type outside this set (it once wrote "unspecified", which was invisible
    // to the homepage filter and rendered as a raw string).
    type: enumVal(p.type, STUDIO_TYPES, "type"),
    description: optStr(p.description, MAX_DESCRIPTION, "description"),
    country: strArray(p.country, "country", { min: 1, allowed: COUNTRY_OPTIONS }),
    website_url: optUrl(p.website_url, "website_url"),
    thumbnail_url: optThumbnailUrl(p.thumbnail_url),
  };
}

function validateCommunity(p: Record<string, unknown>): Record<string, unknown> {
  return {
    name: reqStr(p.name, MAX_NAME, "name"),
    type: enumVal(p.type, COMMUNITY_TYPES, "type"),
    description: optStr(p.description, MAX_DESCRIPTION, "description"),
    country: strArray(p.country, "country", { min: 1, allowed: COUNTRY_OPTIONS }),
    website_url: optUrl(p.website_url, "website_url"),
    // Topics allow free text: the form has an "Other" escape hatch, so we cap
    // length and count instead of restricting to the canonical list.
    topics: strArray(p.topics, "topics", { max: 20 }),
    social_links: linkMap(p.social_links, SOCIAL_LINK_KEYS, "social_links"),
    thumbnail_url: optThumbnailUrl(p.thumbnail_url),
  };
}

export function validateSubmission(entityType: EntityType, raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "payload must be an object" };
  }
  const p = raw as Record<string, unknown>;
  try {
    switch (entityType) {
      case "game": return { ok: true, payload: validateGame(p) };
      case "studio": return { ok: true, payload: validateStudio(p) };
      case "community": return { ok: true, payload: validateCommunity(p) };
      default: return { ok: false, error: "unknown entityType" };
    }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}
