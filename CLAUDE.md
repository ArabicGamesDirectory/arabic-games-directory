# Arabic Games Directory — Claude Code Context

## Project overview
A public directory of games developed in the MENA region. Anyone can submit a game. Submissions go into a private queue, an admin reviews them, and approved games appear on the public site.

- **Site:** arabicgames.directory
- **Frontend:** Next.js (App Router, TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting:** Vercel
- **Content:** Text and links only — no thumbnails (yet)

---

## Project structure

```
arabic-games-directory/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (html + body)
│   │   ├── page.tsx            # Homepage — lists approved games with filters
│   │   ├── submit/
│   │   │   └── page.tsx        # Public submission form
│   │   ├── admin/
│   │   │   └── page.tsx        # Admin review page (approve / reject) — uses createBrowserClient
│   │   ├── api/
│   │   │   ├── approve/
│   │   │   │   └── route.ts    # POST — server-side approve (verifies session + admin email)
│   │   │   └── reject/
│   │   │       └── route.ts    # POST — server-side reject (verifies session + admin email)
│   │   ├── games/
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Game detail page
│   │   └── stats/
│   │       └── page.tsx        # Statistics (by country, platform, genre, status)
│   └── lib/
│       ├── supabase.ts         # Supabase client (anon key, public) — used by non-admin pages
│       └── slug.ts             # slugify() helper
├── .env.local                  # Local env vars (never commit)
├── .gitignore
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ADMIN_EMAIL=...       # Checked server-side in /api/approve and /api/reject routes
```

Vercel has the same variables set in project settings.

---

## Database schema (Supabase / PostgreSQL)

### `games` table — approved, public
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| slug | text | unique, not null |
| name | text | not null |
| country | text | not null |
| platforms | text[] | e.g. ['PC', 'Mobile'] |
| genres | text[] | e.g. ['Action', 'Puzzle'] |
| short_description | text | not null |
| release_date | date | nullable |
| status | game_status enum | announced / in_dev / early_access / released / cancelled |
| website_url | text | nullable |
| store_links | jsonb | keys: Steam, Google Play, App Store, Itch |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| submitter_name | text | nullable |
| submitter_email | text | nullable |
| payload | jsonb | full game data (mirrors games columns) |
| moderation_status | text | pending / approved / rejected |
| moderator_notes | text | nullable |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### RLS summary
- `games`: anon + authenticated can SELECT. Authenticated can INSERT.
- `submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.

---

## Current known issues / planned improvements

### Planned improvements (in rough priority order)
1. ~~Server-side admin API routes (security)~~ ✓ Done
2. Controlled dropdowns for country, platform, genre on submit form (instead of free text)
3. URL validation on website and store link fields
4. Slug collision handling on approve (check uniqueness, auto-append suffix if clash)
5. Search by game name or developer
6. Thumbnails via Supabase Storage (deferred — keeping text-only for now)
7. Email notification to submitter on approve/reject
8. Charts on stats page instead of plain lists
9. Tailwind for UI (replacing inline styles)

---

## Key conventions

- **Slugs** are generated from the game name via `slugify()` in `src/lib/slug.ts` at submission time. They live in `payload.slug` and are copied to `games.slug` on approve.
- **Store links** are stored as `{ Steam: url|null, "Google Play": url|null, "App Store": url|null, Itch: url|null }` in both submissions payload and the games table.
- **Admin flow:** Admin signs in with Supabase email/password auth → page loads pending submissions → clicking Approve/Reject calls a server-side API route (`/api/approve` or `/api/reject`) which verifies the session cookie and admin email before writing to the DB.
- **Admin auth:** `admin/page.tsx` uses `createBrowserClient` from `@supabase/auth-helpers-nextjs` (stores session in cookies, not localStorage) so the session is readable by the server-side API routes. The shared `supabase` client in `lib/supabase.ts` is only used by non-admin pages.
- **Server routes auth:** `/api/approve` and `/api/reject` use `createServerClient` from `@supabase/auth-helpers-nextjs` to read the session from cookies and verify `user.email === NEXT_PUBLIC_ADMIN_EMAIL` before any DB write.
- Pages that read from `games` are: homepage (`page.tsx`), game detail (`games/[slug]/page.tsx`), stats (`stats/page.tsx`). All use the anon Supabase client.
- The admin page is `"use client"` and uses Supabase Auth client-side. All other data-fetching pages are server components.

---

## Dev commands

```bash
npm run dev       # start local dev server
npm run build     # production build
npm run lint      # lint
```

Supabase schema changes should be done via the Supabase dashboard SQL editor and documented here.

---

## Manual steps protocol

Whenever a change requires a Supabase SQL migration or a new environment variable, add a clear TODO comment in the code and tell me exactly what I need to do manually in the dashboards.

---

## What NOT to do
- Do not commit `.env.local` or any file containing Supabase keys.
- Do not use the anon Supabase client in API routes that perform privileged actions — use `createServerClient` with the service role key or session cookie.
- Do not remove the RLS policies — the security model depends on them.
- Do not change the `submissions` → `games` approve flow without updating both the client admin page and any new API routes to stay in sync.
