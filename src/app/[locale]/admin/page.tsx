"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Submission = {
  id: string;
  game_id: string | null;
  moderation_status: string;
  payload: {
    name: string;
    slug: string;
    developer: string | null;
    country: string[] | string;
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
    publishing_type: string | null;
    publisher_name: string | null;
  };
};

type Game = {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
  country: string[];
  platforms: string[];
  genres: string[];
  gameplay_modes: string[] | null;
  game_engine: string | null;
  monetization: string[] | null;
  short_description: string;
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
  publishing_type: string | null;
  publisher_name: string | null;
};

type StudioSubmission = {
  id: string;
  studio_id: string | null;
  moderation_status: string;
  payload: {
    name: string;
    slug: string;
    type: string;
    description: string | null;
    country: string[] | string;
    website_url: string | null;
  };
};

type Studio = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
};

type CommunitySubmission = {
  id: string;
  community_id: string | null;
  moderation_status: string;
  payload: {
    name: string;
    slug: string;
    type: string;
    description: string | null;
    country: string[] | string;
    website_url: string | null;
    social_links: Record<string, string | null> | null;
    topics: string[] | null;
  };
};

type Community = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
  social_links: Record<string, string | null> | null;
  topics: string[] | null;
};

type ApprovedGame = {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
};

type ApprovedStudio = {
  id: string;
  slug: string;
  name: string;
  type: string;
};

type ApprovedCommunity = {
  id: string;
  slug: string;
  name: string;
  type: string;
};

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

function normalizeVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return [...v].sort().join(",");
  return String(v);
}

function fieldChanged(newVal: unknown, oldVal: unknown): boolean {
  return normalizeVal(newVal) !== normalizeVal(oldVal);
}

function arrayToDisplay(v: string[] | string | null | undefined): string {
  if (!v) return "—";
  return [v].flat().join(", ") || "—";
}

function storeLinksToDisplay(links: Record<string, string | null> | null | undefined): string {
  if (!links) return "—";
  const entries = Object.entries(links).filter(([, val]) => val);
  return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join("\n") : "—";
}

