"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

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
    country: string;
    platforms: string[];
    genres: string[];
    short_description: string;
    status: string;
    release_date: string | null;
    website_url: string | null;
    store_links: Record<string, string | null>;
  };
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUserAndSubmissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);

    if (!user?.email) return;

    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      setMessage("This account is not allowed to access admin.");
      return;
    }

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
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

    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage("Approve failed: " + data.error);
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setMessage(`Approved: ${submission.payload.name}`);
  }

  async function rejectSubmission(id: string) {
    setMessage(null);

    const res = await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage("Reject failed: " + data.error);
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setMessage("Submission rejected.");
  }

  if (!userEmail) {
    return (
      <main style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin login</h1>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={signIn} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {message && <p>{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin review</h1>
          <p style={{ opacity: 0.7 }}>Signed in as {userEmail}</p>
        </div>
        <button onClick={signOut}>Sign out</button>
      </header>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {submissions.length === 0 ? (
          <p>No pending submissions.</p>
        ) : (
          submissions.map((s) => (
            <article
              key={s.id}
              style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{s.payload.name}</h2>
              <p style={{ opacity: 0.7, marginTop: 4 }}>
                {s.payload.country} • {s.payload.platforms.join(", ")} • {s.payload.status}
              </p>
              <p style={{ marginTop: 8 }}>{s.payload.short_description}</p>

              <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
                Genres: {s.payload.genres.join(", ")}
                <br />
                Submitter: {s.submitter_name || "—"} / {s.submitter_email || "—"}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                <button onClick={() => approveSubmission(s)}>Approve</button>
                <button onClick={() => rejectSubmission(s.id)}>Reject</button>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}