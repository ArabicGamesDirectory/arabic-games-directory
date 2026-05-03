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
│   │   │   ├── communities/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx  # Community detail page — name/type/country/topics/social links
│   │   │   ├── submit-community/
│   │   │   │   └── page.tsx    # Thin wrapper that renders <CommunitySubmitForm />
│   │   │   ├── contact/
│   │   │   │   └── page.tsx    # Thin wrapper that renders <ContactForm />
│   │   │   ├── update-community/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx  # Fetches existing community, renders <CommunitySubmitForm initialData={community} />
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
│   │       ├── approve-community/
│   │       │   └── route.ts    # POST — approve community submission
│   │       ├── reject-community/
│   │       │   └── route.ts    # POST — reject community submission
│   │       ├── delete-game/
│   │       │   └── route.ts    # POST — hard-delete an approved game by id (admin only)
│   │       ├── delete-studio/
│   │       │   └── route.ts    # POST — hard-delete an approved studio by id (admin only)
│   │       ├── delete-community/
│   │       │   └── route.ts    # POST — hard-delete an approved community by id (admin only)
│   │       ├── upload-thumbnail/
│   │       │   └── route.ts    # POST — validates magic bytes, converts to 460×215 WebP via sharp, uploads to thumbnails/temp/, returns public URL
│   │       ├── notify-submission/
│   │       │   └── route.ts    # POST — fire-and-forget Discord webhook for new/updated game/studio/community submissions; reads client IP from x-forwarded-for; no-ops if DISCORD_SUBMISSIONS_WEBHOOK_URL unset
│   │       ├── contact/
│   │       │   └── route.ts    # POST — contact-form endpoint; validates email + message, checks honeypot field, fires Discord webhook (no DB persistence); no-ops if DISCORD_CONTACT_WEBHOOK_URL unset
│   │       └── cron/
│   │           └── cleanup-thumbnails/
│   │               └── route.ts  # GET — deletes temp/ thumbnails older than 24h; secured with CRON_SECRET
│   ├── components/
│   │   ├── ThemeToggle.tsx     # Floating light/dark theme switcher (persists to localStorage)
│   │   ├── LanguageSwitcher.tsx  # Floating EN↔AR switcher (fixed bottom start-4)
│   │   ├── SubmitForm.tsx      # Shared form for new game submissions and update suggestions (accepts initialData); developer field has datalist autocomplete from approved studios; includes optional thumbnail upload field
│   │   ├── StudioSubmitForm.tsx  # Form for submitting a new studio/team/individual; includes optional thumbnail upload field
│   │   ├── CommunitySubmitForm.tsx  # Form for submitting a new community (online/in_person/hybrid); fields: name, type, description, country (multi), topics (Game Dev/Programming/Art/Design + Other), social links (jsonb mirror of games.store_links), thumbnail; reused for updates via initialData
│   │   ├── StatsCharts.tsx     # "use client" Recharts charts for the stats page; exports StatsCharts + ChartEntry type
│   │   ├── TitleCover.tsx      # Fallback "cover art" — gradient tile with the title rendered as bold white text; gradient picked deterministically by hashing a seed (slug); used wherever a thumbnail is missing on game/studio cards
│   │   ├── SortSelect.tsx      # "use client" — styled <select> for homepage sort; on change pushes a new URL preserving other params and resetting the matching page param
│   │   ├── FilterSelect.tsx    # "use client" — generic <select> for filter dropdowns (country, genre, platform, status, type, topic, etc.); takes paramName + options + a "default" placeholder for the empty/All option; navigates on change, optionally resetting the matching pageParam
│   │   ├── SubmitMenu.tsx      # "use client" — single "Submit ▾" dropdown menu in the homepage header that links to /submit and /submit-community; close on outside click + Escape. Studios are intentionally NOT exposed here — they're created automatically when a game is submitted with an unknown developer name.
│   │   ├── DeveloperTagsInput.tsx  # "use client" — tag-style multi-developer input used by SubmitForm. Renders existing tags as removable indigo chips + a free-text input with autocomplete suggestions from approved studio names. Enter or comma adds a tag; Backspace on empty input removes the last tag; click suggestion or chip × button to mutate. Emits one hidden `<input name={name}>` per tag so FormData.getAll(name) returns the array.
│   │   ├── Disclaimer.tsx      # Server component — site-wide footer with the curation/volunteer disclaimer + Contact link (i18n-driven via the `footer` namespace); rendered from `[locale]/layout.tsx` so it appears on every page
│   │   └── ContactForm.tsx     # "use client" — contact form (name optional, email required, category, message); honeypot field; POSTs to /api/contact; fire-and-forget on the server side (no DB persistence)
│   ├── i18n/
│   │   ├── routing.ts          # Defines locales: ['en', 'ar'], defaultLocale: 'en'
│   │   ├── request.ts          # next-intl server config — loads messages per locale
│   │   └── navigation.ts       # Locale-aware Link, useRouter, usePathname from next-intl
│   ├── proxy.ts                # next-intl locale routing middleware (Next.js 16 uses proxy.ts)
│   └── lib/
│       ├── supabase.ts         # Supabase client (anon key, public) — used by non-admin pages
│       ├── countries.ts        # COUNTRY_OPTIONS list + COUNTRY_KEY_MAP for i18n
│       ├── slug.ts             # slugify() helper — falls back to game-{timestamp} for Arabic-only names
│       ├── gameStatus.ts       # STATUSES_WITH_RELEASE_DATE set + statusAllowsReleaseDate() helper — single source of truth for which game statuses allow a release date
│       ├── genres.ts           # GENRE_VALUES (25 entries) + GENRE_I18N_KEYS map — single source of truth shared by SubmitForm and homepage genre filter
│       ├── communityTopics.ts  # COMMUNITY_TOPIC_VALUES (4 entries) + COMMUNITY_TOPIC_I18N_KEYS map — shared by CommunitySubmitForm and homepage topic filter
│       └── promoteThumbnail.ts # Moves temp thumbnail to permanent path on approve; used by /api/approve and /api/approve-studio
├── .env.local                  # Local env vars (never commit)
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json                 # Vercel Cron config — cleanup-thumbnails runs daily at 03:00 UTC
└── next.config.ts              # Wrapped with createNextIntlPlugin
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ADMIN_EMAIL=...             # Checked server-side in /api/approve and /api/reject routes
SUPABASE_SERVICE_ROLE_KEY=...           # Server-only — used in API routes for privileged DB writes (bypasses RLS)
CRON_SECRET=...                         # Server-only — Bearer token checked by /api/cron/cleanup-thumbnails; must also be set in Vercel project settings and in the Vercel Cron configuration
DISCORD_SUBMISSIONS_WEBHOOK_URL=...     # Server-only — optional. When set, /api/notify-submission posts a fire-and-forget Discord embed for every new/updated game/studio/community submission. If unset, the route silently no-ops (dev-friendly).
DISCORD_CONTACT_WEBHOOK_URL=...         # Server-only — optional. When set, /api/contact posts the contact-form message as a Discord embed to the configured channel. If unset, the route validates input but skips the webhook so the form still works in dev.
SITE_URL=https://arabicgames.directory  # Server-only — optional. Used to build the absolute admin URL embedded in the submission webhook (so clicking the embed title in Discord opens /admin?tab=...). Defaults to the production domain if unset.
```

Vercel has the same variables set in project settings.

> **Manual step:** After deploying, add `CRON_SECRET` to Vercel project settings (Settings → Environment Variables). Generate a strong random value (e.g. `openssl rand -hex 32`). Vercel Cron automatically passes it as the `Authorization: Bearer` header when invoking the route.

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
| developers | text[] | not null default '{}' — display names; one or more entries. Source of truth for what's rendered on cards/detail. May contain free-text values that don't match any approved studio (still render as plain text). |
| gameplay_modes | text[] | e.g. ['Single Player', 'Co-op'] |
| game_engine | text | nullable, e.g. 'Unity' |
| monetization | text[] | e.g. ['Free', 'IAP'] |
| website_url | text | nullable |
| store_links | jsonb | keys: Steam, Google Play, App Store, PlayStation, Xbox, Nintendo, Itch, Others |
| publishing_type | text | nullable — `self_published` or `with_publisher` |
| publisher_name | text | nullable — set when publishing_type = `with_publisher` |
| thumbnail_url | text | nullable — public URL of the 460×215 WebP stored in Supabase Storage bucket "thumbnails" |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `game_studios` join table — approved, public
Many-to-many link between approved games and approved studios. A game's `developers[]` array holds display names; this table holds the FK link for any name that matches an approved studio (case-insensitive). Names that don't match any approved studio do NOT have a row here — they render as plain text on cards/detail until the matching studio is approved (which retroactively populates rows via `/api/approve-studio`).
| Column | Type | Notes |
|---|---|---|
| game_id | uuid | not null, FK → games(id) ON DELETE CASCADE |
| studio_id | uuid | not null, FK → studios(id) ON DELETE CASCADE |
| PRIMARY KEY | (game_id, studio_id) | composite |

Index: `game_studios_studio_id_idx` on `(studio_id)` to speed up the studio-detail-page games list query.

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
| thumbnail_url | text | nullable — public URL of the 460×215 WebP stored in Supabase Storage bucket "thumbnails" |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `studio_submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| payload | jsonb | full studio data (mirrors studios columns) |
| moderation_status | text | pending / approved / rejected |
| studio_id | uuid | nullable — if set, this is an update to an existing studio (references studios.id) |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### `communities` table — approved, public
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| slug | text | unique, not null |
| name | text | not null |
| type | text | online / in_person / hybrid |
| description | text | nullable |
| country | text[] | not null — array of country names |
| website_url | text | nullable |
| social_links | jsonb | keys: Discord, Telegram, WhatsApp, Reddit, Facebook, "X (Twitter)", YouTube, Twitch, Instagram, Others (all url\|null) |
| topics | text[] | nullable — Game Development / Game Programming / Game Art / Game Design + free-text "Other" |
| thumbnail_url | text | nullable — public URL of the 460×215 WebP stored in Supabase Storage bucket "thumbnails" |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated via trigger |

