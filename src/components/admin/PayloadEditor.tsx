"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { PLATFORM_OPTIONS } from "@/lib/platforms";
import { GENRE_VALUES } from "@/lib/genres";
import { COMMUNITY_TOPIC_VALUES } from "@/lib/communityTopics";
import { STORE_LINK_KEYS, SOCIAL_LINK_KEYS } from "@/lib/linkKeys";
import { statusAllowsReleaseDate } from "@/lib/gameStatus";
import {
  GAME_STATUSES,
  STUDIO_TYPES,
  COMMUNITY_TYPES,
  type EntityType,
} from "@/lib/validateSubmission";

// Inline editor for a pending submission's payload on the admin page
// ("edit before approve"). The server re-validates everything with
// validateSubmission(), so this only has to produce the right shape — it does
// no validation of its own beyond what the inputs constrain.

// Mirrors the option lists in SubmitForm.tsx (which pairs them with i18n
// labels). Values outside these lists are still allowed — the validator accepts
// free text for these fields — and show up as removable "custom" chips.
const STATUS_LABELS: Record<string, string> = {
  announced: "Announced",
  in_dev: "In Dev",
  prototype: "Prototype",
  early_access: "Early Access",
  released: "Released",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  delisted: "Delisted",
};
const PUBLISHING_LABELS: Record<string, string> = {
  self_published: "Self-published",
  with_publisher: "With a publisher",
};
const GAMEPLAY_MODE_VALUES = ["Single Player", "Multiplayer", "Co-op", "PvP", "MMO"];
const MONETIZATION_VALUES = ["Free", "Premium", "Ads", "In-App Purchases", "Subscription"];

type Field =
  | { key: string; label: string; kind: "text" | "url" | "textarea" | "date" }
  | {
      key: string;
      label: string;
      kind: "select";
      options: readonly string[];
      labels?: Record<string, string>;
      allowEmpty?: boolean;
    }
  | { key: string; label: string; kind: "multi"; options: readonly string[]; allowCustom?: boolean }
  | { key: string; label: string; kind: "list" }
  | { key: string; label: string; kind: "links"; keys: readonly string[] }
  | { key: string; label: string; kind: "thumbnail" };

const FIELDS: Record<EntityType, Field[]> = {
  game: [
    { key: "name", label: "Name", kind: "text" },
    { key: "developers", label: "Developers (comma-separated)", kind: "list" },
    { key: "short_description", label: "Description", kind: "textarea" },
    { key: "status", label: "Status", kind: "select", options: GAME_STATUSES, labels: STATUS_LABELS },
    { key: "release_date", label: "Release date", kind: "date" },
    { key: "country", label: "Country", kind: "multi", options: COUNTRY_OPTIONS },
    { key: "platforms", label: "Platforms", kind: "multi", options: PLATFORM_OPTIONS },
    { key: "genres", label: "Genres", kind: "multi", options: GENRE_VALUES, allowCustom: true },
    { key: "gameplay_modes", label: "Gameplay modes", kind: "multi", options: GAMEPLAY_MODE_VALUES, allowCustom: true },
    { key: "monetization", label: "Monetization", kind: "multi", options: MONETIZATION_VALUES, allowCustom: true },
    { key: "game_engine", label: "Game engine", kind: "text" },
    { key: "website_url", label: "Website URL", kind: "url" },
    { key: "store_links", label: "Store links", kind: "links", keys: STORE_LINK_KEYS },
    { key: "publishing_type", label: "Publishing", kind: "select", options: ["self_published", "with_publisher"], labels: PUBLISHING_LABELS, allowEmpty: true },
    { key: "publisher_name", label: "Publisher", kind: "text" },
    { key: "thumbnail_url", label: "Thumbnail", kind: "thumbnail" },
  ],
  studio: [
    { key: "name", label: "Name", kind: "text" },
    { key: "type", label: "Type", kind: "select", options: STUDIO_TYPES },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "country", label: "Country", kind: "multi", options: COUNTRY_OPTIONS },
    { key: "website_url", label: "Website URL", kind: "url" },
    { key: "thumbnail_url", label: "Thumbnail", kind: "thumbnail" },
  ],
  community: [
    { key: "name", label: "Name", kind: "text" },
    { key: "type", label: "Type", kind: "select", options: COMMUNITY_TYPES },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "country", label: "Country", kind: "multi", options: COUNTRY_OPTIONS },
    { key: "topics", label: "Topics", kind: "multi", options: COMMUNITY_TOPIC_VALUES, allowCustom: true },
    { key: "website_url", label: "Website URL", kind: "url" },
    { key: "social_links", label: "Social links", kind: "links", keys: SOCIAL_LINK_KEYS },
    { key: "thumbnail_url", label: "Thumbnail", kind: "thumbnail" },
  ],
};

