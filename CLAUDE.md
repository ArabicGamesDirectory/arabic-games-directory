# Arabic Games Directory — Claude Code Context

## Project overview
A public directory of games developed in the MENA region. Anyone can submit a game. Submissions go into a private queue, an admin reviews them, and approved games appear on the public site.

- **Site:** arabicgames.directory
- **Frontend:** Next.js 16 (App Router, TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting:** Vercel
- **Content:** Text and links only — no thumbnails (yet)
- **Localization:** English + Arabic (RTL) via `next-intl`

---

## Project structure

```
arabic-games-directory/
├── messages/
│   ├── en.json             # English translations
│   └── ar.json             # Arabic translations
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — reads locale via getLocale(), sets <html lang dir>
│   │   ├── globals.css         # Tailwind v4 import + semantic CSS variables + RTL font rule
│   │   ├── [locale]/
│   │   │   ├── layout.tsx      # Locale layout — NextIntlClientProvider + ThemeToggle + LanguageSwitcher
│   │   │   ├── page.tsx        # Homepage — lists approved games with filters + search
│   │   │   ├── submit/
│   │   │   │   └── page.tsx    # Thin wrapper that renders <SubmitForm />
│   │   │   ├── submit-studio/
│   │   │   │   └── page.tsx    # Thin wrapper that renders <StudioSubmitForm />
│   │   │   ├── update/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx  # Fetches existing game, renders <SubmitForm initialData={game} />
│   │   │   ├── admin/
│   │   │   │   └── page.tsx    # Admin review page — tabs for Games and Studios
│   │   │   ├── games/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx  # Game detail page — includes "Suggest an update" link
│   │   │   └── stats/
│   │   │       └── page.tsx    # Statistics (by country, platform, genre, status)
│   │   └── api/
│   │       ├── approve/
│   │       │   └── route.ts    # POST — approve game submission
│   │       ├── reject/
│   │       │   └── route.ts    # POST — reject game submission
│   │       ├── approve-studio/
│   │       │   └── route.ts    # POST — approve studio submission
│   │       └── reject-studio/
│   │           └── route.ts    # POST — reject studio submission
│   ├── components/
│   │   ├── ThemeToggle.tsx     # Floating light/dark theme switcher (persists to localStorage)
│   │   ├── LanguageSwitcher.tsx  # Floating EN↔AR switcher (fixed bottom start-4)
│   │   ├── SubmitForm.tsx      # Shared form for new game submissions and update suggestions (accepts initialData); developer field has datalist autocomplete from approved studios
│   │   └── StudioSubmitForm.tsx  # Form for submitting a new studio/team/individual
│   ├── i18n/
│   │   ├── routing.ts          # Defines locales: ['en', 'ar'], defaultLocale: 'en'
│   │   ├── request.ts          # next-intl server config — loads messages per locale
│   │   └── navigation.ts       # Locale-aware Link, useRouter, usePathname from next-intl
│   ├── proxy.ts                # next-intl locale routing middleware (Next.js 16 uses proxy.ts)
│   └── lib/
│       ├── supabase.ts         # Supabase client (anon key, public) — used by non-admin pages
│       ├── countries.ts        # COUNTRY_OPTIONS list + COUNTRY_KEY_MAP for i18n
│       └── slug.ts             # slugify() helper — falls back to game-{timestamp} for Arabic-only names
├── .env.local                  # Local env vars (never commit)
├── .gitignore
├── package.json
├── tsconfig.json
└── next.config.ts              # Wrapped with createNextIntlPlugin
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ADMIN_EMAIL=...             # Checked server-side in /api/approve and /api/reject routes
SUPABASE_SERVICE_ROLE_KEY=...           # Server-only — used in API routes for privileged DB writes (bypasses RLS)
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
| country | text[] | not null — array of country names (e.g. ['Egypt', 'Iraq']) |
| platforms | text[] | e.g. ['PC', 'Mobile'] |
| genres | text[] | e.g. ['Action', 'Puzzle'] |
| short_description | text | not null |
| release_date | date | nullable |
| status | game_status enum | announced / in_dev / early_access / released / cancelled |
| developer | text | nullable, e.g. 'Semaphore Studios' |
| gameplay_modes | text[] | e.g. ['Single Player', 'Co-op'] |
| game_engine | text | nullable, e.g. 'Unity' |
| monetization | text[] | e.g. ['Free', 'IAP'] |
| website_url | text | nullable |
| store_links | jsonb | keys: Steam, Google Play, App Store, PlayStation, Xbox, Nintendo, Itch, Others |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `studios` table — approved, public
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| slug | text | unique, not null |
| name | text | not null |
| type | text | individual / team / studio |
| description | text | nullable |
| country | text[] | not null — array of country names |
| website_url | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `studio_submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| submitter_name | text | nullable |
| submitter_email | text | nullable |
| payload | jsonb | full studio data (mirrors studios columns) |
| moderation_status | text | pending / approved / rejected |
| studio_id | uuid | nullable — if set, this is an update to an existing studio (references studios.id) |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### `submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| submitter_name | text | nullable |
| submitter_email | text | nullable |
| payload | jsonb | full game data (mirrors games columns) |
| moderation_status | text | pending / approved / rejected |
| game_id | uuid | nullable — if set, this is an update to an existing game (references games.id) |
| moderator_notes | text | nullable |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### RLS summary
- `games`: anon + authenticated can SELECT. Authenticated can INSERT.
- `submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.
- `studios`: anon + authenticated can SELECT. Authenticated can INSERT.
- `studio_submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.

---

## Current known issues / planned improvements

### Planned improvements (in rough priority order)
1. ~~Server-side admin API routes (security)~~ ✓ Done
2. ~~Tailwind for UI (replacing inline styles)~~ ✓ Done
3. ~~Controlled dropdowns for platform on submit form~~ ✓ Done (platforms, gameplay modes, monetization, and genres are now checkboxes; game engine uses datalist; country uses checkboxes).
4. URL validation on website and store link fields
5. Slug collision handling on approve (check uniqueness, auto-append suffix if clash)
6. ~~Search by game name or developer~~ ✓ Done (server-side via `?q=` param; searches name + developer with `ilike`, genres with exact `cs` match; filters and search compose together)
7. ~~Localization (EN + AR / RTL)~~ ✓ Done (next-intl, `/en/` and `/ar/` routes, Cairo font for RTL)
8. ~~Controlled country selection~~ ✓ Done (18 MENA countries, multi-select checkboxes, translated, stored as `text[]`)
9. ~~Game update submissions~~ ✓ Done ("Suggest an update" on game detail → pre-filled form → update submission with `game_id`; admin approve patches existing game row)
10. ~~Admin full-detail view with diff highlighting~~ ✓ Done (expandable cards show all fields incl. store links; update submissions highlight changed fields in amber with "was: [old value]" annotation)
11. ~~Studios / developers directory~~ ✓ Done (Games/Studios tab on homepage; studio cards link to `/studios/[slug]`; studio detail page with "Suggest an update"; update flow via `/update-studio/[slug]`; auto-submit studio entry when game is submitted with an unknown developer name; developer names on game cards and game detail page are clickable links when a matching approved studio exists)
12. ~~UI/UX polish batch~~ ✓ Done (status badges use opacity-based colors for dark mode; description cards use `line-clamp-3`; store links on cards simplified to platform names only max 2 + count; tags pool all fields up to 5 with "+N more" overflow; collapsible store links section in submit form; Stats link moved to tab row; filter state preserved on tab switch; back link on update pages uses "← Back to {name}"; empty states use emoji + hint text; studios tab CTA hint)
13. ~~Two-theme simplification~~ ✓ Done (removed "gray" theme; default light now uses the old gray palette for easier reading; dark theme uses zinc-900 base instead of zinc-950)
14. ~~Games list on studio page~~ ✓ Done (studio detail page fetches games via `.ilike("developer", studio.name)` and shows them as cards with status badge, platforms, description, genre tags)
15. ~~Search on studios tab~~ ✓ Done (search form with `tab=studios` hidden input; in-memory filter on already-fetched studios by name/description; three empty states: no studios, no results, list; count reflects filtered total)
16. ~~Genres as checkboxes~~ ✓ Done (20 predefined genres sorted alphabetically: Action, Adventure, Arcade, Card / Board Game, Casual, Educational, Endless Runner, Fighting, Horror, Idle / Clicker, Platformer, Puzzle, Racing, RPG, Shooter FPS, Simulation, Sports, Strategy, Tower Defense, Visual Novel — plus an "Other" toggle that reveals a free-text field; stored as English values in `text[]`; translated via `genres` i18n namespace; pre-fills on update form)
17. ~~Form validation feedback~~ ✓ Done (`errors` state validated on submit; inline red error messages per field via `Field` component `error` prop; `inputCls(field?)` helper applies red border when field has error; validates: name, description, country ≥1, genres ≥1, platforms ≥1, developer (non-empty), gameplay_modes ≥1, game_engine (non-empty), submitter_name (non-empty), submitter_email (non-empty); HTML `required` removed — all validation through JS)
18. Thumbnails via Supabase Storage (deferred — keeping text-only for now)
19. Email notification to submitter on approve/reject
20. Charts on stats page instead of plain lists
21. Link games to studios via `studio_id` FK (currently stores studio name as plain text in `developer`; name-matching is done with `.ilike` at render time)

---

## Key conventions

- **Localization:** Uses `next-intl`. All pages are under `src/app/[locale]/`. Use `getTranslations('namespace')` in server components and `useTranslations('namespace')` in client components. Import `Link` from `@/i18n/navigation` (not `next/link`) so hrefs are automatically locale-prefixed. Always call `setRequestLocale(locale)` at the top of each page/layout for static rendering support.
- **RTL:** Arabic sets `dir="rtl"` on `<html>` server-side in the root layout. Cairo font (Google Fonts) is applied via `[dir="rtl"]` CSS rule. Use Tailwind logical properties (`end-*`, `start-*`, `ms-*`, `me-*`, `ps-*`, `pe-*`) for anything directional — never use physical `left-*`/`right-*`/`ml-*`/`mr-*` for elements that should flip in RTL.
- **Proxy (middleware):** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The file is at `src/proxy.ts`. Do not rename it back to `middleware.ts`.
- **Countries** are a controlled list of 18 MENA countries defined in `src/lib/countries.ts` (`COUNTRY_OPTIONS`). Stored as `text[]` in both the `games` table and `submissions.payload.country`. The submit form uses checkboxes (multiple selection allowed). Displayed with translated labels via `COUNTRY_KEY_MAP` → `t('countries.*')`. The country filter query uses `.contains("country", [value])` instead of `.eq`. **Backward compat:** old submissions stored `country` as a plain string — always normalize with `[value].flat()` before calling `.join()` or iterating, and type it as `string[] | string` in the admin page.
- **Slugs** are generated from the game name via `slugify()` in `src/lib/slug.ts` at submission time. Falls back to `game-{timestamp}` for Arabic-only names (which would otherwise produce an empty slug). They live in `payload.slug` and are copied to `games.slug` on approve.
- **Store links** are stored as `{ Steam, "Google Play", "App Store", PlayStation, Xbox, Nintendo, Itch, Others }` (all `url|null`) in both submissions payload and the games table. Rendered dynamically via `Object.entries` so adding new keys only requires updating the submit form.
- **Update submissions:** Game detail page has a "Suggest an update" link → `/update/[slug]` → server fetches game → renders `<SubmitForm initialData={game} />`. On submit, the slug is preserved (not regenerated) and `game_id` is stored in the submissions row. On admin approve, if `game_id` is set the existing `games` row is `UPDATE`d (not `INSERT`ed), preserving the slug and all URL references.
- **Studios:** Stored in the `studios` table (approved, public). Fields: name, slug, type (individual/team/studio), description, country[], website_url. The homepage has a Games/Studios tab switcher (`?tab=studios`); the Studios tab lists all approved studios linking to `/studios/[slug]`. The studio detail page shows all info and has a "Suggest an update" link → `/update-studio/[slug]` → pre-filled `StudioSubmitForm`. Update submissions store `studio_id`; `/api/approve-studio` does UPDATE when set, INSERT otherwise. The `developer` field in the game submit form fetches approved studio names and surfaces them via `<datalist>` autocomplete. When a game is submitted with a developer name that doesn't match any approved studio, a `studio_submissions` entry is auto-inserted (fire-and-forget). Developer names on game cards (homepage) and game detail page are rendered as `<Link>` to `/studios/[slug]` when a case-insensitive name match exists in the studios table; plain text otherwise. Studio names are stored as plain text in `games.developer` — matching is done via `.ilike` lookup at render time (no FK yet).
- **Admin flow:** Admin signs in with Supabase email/password auth → page loads both pending game and studio submissions → a "Games / Studios" tab switcher at the top of the queue shows counts. Game cards have "View details ↓" expandable sections with diff highlighting for updates. Studio cards show all fields inline. Approve/Reject call server-side API routes that verify the session cookie + admin email, then use the service-role client for DB writes. If `getUser()` returns an auth error (e.g. stale refresh token), the page calls `signOut()` to clear bad cookies and shows the login form cleanly.
- **Admin auth:** `[locale]/admin/page.tsx` uses `createBrowserClient` from `@supabase/auth-helpers-nextjs` (stores session in cookies, not localStorage) so the session is readable by the server-side API routes. The shared `supabase` client in `lib/supabase.ts` is only used by non-admin pages.
- **Server routes auth:** `/api/approve` and `/api/reject` use a two-client pattern: (1) `createServerClient` with the anon key reads the session cookie and verifies `user.email === NEXT_PUBLIC_ADMIN_EMAIL`; (2) `createClient` with `SUPABASE_SERVICE_ROLE_KEY` performs the actual DB writes, bypassing RLS. This is necessary because the `games` RLS policy only grants `authenticated` users SELECT and INSERT — there is no UPDATE policy, so writes via the anon client silently affect 0 rows. The service role key is server-only (no `NEXT_PUBLIC_` prefix) and must never be exposed to the client. API routes have no locale prefix and are excluded from the proxy matcher.
- **Search:** Homepage accepts a `?q=` URL param (server-side, no JS required). Supabase `.or()` matches `name.ilike.%q%`, `developer.ilike.%q%`, and `genres.cs.{q}` (exact element match for genres). Search and filter pills compose — each preserves the other in the URL.
- Pages that read from `games` are: homepage, game detail, stats. Pages that read from `studios` are: homepage (always, for both tab and developer-name linking), game detail (single `.ilike` lookup), studio detail. All use the anon Supabase client.
- The admin page is `"use client"` and uses Supabase Auth client-side. All other data-fetching pages are server components.
- **Theming:** Two themes — light (default) and dark — defined as CSS custom properties in `globals.css` (`:root` and `.theme-dark`). The gray theme was removed; the default light palette now uses those softer zinc-200/zinc-100 tones for easier reading. Dark uses zinc-900 base (not zinc-950). Registered as Tailwind utilities via `@theme inline` (e.g. `bg-c-surface`, `text-c-text`, `border-c-border`). Never use hardcoded `zinc-*` color classes in page components — always use the semantic `c-*` tokens so themes work. Status badges use opacity-based color classes (e.g. `bg-blue-500/15 text-blue-500`) so they work across both themes without modification. Accent colors (indigo, emerald, red) are intentionally fixed and do not theme-switch. The `ThemeToggle` component persists the choice to `localStorage`; the root `layout.tsx` has an inline script in `<head>` that adds `theme-dark` before hydration to prevent flash.
- **Store links (submit form):** The store links section in `SubmitForm` is collapsible — collapsed by default for new submissions, open by default only when `isUpdate` and the existing game already has at least one store link. Toggled by a button with ↑/↓ indicator. This keeps the form short for most submitters.
- **Store links (game cards):** On the homepage, store links are rendered as platform names only (no full URLs), capped at 2 visible + "+N" count pill, all linking to the game detail page rather than external URLs directly. This avoids visual clutter.
- **Tag display (game cards):** Genres, gameplay modes, and other tag-like fields are pooled and shown up to 5 total with a "+N more" pill for overflow.
- **Stats link:** The Stats page link lives in the tab row on the homepage (right-aligned), not in a separate footer section. This keeps it discoverable without adding visual weight.
- **Tab filter preservation:** When switching between the Games and Studios tabs on the homepage, the current search query and filter params (`q`, `platform`, `status`) are preserved in the URL. Both tab hrefs are built using `URLSearchParams` from the current `searchParams`.
- **Back link on update pages:** Update pages for both games (`/update/[slug]`) and studios (`/update-studio/[slug]`) use the i18n key `common.backToItem` (e.g. "← Back to {name}") instead of the generic "← Back to directory". The name is passed as an interpolation param.
- **Empty states:** The games and studios empty states on the homepage use an emoji (🔍 for no games, 🏢 for no studios yet) with a short hint line below, rather than plain text. The studios empty state includes a CTA explaining that studios are added automatically when a game is submitted.
- **Genres:** 20 predefined genres defined outside the component as `GENRE_BASE_VALUES` (string array, used for state init) and inside the component as `GENRE_OPTIONS_BASE` (with translated labels via `tGenres`). "Other" is rendered as a standalone toggle below the `CheckboxGroup`; when checked it reveals a free-text input (`genreOtherText` state). On submit, if "Other" is checked the custom text (or the literal string `"Other"` if blank) is appended to the genres array. Pre-fills on update: known values go to `CheckboxGroup` initialValues; any unrecognized value sets `genreOtherChecked=true` and `genreOtherText` to that value. Stored as `text[]` in `games.genres`. Do not change the English `value` strings without a data migration. **Legacy values** (`"Shooter"`, `"Idle"`, `"Survival"`) may still exist in the DB from before the rename — they display as raw strings on game pages (no translation lookup needed).
- **Developer autocomplete:** The developer field in `SubmitForm` uses a fully custom styled dropdown instead of a native `<datalist>` (which ignores CSS variables and shows unreadable colors in the light theme). State: `developerValue` (controlled input) + `showDeveloperSuggestions`. Suggestions are filtered in-memory from `studioNames` as the user types, capped at 8, shown in a `<ul>` with `bg-c-surface text-c-text hover:bg-c-bg` so it respects both themes. `onBlur` uses a 150ms timeout so `onMouseDown` on a suggestion fires before focus is lost. `autoComplete="off"` prevents the browser's own autocomplete from overlapping.
- **Form validation (submit form):** All required-field validation is done in JS inside `onSubmit` — no HTML `required` attributes. An `errors: Record<string, string>` state holds per-field messages; cleared and re-evaluated on each submit attempt. The `Field` component accepts an optional `error` prop and renders it as a small red `<p>` below the field. The `inputCls(field?)` helper returns the base input class string with a red border (`border-red-500/50 focus:ring-red-500`) when `errors[field]` is set. Required fields: name, short_description, developer, country (≥1), genres (≥1), platforms (≥1), gameplay_modes (≥1), game_engine, submitter_name, submitter_email. The "Your info" section header no longer shows "(optional)".
- **Studio page games list:** The studio detail page (`/studios/[slug]`) fetches games from the `games` table using `.ilike("developer", studio.name)` and renders them as clickable cards linking to `/games/[slug]`. Cards show: name, status badge, platforms/release date, description (line-clamp-2), genre tags (max 4 + overflow). If no games match, shows "No games in the directory yet." This relies on the same name-based matching used elsewhere — no FK.
- **Studios tab search:** The Studios tab on the homepage has a search form that posts `q` and `tab=studios` as hidden input. Studios are always fetched unfiltered (needed for the `studioSlugMap` used on game cards); `filteredStudios` is computed in-memory with `.filter()` by name/description. Three rendering states: no studios at all (🏢), search returned zero results (🔍 + clear link), results list. Count badge reflects `filteredStudios.length`.

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
- Do not use `next/link` directly in page components — use `@/i18n/navigation`'s `Link` so locale prefix is applied automatically.
- Do not use physical directional Tailwind classes (`right-*`, `left-*`, `ml-*`, `mr-*`, `pl-*`, `pr-*`) for UI elements that should respect RTL — use logical properties instead.
- Do not rename `proxy.ts` back to `middleware.ts` — Next.js 16 deprecated the middleware convention.