### `community_submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| payload | jsonb | full community data (mirrors communities columns) |
| moderation_status | text | pending / approved / rejected |
| community_id | uuid | nullable — if set, this is an update to an existing community (references communities.id) |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### `submissions` table — pending moderation queue, private
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| payload | jsonb | full game data (mirrors games columns) |
| moderation_status | text | pending / approved / rejected |
| game_id | uuid | nullable — if set, this is an update to an existing game (references games.id) |
| moderator_notes | text | nullable |
| created_at | timestamptz | |
| reviewed_at | timestamptz | set on approve or reject |

### RLS summary
- `games`: anon + authenticated can SELECT. Authenticated can INSERT.
- `game_studios`: anon + authenticated can SELECT (read-only). Writes only via service-role key in `/api/approve` and `/api/approve-studio`.
- `submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.
- `studios`: anon + authenticated can SELECT. Authenticated can INSERT.
- `studio_submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.
- `communities`: anon + authenticated can SELECT. Authenticated can INSERT.
- `community_submissions`: anon + authenticated can INSERT. Authenticated can SELECT and UPDATE.

### Supabase Storage
- **Bucket:** `thumbnails` — public read, no RLS policies needed. All uploads go through `/api/upload-thumbnail` which uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). The bucket is public so stored URLs are directly accessible without auth.
- **File format:** All uploads are converted to WebP at 460×215 (cover crop) by the API route before storage. Original format is irrelevant — always stored as `.webp`.
- **Filename pattern:** `{slug}-{timestamp}.webp` (permanent) / `temp/{slug}-{timestamp}.webp` (before approval)
- **Max input size:** 200 KB enforced client-side in the form and server-side in the API route before processing.
- **Temp prefix:** All uploads go to `thumbnails/temp/{slug}-{timestamp}.webp`. On approve, `/api/approve` and `/api/approve-studio` call `promoteThumbnail()` (`src/lib/promoteThumbnail.ts`) which copies the file to `thumbnails/{slug}-{timestamp}.webp`, deletes the temp original, and returns the permanent URL. The `thumbnail_url` written to the DB row is always the permanent URL. If promotion fails silently, the temp URL remains in the DB and the cron job will eventually delete the orphan file.
- **Cron cleanup:** `/api/cron/cleanup-thumbnails` runs daily at 03:00 UTC (configured in `vercel.json`). It lists all files under the `temp/` prefix, filters for those whose embedded timestamp is older than 24 hours, and deletes them. Secured with `Authorization: Bearer {CRON_SECRET}`.
- **Accepted input types:** `image/jpeg`, `image/png`, `image/webp`.

---

## Current known issues / planned improvements

