"use client";

// TODO: Run this migration in the Supabase SQL editor before deploying:
//
// ALTER TABLE games
//   ADD COLUMN IF NOT EXISTS gameplay_modes text[] DEFAULT '{}',
//   ADD COLUMN IF NOT EXISTS game_engine     text,
//   ADD COLUMN IF NOT EXISTS monetization    text[] DEFAULT '{}',
//   ADD COLUMN IF NOT EXISTS developer       text;

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import Link from "next/link";

const PLATFORM_OPTIONS = [
  "iOS", "Android", "Windows", "macOS", "Linux",
  "Web", "PlayStation", "Xbox", "Nintendo Switch",
];

const GAMEPLAY_MODE_OPTIONS = [
  "Single Player", "Multiplayer", "Co-op", "PvP", "MMO",
];

const MONETIZATION_OPTIONS = [
  "Free", "Premium", "Ads", "In-App Purchases", "Subscription",
];

export default function SubmitPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();

    const payload = {
      name,
      slug: slugify(name),
      developer: String(form.get("developer") || "").trim() || null,
      country: String(form.get("country") || "").trim(),
      platforms: form.getAll("platforms") as string[],
      genres: String(form.get("genres") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      gameplay_modes: form.getAll("gameplay_modes") as string[],
      game_engine: String(form.get("game_engine") || "").trim() || null,
      monetization: form.getAll("monetization") as string[],
      short_description: String(form.get("short_description") || "").trim(),
      status: String(form.get("status") || "announced"),
      release_date: String(form.get("release_date") || "").trim() || null,
      website_url: String(form.get("website_url") || "").trim() || null,
      store_links: {
        Steam: String(form.get("steam") || "").trim() || null,
        "Google Play": String(form.get("google_play") || "").trim() || null,
        "App Store": String(form.get("app_store") || "").trim() || null,
        Itch: String(form.get("itch") || "").trim() || null,
        Others: String(form.get("others") || "").trim() || null,
        PlayStation: String(form.get("playstation") || "").trim() || null,
        Xbox: String(form.get("xbox") || "").trim() || null,
        Nintendo: String(form.get("nintendo") || "").trim() || null,
      },
    };

    const submitter_name = String(form.get("submitter_name") || "").trim() || null;
    const submitter_email = String(form.get("submitter_email") || "").trim() || null;

    const { error } = await supabase.from("submissions").insert({
      submitter_name,
      submitter_email,
      payload,
      moderation_status: "pending",
    });

    setLoading(false);

    if (error) {
      setDone({ ok: false, message: "Error: " + error.message });
      return;
    }

    formEl.reset();
    setDone({ ok: true, message: "Submitted! We'll review and publish it soon." });
  }

  const inputClass =
    "w-full bg-c-surface border border-c-border rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-c-muted hover:text-c-text transition-colors">
        ← Back to directory
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">Submit a game</h1>
        <p className="text-c-muted text-sm mt-1">
          Anyone can submit. We review and approve before it appears publicly.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Game info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            Game info
          </h2>

          <Field label="Game name" required>
            <input id="name" name="name" required className={inputClass} placeholder="e.g. Desert Quest" />
          </Field>

          <Field label="Developer / Studio">
            <input id="developer" name="developer" className={inputClass} placeholder="e.g. Semaphore Studios" />
          </Field>

          <Field label="Country" required>
            <input id="country" name="country" required className={inputClass} placeholder="e.g. Iraq, Saudi Arabia, Egypt" />
          </Field>

          <Field label="Short description" required>
            <textarea
              id="short_description"
              name="short_description"
              required
              rows={4}
              className={inputClass + " resize-none"}
              placeholder="A brief description of the game"
            />
          </Field>

          <Field label="Genres" required hint="Comma separated">
            <input id="genres" name="genres" required className={inputClass} placeholder="Action, Puzzle, RPG" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select id="status" name="status" defaultValue="announced" className={inputClass}>
                <option value="announced">Announced</option>
                <option value="in_dev">In development</option>
                <option value="early_access">Early access</option>
                <option value="released">Released</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Release date">
              <input id="release_date" name="release_date" type="date" className={inputClass} />
            </Field>
          </div>

          <Field label="Website URL">
            <input id="website_url" name="website_url" type="url" className={inputClass} placeholder="https://..." />
          </Field>
        </div>

        {/* Platforms, modes, engine, monetization */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            Platform &amp; gameplay details
          </h2>

          <Field label="Platforms" required>
            <CheckboxGroup name="platforms" options={PLATFORM_OPTIONS} />
          </Field>

          <Field label="Gameplay modes">
            <CheckboxGroup name="gameplay_modes" options={GAMEPLAY_MODE_OPTIONS} />
          </Field>

          <Field label="Game engine">
            <input
              name="game_engine"
              list="engine-options"
              className={inputClass}
              placeholder="e.g. Unity, Unreal Engine, Godot"
            />
            <datalist id="engine-options">
              {["Unity", "Unreal Engine", "Godot", "GameMaker", "Cocos2d", "LibGDX", "Custom Engine"].map(
                (e) => <option key={e} value={e} />
              )}
            </datalist>
          </Field>

          <Field label="Monetization">
            <CheckboxGroup name="monetization" options={MONETIZATION_OPTIONS} />
          </Field>
        </div>

        {/* Store links */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            Store links{" "}
            <span className="font-normal normal-case text-c-faint">(optional)</span>
          </h2>

          {[
            { id: "steam",       label: "Steam",         placeholder: "https://store.steampowered.com/app/..." },
            { id: "google_play", label: "Google Play",   placeholder: "https://play.google.com/store/apps/..." },
            { id: "app_store",   label: "App Store",     placeholder: "https://apps.apple.com/..." },
            { id: "playstation", label: "PlayStation",   placeholder: "https://store.playstation.com/..." },
            { id: "xbox",        label: "Xbox",          placeholder: "https://www.xbox.com/games/store/..." },
            { id: "nintendo",    label: "Nintendo",      placeholder: "https://www.nintendo.com/store/..." },
            { id: "itch",        label: "itch.io",       placeholder: "https://itch.io/..." },
            { id: "others",      label: "Others",        placeholder: "Any other store or platform URL" },
          ].map(({ id, label, placeholder }) => (
            <Field key={id} label={label}>
              <input id={id} name={id} type="url" className={inputClass} placeholder={placeholder} />
            </Field>
          ))}
        </div>

        {/* Submitter info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            Your info{" "}
            <span className="font-normal normal-case text-c-faint">(optional)</span>
          </h2>

          <Field label="Name">
            <input id="submitter_name" name="submitter_name" className={inputClass} placeholder="Your name" />
          </Field>

          <Field label="Email">
            <input id="submitter_email" name="submitter_email" type="email" className={inputClass} placeholder="you@example.com" />
          </Field>
        </div>

        {done && (
          <div
            className={`p-4 rounded-lg text-sm border ${
              done.ok
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20"
            }`}
          >
            {done.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Submitting..." : "Submit game"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-c-soft">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-c-faint font-normal ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-1.5 bg-c-bg border border-c-border rounded-lg px-3 py-1.5 text-sm text-c-soft cursor-pointer hover:border-c-border-hover has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-colors select-none"
        >
          <input type="checkbox" name={name} value={opt} className="sr-only" />
          {opt}
        </label>
      ))}
    </div>
  );
}
