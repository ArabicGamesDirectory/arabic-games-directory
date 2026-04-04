# Arabic Games Directory — Claude Code Context

## Project overview
A public directory of games developed in the MENA region. Anyone can submit a game. Submissions go into a private queue, an admin reviews them, and approved games appear on the public site.

- **Site:** arabicgames.directory
- **Frontend:** Next.js 16 (App Router, TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting:** Vercel
- **Content:** Text, links, and optional thumbnails (stored in Supabase Storage)
- **Localization:** English + Arabic (RTL) via `next-intl`
- **Key packages:** `sharp` (thumbnail processing), `recharts` (stats charts), `@supabase/auth-helpers-nextjs` (admin auth)

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
│   │       ├── reject-studio/
│   │       │   └── route.ts    # POST — reject studio submission
│   │       ├── delete-game/
│   │       │   └── route.ts    # POST — hard-delete an approved game by id (admin only)
│   │       ├── delete-studio/
│   │       │   └── route.ts    # POST — hard-delete an approved studio by id (admin only)
│   │       └── upload-thumbnail/
│   │           └── route.ts    # POST — receives file + slug, converts to 460×215 WebP via sharp, uploads to Supabase Storage bucket "thumbnails", returns public URL
│   ├── components/
│   │   ├── ThemeToggle.tsx     # Floating light/dark theme switcher (persists to localStorage)
│   │   ├── LanguageSwitcher.tsx  # Floating EN↔AR switcher (fixed bottom start-4)
│   │   ├── SubmitForm.tsx      # Shared form for new game submissions and update suggestions (accepts initialData); developer field has datalist autocomplete from approved studios; includes optional thumbnail upload field
│   │   ├── StudioSubmitForm.tsx  # Form for submitting a new studio/team/individual; includes optional thumbnail upload field
│   │   └── StatsCharts.tsx     # "use client" Recharts charts for the stats page; exports StatsCharts + ChartEntry type
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
| status | game_status enum | announced / in_dev / prototype / early_access / released / on_hold / cancelled / delisted |
| developer | text | nullable, e.g. 'Semaphore Studios' |
| gameplay_modes | text[] | e.g. ['Single Player', 'Co-op'] |
| game_engine | text | nullable, e.g. 'Unity' |
| monetization | text[] | e.g. ['Free', 'IAP'] |
| website_url | text | nullable |
| store_links | jsonb | keys: Steam, Google Play, App Store, PlayStation, Xbox, Nintendo, Itch, Others |
| publishing_type | text | nullable — `self_published` or `with_publisher` |
| publisher_name | text | nullable — set when publishing_type = `with_publisher` |
| studio_id | uuid | nullable — FK → studios(id) ON DELETE SET NULL; set at approve time via name-matching |
| submitted_by | text | nullable — submitter name copied from submission on first approve |
| submitted_by_email | text | nullable — submitter email copied from submission on first approve |
| thumbnail_url | text | nullable — public URL of the 460×215 WebP stored in Supabase Storage bucket "thumbnails" |
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
| submitted_by | text | nullable — submitter name copied from submission on first approve |
| thumbnail_url | text | nullable — public URL of the 460×215 WebP stored in Supabase Storage bucket "thumbnails" |
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

### Supabase Storage
- **Bucket:** `thumbnails` — public read, no RLS policies needed. All uploads go through `/api/upload-thumbnail` which uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). The bucket is public so stored URLs are directly accessible without auth.
- **File format:** All uploads are converted to WebP at 460×215 (cover crop) by the API route before storage. Original format is irrelevant — always stored as `.webp`.
- **Filename pattern:** `{slug}-{timestamp}.webp`
- **Max input size:** 150 KB enforced client-side in the form and server-side in the API route before processing.
- **Accepted input types:** `image/jpeg`, `image/png`, `image/webp`.

---

## Current known issues / planned improvements

