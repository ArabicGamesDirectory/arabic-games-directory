"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";

export default function SubmitPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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
    country: String(form.get("country") || "").trim(),
    platforms: String(form.get("platforms") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    genres: String(form.get("genres") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    short_description: String(form.get("short_description") || "").trim(),
    status: String(form.get("status") || "announced"),
    release_date: String(form.get("release_date") || "").trim() || null,
    website_url: String(form.get("website_url") || "").trim() || null,
    store_links: {
      Steam: String(form.get("steam") || "").trim() || null,
      "Google Play": String(form.get("google_play") || "").trim() || null,
      "App Store": String(form.get("app_store") || "").trim() || null,
      Itch: String(form.get("itch") || "").trim() || null,
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
    setDone("Error: " + error.message);
    return;
  }

  formEl.reset();
  setDone("Submitted! We’ll review and publish it soon.");
}

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Submit a game</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>Anyone can submit. We review and approve before it appears publicly.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <input name="name" placeholder="Game name" required />
        <input name="country" placeholder="Country (e.g., Iraq, Saudi Arabia)" required />
        <input name="platforms" placeholder="Platforms (comma separated: PC, Mobile, Console)" required />
        <input name="genres" placeholder="Genres (comma separated: Action, Puzzle...)" required />
        <textarea name="short_description" placeholder="Short description" required rows={4} />

        <select name="status" defaultValue="announced">
          <option value="announced">Announced</option>
          <option value="in_dev">In development</option>
          <option value="early_access">Early access</option>
          <option value="released">Released</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input name="release_date" placeholder="Release date (YYYY-MM-DD) optional" />
        <input name="website_url" placeholder="Website URL (optional)" />

        <h3 style={{ marginTop: 10, fontWeight: 600 }}>Store links (optional)</h3>
        <input name="steam" placeholder="Steam URL" />
        <input name="google_play" placeholder="Google Play URL" />
        <input name="app_store" placeholder="App Store URL" />
        <input name="itch" placeholder="itch.io URL" />

        <h3 style={{ marginTop: 10, fontWeight: 600 }}>Your info (optional)</h3>
        <input name="submitter_name" placeholder="Your name" />
        <input name="submitter_email" placeholder="Your email" />

        <button disabled={loading} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          {loading ? "Submitting..." : "Submit"}
        </button>

        {done && <p style={{ marginTop: 8 }}>{done}</p>}
      </form>
    </main>
  );
}