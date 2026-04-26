# Arabic Games Directory

A public archive of games developed in the Arab region — plus the studios that build them and the communities around them.

Live at **[arabicgames.directory](https://arabicgames.directory)**.

Anyone can submit. Submissions go into a moderation queue; an admin reviews them, and approved entries appear on the public site.

## What's in the directory

- **Games** — name, developer, country, platforms, genres, gameplay modes, status, release date, store links, thumbnail.
- **Studios** — individuals, teams, and studios shipping games from the region. Linked to their games via FK.
- **Communities** — online, in-person, and hybrid communities around game development, programming, art, and design.
- **Contact form** — `/contact` for feedback, suggestions, bug reports, and studio claims.

## Tech stack

- **Next.js 16** (App Router, TypeScript) with `next-intl` for English/Arabic routing and RTL.
- **Supabase** — PostgreSQL + Auth + Row Level Security + Storage (for thumbnails).
- **Tailwind v4** with semantic CSS variables for light/dark theming.
- **`sharp`** for server-side thumbnail processing (converts uploads to 460×215 WebP).
- **`recharts`** for the stats page.
- **Discord webhooks** for submission/contact notifications (fire-and-forget, optional).
- Deployed on **Vercel**.

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run lint
```

You'll need a `.env.local` with Supabase credentials. Discord webhook URLs are optional — the routes silently no-op if unset, so dev works without them. See [CLAUDE.md](./CLAUDE.md) for the full env-var list and database schema.

## Project layout

- `src/app/[locale]/` — all pages, locale-prefixed (`/en/...`, `/ar/...`): homepage, game/studio/community detail pages, submit forms, update flows, stats, admin, contact.
- `src/app/api/` — server routes:
  - `approve` / `reject` / `delete` for each entity (games, studios, communities)
  - `upload-thumbnail` (sharp + Supabase Storage)
  - `notify-submission` (Discord webhook on submit/update)
  - `contact` (Discord webhook for contact form)
  - `cron/cleanup-thumbnails` (daily orphan cleanup)
- `src/components/` — `SubmitForm`, `StudioSubmitForm`, `CommunitySubmitForm`, `ContactForm`, plus shared UI: `TitleCover` (gradient fallback for missing thumbnails), `SortSelect`, `FilterSelect`, `SubmitMenu`, `Disclaimer` (site-wide footer), `ThemeToggle`, `LanguageSwitcher`.
- `src/lib/` — Supabase client, country list, slugify helper, game-status helpers, genre and community-topic taxonomies.
- `src/proxy.ts` — `next-intl` locale routing (Next.js 16 uses `proxy.ts`, not `middleware.ts`).
- `messages/en.json`, `messages/ar.json` — translations.

## Documentation

[**CLAUDE.md**](./CLAUDE.md) is the authoritative spec — schema, RLS, conventions, gotchas, planned improvements. Read it before making non-trivial changes.

## Contributing

- **Data corrections** (game / studio / community listing is wrong): use the "Suggest an update" link on the listing's page — that's the lowest-friction path.
- **Bug reports, suggestions, studio claims:** use the [Contact form](https://arabicgames.directory/contact) in the site footer.
- **Code:** open an issue or PR.