### Planned improvements (in rough priority order)
1. ~~Server-side admin API routes (security)~~ ✓ Done
2. ~~Tailwind for UI (replacing inline styles)~~ ✓ Done
3. ~~Controlled dropdowns for platform on submit form~~ ✓ Done (platforms, gameplay modes, monetization, and genres are now checkboxes; game engine uses datalist; country uses checkboxes). Genres list updated to 23 entries — added Resource Management, Rogue-lite, Roguelike.
4. ~~URL validation on website and store link fields~~ ✓ Done (`website_url` in both forms, all store link fields in `SubmitForm`; validated on submit only using `new URL()` try/catch; empty fields always pass; error key `validation.invalidUrl` shared across all URL fields; `type="url"` intentionally absent — validation is JS-only)
5. ~~Slug collision handling on approve~~ ✓ Done (on INSERT path in `/api/approve` and `/api/approve-studio`: query all slugs matching `baseSlug%`, build a taken set, increment suffix `-2`, `-3`, … until a free slug is found)
6. ~~Search by game name or developer~~ ✓ Done (server-side via `?q=` param; searches name + developer with `ilike`, genres with exact `cs` match; filters and search compose together)
7. ~~Localization (EN + AR / RTL)~~ ✓ Done (next-intl, `/en/` and `/ar/` routes, Cairo font for RTL)
8. ~~Controlled country selection~~ ✓ Done (18 MENA countries, multi-select checkboxes, translated, stored as `text[]`)
9. ~~Game update submissions~~ ✓ Done ("Suggest an update" on game detail → pre-filled form → update submission with `game_id`; admin approve patches existing game row)
10. ~~Admin full-detail view with diff highlighting~~ ✓ Done (expandable cards show all fields incl. store links; update submissions highlight changed fields in amber with "was: [old value]" annotation; applies to both game and studio submissions — studio update cards batch-fetch the original studio row for diffing, identical pattern to games)
11. ~~Studios / developers directory~~ ✓ Done (Games/Studios tab on homepage; studio cards link to `/studios/[slug]`; studio detail page with "Suggest an update"; update flow via `/update-studio/[slug]`; auto-submit studio entry when game is submitted with an unknown developer name; developer names on game cards and game detail page are clickable links when a matching approved studio exists)
12. ~~UI/UX polish batch~~ ✓ Done (status badges use opacity-based colors for dark mode; tags pool all fields up to 5 with "+N more" overflow; collapsible store links section in submit form; Stats link moved to tab row; filter state preserved on tab switch; back link on update pages uses "← Back to {name}"; empty states use emoji + hint text; studios tab CTA hint; homepage cards redesigned to compact side-by-side layout — 230×108 thumbnail on start side, content in flex-1 div, `flex-col sm:flex-row` for mobile graceful degradation; thumbnail corners clipped by container `overflow-hidden rounded-xl` — no `rounded-s-lg` on img; game cards show only: name + status badge, developer, meta line, tags row — description and store links removed from cards, available on the detail page only; studio cards retain description)
13. ~~Two-theme simplification~~ ✓ Done (removed "gray" theme; default light now uses the old gray palette for easier reading; dark theme uses zinc-900 base instead of zinc-950)
14. ~~Games list on studio page~~ ✓ Done (studio detail page fetches games via `.ilike("developer", studio.name)` and shows them as cards with status badge, platforms, description, genre tags)
15. ~~Search on studios tab~~ ✓ Done (search form with `tab=studios` hidden input; server-side filter on studios by name/description; three empty states: no studios, no results, list; count reflects filtered total)
16. ~~Genres as checkboxes~~ ✓ Done (25 predefined genres sorted alphabetically: Action, Adventure, Arcade, Card / Board Game, Casual, Educational, Endless Runner, Family, Fighting, Horror, Idle / Clicker, Made for Kids, Platformer, Puzzle, Racing, Resource Management, Rogue-lite, Roguelike, RPG, Shooter FPS, Simulation, Sports, Strategy, Tower Defense, Visual Novel — plus an "Other" toggle that reveals a free-text field; stored as English values in `text[]`; translated via `genres` i18n namespace; pre-fills on update form)
17. ~~Form validation feedback~~ ✓ Done (`errors` state validated on submit; inline red error messages per field via `Field` component `error` prop; `inputCls(field?)` helper applies red border when field has error; validates: name, description, country ≥1, genres ≥1, platforms ≥1, developer (non-empty), gameplay_modes ≥1, game_engine (non-empty); HTML `required` removed — all validation through JS)
18. ~~Admin published games list with delete~~ ✓ Done ("Published" tab in admin lists all approved games and studios; Games section shows name and developer; Studios section shows name and type badge; Delete buttons call `/api/delete-game` and `/api/delete-studio` respectively; confirm dialog; optimistic list update)
19. ~~Thumbnails via Supabase Storage~~ ✓ Done (optional thumbnail upload on both game and studio submit forms; `/api/upload-thumbnail` converts to 460×215 WebP via `sharp`; stored in `thumbnails` bucket; `thumbnail_url` column on `games` and `studios` tables; displayed on homepage cards, game detail, and studio detail pages; placeholder shown on cards when no thumbnail; no placeholder on detail pages)
20. ~~Server-side pagination on homepage~~ ✓ Done (10 results per page; `?page=` for games tab, `?studiosPage=` for studios tab; Prev/Next controls hidden when only one page; resets to page 1 when search/filter active; games use Supabase `.range()` with `{ count: "exact" }`; studios paginate over the already-filtered in-memory slice)
21. ~~Submitter info removed~~ ✓ Done (submitter name/email fields removed from both submit forms, API routes, admin page, and detail pages; `submitted_by`, `submitted_by_email` dropped from `games` and `studios` tables; `submitter_name`, `submitter_email` dropped from `submissions` and `studio_submissions` tables)
22. ~~Charts on stats page~~ ✓ Done (Recharts-based; `StatsCharts.tsx` is a `"use client"` component; server page resolves all translated labels and passes `ChartEntry[]` arrays; By Country → horizontal bar chart; By Status → donut chart with status-matched colors; By Platform → donut chart; By Genre → horizontal bar chart; tooltip styled with `--c-surface`/`--c-border`/`--c-text` CSS vars)
23. ~~Link games to studios via `studio_id` FK~~ ✓ Done (`studio_id uuid references studios(id) on delete set null` added to `games` table; at approve time `/api/approve` does a follow-up `.ilike` lookup and sets `studio_id` if a match is found; game queries use `.select("*, studios(slug)")` Supabase FK join — no runtime name-matching at render; studio detail page uses `.eq("studio_id", studio.id)` instead of `.ilike`; `studioSlugMap` removed from homepage)
24. ~~Title-as-cover fallback for missing thumbnails~~ ✓ Done (new `<TitleCover>` component renders a deterministic gradient tile with the title in bold white text whenever `thumbnail_url` is null on a card; replaces the prior 🎮 / 🏢 emoji placeholders on the homepage games tab, homepage studios tab, and the studio detail page games list; gradient picked from 8-color palette by hashing the slug; supports Arabic via `dir="auto"`)
25. ~~Homepage sort options for games and studios~~ ✓ Done (new `<SortSelect>` client component on each tab; games support 4 sorts — recently updated newest/oldest, release date newest/oldest; studios support 2 sorts — recently updated newest/oldest; default is "Recently updated, newest first" for both; URL params `sort` and `studiosSort` are independent per tab; sort preserved across filter pills/search/clear-search/pagination within a tab; resets pagination on change; no DB schema changes needed)
26. ~~Status-gated release date~~ ✓ Done (release_date only valid for statuses `prototype`, `early_access`, `released`, `delisted`; new `src/lib/gameStatus.ts` exports the set + `statusAllowsReleaseDate()` helper; `SubmitForm.tsx` hides the field when status is not in the allowed set, with controlled state that clears the value on transition; `/api/approve` coerces release_date to null when status disallows it; display gated on every render site; manual SQL backfill required for existing rows — see Key conventions section)
27. ~~Homepage CTA — Submit a studio button~~ ✓ Done (homepage header now renders both `Submit a game` (primary indigo, links to `/submit`) and `Submit a studio` (secondary outline, links to `/submit-studio`) side by side in a `flex gap-2 flex-wrap shrink-0` wrapper; `tCommon("submitStudio")` i18n key already existed)
28. ~~Communities directory~~ ✓ Done (full feature mirroring studios: new `communities` + `community_submissions` tables, `<CommunitySubmitForm>` component, `/submit-community` + `/communities/[slug]` + `/update-community/[slug]` pages, three new API routes (`approve-community`, `reject-community`, `delete-community`), Communities tab on homepage with Online/In Person/Hybrid type filter and updated/oldest sort, Communities pending queue + Published section in admin, third "Submit a community" button in homepage header, `community.*` i18n namespace in en/ar; topics are 4 base values + Other with free-text fallback, social links jsonb keyed by platform mirrors games' store_links; no relationship to games or studios; manual SQL migration required — see schema section)
29. ~~Better filtering on homepage (all tabs)~~ ✓ Done (added country dropdown to all 3 tabs + genre dropdown for games + type pills for studios + topic pills for communities + active-filter chips with one-click removal across all tabs; new `<FilterSelect>` client component for high-cardinality dropdowns; new `src/lib/genres.ts` and `src/lib/communityTopics.ts` so the homepage and forms share a single source of truth for taxonomy values; filters now compose properly — clicking PC keeps Released active, clicking "All" clears only the dimensions it represents; tab-scoped filters do NOT carry across tab switches)
30. ~~Uniform dropdown filters + Submit menu~~ ✓ Done (homepage filter pills converted to dropdowns across all tabs — games gains a Platform and Status dropdown (full 8 statuses), studios gains a Type dropdown, communities gains Type + Topic dropdowns; the previous All/PC/Mobile/Released/In Dev pill row is gone; header CTA replaced with a single `<SubmitMenu>` "Submit ▾" dropdown listing the three submission targets — replaces the prior 3-button row that crowded the header on mobile; new i18n keys `home.filterAllPlatforms`, `home.filterAllStatuses`, `home.filterAllTypes`, `home.filterAllTopics`, `common.submit` in both en/ar)
31. ~~Discord webhooks + Contact form~~ ✓ Done (two new server routes — `/api/notify-submission` (called by all 3 submit forms after insert, fire-and-forget) and `/api/contact` (validates email + message, honeypot-only spam protection, fire-and-forget). Two new server-only env vars: `DISCORD_SUBMISSIONS_WEBHOOK_URL`, `DISCORD_CONTACT_WEBHOOK_URL`; both optional — routes no-op if unset. Optional `SITE_URL` env var sets the absolute admin link in the submission embed. New page `/contact` with `<ContactForm>` client component; new "Contact us" link in the site-wide `<Disclaimer>` footer; new `contact.*` i18n namespace + `footer.contact` key in en/ar. Embed payloads kept minimal per spec — submission webhook sends Title + Color + Name + Type + Country + IP + footer "→ Review in admin" + timestamp; contact webhook sends Title + Color + From (name+email) + Category + Message + IP + timestamp. No DB persistence for contact messages.)
32. ~~Multi-developer support per game~~ ✓ Done (a game can now have one or more developers; `games.developer text` becomes `games.developers text[]` (display names) and `games.studio_id uuid` is replaced by a many-to-many `game_studios(game_id, studio_id)` join table with `ON DELETE CASCADE` on both sides. New `<DeveloperTagsInput>` (`src/components/DeveloperTagsInput.tsx`) is a tag-style input — chips for added developers, free-text input with autocomplete from approved studio names, Enter or comma to add, Backspace on empty input to remove last, × button per chip, case-insensitive dedup. `SubmitForm.tsx` validates `developers ≥ 1` and loops auto-submission of unknown studio names. `/api/approve` reads developers tolerantly (new `developers[]` or legacy `developer` string) and rebuilds join rows via `syncGameStudios()` after each upsert. `/api/approve-studio` retroactively scans every game's `developers[]` (in JS, since Postgres has no indexed case-insensitive array element match) and upserts join rows with `ignoreDuplicates: true`. All read sites use `.select("..., game_studios(studios(slug, name))")` and render developer names by iterating `developers[]` and looking up each name in the FK-joined rows. Manual SQL migration required — see "Migration: multi-developer" below in the Manual steps section.)

---

## Key conventions

- **Localization:** Uses `next-intl`. All pages are under `src/app/[locale]/`. Use `getTranslations('namespace')` in server components and `useTranslations('namespace')` in client components. Import `Link` from `@/i18n/navigation` (not `next/link`) so hrefs are automatically locale-prefixed. Always call `setRequestLocale(locale)` at the top of each page/layout for static rendering support.
- **RTL:** Arabic sets `dir="rtl"` on `<html>` server-side in the root layout. Cairo font (Google Fonts) is applied via `[dir="rtl"]` CSS rule. **Gotcha:** Next.js App Router does NOT re-render the root layout on client-side navigation, so a locale switch via `router.replace(...)` alone leaves `<html dir>` stale until a manual page refresh. `LanguageSwitcher` works around this by imperatively setting `document.documentElement.dir` and `.lang` immediately before calling `router.replace` — keep that imperative update in place if the component is ever refactored. Use Tailwind logical properties (`end-*`, `start-*`, `ms-*`, `me-*`, `ps-*`, `pe-*`) for anything directional — never use physical `left-*`/`right-*`/`ml-*`/`mr-*` for elements that should flip in RTL. Free-text description fields (textareas in both submit forms) and description display elements (`<p>` on game cards, game detail, studio cards, studio detail) use `dir="auto"` so mixed Arabic/English content renders with the correct base direction per element. Full description elements on detail pages (game detail, studio detail) also use `whitespace-pre-wrap` to preserve newlines entered by submitters. Card descriptions use `line-clamp` without `whitespace-pre-wrap` to keep previews dense.
- **Proxy (middleware):** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The file is at `src/proxy.ts`. Do not rename it back to `middleware.ts`.
- **Countries** are a controlled list of 18 MENA countries defined in `src/lib/countries.ts` (`COUNTRY_OPTIONS`). Stored as `text[]` in both the `games` table and `submissions.payload.country`. The submit form uses checkboxes in a 3-column grid (multiple selection allowed). The `CheckboxGroup` component accepts a `grid3` boolean prop — when true, renders `grid grid-cols-3 gap-2`; otherwise `flex flex-wrap gap-2`. Each label has `min-w-0` and must not have `w-full`, `flex-1`, or `justify-items-start` which would force full-width items and break the grid layout. Displayed with translated labels via `COUNTRY_KEY_MAP` → `t('countries.*')`. The country filter query uses `.contains("country", [value])` instead of `.eq`. **Backward compat:** old submissions stored `country` as a plain string — always normalize with `[value].flat()` before calling `.join()` or iterating, and type it as `string[] | string` in the admin page.
- **Game status distinctions:** `cancelled` = development stopped before a full public release. `delisted` = was fully released and publicly available, then removed from stores/platforms (e.g. pulled from App Store, Steam, etc.) — the game exists but can no longer be downloaded or purchased. Never conflate the two. `on_hold` = development paused but not abandoned.
- **Release date is status-gated:** `release_date` only makes sense for statuses where the game has actually shipped something — `prototype`, `early_access`, `released`, `delisted`. The allowed set lives in `src/lib/gameStatus.ts` as `STATUSES_WITH_RELEASE_DATE`; consume it via `statusAllowsReleaseDate(status)`. **Form (`SubmitForm.tsx`):** status and release_date are both controlled state; the release_date `<Field>` is conditionally rendered only when the current status is allowed; a `useEffect` clears `releaseDate` whenever status moves to a disallowed value so a stale value can't sneak through. The two-column grid wrapper class is conditional (`grid grid-cols-2 gap-4` when shown, empty when hidden) so status takes the full row when alone. **Server (`/api/approve`):** `gameFields.release_date` is coerced to `null` when `statusAllowsReleaseDate(payload.status)` is false — defense in depth against pending submissions queued before this gating existed and any direct API writes. **Display:** every render site (homepage card meta line, game detail hero pill row, studio detail games list) gates `release_date` rendering on `statusAllowsReleaseDate(status)` AND truthy date — so even legacy rows with stale dates render correctly until backfilled. **DB backfill:** existing rows where status is not in the allowed set must have their `release_date` cleared manually. Run in the Supabase SQL editor: `UPDATE games SET release_date = NULL WHERE status NOT IN ('prototype', 'early_access', 'released', 'delisted');`. Optionally also clean pending submissions: `UPDATE submissions SET payload = jsonb_set(payload, '{release_date}', 'null'::jsonb) WHERE moderation_status = 'pending' AND payload->>'status' NOT IN ('prototype', 'early_access', 'released', 'delisted');`.
- **Slugs** are generated from the game name via `slugify()` in `src/lib/slug.ts` at submission time. Falls back to `game-{timestamp}` for Arabic-only names (which would otherwise produce an empty slug). They live in `payload.slug` and are copied to `games.slug` on approve.
- **Store links** are stored as `{ Steam, "Google Play", "App Store", PlayStation, Xbox, Nintendo, Itch, Others }` (all `url|null`) in both submissions payload and the games table. Rendered dynamically via `Object.entries` so adding new keys only requires updating the submit form.
- **Update submissions:** Game detail page has a "Suggest an update" link → `/update/[slug]` → server fetches game → renders `<SubmitForm initialData={game} />`. On submit, the slug is preserved (not regenerated) and `game_id` is stored in the submissions row. On admin approve, if `game_id` is set the existing `games` row is `UPDATE`d (not `INSERT`ed), preserving the slug and all URL references.
- **Communities:** Stored in the `communities` table (approved, public). Modeled closely on studios. Fields: `name, slug, type, description, country[], website_url, social_links jsonb, topics[], thumbnail_url`. **Type values:** `online`, `in_person`, `hybrid` — defined in `COMMUNITY_TYPES` in `page.tsx` and the `community.typeOnline/typeInPerson/typeHybrid` i18n keys; storage uses snake_case lowercase. **Topics:** `Game Development`, `Game Programming`, `Game Art`, `Game Design` (defined in `TOPIC_BASE_VALUES` in `CommunitySubmitForm.tsx`) plus a free-text "Other" toggle (same pattern as game genres) that appends a custom topic on submit. **Social links:** stored in `social_links` jsonb with keys `Discord, Telegram, WhatsApp, Reddit, Facebook, "X (Twitter)", YouTube, Twitch, Instagram, Others` — all `url|null`. Mirrors games' `store_links` pattern; admin diff uses the same `storeLinksToDisplay` / `storeLinksChanged` helpers. Field names in the form are derived via `socialLinkFieldName(key)` which kebab-snake-cases the platform name (e.g. `"X (Twitter)"` → `"social_x_twitter"`). **Routing:** `/submit-community`, `/communities/[slug]`, `/update-community/[slug]`. **Homepage tab:** filters by type (Online/In Person/Hybrid pills), search by name/description, sort by recently updated newest/oldest. URL params `?tab=communities`, `?communitiesPage=N`, `?communitiesSort=`, `?communityType=`. Communities are fetched only when the tab is active (no equivalent of the studios cross-fetch needed for game-card linking). **Admin:** pending tab + Published section, mirroring studios. **No relationship** to games or studios — communities are a standalone entity (no FK linking).
- **Studios:** Stored in the `studios` table (approved, public). Fields: name, slug, type (individual/team/studio), description, country[], website_url. The homepage has a Games/Studios tab switcher (`?tab=studios`); the Studios tab lists all approved studios linking to `/studios/[slug]`. The studio detail page shows all info and has a "Suggest an update" link → `/update-studio/[slug]` → pre-filled `StudioSubmitForm`. Update submissions store `studio_id`; `/api/approve-studio` does UPDATE when set, INSERT otherwise. **Studio submission is intentionally not exposed in the homepage `<SubmitMenu>`** — studios are created automatically by the game-submit flow whenever a developer tag doesn't match any approved studio (see "Game–studio many-to-many" below). `/submit-studio` and `/update-studio/[slug]` routes still exist (used by the auto-submit path and admin update flow respectively).
- **Admin flow:** Admin signs in with Supabase email/password auth → page loads both pending game and studio submissions → a three-tab switcher: "Games" (pending game queue), "Studios" (pending studio queue), "Published" (all approved games + studios). Both game and studio queue cards use the same expandable pattern: compact header always visible, "View details ↓" toggle reveals a `DetailRow`-based detail section. Update submissions (those with `game_id` / `studio_id` set) highlight changed fields in amber with a "changed" badge and "was: [old value]" annotation. The admin page batch-fetches original games and original studios at load time (stored in `originalGames` and `originalStudios` maps keyed by id) so diffs are available immediately. Studio update cards include a "View current studio ↗" link. The "Published" tab has two sections — **Games** and **Studios** — each listing all approved entries. Every game row shows: name (linked to public detail page) and developer. Every studio row shows: name (linked to public detail page) and type badge. Each row has a Delete button — games call `/api/delete-game`, studios call `/api/delete-studio` — both POST `{ id }`, verify admin session, and hard-delete the row. The list updates optimistically on delete. Approve/Reject/Delete all call server-side API routes that verify the session cookie + admin email, then use the service-role client for DB writes. If `getUser()` returns an auth error (e.g. stale refresh token), the page calls `signOut()` to clear bad cookies and shows the login form cleanly.
- **Admin auth:** `[locale]/admin/page.tsx` uses `createBrowserClient` from `@supabase/auth-helpers-nextjs` (stores session in cookies, not localStorage) so the session is readable by the server-side API routes. The shared `supabase` client in `lib/supabase.ts` is only used by non-admin pages.
- **Server routes auth:** `/api/approve` and `/api/reject` use a two-client pattern: (1) `createServerClient` with the anon key reads the session cookie and verifies `user.email === NEXT_PUBLIC_ADMIN_EMAIL`; (2) `createClient` with `SUPABASE_SERVICE_ROLE_KEY` performs the actual DB writes, bypassing RLS. This is necessary because the `games` RLS policy only grants `authenticated` users SELECT and INSERT — there is no UPDATE policy, so writes via the anon client silently affect 0 rows. The service role key is server-only (no `NEXT_PUBLIC_` prefix) and must never be exposed to the client. API routes have no locale prefix and are excluded from the proxy matcher.
- **Search:** Homepage accepts a `?q=` URL param (server-side, no JS required) on each tab. All three tabs match the same two fields for consistency: **name** and **description** (games use `short_description`; studios and communities use `description`). Games uses Supabase `.or("name.ilike.%q%,short_description.ilike.%q%")`; studios/communities filter in-memory after fetch since they're paginated client-side. Search composes with all filter dropdowns — search preserves filters and vice versa.
- **Platform filter pills:** The "PC" and "Mobile" pills on the homepage are umbrella categories — there is no game row whose `platforms` array contains the literal string `"PC"` or `"Mobile"`. The mapping lives in `PLATFORM_GROUPS` at the top of `src/app/[locale]/page.tsx`: `PC → ["Windows", "macOS", "Linux"]`, `Mobile → ["iOS", "Android"]`. The query checks `PLATFORM_GROUPS[sp.platform]` first; if it's a group, uses Supabase `.overlaps("platforms", group)` (PostgREST `&&` — matches when the row's platforms array shares any element with the group); otherwise falls back to `.contains("platforms", [sp.platform])` for direct platform names (`?platform=Windows` etc., though no UI exposes this today). `Web` is intentionally excluded from both groups — Web games are platform-agnostic and would dominate both filters if included. Retro/old-PC platforms (`DOS`, `MSX`, `Amstrad CPC`, `Amiga`, `Commodore 64`) and retro-mobile platforms (`Pocket PC`, `Nokia Symbian`) are also intentionally NOT in the PC or Mobile groups — the umbrellas stay modern-only (PC: Windows/macOS/Linux; Mobile: iOS/Android). Handheld and retro consoles (`Nintendo 64`, `Nintendo DS`, `Nintendo 3DS`, `GameBoy Advance`, `PSP`, `PSVITA`) are also standalone — not grouped under any umbrella. All non-umbrella platforms are still selectable on the submit form and display on cards/detail; they're filterable only via direct `?platform=DOS` etc. URLs. Keep `PLATFORM_GROUPS` and `PLATFORM_OPTIONS` in `SubmitForm.tsx` in sync if new platforms are added — `PLATFORM_OPTIONS` currently lists: iOS, Android, Pocket PC, Nokia Symbian, Windows, macOS, Linux, DOS, MSX, Amstrad CPC, Amiga, Commodore 64, Web, PlayStation, Xbox, Nintendo Switch, Nintendo 64, Nintendo DS, Nintendo 3DS, GameBoy Advance, PSP, PSVITA.
- **Game detail page layout:** `src/app/[locale]/games/[slug]/page.tsx` uses a three-section layout. (1) **Hero block** — full-width `aspect-[460/215]` thumbnail (when present), then title `h1`, developer names as a single `<p>` rendering each entry of `developers[]` separated by `", "` (each name is a `/studios/[slug]` link when its `game_studios` join row resolves the slug; plain text otherwise), status badge + country + platform + release date as a single `flex flex-wrap gap-2 mt-3` pill row, description with `whitespace-pre-wrap`. (2) **Two-column details grid** — `grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8`; each cell uses a `DetailCell` helper (small-caps label + content below); Genres/Gameplay Modes/Monetization use pill `<Tag>` badges; Game Engine is plain `text-sm text-c-text`; empty cells are omitted. Publishing is **not** in the grid — it appears inline in the Links section header row as `LINKS · Self-published` (or publisher name) using `text-xs text-c-faint`. (3) **Links section** — header row is `flex items-center gap-2` with the small-caps "Links" label and optional publishing annotation beside it; pills are `inline-flex` buttons linking directly to external URLs (unlike the homepage card which links to the game detail page — on the detail page itself, links always go external). The "Back to directory" link and "Suggest an update" button stay in a `flex justify-between` row at the very top.
- Pages that read from `games` are: homepage, game detail, stats. Pages that read from `studios` are: homepage (always, for both tab and developer-name linking), game detail (single `.ilike` lookup), studio detail. All use the anon Supabase client.
- The admin page is `"use client"` and uses Supabase Auth client-side. All other data-fetching pages are server components.
- **Theming:** Two themes — light (default) and dark — defined as CSS custom properties in `globals.css` (`:root` and `.theme-dark`). The gray theme was removed; the default light palette now uses those softer zinc-200/zinc-100 tones for easier reading. Dark uses zinc-900 base (not zinc-950). Registered as Tailwind utilities via `@theme inline` (e.g. `bg-c-surface`, `text-c-text`, `border-c-border`). Never use hardcoded `zinc-*` color classes in page components — always use the semantic `c-*` tokens so themes work. Status badges use opacity-based color classes so they work across both themes without modification — color map: announced=blue, in_dev=amber, prototype=cyan, early_access=purple, released=emerald, on_hold=orange, cancelled=c-tag/c-muted, delisted=c-tag/c-muted. Accent colors (indigo, emerald, red) are intentionally fixed and do not theme-switch. The `ThemeToggle` component persists the choice to `localStorage`; the root `layout.tsx` has an inline script in `<head>` that adds `theme-dark` before hydration to prevent flash.
- **Store links (submit form):** The store links section in `SubmitForm` is collapsible but **open by default** for both new submissions and updates. Toggled by a button with ↑/↓ indicator. `storeLinksOpen` state is initialized to `true` unconditionally.
- **Store links (game cards):** Game cards on the homepage do **not** show store links or a website URL row. These are removed entirely from the card — they are accessible on the game detail page. Studio cards are unaffected.
- **Tag display (game cards):** Genres, gameplay modes, and other tag-like fields are pooled and shown up to 5 total with a "+N more" pill for overflow.
- **Stats link:** The Stats page link lives in the tab row on the homepage (right-aligned), not in a separate footer section. This keeps it discoverable without adding visual weight.
- **Tab filter preservation:** When switching between the Games and Studios tabs on the homepage, the current search query and filter params (`q`, `platform`, `status`) are preserved in the URL. Both tab hrefs are built using `URLSearchParams` from the current `searchParams`.
- **Back link on update pages:** Update pages for both games (`/update/[slug]`) and studios (`/update-studio/[slug]`) use the i18n key `common.backToItem` (e.g. "← Back to {name}") instead of the generic "← Back to directory". The name is passed as an interpolation param.
- **Empty states:** The games and studios empty states on the homepage use an emoji (🔍 for no games, 🏢 for no studios yet) with a short hint line below, rather than plain text. The studios empty state includes a CTA explaining that studios are added automatically when a game is submitted.
- **Genres:** 25 predefined genres tuned for the MENA gaming context. Educational is a first-class genre (not under "Other") because Arabic educational and Islamic apps are prominent in the region. Visual Novel is separate from Adventure because several MENA studios build story-driven games rooted in regional folklore. Casual and Idle are included as top-level genres because mobile dominates the region. Family and Made for Kids are included as distinct genres — Family targets mixed-age audiences, Made for Kids targets children specifically. Defined outside the component as `GENRE_BASE_VALUES` (string array, used for state init) and inside the component as `GENRE_OPTIONS_BASE` (with translated labels via `tGenres`). "Other" is rendered as a standalone toggle below the `CheckboxGroup`; when checked it reveals a free-text input (`genreOtherText` state). On submit, if "Other" is checked the custom text (or the literal string `"Other"` if blank) is appended to the genres array. Pre-fills on update: known values go to `CheckboxGroup` initialValues; any unrecognized value sets `genreOtherChecked=true` and `genreOtherText` to that value. Stored as `text[]` in `games.genres`. Do not change the English `value` strings without a data migration. **Legacy values** (`"Shooter"`, `"Idle"`, `"Survival"`) may still exist in the DB from before the rename — they display as raw strings on game pages (no translation lookup needed).
- **Game engine options:** `ENGINE_OPTIONS` in `SubmitForm.tsx` is the datalist source for the game engine field. Current list: Unity, Unreal Engine, Godot, GameMaker, GameSalad, Construct, Cocos2d, Custom Engine, Others. The field is free-text with datalist autocomplete — submitters can type any value not in the list. Do not change existing values without a data migration.
- **Developer tag input:** The "Developer / Studio" field in `SubmitForm` uses `<DeveloperTagsInput>` (`src/components/DeveloperTagsInput.tsx`) — a tag-style input. Existing tags render as removable indigo chips on the start side; a free-text input on the end side has a custom-styled autocomplete dropdown filtering from `studioNames` (capped at 8). User adds a tag by clicking a suggestion, pressing Enter, or pressing comma. Backspace on an empty input removes the last tag. Each chip × button removes that tag. Dedup is case-insensitive. The component emits one hidden `<input type="hidden" name={name} value={tag}>` per chip so `formData.getAll(name)` returns the full array — same FormData pattern as `<CheckboxGroup>`. `autoComplete="off"` on the text input + 150ms `onBlur` timeout so `onMouseDown` on a suggestion fires before focus is lost. The component is fully self-contained — parent reads tags via FormData on submit; no callback needed.
- **Form validation (submit form):** All required-field validation is done in JS inside `onSubmit` — no HTML `required` attributes. An `errors: Record<string, string>` state holds per-field messages; cleared and re-evaluated on each submit attempt. The `Field` component accepts an optional `error` prop and renders it as a small red `<p>` below the field. The `inputCls(field?)` helper returns the base input class string with a red border (`border-red-500/50 focus:ring-red-500`) when `errors[field]` is set; `<DeveloperTagsInput>` accepts a `hasError` boolean prop and applies the same red-border treatment to its outer wrapper. Required fields: name, short_description, country (≥1), genres (≥1), platforms (≥1), `developers` (≥1, read via `formData.getAll("developers")`), gameplay_modes (≥1), game_engine. **New form field defaults:** all text inputs and checkboxes are empty/unchecked on a fresh submission. The only pre-selected values are the two required dropdowns: `status` defaults to `"announced"` and studio `type` defaults to `"studio"` — selects must always show an option.
- **Studio page games list:** The studio detail page (`/studios/[slug]`) fetches games via the `game_studios` join table — `.select("..., game_studios!inner(studio_id)").eq("game_studios.studio_id", studio.id)` — and renders them using the **exact same card structure as the homepage game cards** — `article` container with `overflow-hidden rounded-xl`, `flex flex-col sm:flex-row`, thumbnail on the start side (`w-full sm:w-[230px] shrink-0 object-cover self-stretch`, no fixed height), content in `flex-1 min-w-0 p-4`. Content: name (linked to `/games/[slug]`) + status badge row with developer names (`developers.join(", ")`) below, country · platforms · date meta line, pooled tags row (genres gray, gameplay_modes blue, monetization amber, game_engine gray/faint — capped at 5 with `+N` overflow). No description on cards. Query selects: `slug, name, developers, status, country, platforms, genres, gameplay_modes, monetization, game_engine, release_date, thumbnail_url, game_studios!inner(studio_id)`. Cast as `unknown as Game[]` to bypass Supabase generic inference. If no games match, shows "No games in the directory yet."
- **Studios tab search:** The Studios tab on the homepage has a search form that posts `q` and `tab=studios` as hidden input. All studios are always fetched (needed for the studios tab display); `filteredStudios` is then computed in-memory with `.filter()` by name/description (studios are a small set — server-side Supabase filtering would require a separate query). Pagination slices `filteredStudios` after filtering. Three rendering states: no studios at all (🏢), search returned zero results (🔍 + clear link), results list. Count badge reflects `filteredStudios.length`.
- **Thumbnail upload (forms):** Both `SubmitForm` and `StudioSubmitForm` have an optional thumbnail field at the top of the info section. Upload happens on file selection (not on form submit). Flow: client validates type (`image/jpeg`, `image/png`, `image/webp`) and size (≤200 KB) before sending → `POST /api/upload-thumbnail` with `FormData` containing `file` and `slug` → API validates magic bytes from raw buffer (not Content-Type header), converts to 460×215 WebP via `sharp` (wrapped in try/catch — returns 400 `"Invalid image"` on failure), uploads to `thumbnails/temp/` bucket path with service role key, returns `{ url }` → form stores URL in `thumbnailUrl` state → included in payload on submit. A local `URL.createObjectURL()` preview is shown immediately on selection (before upload completes). The preview is rendered as `<div className="relative aspect-[460/215] w-full overflow-hidden rounded-lg">` containing `<img className="absolute inset-0 w-full h-full object-cover">` — the aspect-ratio wrapper controls the box dimensions, and the absolute img fills it. Upload status: `idle | uploading | done | error`. On `isUpdate`, pre-fills preview and URL from `initialData.thumbnail_url`. Field is fully optional — no validation error if skipped. Reset clears `thumbnailUrl`, `thumbnailPreview`, `thumbnailStatus` to initial state.
- **Thumbnail display:** Homepage cards (both games and studios) use a compact side-by-side layout: thumbnail is `w-full sm:w-[230px] shrink-0 object-cover self-stretch` on the start side, content fills the remaining space (`flex-1 min-w-0 p-4`). `self-stretch` ensures the thumbnail fills the full card height (driven by the content side) with no gap below the image — do not use a fixed `h-[108px]` or `self-start` as these cause a white gap when card content is taller than the fixed height. On mobile (`< sm:`), layout stacks vertically (`flex-col sm:flex-row`) with thumbnail full-width on top. The card container has `overflow-hidden rounded-xl` which clips all thumbnail corners flush — do not add `rounded-s-lg` or any border-radius directly to the game card thumbnail `<img>` or placeholder `<div>` (studio card retains `rounded-s-lg` since its container is a `<Link>` not an `<article>`). When no thumbnail exists, the `<TitleCover>` component is rendered in place of the `<img>` — same dimensions (`w-full sm:w-[230px] shrink-0 self-stretch aspect-[460/215] sm:aspect-auto`), gradient background picked deterministically by hashing the slug, and the game/studio name shown as bold white text with `text-shadow` for legibility. Used on homepage games tab, homepage studios tab, and the studio detail page games list. On detail pages (game detail, studio detail), thumbnail is `460×215` (`rounded-xl`) and shown only when it exists — no fallback on detail pages. All `<img>` elements use `loading="lazy"` and `decoding="async"` except the first card on page 1 (index 0, page === 1) which uses `loading="eager"` to avoid LCP penalty.
- **TitleCover fallback:** `src/components/TitleCover.tsx` exports a default component `<TitleCover name seed className />`. Picks one of 8 Tailwind gradient pairs (`from-* to-*`, all literal strings so the v4 scanner picks them up) by hashing `seed` with a simple `(h * 31 + char) | 0` loop. Renders `bg-linear-to-br {gradient}` with the name centered, `dir="auto"` so Arabic titles render right-aligned, `line-clamp-3`, and `textShadow: "0 1px 2px rgba(0,0,0,0.25)"`. The `seed` is the slug (stable across renders); the `name` is the display string. Tailwind v4 syntax — gradient utility is `bg-linear-to-br`, not `bg-gradient-to-br` (legacy alias still works but use the v4 form).
- **Slug collision handling:** On the INSERT path of `/api/approve` and `/api/approve-studio`, before inserting a new row the route queries all existing slugs matching `${baseSlug}%`, builds a `Set` of taken values, then tries `baseSlug`, `baseSlug-2`, `baseSlug-3`, … until a free one is found. Update approvals (where `game_id` / `studio_id` is set) skip this — they `UPDATE` the existing row and preserve its slug unchanged.
- **Game–studio many-to-many:** A game can have one or more developers (multi-studio collaborations are common). The data model is **`games.developers text[]` (display names) + `game_studios(game_id, studio_id)` join table (FK link)**. The join table only contains rows for developer names that match an approved studio — names without a match render as plain text until the corresponding studio is approved. **Submit form (`SubmitForm.tsx`):** uses `<DeveloperTagsInput>` — a tag-style input where the user can add multiple developer names. Each tag emits a hidden `<input name="developers">` so `formData.getAll("developers")` returns the array. Validation requires `developers.length >= 1`. Auto-submission: on initial submission (not updates), the form loops through each developer tag and inserts a `studio_submissions` row for any name not already in `studioNames`. **Approve flow (`/api/approve`):** after the games row is upserted, `syncGameStudios(gameId, developers)` rebuilds the join table for that game — for each developer name, it does a single `.ilike("name", devName).maybeSingle()` lookup on `studios`, collects the matched ids into a Set, deletes existing `game_studios` rows for the game, and inserts the new set. Idempotent — safe to re-run on update approvals. The legacy `developer: string` payload shape is still tolerated via `readDevelopers()` helper for any submissions queued before the migration. **Studio approve flow (`/api/approve-studio`):** retroactive linking now scans every game's `developers[]` (in JS, since Postgres has no indexed case-insensitive array element match) and upserts a `game_studios` row for any game whose array contains the studio name (case-insensitive). Uses `.upsert(..., { onConflict: "game_id,studio_id", ignoreDuplicates: true })` so already-linked games are no-ops. **Rename propagation:** for studio UPDATE submissions, the route captures the old `studios.name` BEFORE the update, then if the name effectively changed (case-insensitive compare), `propagateStudioRename()` walks every game linked via `game_studios` and rewrites the matching `developers[]` entry in-place. This is necessary because `game_studios` links by id (so the FK row survives the rename), but display lookups match `developers[]` strings against `studios.name` case-insensitively — without this rewrite, a rename silently breaks the link visually even though the join row is intact. **Caveat:** if a studio is renamed via the Supabase dashboard directly (bypassing `/api/approve-studio`), `developers[]` is NOT rewritten and games will lose their visual link until you either re-approve the studio or run `UPDATE games SET developers = array_replace(developers, 'Old Name', 'New Name') WHERE 'Old Name' = ANY(developers);` manually. **Read sites:** queries select `*, game_studios(studios(slug, name))` (nested FK join). The runtime shape is `game_studios: { studios: { slug, name } | null }[] | null`. Display logic iterates `g.developers[]` (preserving submitter-chosen order) and looks up each name in `g.game_studios` for a slug — links if found, plain text otherwise. Used on homepage cards, game detail hero, and admin diff. **Studio detail page games list:** uses `.select("..., game_studios!inner(studio_id)").eq("game_studios.studio_id", studio.id)` — the `!inner` modifier turns the join into an inner-filter so only games linked to this studio come back. Cast result with `as unknown as Game[]` to bypass Supabase's generic inference (it types `game_studios` as `any[]`). **Display rule:** never use a singular `developer` field — that column is gone. Always read/render `developers[]`.
- **Stats charts:** The stats page (`/stats`) is a server component that fetches all games, aggregates counts, resolves translated labels, then passes `ChartEntry[]` arrays to the `StatsCharts` client component. All i18n is resolved server-side — the client component only receives `{ name: string; value: number; color?: string }[]`. Chart types: By Country → `BarChart` horizontal; By Status → `PieChart` donut with status-specific colors matching the badge palette; By Platform → `PieChart` donut; By Genre → `BarChart` horizontal. Tooltips use `var(--c-surface)` / `var(--c-border)` / `var(--c-text)` inline styles so they theme-switch correctly. **Small-data fallback:** each chart section independently checks its data length — if `length === 0` it shows a muted "No data yet" line; if `length < 3` (strictly less than 3) it renders a `SummaryList` instead of the chart: each entry is a `flex justify-between` row with the label on the start side and a count badge (`text-xs font-medium px-2 py-0.5 rounded-md bg-c-surface border border-c-border text-c-muted`) on the end side. Exactly 3 or more entries renders the chart normally. Requires `recharts` (already in `package.json`).
- **Homepage pagination:** Games and studios are paginated separately. Page size is 10. Games use URL param `?page=N`, studios use `?studiosPage=N`, so both tabs can paginate independently without resetting each other. When a search query or filter is active, links reset to page 1 (params omitted when page === 1). Games pagination uses Supabase `.range(from, to)` with `{ count: "exact" }` to get the total count in one query. Studios pagination slices `filteredStudios` in-memory. Prev/Next controls are hidden when `totalPages === 1`. Disabled direction links render as muted `<span>` instead of `<Link>`.
- **Homepage filters:** Every filter is a dropdown (`<FilterSelect>`) — no pill-style filters in the homepage. Each tab has its own URL-scoped query params; filters compose with search and sort. **Games:** `?platform=PC|Mobile`, `?status=announced|in_dev|prototype|early_access|released|on_hold|cancelled|delisted`, `?country=Egypt`, `?genre=Action`. **Studios:** `?studioType=individual|team|studio`, `?studioCountry=Egypt`. **Communities:** `?communityType=online|in_person|hybrid`, `?communityTopic=Game Development|Game Programming|Game Art|Game Design`, `?communityCountry=Egypt`. Tab-scoped filters do NOT carry across tab switches (only `q` does); they're erased when switching tabs because they don't apply. **Implementation:** validation done up-front against `Set`s constructed from `COUNTRY_OPTIONS`, `GENRE_VALUES`, `COMMUNITY_TOPIC_VALUES`; invalid values silently coerce to `null`. Each tab has a `buildXFilterHref(extra)` helper that preserves all current filters by default and accepts `null` values in `extra` to remove a key (used by the active-filter chips to remove a single dimension). Pagination/clear-search/search-form-hidden-inputs all preserve every filter param. **Active-filter chips:** rendered above the sort row when any filter is active — each chip shows the human-readable label (translated where applicable: country, genre, status, platform, type, topic) and links to a URL with that one param removed. Component is a local helper `<ActiveFilterChips>` defined at the bottom of `page.tsx`. **`<FilterSelect>` (`src/components/FilterSelect.tsx`):** generic `"use client"` `<select>` wrapper for every filter dimension. Adds an empty-value `<option>` at the top with a `defaultLabel` (e.g. "All countries", "All platforms") that maps to "no filter" — empty value = `params.delete(paramName)`. Sets pageParam to deletion on change so results reset to page 1.
- **Discord webhooks:** Two server-only env vars hold webhook URLs — `DISCORD_SUBMISSIONS_WEBHOOK_URL` (notifies on every game/studio/community submission or update via `/api/notify-submission`) and `DISCORD_CONTACT_WEBHOOK_URL` (contact-form messages via `/api/contact`). Both routes are **fire-and-forget**: failures are swallowed so the user never sees a webhook error, and if the env var isn't set the route silently no-ops (so dev environments work without Discord configured). The submission webhook is called from the client AFTER the row is inserted into `*_submissions` — if it fails, the submission still went through. Embed payloads are minimal by design (per user spec): submission webhook = title + color + Name + Type + Country + IP + footer "→ Review in admin" + timestamp; contact webhook = title + color + From (name+email) + Category + Message body + IP + timestamp. Client IP is extracted from `x-forwarded-for` (Vercel sets this) with a fallback to `x-real-ip` and finally `"unknown"`. **Honeypot:** the contact form has a hidden `website_url_extra` field (positioned `-left-[9999px]`); bots fill in every field, humans don't — if filled, the route returns 200 without forwarding so the bot thinks it succeeded. No CAPTCHA / Turnstile.
- **Homepage submit CTA:** A single `<SubmitMenu>` (client) renders a "Submit ▾" indigo button in the header that opens a dropdown listing two submission targets — game and community. Studios are deliberately omitted from public submission; they are created automatically at game-approve time when the `developer` value doesn't match an existing studio (see "Studios" convention). Closes on outside click + Escape. The button label uses `tCommon("submit")`; the menu items reuse the existing `submitGame` / `submitCommunity` keys. The `submitStudio` key still exists in `messages/{en,ar}.json` and the `/submit-studio` route still works (used by the auto-submission path), it's just not surfaced in the UI.
- **Homepage sort:** Each tab has its own sort dropdown rendered via `<SortSelect>` (`src/components/SortSelect.tsx`, `"use client"`). Games use URL param `?sort=`, studios use `?studiosSort=` — independent across tabs (matches the pagination split). Defaults live in module-level constants `GAMES_DEFAULT_SORT` (`"released_desc"`) and `STUDIOS_DEFAULT_SORT` (`"updated_desc"`); always reference the constants, not the string literals, so flipping the default in one place updates every URL-builder and form-hidden-input check. The default sort is omitted from URLs when active to keep them clean. **Games options:** `updated_desc`, `updated_asc`, `released_desc` (default), `released_asc` — applied as a Supabase `.order(...)` call on the games query; `release_date` orderings pass `nullsFirst: false` so games without a release date (any status not in `STATUSES_WITH_RELEASE_DATE`) sort to the end in both directions. **Studios options:** `updated_desc` (default), `updated_asc` — applied as an in-memory `.sort()` on `filteredStudios` (studios are filtered/paginated client-side, so sorting must happen there too). The studios SELECT therefore includes `created_at, updated_at` even though the columns aren't displayed. The `Studio` type carries those fields. **URL-building rules:** sort is preserved across filter pills, search forms, clear-search, and pagination links within the same tab; it is NOT carried across tab switches (sort is tab-scoped). On sort change, `SortSelect` deletes the matching page param so results reset to page 1. The order is applied AFTER `filteredStudios` is computed so search and sort compose correctly. Requires `games.updated_at` and `studios.updated_at` triggers to actually update on row changes — the schema doc states they exist; verify in Supabase if "Recently updated" looks wrong.

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

### Migration: multi-developer (#32)
Run this in the Supabase SQL editor **before deploying** the multi-developer code (the deployed code reads `games.developers` and `game_studios` and will fail if they don't exist):

```sql
-- 1. Add the new array column for display names
alter table games add column developers text[] not null default '{}';

-- 2. Backfill from the existing single `developer` column
update games
   set developers = case
     when developer is null or developer = '' then '{}'::text[]
     else array[developer]
   end;

-- 3. Create the many-to-many join table (cascade on either side delete)
create table game_studios (
  game_id uuid not null references games(id) on delete cascade,
  studio_id uuid not null references studios(id) on delete cascade,
  primary key (game_id, studio_id)
);
create index game_studios_studio_id_idx on game_studios(studio_id);

-- 4. Public read RLS (mirrors `games`)
alter table game_studios enable row level security;
create policy "Anyone can view game_studios"
  on game_studios for select
  using (true);

-- 5. Backfill the join table from the existing single FK column
insert into game_studios (game_id, studio_id)
select id, studio_id from games where studio_id is not null;

-- 6. Drop the old single-value columns (data is now in `developers` and `game_studios`)
alter table games drop column developer;
alter table games drop column studio_id;
```

Pending submission rows (`submissions.payload.developer: string`) queued before the migration are still readable — `/api/approve` and the admin page tolerate the legacy shape via `readDevelopers()` / `payloadDevelopers()` helpers.

---

## What NOT to do
- Do not commit `.env.local` or any file containing Supabase keys.
- Do not use the anon Supabase client in API routes that perform privileged actions — use `createServerClient` with the service role key or session cookie.
- Do not remove the RLS policies — the security model depends on them.
- Do not change the `submissions` → `games` approve flow without updating both the client admin page and any new API routes to stay in sync.
- Do not use `next/link` directly in page components — use `@/i18n/navigation`'s `Link` so locale prefix is applied automatically.
- Do not use physical directional Tailwind classes (`right-*`, `left-*`, `ml-*`, `mr-*`, `pl-*`, `pr-*`) for UI elements that should respect RTL — use logical properties instead.
- Do not rename `proxy.ts` back to `middleware.ts` — Next.js 16 deprecated the middleware convention.