### Planned improvements (in rough priority order)
1. ~~Server-side admin API routes (security)~~ ✓ Done
2. ~~Tailwind for UI (replacing inline styles)~~ ✓ Done
3. ~~Controlled dropdowns for platform on submit form~~ ✓ Done (platforms, gameplay modes, monetization, and genres are now checkboxes; game engine uses datalist; country uses checkboxes).
4. ~~URL validation on website and store link fields~~ ✓ Done (`website_url` in both forms, all store link fields in `SubmitForm`; validated on submit only using `new URL()` try/catch; empty fields always pass; error key `validation.invalidUrl` shared across all URL fields; `type="url"` intentionally absent — validation is JS-only)
5. ~~Slug collision handling on approve~~ ✓ Done (on INSERT path in `/api/approve` and `/api/approve-studio`: query all slugs matching `baseSlug%`, build a taken set, increment suffix `-2`, `-3`, … until a free slug is found)
6. ~~Search by game name or developer~~ ✓ Done (server-side via `?q=` param; searches name + developer with `ilike`, genres with exact `cs` match; filters and search compose together)
7. ~~Localization (EN + AR / RTL)~~ ✓ Done (next-intl, `/en/` and `/ar/` routes, Cairo font for RTL)
8. ~~Controlled country selection~~ ✓ Done (18 MENA countries, multi-select checkboxes, translated, stored as `text[]`)
9. ~~Game update submissions~~ ✓ Done ("Suggest an update" on game detail → pre-filled form → update submission with `game_id`; admin approve patches existing game row)
10. ~~Admin full-detail view with diff highlighting~~ ✓ Done (expandable cards show all fields incl. store links; update submissions highlight changed fields in amber with "was: [old value]" annotation; applies to both game and studio submissions — studio update cards batch-fetch the original studio row for diffing, identical pattern to games)
11. ~~Studios / developers directory~~ ✓ Done (Games/Studios tab on homepage; studio cards link to `/studios/[slug]`; studio detail page with "Suggest an update"; update flow via `/update-studio/[slug]`; auto-submit studio entry when game is submitted with an unknown developer name; developer names on game cards and game detail page are clickable links when a matching approved studio exists)
12. ~~UI/UX polish batch~~ ✓ Done (status badges use opacity-based colors for dark mode; description cards use `line-clamp-3`; store links on cards simplified to platform names only max 2 + count; tags pool all fields up to 5 with "+N more" overflow; collapsible store links section in submit form; Stats link moved to tab row; filter state preserved on tab switch; back link on update pages uses "← Back to {name}"; empty states use emoji + hint text; studios tab CTA hint; homepage cards redesigned to compact side-by-side layout — 230×108 thumbnail on start side with `rounded-s-lg`, content in flex-1 div, `flex-col sm:flex-row` for mobile graceful degradation, `line-clamp-2` descriptions; applies to both game and studio cards)
13. ~~Two-theme simplification~~ ✓ Done (removed "gray" theme; default light now uses the old gray palette for easier reading; dark theme uses zinc-900 base instead of zinc-950)
14. ~~Games list on studio page~~ ✓ Done (studio detail page fetches games via `.ilike("developer", studio.name)` and shows them as cards with status badge, platforms, description, genre tags)
15. ~~Search on studios tab~~ ✓ Done (search form with `tab=studios` hidden input; server-side filter on studios by name/description; three empty states: no studios, no results, list; count reflects filtered total)
16. ~~Genres as checkboxes~~ ✓ Done (20 predefined genres sorted alphabetically: Action, Adventure, Arcade, Card / Board Game, Casual, Educational, Endless Runner, Fighting, Horror, Idle / Clicker, Platformer, Puzzle, Racing, RPG, Shooter FPS, Simulation, Sports, Strategy, Tower Defense, Visual Novel — plus an "Other" toggle that reveals a free-text field; stored as English values in `text[]`; translated via `genres` i18n namespace; pre-fills on update form)
17. ~~Form validation feedback~~ ✓ Done (`errors` state validated on submit; inline red error messages per field via `Field` component `error` prop; `inputCls(field?)` helper applies red border when field has error; validates: name, description, country ≥1, genres ≥1, platforms ≥1, developer (non-empty), gameplay_modes ≥1, game_engine (non-empty), submitter_name (non-empty), submitter_email (non-empty); HTML `required` removed — all validation through JS)
18. ~~Admin published games list with delete~~ ✓ Done ("Published" tab in admin lists all approved games and studios; Games section shows name, developer, submitter name · email; Studios section shows name, type badge, submitter name; Delete buttons call `/api/delete-game` and `/api/delete-studio` respectively; confirm dialog; optimistic list update)
19. ~~Thumbnails via Supabase Storage~~ ✓ Done (optional thumbnail upload on both game and studio submit forms; `/api/upload-thumbnail` converts to 460×215 WebP via `sharp`; stored in `thumbnails` bucket; `thumbnail_url` column on `games` and `studios` tables; displayed on homepage cards, game detail, and studio detail pages; placeholder shown on cards when no thumbnail; no placeholder on detail pages)
20. ~~Server-side pagination on homepage~~ ✓ Done (10 results per page; `?page=` for games tab, `?studiosPage=` for studios tab; Prev/Next controls hidden when only one page; resets to page 1 when search/filter active; games use Supabase `.range()` with `{ count: "exact" }`; studios paginate over the already-filtered in-memory slice)
21. Email notification to submitter on approve/reject
22. ~~Charts on stats page~~ ✓ Done (Recharts-based; `StatsCharts.tsx` is a `"use client"` component; server page resolves all translated labels and passes `ChartEntry[]` arrays; By Country → horizontal bar chart; By Status → donut chart with status-matched colors; By Platform → donut chart; By Genre → horizontal bar chart; tooltip styled with `--c-surface`/`--c-border`/`--c-text` CSS vars)
23. ~~Link games to studios via `studio_id` FK~~ ✓ Done (`studio_id uuid references studios(id) on delete set null` added to `games` table; at approve time `/api/approve` does a follow-up `.ilike` lookup and sets `studio_id` if a match is found; game queries use `.select("*, studios(slug)")` Supabase FK join — no runtime name-matching at render; studio detail page uses `.eq("studio_id", studio.id)` instead of `.ilike`; `studioSlugMap` removed from homepage)