type Draft = Record<string, unknown>;

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v) return [v]; // legacy single-value country
  return [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Editable copy of a payload. `list` fields are held as the raw comma-separated
 * text while editing so typing "a, " isn't immediately re-normalised.
 */
function toDraft(entity: EntityType, payload: Record<string, unknown>): Draft {
  const draft: Draft = {};
  for (const f of FIELDS[entity]) {
    const v = payload[f.key];
    if (f.kind === "list") {
      // Legacy game payloads carry a single `developer` string.
      const list = asArray(v).length ? asArray(v) : asArray(payload.developer);
      draft[f.key] = list.join(", ");
    } else if (f.kind === "multi") {
      draft[f.key] = asArray(v);
    } else if (f.kind === "links") {
      draft[f.key] = { ...((v as Record<string, string | null> | null) ?? {}) };
    } else {
      draft[f.key] = asString(v);
    }
  }
  return draft;
}

function toPayload(entity: EntityType, draft: Draft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS[entity]) {
    const v = draft[f.key];
    if (f.kind === "list") {
      out[f.key] = asString(v).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (f.kind === "links") {
      const links: Record<string, string | null> = {};
      for (const [k, url] of Object.entries((v as Record<string, string | null>) ?? {})) {
        links[k] = url?.trim() ? url.trim() : null;
      }
      out[f.key] = links;
    } else if (f.kind === "multi") {
      out[f.key] = v;
    } else {
      out[f.key] = asString(v).trim() || null;
    }
  }
  if (entity === "game") {
    if (!statusAllowsReleaseDate(asString(out.status))) out.release_date = null;
    if (out.publishing_type !== "with_publisher") out.publisher_name = null;
  }
  return out;
}

const inputCls =
  "w-full bg-c-bg border border-c-border rounded-lg px-3 py-2 text-sm text-c-text focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function PayloadEditor({
  entity,
  initial,
  busy,
  onSave,
  onApprove,
  onCancel,
}: {
  entity: EntityType;
  initial: Record<string, unknown>;
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => void;
  onApprove: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin");
  const [draft, setDraft] = useState<Draft>(() => toDraft(entity, initial));
  const [customText, setCustomText] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  function hidden(f: Field): boolean {
    if (entity !== "game") return false;
    if (f.key === "release_date") return !statusAllowsReleaseDate(asString(draft.status));
    if (f.key === "publisher_name") return draft.publishing_type !== "with_publisher";
    return false;
  }

  function renderField(f: Field) {
    switch (f.kind) {
      case "text":
      case "url":
      case "date":
        return (
          <input
            type={f.kind === "date" ? "date" : "text"}
            dir="auto"
            value={asString(draft[f.key])}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          />
        );
      case "list":
        return (
          <input
            type="text"
            dir="auto"
            value={asString(draft[f.key])}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          />
        );
      case "textarea":
        return (
          <textarea
            dir="auto"
            rows={5}
            value={asString(draft[f.key])}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          />
        );
      case "select":
        return (
          <select
            value={asString(draft[f.key])}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputCls}
          >
            {f.allowEmpty && <option value="">—</option>}
            {f.options.map((o) => (
              <option key={o} value={o}>
                {f.labels?.[o] ?? o}
              </option>
            ))}
          </select>
        );
      case "multi": {
        const selected = asArray(draft[f.key]);
        const custom = selected.filter((v) => !f.options.includes(v));
        const toggle = (v: string) =>
          set(f.key, selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
        const addCustom = () => {
          const v = (customText[f.key] ?? "").trim();
          if (v && !selected.some((x) => x.toLowerCase() === v.toLowerCase())) set(f.key, [...selected, v]);
          setCustomText((c) => ({ ...c, [f.key]: "" }));
        };
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {[...f.options, ...custom].map((o) => {
                const on = selected.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(o)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      on
                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-500"
                        : "bg-c-bg border-c-border text-c-muted hover:text-c-text"
                    }`}
                  >
                    {o}
                    {on && custom.includes(o) ? " ×" : ""}
                  </button>
                );
              })}
            </div>
            {f.allowCustom && (
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="auto"
                  value={customText[f.key] ?? ""}
                  onChange={(e) => setCustomText((c) => ({ ...c, [f.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder={t("editAddOther")}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="shrink-0 px-3 text-xs border border-c-border rounded-lg text-c-soft hover:text-c-text"
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      }
      case "links": {
        const links = (draft[f.key] as Record<string, string | null>) ?? {};
        return (
          <div className="grid gap-2">
            {f.keys.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs text-c-muted">{k}</span>
                <input
                  type="text"
                  value={links[k] ?? ""}
                  onChange={(e) => set(f.key, { ...links, [k]: e.target.value })}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        );
      }
      case "thumbnail": {
        const url = asString(draft[f.key]);
        return url ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-40 aspect-[460/215] object-cover rounded-md" />
            <button
              type="button"
              onClick={() => set(f.key, "")}
              className="text-xs text-red-500 hover:underline"
            >
              {t("editRemoveThumbnail")}
            </button>
          </div>
        ) : (
          <p className="text-sm text-c-faint">—</p>
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      {FIELDS[entity].filter((f) => !hidden(f)).map((f) => (
        <div key={f.key} className="space-y-1">
          <span className="text-xs font-medium text-c-faint uppercase tracking-wide">{f.label}</span>
          {renderField(f)}
        </div>
      ))}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove(toPayload(entity, draft))}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {busy ? t("working") : t("editSaveApprove")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(toPayload(entity, draft))}
          className="px-4 py-2 bg-c-surface border border-c-border text-c-soft text-sm font-medium rounded-lg hover:text-c-text disabled:opacity-50 transition-colors"
        >
          {t("editSave")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="px-4 py-2 text-sm text-c-muted hover:text-c-text disabled:opacity-50 transition-colors"
        >
          {t("editCancel")}
        </button>
      </div>
    </div>
  );
}