function storeLinksChanged(
  newLinks: Record<string, string | null> | null | undefined,
  oldLinks: Record<string, string | null> | null | undefined
): boolean {
  return normalizeVal(storeLinksToDisplay(newLinks)) !== normalizeVal(storeLinksToDisplay(oldLinks));
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [originalGames, setOriginalGames] = useState<Record<string, Game>>({});
  const [studioSubmissions, setStudioSubmissions] = useState<StudioSubmission[]>([]);
  const [originalStudios, setOriginalStudios] = useState<Record<string, Studio>>({});
  const [communitySubmissions, setCommunitySubmissions] = useState<CommunitySubmission[]>([]);
  const [originalCommunities, setOriginalCommunities] = useState<Record<string, Community>>({});
  const [approvedGames, setApprovedGames] = useState<ApprovedGame[]>([]);
  const [approvedStudios, setApprovedStudios] = useState<ApprovedStudio[]>([]);
  const [approvedCommunities, setApprovedCommunities] = useState<ApprovedCommunity[]>([]);
  const [activeTab, setActiveTab] = useState<"games" | "studios" | "communities" | "published">("games");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadUserAndSubmissions() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Invalid/expired refresh token — clear it and show the login form.
    if (authError) {
      await supabase.auth.signOut();
      setUserEmail(null);
      return;
    }

    setUserEmail(user?.email ?? null);
    if (!user?.email) return;

    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      setMessage({ text: t("notAllowed"), ok: false });
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

    const subs = (data as Submission[]) ?? [];
    setSubmissions(subs);

    // Batch-fetch original games for update submissions
    const gameIds = subs
      .map((s) => s.game_id)
      .filter((id): id is string => !!id);

    if (gameIds.length > 0) {
      const { data: games } = await supabase
        .from("games")
        .select("*")
        .in("id", gameIds);

      if (games) {
        const map: Record<string, Game> = {};
        for (const g of games as Game[]) {
          map[g.id] = g;
        }
        setOriginalGames(map);
      }
    }

    // Fetch pending studio submissions
    const { data: studioData } = await supabase
      .from("studio_submissions")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true });

    const studioSubs = (studioData as StudioSubmission[]) ?? [];
    setStudioSubmissions(studioSubs);

    // Batch-fetch original studios for update submissions
    const studioIds = studioSubs
      .map((s) => s.studio_id)
      .filter((id): id is string => !!id);

    if (studioIds.length > 0) {
      const { data: studios } = await supabase
        .from("studios")
        .select("*")
        .in("id", studioIds);

      if (studios) {
        const map: Record<string, Studio> = {};
        for (const st of studios as Studio[]) {
          map[st.id] = st;
        }
        setOriginalStudios(map);
      }
    }

    // Fetch pending community submissions
    const { data: communityData } = await supabase
      .from("community_submissions")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: true });

    const communitySubs = (communityData as CommunitySubmission[]) ?? [];
    setCommunitySubmissions(communitySubs);

    // Batch-fetch original communities for update submissions
    const communityIds = communitySubs
      .map((s) => s.community_id)
      .filter((id): id is string => !!id);

    if (communityIds.length > 0) {
      const { data: communities } = await supabase
        .from("communities")
        .select("*")
        .in("id", communityIds);

      if (communities) {
        const map: Record<string, Community> = {};
        for (const c of communities as Community[]) {
          map[c.id] = c;
        }
        setOriginalCommunities(map);
      }
    }

    // Fetch all approved games, studios, and communities for the Published tab
    const { data: approved } = await supabase
      .from("games")
      .select("id, slug, name, developer")
      .order("created_at", { ascending: false });
    setApprovedGames((approved as ApprovedGame[]) ?? []);

    const { data: approvedStudiosData } = await supabase
      .from("studios")
      .select("id, slug, name, type")
      .order("created_at", { ascending: false });
    setApprovedStudios((approvedStudiosData as ApprovedStudio[]) ?? []);

    const { data: approvedCommunitiesData } = await supabase
      .from("communities")
      .select("id, slug, name, type")
      .order("created_at", { ascending: false });
    setApprovedCommunities((approvedCommunitiesData as ApprovedCommunity[]) ?? []);
  }

  useEffect(() => {
    loadUserAndSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setOriginalGames({});
    setStudioSubmissions([]);
    setOriginalStudios({});
    setCommunitySubmissions([]);
    setOriginalCommunities({});
    setApprovedGames([]);
    setApprovedStudios([]);
    setApprovedCommunities([]);
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
      setMessage({ text: t("approveFailed", { error: data.error }), ok: false });
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setMessage({ text: t("approved", { name: submission.payload.name }), ok: true });
  }

  async function approveStudio(submission: StudioSubmission) {
    setMessage(null);
    setActionId(submission.id);
    const res = await fetch("/api/approve-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: t("approveFailed", { error: data.error }), ok: false });
      return;
    }
    setStudioSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setMessage({ text: t("approvedStudio", { name: submission.payload.name }), ok: true });
  }

  async function rejectStudio(id: string) {
    setMessage(null);
    setActionId(id);
    const res = await fetch("/api/reject-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: t("rejectFailed", { error: data.error }), ok: false });
      return;
    }
    setStudioSubmissions((prev) => prev.filter((s) => s.id !== id));
    setMessage({ text: t("rejected"), ok: true });
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
      setMessage({ text: t("rejectFailed", { error: data.error }), ok: false });
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setMessage({ text: t("rejected"), ok: true });
  }

  async function deleteGame(id: string, name: string) {
    if (!confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
    setMessage(null);
    setDeletingId(id);
    const res = await fetch("/api/delete-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      setMessage({ text: `Delete failed: ${data.error}`, ok: false });
      return;
    }
    setApprovedGames((prev) => prev.filter((g) => g.id !== id));
    setMessage({ text: `"${name}" deleted.`, ok: true });
  }

  async function deleteStudio(id: string, name: string) {
    if (!confirm(`Delete studio "${name}" permanently? This cannot be undone.`)) return;
    setMessage(null);
    setDeletingId(id);
    const res = await fetch("/api/delete-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      setMessage({ text: `Delete failed: ${data.error}`, ok: false });
      return;
    }
    setApprovedStudios((prev) => prev.filter((s) => s.id !== id));
    setMessage({ text: `"${name}" deleted.`, ok: true });
  }

  async function approveCommunity(submission: CommunitySubmission) {
    setMessage(null);
    setActionId(submission.id);
    const res = await fetch("/api/approve-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: t("approveFailed", { error: data.error }), ok: false });
      return;
    }
    setCommunitySubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setMessage({ text: t("approvedCommunity", { name: submission.payload.name }), ok: true });
  }

  async function rejectCommunity(id: string) {
    setMessage(null);
    setActionId(id);
    const res = await fetch("/api/reject-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setMessage({ text: t("rejectFailed", { error: data.error }), ok: false });
      return;
    }
    setCommunitySubmissions((prev) => prev.filter((s) => s.id !== id));
    setMessage({ text: t("rejected"), ok: true });
  }

  async function deleteCommunity(id: string, name: string) {
    if (!confirm(`Delete community "${name}" permanently? This cannot be undone.`)) return;
    setMessage(null);
    setDeletingId(id);
    const res = await fetch("/api/delete-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      setMessage({ text: `Delete failed: ${data.error}`, ok: false });
      return;
    }
    setApprovedCommunities((prev) => prev.filter((c) => c.id !== id));
    setMessage({ text: `"${name}" deleted.`, ok: true });
  }

  const inputClass =
    "w-full bg-c-surface border border-c-border rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-c-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-c-text mb-6">
            {t("loginTitle")}
          </h1>

          <div className="bg-c-surface border border-c-border rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-c-soft" htmlFor="email">
                {t("fieldEmail")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className={inputClass}
                placeholder={t("placeholderEmail")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-c-soft" htmlFor="password">
                {t("fieldPassword")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className={inputClass}
                placeholder={t("placeholderPassword")}
              />
            </div>

            {message && <p className="text-sm text-red-500">{message.text}</p>}

            <button
              onClick={signIn}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </div>

          <Link
            href="/"
            className="block text-center mt-4 text-sm text-c-faint hover:text-c-muted transition-colors"
          >
            {tCommon("backToDirectory")}
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
            {t("reviewTitle")}
          </h1>
          <p className="text-sm text-c-muted mt-1">
            {t("signedInAs", { email: userEmail })}
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-c-muted hover:text-c-text transition-colors"
        >
          {t("signOut")}
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

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-c-surface border border-c-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("games")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "games"
              ? "bg-c-bg text-c-text shadow-sm"
              : "text-c-muted hover:text-c-text"
          }`}
        >
          {t("tabGames")}{submissions.length > 0 ? ` (${submissions.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("studios")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "studios"
              ? "bg-c-bg text-c-text shadow-sm"
              : "text-c-muted hover:text-c-text"
          }`}
        >
          {t("tabStudios")}{studioSubmissions.length > 0 ? ` (${studioSubmissions.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("communities")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "communities"
              ? "bg-c-bg text-c-text shadow-sm"
              : "text-c-muted hover:text-c-text"
          }`}
        >
          {t("tabCommunities")}{communitySubmissions.length > 0 ? ` (${communitySubmissions.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("published")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "published"
              ? "bg-c-bg text-c-text shadow-sm"
              : "text-c-muted hover:text-c-text"
          }`}
        >
          Published{approvedGames.length > 0 ? ` (${approvedGames.length})` : ""}
        </button>
      </div>

      {/* Games tab */}
      {activeTab === "games" && (submissions.length === 0 ? (
        <div className="text-center py-16 text-c-muted">
          <p>{t("noPending")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((s) => {
            const original = s.game_id ? originalGames[s.game_id] : null;
            const isExpanded = expandedId === s.id;
            const countries = [s.payload.country].flat();

            return (
              <article
                key={s.id}
                className="bg-c-surface border border-c-border rounded-xl overflow-hidden"
              >
                {/* Compact header — always visible */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-c-text">
                          {s.payload.name}
                        </h2>
                        {s.game_id && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                            {t("updateBadge")}
                          </span>
                        )}
                      </div>
                      {s.payload.developer && (
                        <p className="text-xs text-c-faint mt-0.5">
                          {s.payload.developer}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs bg-c-tag text-c-tag-text px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[s.payload.status] ?? s.payload.status}
                    </span>
                  </div>

                  <p className="text-sm text-c-muted">
                    {countries.join(", ")} · {s.payload.platforms.join(", ")}
                    {s.payload.release_date ? ` · ${s.payload.release_date}` : ""}
                  </p>

                  <p className="text-sm text-c-soft mt-3 leading-relaxed">
                    {s.payload.short_description}
                  </p>

                  {/* Toggle details */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    {isExpanded ? t("hideDetails") : t("viewDetails")} {isExpanded ? "↑" : "↓"}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-c-border px-5 py-4 space-y-4">
                    {s.game_id && original && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/games/${original.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          {t("viewCurrentGame")}
                        </a>
                      </div>
                    )}

                    <DetailRow
                      label="Name"
                      value={s.payload.name}
                      oldValue={original?.name}
                      changed={!!original && fieldChanged(s.payload.name, original.name)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Developer"
                      value={s.payload.developer || "—"}
                      oldValue={original?.developer}
                      changed={!!original && fieldChanged(s.payload.developer, original.developer)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Status"
                      value={STATUS_LABELS[s.payload.status] ?? s.payload.status}
                      oldValue={original ? (STATUS_LABELS[original.status] ?? original.status) : undefined}
                      changed={!!original && fieldChanged(s.payload.status, original.status)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Country"
                      value={arrayToDisplay(s.payload.country)}
                      oldValue={original ? arrayToDisplay(original.country) : undefined}
                      changed={!!original && fieldChanged(s.payload.country, original.country)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Platforms"
                      value={arrayToDisplay(s.payload.platforms)}
                      oldValue={original ? arrayToDisplay(original.platforms) : undefined}
                      changed={!!original && fieldChanged(s.payload.platforms, original.platforms)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Genres"
                      value={arrayToDisplay(s.payload.genres)}
                      oldValue={original ? arrayToDisplay(original.genres) : undefined}
                      changed={!!original && fieldChanged(s.payload.genres, original.genres)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Description"
                      value={s.payload.short_description}
                      oldValue={original?.short_description}
                      changed={!!original && fieldChanged(s.payload.short_description, original.short_description)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      multiline
                    />

                    <DetailRow
                      label="Gameplay modes"
                      value={arrayToDisplay(s.payload.gameplay_modes)}
                      oldValue={original ? arrayToDisplay(original.gameplay_modes) : undefined}
                      changed={!!original && fieldChanged(s.payload.gameplay_modes, original.gameplay_modes)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Monetization"
                      value={arrayToDisplay(s.payload.monetization)}
                      oldValue={original ? arrayToDisplay(original.monetization) : undefined}
                      changed={!!original && fieldChanged(s.payload.monetization, original.monetization)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Game engine"
                      value={s.payload.game_engine || "—"}
                      oldValue={original?.game_engine}
                      changed={!!original && fieldChanged(s.payload.game_engine, original.game_engine)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Release date"
                      value={s.payload.release_date || "—"}
                      oldValue={original?.release_date}
                      changed={!!original && fieldChanged(s.payload.release_date, original.release_date)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Website URL"
                      value={s.payload.website_url || "—"}
                      oldValue={original?.website_url}
                      changed={!!original && fieldChanged(s.payload.website_url, original.website_url)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      isUrl={!!s.payload.website_url}
                    />

                    <DetailRow
                      label="Store links"
                      value={storeLinksToDisplay(s.payload.store_links)}
                      oldValue={original ? storeLinksToDisplay(original.store_links) : undefined}
                      changed={!!original && storeLinksChanged(s.payload.store_links, original.store_links)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      multiline
                    />

                    <DetailRow
                      label="Publishing"
                      value={s.payload.publishing_type === "self_published" ? "Self-published" : s.payload.publishing_type === "with_publisher" ? "With a publisher" : "—"}
                      oldValue={original ? (original.publishing_type === "self_published" ? "Self-published" : original.publishing_type === "with_publisher" ? "With a publisher" : "—") : undefined}
                      changed={!!original && fieldChanged(s.payload.publishing_type, original.publishing_type)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    {s.payload.publishing_type === "with_publisher" && (
                      <DetailRow
                        label="Publisher"
                        value={s.payload.publisher_name || "—"}
                        oldValue={original?.publisher_name}
                        changed={!!original && fieldChanged(s.payload.publisher_name, original.publisher_name)}
                        changedLabel={t("changed")}
                        wasLabel={t("was")}
                      />
                    )}

                    <div className="text-xs text-c-faint pt-1">
                      <span className="font-medium">Slug:</span> {s.payload.slug}
                    </div>

                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 px-5 py-4 border-t border-c-border">
                  <button
                    onClick={() => approveSubmission(s)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("approve")}
                  </button>
                  <button
                    onClick={() => rejectSubmission(s.id)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-c-surface border border-c-border text-c-soft text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("reject")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {/* Studios tab */}
      {activeTab === "studios" && (studioSubmissions.length === 0 ? (
        <div className="text-center py-16 text-c-muted">
          <p>{t("noPendingStudios")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {studioSubmissions.map((s) => {
            const original = s.studio_id ? originalStudios[s.studio_id] : null;
            const isExpanded = expandedId === s.id;
            const countries = [s.payload.country].flat();

            return (
              <article
                key={s.id}
                className="bg-c-surface border border-c-border rounded-xl overflow-hidden"
              >
                {/* Compact header — always visible */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-c-text">{s.payload.name}</h2>
                        {s.studio_id && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                            {t("updateBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-c-faint mt-0.5">
                        {t("studioType")}: {s.payload.type}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-c-muted">
                    {countries.join(", ")}
                  </p>

                  {s.payload.description && (
                    <p className="text-sm text-c-soft mt-3 leading-relaxed" dir="auto">
                      {s.payload.description}
                    </p>
                  )}

                  {/* Toggle details */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    {isExpanded ? t("hideDetails") : t("viewDetails")} {isExpanded ? "↑" : "↓"}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-c-border px-5 py-4 space-y-4">
                    {s.studio_id && original && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/studios/${original.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          {t("viewCurrentStudio")}
                        </a>
                      </div>
                    )}

                    <DetailRow
                      label="Name"
                      value={s.payload.name}
                      oldValue={original?.name}
                      changed={!!original && fieldChanged(s.payload.name, original.name)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Type"
                      value={s.payload.type}
                      oldValue={original?.type}
                      changed={!!original && fieldChanged(s.payload.type, original.type)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Country"
                      value={arrayToDisplay(s.payload.country)}
                      oldValue={original ? arrayToDisplay(original.country) : undefined}
                      changed={!!original && fieldChanged(s.payload.country, original.country)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Description"
                      value={s.payload.description || "—"}
                      oldValue={original?.description}
                      changed={!!original && fieldChanged(s.payload.description, original.description)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      multiline
                    />

                    <DetailRow
                      label="Website URL"
                      value={s.payload.website_url || "—"}
                      oldValue={original?.website_url}
                      changed={!!original && fieldChanged(s.payload.website_url, original.website_url)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      isUrl={!!s.payload.website_url}
                    />

                    <div className="text-xs text-c-faint pt-1">
                      <span className="font-medium">Slug:</span> {s.payload.slug}
                    </div>

                  </div>
                )}

                <div className="flex gap-3 px-5 py-4 border-t border-c-border">
                  <button
                    onClick={() => approveStudio(s)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("approve")}
                  </button>
                  <button
                    onClick={() => rejectStudio(s.id)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-c-surface border border-c-border text-c-soft text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("reject")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {/* Communities tab */}
      {activeTab === "communities" && (communitySubmissions.length === 0 ? (
        <div className="text-center py-16 text-c-muted">
          <p>{t("noPendingCommunities")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {communitySubmissions.map((s) => {
            const original = s.community_id ? originalCommunities[s.community_id] : null;
            const isExpanded = expandedId === s.id;
            const countries = [s.payload.country].flat();

            return (
              <article
                key={s.id}
                className="bg-c-surface border border-c-border rounded-xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-c-text">{s.payload.name}</h2>
                        {s.community_id && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                            {t("updateBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-c-faint mt-0.5">
                        {t("communityType")}: {s.payload.type}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-c-muted">
                    {countries.join(", ")}
                  </p>

                  {s.payload.description && (
                    <p className="text-sm text-c-soft mt-3 leading-relaxed" dir="auto">
                      {s.payload.description}
                    </p>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    {isExpanded ? t("hideDetails") : t("viewDetails")} {isExpanded ? "↑" : "↓"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-c-border px-5 py-4 space-y-4">
                    {s.community_id && original && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/communities/${original.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          {t("viewCurrentCommunity")}
                        </a>
                      </div>
                    )}

                    <DetailRow
                      label="Name"
                      value={s.payload.name}
                      oldValue={original?.name}
                      changed={!!original && fieldChanged(s.payload.name, original.name)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Type"
                      value={s.payload.type}
                      oldValue={original?.type}
                      changed={!!original && fieldChanged(s.payload.type, original.type)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Country"
                      value={arrayToDisplay(s.payload.country)}
                      oldValue={original ? arrayToDisplay(original.country) : undefined}
                      changed={!!original && fieldChanged(s.payload.country, original.country)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Description"
                      value={s.payload.description || "—"}
                      oldValue={original?.description}
                      changed={!!original && fieldChanged(s.payload.description, original.description)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      multiline
                    />

                    <DetailRow
                      label="Topics"
                      value={arrayToDisplay(s.payload.topics)}
                      oldValue={original ? arrayToDisplay(original.topics) : undefined}
                      changed={!!original && fieldChanged(s.payload.topics, original.topics)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                    />

                    <DetailRow
                      label="Website URL"
                      value={s.payload.website_url || "—"}
                      oldValue={original?.website_url}
                      changed={!!original && fieldChanged(s.payload.website_url, original.website_url)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      isUrl={!!s.payload.website_url}
                    />

                    <DetailRow
                      label="Social links"
                      value={storeLinksToDisplay(s.payload.social_links)}
                      oldValue={original ? storeLinksToDisplay(original.social_links) : undefined}
                      changed={!!original && storeLinksChanged(s.payload.social_links, original.social_links)}
                      changedLabel={t("changed")}
                      wasLabel={t("was")}
                      multiline
                    />

                    <div className="text-xs text-c-faint pt-1">
                      <span className="font-medium">Slug:</span> {s.payload.slug}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 px-5 py-4 border-t border-c-border">
                  <button
                    onClick={() => approveCommunity(s)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("approve")}
                  </button>
                  <button
                    onClick={() => rejectCommunity(s.id)}
                    disabled={actionId === s.id}
                    className="px-4 py-2 bg-c-surface border border-c-border text-c-soft text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                  >
                    {actionId === s.id ? t("working") : t("reject")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {/* Published tab — Games + Studios + Communities */}
      {activeTab === "published" && (
        <div className="space-y-8">

          {/* Games section */}
          <div>
            <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-3">
              Games ({approvedGames.length})
            </h2>
            {approvedGames.length === 0 ? (
              <p className="text-sm text-c-muted py-4">No published games yet.</p>
            ) : (
              <div className="space-y-2">
                {approvedGames.map((g) => (
                  <div
                    key={g.id}
                    className="bg-c-surface border border-c-border rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/games/${g.slug}`}
                          className="font-medium text-c-text hover:text-indigo-500 transition-colors text-sm"
                        >
                          {g.name}
                        </Link>
                        {g.developer && (
                          <span className="text-xs text-c-faint">— {g.developer}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGame(g.id, g.name)}
                      disabled={deletingId === g.id}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === g.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Studios section */}
          <div>
            <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-3">
              Studios ({approvedStudios.length})
            </h2>
            {approvedStudios.length === 0 ? (
              <p className="text-sm text-c-muted py-4">No published studios yet.</p>
            ) : (
              <div className="space-y-2">
                {approvedStudios.map((s) => (
                  <div
                    key={s.id}
                    className="bg-c-surface border border-c-border rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/studios/${s.slug}`}
                          className="font-medium text-c-text hover:text-indigo-500 transition-colors text-sm"
                        >
                          {s.name}
                        </Link>
                        <span className="text-xs bg-c-bg border border-c-border text-c-faint px-2 py-0.5 rounded-full">
                          {s.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteStudio(s.id, s.name)}
                      disabled={deletingId === s.id}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Communities section */}
          <div>
            <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-3">
              Communities ({approvedCommunities.length})
            </h2>
            {approvedCommunities.length === 0 ? (
              <p className="text-sm text-c-muted py-4">No published communities yet.</p>
            ) : (
              <div className="space-y-2">
                {approvedCommunities.map((c) => (
                  <div
                    key={c.id}
                    className="bg-c-surface border border-c-border rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/communities/${c.slug}`}
                          className="font-medium text-c-text hover:text-indigo-500 transition-colors text-sm"
                        >
                          {c.name}
                        </Link>
                        <span className="text-xs bg-c-bg border border-c-border text-c-faint px-2 py-0.5 rounded-full">
                          {c.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCommunity(c.id, c.name)}
                      disabled={deletingId === c.id}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === c.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  );
}

function DetailRow({
  label,
  value,
  oldValue,
  changed,
  changedLabel,
  wasLabel,
  multiline,
  isUrl,
}: {
  label: string;
  value: string;
  oldValue?: string | null;
  changed: boolean;
  changedLabel: string;
  wasLabel: string;
  multiline?: boolean;
  isUrl?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 ${changed ? "bg-amber-500/10 border border-amber-500/20" : "bg-c-bg"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-c-faint uppercase tracking-wide">{label}</span>
        {changed && (
          <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full">
            {changedLabel}
          </span>
        )}
      </div>
      {isUrl && value !== "—" ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline break-all">
          {value}
        </a>
      ) : multiline ? (
        <pre className="text-sm text-c-text whitespace-pre-wrap break-all font-sans">{value}</pre>
      ) : (
        <p className="text-sm text-c-text">{value}</p>
      )}
      {changed && oldValue != null && oldValue !== "" && (
        <p className="text-xs text-c-faint mt-1">
          {wasLabel}: <span className="line-through">{oldValue}</span>
        </p>
      )}
    </div>
  );
}