---

## Key conventions

- **Localization:** Uses `next-intl`. All pages are under `src/app/[locale]/`. Use `getTranslations('namespace')` in server components and `useTranslations('namespace')` in client components. Import `Link` from `@/i18n/navigation` (not `next/link`) so hrefs are automatically locale-prefixed. Always call `setRequestLocale(locale)` at the top of each page/layout for static rendering support.
- **RTL:** Arabic sets `dir="rtl"` on `<html>` server-side in the root layout. Cairo font (Google Fonts) is applied via `[dir="rtl"]` CSS rule. Use Tailwind logical properties (`end-*`, `start-*`, `ms-*`, `me-*`, `ps-*`, `pe-*`) for anything directional — never use physical `left-*`/`right-*`/`ml-*`/`mr-*` for elements that should flip in RTL. Free-text description fields (textareas in both submit forms) and description display elements (`<p>` on game cards, game detail, studio cards, studio detail) use `dir="auto"` so mixed Arabic/English content renders with the correct base direction per element. Full description elements on detail pages (game detail, studio detail) also use `whitespace-pre-wrap` to preserve newlines entered by submitters. Card descriptions use `line-clamp` without `whitespace-pre-wrap` to keep previews dense.
- **Proxy (middleware):** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The file is at `src/proxy.ts`. Do not rename it back to `middleware.ts`.
- **Countries** are a controlled list of 18 MENA countries defined in `src/lib/countries.ts` (`COUNTRY_OPTIONS`). Stored as `text[]` in both the `games` table and `submissions.payload.country`. The submit form uses checkboxes (multiple selection allowed). Displayed with translated labels via `COUNTRY_KEY_MAP` → `t('countries.*')`. The country filter query uses `.contains("country", [value])` instead of `.eq`. **Backward compat:** old submissions stored `country` as a plain string — always normalize with `[value].flat()` before calling `.join()` or iterating, and type it as `string[] | string` in the admin page.
- **Game status distinctions:** `cancelled` = development stopped before a full public release. `delisted` = was fully released and publicly available, then removed from stores/platforms (e.g. pulled from App Store, Steam, etc.) — the game exists but can no longer be downloaded or purchased. Never conflate the two. `on_hold` = development paused but not abandoned.
- **Slugs** are generated from the game name via `slugify()` in `src/lib/slug.ts` at submission time. Falls back to `game-{timestamp}` for Arabic-only names (which would otherwise produce an empty slug). They live in `payload.slug` and are copied to `games.slug` on approve.
- **Store links** are stored as `{ Steam, "Google Play", "App Store", PlayStation, Xbox, Nintendo, Itch, Others }` (all `url|null`) in both submissions payload and the games table. Rendered dynamically via `Object.entries` so adding new keys only requires updating the submit form.
- **Update submissions:** Game detail page has a "Suggest an update" link → `/update/[slug]` → server fetches game → renders `<SubmitForm initialData={game} />`. On submit, the slug is preserved (not regenerated) and `game_id` is stored in the submissions row. On admin approve, if `game_id` is set the existing `games` row is `UPDATE`d (not `INSERT`ed), preserving the slug and all URL references.
- **Studios:** Stored in the `studios` table (approved, public). Fields: name, slug, type (individual/team/studio), description, country[], website_url. The homepage has a Games/Studios tab switcher (`?tab=studios`); the Studios tab lists all approved studios linking to `/studios/[slug]`. The studio detail page shows all info and has a "Suggest an update" link → `/update-studio/[slug]` → pre-filled `StudioSubmitForm`. Update submissions store `studio_id`; `/api/approve-studio` does UPDATE when set, INSERT otherwise. The `developer` field in the game submit form fetches approved studio names and surfaces them via custom dropdown autocomplete. When a game is submitted with a developer name that doesn't match any approved studio, a `studio_submissions` entry is auto-inserted (fire-and-forget). `games.studio_id` is a nullable FK to `studios.id` (set at approve time) — developer names on game cards and game detail page link to `/studios/[slug]` via this FK; plain text if `studio_id` is null. The `developer` text column remains the display name; `studio_id` is the machine reference.
- **Admin flow:** Admin signs in with Supabase email/password auth → page loads both pending game and studio submissions → a three-tab switcher: "Games" (pending game queue), "Studios" (pending studio queue), "Published" (all approved games + studios). Both game and studio queue cards use the same expandable pattern: compact header always visible, "View details ↓" toggle reveals a `DetailRow`-based detail section. Update submissions (those with `game_id` / `studio_id` set) highlight changed fields in amber with a "changed" badge and "was: [old value]" annotation. The admin page batch-fetches original games and original studios at load time (stored in `originalGames` and `originalStudios` maps keyed by id) so diffs are available immediately. Studio update cards include a "View current studio ↗" link. The "Published" tab has two sections — **Games** and **Studios** — each listing all approved entries. Every row shows: name (linked to public detail page), developer/type badge, and submitter info (name · email for games; name only for studios, since `studios` has no `submitted_by_email`). Each row has a Delete button — games call `/api/delete-game`, studios call `/api/delete-studio` — both POST `{ id }`, verify admin session, and hard-delete the row. The list updates optimistically on delete. Approve/Reject/Delete all call server-side API routes that verify the session cookie + admin email, then use the service-role client for DB writes. If `getUser()` returns an auth error (e.g. stale refresh token), the page calls `signOut()` to clear bad cookies and shows the login form cleanly.
- **Admin auth:** `[locale]/admin/page.tsx` uses `createBrowserClient` from `@supabase/auth-helpers-nextjs` (stores session in cookies, not localStorage) so the session is readable by the server-side API routes. The shared `supabase` client in `lib/supabase.ts` is only used by non-admin pages.
- **Server routes auth:** `/api/approve` and `/api/reject` use a two-client pattern: (1) `createServerClient` with the anon key reads the session cookie and verifies `user.email === NEXT_PUBLIC_ADMIN_EMAIL`; (2) `createClient` with `SUPABASE_SERVICE_ROLE_KEY` performs the actual DB writes, bypassing RLS. This is necessary because the `games` RLS policy only grants `authenticated` users SELECT and INSERT — there is no UPDATE policy, so writes via the anon client silently affect 0 rows. The service role key is server-only (no `NEXT_PUBLIC_` prefix) and must never be exposed to the client. API routes have no locale prefix and are excluded from the proxy matcher.
- **Search:** Homepage accepts a `?q=` URL param (server-side, no JS required). Supabase `.or()` matches `name.ilike.%q%`, `developer.ilike.%q%`, and `genres.cs.{q}` (exact element match for genres). Search and filter pills compose — each preserves the other in the URL.
- Pages that read from `games` are: homepage, game detail, stats. Pages that read from `studios` are: homepage (always, for both tab and developer-name linking), game detail (single `.ilike` lookup), studio detail. All use the anon Supabase client.
- The admin page is `"use client"` and uses Supabase Auth client-side. All other data-fetching pages are server components.
- **Theming:** Two themes — light (default) and dark — defined as CSS custom properties in `globals.css` (`:root` and `.theme-dark`). The gray theme was removed; the default light palette now uses those softer zinc-200/zinc-100 tones for easier reading. Dark uses zinc-900 base (not zinc-950). Registered as Tailwind utilities via `@theme inline` (e.g. `bg-c-surface`, `text-c-text`, `border-c-border`). Never use hardcoded `zinc-*` color classes in page components — always use the semantic `c-*` tokens so themes work. Status badges use opacity-based color classes so they work across both themes without modification — color map: announced=blue, in_dev=amber, prototype=cyan, early_access=purple, released=emerald, on_hold=orange, cancelled=c-tag/c-muted, delisted=c-tag/c-muted. Accent colors (indigo, emerald, red) are intentionally fixed and do not theme-switch. The `ThemeToggle` component persists the choice to `localStorage`; the root `layout.tsx` has an inline script in `<head>` that adds `theme-dark` before hydration to prevent flash.
- **Store links (submit form):** The store links section in `SubmitForm` is collapsible but **open by default** for both new submissions and updates. Toggled by a button with ↑/↓ indicator. `storeLinksOpen` state is initialized to `true` unconditionally.
- **Store links (game cards):** On the homepage, store links are rendered as platform names only (no full URLs), capped at 2 visible + "+N" count pill, all linking to the game detail page rather than external URLs directly. This avoids visual clutter.
- **Tag display (game cards):** Genres, gameplay modes, and other tag-like fields are pooled and shown up to 5 total with a "+N more" pill for overflow.
- **Stats link:** The Stats page link lives in the tab row on the homepage (right-aligned), not in a separate footer section. This keeps it discoverable without adding visual weight.
- **Tab filter preservation:** When switching between the Games and Studios tabs on the homepage, the current search query and filter params (`q`, `platform`, `status`) are preserved in the URL. Both tab hrefs are built using `URLSearchParams` from the current `searchParams`.
- **Back link on update pages:** Update pages for both games (`/update/[slug]`) and studios (`/update-studio/[slug]`) use the i18n key `common.backToItem` (e.g. "← Back to {name}") instead of the generic "← Back to directory". The name is passed as an interpolation param.
- **Empty states:** The games and studios empty states on the homepage use an emoji (🔍 for no games, 🏢 for no studios yet) with a short hint line below, rather than plain text. The studios empty state includes a CTA explaining that studios are added automatically when a game is submitted.
- **Genres:** 20 predefined genres tuned for the MENA gaming context. Educational is a first-class genre (not under "Other") because Arabic educational and Islamic apps are prominent in the region. Visual Novel is separate from Adventure because several MENA studios build story-driven games rooted in regional folklore. Casual and Idle are included as top-level genres because mobile dominates the region. Defined outside the component as `GENRE_BASE_VALUES` (string array, used for state init) and inside the component as `GENRE_OPTIONS_BASE` (with translated labels via `tGenres`). "Other" is rendered as a standalone toggle below the `CheckboxGroup`; when checked it reveals a free-text input (`genreOtherText` state). On submit, if "Other" is checked the custom text (or the literal string `"Other"` if blank) is appended to the genres array. Pre-fills on update: known values go to `CheckboxGroup` initialValues; any unrecognized value sets `genreOtherChecked=true` and `genreOtherText` to that value. Stored as `text[]` in `games.genres`. Do not change the English `value` strings without a data migration. **Legacy values** (`"Shooter"`, `"Idle"`, `"Survival"`) may still exist in the DB from before the rename — they display as raw strings on game pages (no translation lookup needed).
- **Developer autocomplete:** The developer field in `SubmitForm` uses a fully custom styled dropdown instead of a native `<datalist>` (which ignores CSS variables and shows unreadable colors in the light theme). State: `developerValue` (controlled input) + `showDeveloperSuggestions`. Suggestions are filtered in-memory from `studioNames` as the user types, capped at 8, shown in a `<ul>` with `bg-c-surface text-c-text hover:bg-c-bg` so it respects both themes. `onBlur` uses a 150ms timeout so `onMouseDown` on a suggestion fires before focus is lost. `autoComplete="off"` prevents the browser's own autocomplete from overlapping.
- **Form validation (submit form):** All required-field validation is done in JS inside `onSubmit` — no HTML `required` attributes. An `errors: Record<string, string>` state holds per-field messages; cleared and re-evaluated on each submit attempt. The `Field` component accepts an optional `error` prop and renders it as a small red `<p>` below the field. The `inputCls(field?)` helper returns the base input class string with a red border (`border-red-500/50 focus:ring-red-500`) when `errors[field]` is set. Required fields: name, short_description, developer, country (≥1), genres (≥1), platforms (≥1), gameplay_modes (≥1), game_engine, submitter_name, submitter_email. The submitter info section is labelled "Submitter info" (i18n key `sectionYourInfo`; EN: "Submitter info", AR: "معلومات مقدّم الطلب") — required in both `SubmitForm` and `StudioSubmitForm`. **New form field defaults:** all text inputs and checkboxes are empty/unchecked on a fresh submission. The only pre-selected values are the two required dropdowns: `status` defaults to `"announced"` and studio `type` defaults to `"studio"` — selects must always show an option.
- **Studio page games list:** The studio detail page (`/studios/[slug]`) fetches games from the `games` table using `.ilike("developer", studio.name)` and renders them as clickable cards linking to `/games/[slug]`. Cards show: name, status badge, platforms/release date, description (line-clamp-2), genre tags (max 4 + overflow). If no games match, shows "No games in the directory yet." This relies on the same name-based matching used elsewhere — no FK.
- **Studios tab search:** The Studios tab on the homepage has a search form that posts `q` and `tab=studios` as hidden input. All studios are always fetched (needed for the studios tab display); `filteredStudios` is then computed in-memory with `.filter()` by name/description (studios are a small set — server-side Supabase filtering would require a separate query). Pagination slices `filteredStudios` after filtering. Three rendering states: no studios at all (🏢), search returned zero results (🔍 + clear link), results list. Count badge reflects `filteredStudios.length`.
- **Submitted by (public display):** Both `games` and `studios` tables have a `submitted_by text` column (nullable). The `games` table also has `submitted_by_email text` (nullable, stores the submitter's contact info — may be an email, URL, or social handle). Both are populated from the submission on first approve (INSERT path in `/api/approve`); `/api/approve-studio` populates `submitted_by` only. Neither column is overwritten on update approvals, preserving original submitter credit. The game detail and studio detail pages display `"Submitted by: {name}"` in small muted text below the description when the field is set. Only the name is shown publicly — `submitted_by_email` is never rendered on public pages; it is visible only to the admin in the "Published" tab.
- **Submitter contact field:** The second submitter info field is labelled "Contact" (not "Email") — submitters may enter an email, website URL, social media handle, or any other contact info. The input has no `type="email"` constraint. The DB column is still named `submitter_email` (in `submissions` and `studio_submissions`) and `submitted_by_email` (in `games`) — no migration needed, the label change is UI-only. The admin panel shows this field as "Contact" in both game and studio submission detail cards.
- **Submitter info persistence:** Both `SubmitForm` and `StudioSubmitForm` persist `submitter_name` and `submitter_email` to `localStorage` (keys `submitter_name`, `submitter_email`) on every successful submission. On mount, new submission forms pre-fill from `localStorage` so returning submitters don't retype their details. **Update forms always start empty** (`isUpdate` skips the localStorage read) — the person suggesting an update may differ from the original submitter. The fields are fully controlled inputs (`submitterName` / `submitterEmail` state); validation and payload construction use the state values directly rather than reading from `FormData`.
- **Thumbnail upload (forms):** Both `SubmitForm` and `StudioSubmitForm` have an optional thumbnail field at the top of the info section. Upload happens on file selection (not on form submit). Flow: client validates type (`image/jpeg`, `image/png`, `image/webp`) and size (≤150 KB) before sending → `POST /api/upload-thumbnail` with `FormData` containing `file` and `slug` → API converts to 460×215 WebP via `sharp`, uploads to `thumbnails` bucket with service role key, returns `{ url }` → form stores URL in `thumbnailUrl` state → included in payload on submit. A local `URL.createObjectURL()` preview is shown immediately on selection (before upload completes). Upload status: `idle | uploading | done | error`. On `isUpdate`, pre-fills preview and URL from `initialData.thumbnail_url`. Field is fully optional — no validation error if skipped. Reset clears `thumbnailUrl`, `thumbnailPreview`, `thumbnailStatus` to initial state.
- **Thumbnail display:** Homepage cards (both games and studios) use a compact side-by-side layout: thumbnail is `230×108` on the start side (`rounded-s-lg`, `object-cover`), content fills the remaining space (`flex-1 min-w-0 p-4`). On mobile (`< sm:`), layout stacks vertically (`flex-col sm:flex-row`) with thumbnail full-width on top. When no thumbnail exists, a `bg-c-surface` placeholder div with a muted emoji (🎮 for games, 🏢 for studios) is shown at the same dimensions — no broken image. On detail pages (game detail, studio detail), thumbnail is `460×215` (`rounded-xl`) and shown only when it exists — no placeholder on detail pages. All `<img>` elements use `loading="lazy"` and `decoding="async"` except the first card on page 1 (index 0, page === 1) which uses `loading="eager"` to avoid LCP penalty.
- **Slug collision handling:** On the INSERT path of `/api/approve` and `/api/approve-studio`, before inserting a new row the route queries all existing slugs matching `${baseSlug}%`, builds a `Set` of taken values, then tries `baseSlug`, `baseSlug-2`, `baseSlug-3`, … until a free one is found. Update approvals (where `game_id` / `studio_id` is set) skip this — they `UPDATE` the existing row and preserve its slug unchanged.
- **Studio FK linking (approve flow):** After a game INSERT, `/api/approve` does a follow-up `.ilike("name", developer)` lookup on `studios` and if a match is found updates the new game row's `studio_id`. For UPDATE approvals, it always re-runs the lookup and sets `studio_id` to the matched id or `null` (in case the developer name changed). This is silent — no error is surfaced to the admin if no match is found. The `submissions` and `studio_submissions` payload schemas are unchanged; linking happens purely at approve time.
- **Game–studio join:** All game queries that need to link to a studio use Supabase's FK join syntax: `.select("*, studios(slug)")`. This returns `studios: { slug: string } | null` on each game row (the correct runtime shape for a many-to-one join). Access via `g.studios?.slug` — not `g.studios?.[0]?.slug`. No runtime name-matching at render. The homepage no longer builds a `studioSlugMap`.
- **Supabase FK join typing:** Supabase's generic JS client infers FK-joined tables as `{ field: any }[]` (array) in TypeScript, but at **runtime** PostgREST returns a single object for many-to-one joins (e.g. `games.studio_id → studios.id`). Declare the type as `studios: { slug: string } | null` (the correct runtime shape), and use `as unknown as Game` / `as unknown as Game[]` casts to bypass the TS inference mismatch. Access via `g.studios?.slug` — not `g.studios?.[0]?.slug`.
- **Retroactive studio linking:** When a studio is approved (`/api/approve-studio`), after the INSERT or UPDATE a follow-up query patches all games where `studio_id IS NULL` and `developer` matches the studio name case-insensitively. This handles the case where a game was approved before its studio existed. Uses a single `.update().is("studio_id", null).ilike("developer", name)` — silent, no error surfaced to admin.
- **Stats charts:** The stats page (`/stats`) is a server component that fetches all games, aggregates counts, resolves translated labels, then passes `ChartEntry[]` arrays to the `StatsCharts` client component. All i18n is resolved server-side — the client component only receives `{ name: string; value: number; color?: string }[]`. Chart types: By Country → `BarChart` horizontal; By Status → `PieChart` donut with status-specific colors matching the badge palette; By Platform → `PieChart` donut; By Genre → `BarChart` horizontal. Tooltips use `var(--c-surface)` / `var(--c-border)` / `var(--c-text)` inline styles so they theme-switch correctly. Requires `recharts` (already in `package.json`).
- **Homepage pagination:** Games and studios are paginated separately. Page size is 10. Games use URL param `?page=N`, studios use `?studiosPage=N`, so both tabs can paginate independently without resetting each other. When a search query or filter is active, links reset to page 1 (params omitted when page === 1). Games pagination uses Supabase `.range(from, to)` with `{ count: "exact" }` to get the total count in one query. Studios pagination slices `filteredStudios` in-memory. Prev/Next controls are hidden when `totalPages === 1`. Disabled direction links render as muted `<span>` instead of `<Link>`.

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
