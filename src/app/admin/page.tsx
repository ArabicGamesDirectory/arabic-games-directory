"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Submission = {
  id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  moderation_status: string;
  payload: {
    name: string;
    slug: string;
    developer: string | null;
    country: string;
    platforms: string[];
    genres: string[];
    short_description: string;
    gameplay_modes: string[] | null;
    game_engine: string | null;
    monetization: string[] | null;
    status: string;
    release_date: string | null;
    website_url: string | null;
    store_links: Record<string, string | null>;
  };
};

const STATUS_LABELS: Record<string, string> = {
  announced: "Announced",
  in_dev: "In Dev",
  early_access: "Early Access",
  released: "Released",
  cancelled: "Cancelled",
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadUserAndSubmissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);
    if (!user?.email) return;

    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      setMessage({ text: "This account is not allowed to access admin.", ok: false });
      return;
    }

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage({ text: error.message, ok: false });
      return;
    }

    setSubmissions((data as Submission[]) ?? []);
  }

  useEffect(() => {
    loadUserAndSubmissions();
  }, []);

  async function signIn() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, ok: false });
      return;
    }
    await loadUserAndSubmissions();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setSubmissions([]);
    setMessage(null);
  }

  async function approveSubmission(submission: Submission) {
    setMessage(null);
    setActionId(submission.id);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: "Approve failed: " + data.error, ok: false });
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setMessage({ text: `Approved: ${submission.payload.name}`, ok: true });
  }

  async function rejectSubmission(id: string) {
    setMessage(null);
    setActionId(id);
    const res = await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: "Reject failed: " + data.error, ok: false });
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setMessage({ text: "Submission rejected.", ok: true });
  }

  const inputClass =
    "w-full bg-c-surface border border-c-border rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-c-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-c-text mb-6">
            Admin login
          </h1>

          <div className="bg-c-surface border border-c-border rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-c-soft" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className={inputClass}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-c-soft" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className="text-sm text-red-500">{message.text}</p>
            )}

            <button
              onClick={signIn}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <Link
            href="/"
            className="block text-center mt-4 text-sm text-c-faint hover:text-c-muted transition-colors"
          >
            ← Back to directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-c-text">
            Admin review
          </h1>
          <p className="text-sm text-c-muted mt-1">Signed in as {userEmail}</p>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          Sign out
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm border ${
            message.ok
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="text-center py-16 text-c-muted">
          <p>No pending submissions.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((s) => (
            <article
              key={s.id}
              className="bg-c-surface border border-c-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-lg font-semibold text-c-text">{s.payload.name}</h2>
                  {s.payload.developer && (
                    <p className="text-xs text-c-faint mt-0.5">{s.payload.developer}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                  {STATUS_LABELS[s.payload.status] ?? s.payload.status}
                </span>
              </div>

              <p className="text-sm text-c-muted">
                {s.payload.country} · {s.payload.platforms.join(", ")}
                {s.payload.release_date ? ` · ${s.payload.release_date}` : ""}
              </p>

              <p className="text-sm text-c-soft mt-3 leading-relaxed">
                {s.payload.short_description}
              </p>

              <div className="flex gap-1.5 flex-wrap mt-3">
                {s.payload.genres.map((g) => (
                  <span key={g} className="text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                    {g}
                  </span>
                ))}
                {s.payload.gameplay_modes?.map((m) => (
                  <span key={m} className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
                {s.payload.monetization?.map((m) => (
                  <span key={m} className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
                {s.payload.game_engine && (
                  <span className="text-xs bg-c-tag text-c-faint px-2 py-0.5 rounded-full">
                    {s.payload.game_engine}
                  </span>
                )}
              </div>

              {s.payload.website_url && (
                <a
                  href={s.payload.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-sm text-indigo-500 hover:underline"
                >
                  {s.payload.website_url} ↗
                </a>
              )}

              <p className="text-xs text-c-faint mt-3">
                Submitted by: {s.submitter_name || "—"}
                {s.submitter_email ? ` (${s.submitter_email})` : ""}
              </p>

              <div className="flex gap-3 mt-4 pt-4 border-t border-c-border">
                <button
                  onClick={() => approveSubmission(s)}
                  disabled={actionId === s.id}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {actionId === s.id ? "Working..." : "Approve"}
                </button>
                <button
                  onClick={() => rejectSubmission(s.id)}
                  disabled={actionId === s.id}
                  className="px-4 py-2 bg-c-surface border border-c-border text-c-soft text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  {actionId === s.id ? "Working..." : "Reject"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
