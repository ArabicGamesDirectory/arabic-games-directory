"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

// useState replacement that persists each state slice to localStorage under a
// per-field key, so a partially-filled form survives an accidental tab close
// or refresh. Drop-in: same return shape as useState.
//
// Pass `enabled: false` to fall back to plain useState — used during the
// update flow where we WANT initialData to win and don't want a stale draft
// from a previous submission to shadow the existing entry being edited.
//
// Storage key strategy: callers pass a stable string like "submit-game:name".
// All keys for a single form share a prefix so the form can wipe its whole
// draft after a successful submit by iterating localStorage.
export function useDraftState<T>(
  key: string,
  initial: T,
  enabled: boolean = true
): [T, Dispatch<SetStateAction<T>>] {
  // Initial read — synchronous so the first render already shows the draft.
  // SSR-safe: typeof window check guards against the server pass.
  const [state, setState] = useState<T>(() => {
    if (!enabled || typeof window === "undefined") return initial;
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return initial;
      return JSON.parse(saved) as T;
    } catch {
      return initial;
    }
  });

  // Skip the very first persist — we just read the value, no need to write
  // it back. Subsequent state changes flow through.
  const isFirstWrite = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (isFirstWrite.current) {
      isFirstWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state, enabled]);

  return [state, setState];
}

// Wipe every key under a given prefix. Used after successful submit so the
// next visit to the form starts blank.
export function clearDraft(prefix: string) {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {}
}
