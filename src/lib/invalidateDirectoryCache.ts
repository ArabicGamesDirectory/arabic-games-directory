import { revalidateTag } from "next/cache";
import { DIRECTORY_CACHE_TAG } from "@/lib/cache";

/**
 * Expire every cached public read. Call after any write that changes what the
 * public site shows (approve, delete). `expire: 0` makes the very next request
 * refetch, so the admin sees an approved entry live straight away rather than
 * one stale render later (which is what the "max" profile would give).
 */
export function invalidateDirectoryCache() {
  revalidateTag(DIRECTORY_CACHE_TAG, { expire: 0 });
}
