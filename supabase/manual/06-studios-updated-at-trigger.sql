-- 06 — Give `studios` the updated_at trigger it never had.
-- NOT YET APPLIED.
--
-- RUN: any time; independent of the deploy.
--
-- Found 2026-10-17: `games` and `communities` have a BEFORE UPDATE trigger
-- calling set_updated_at(), but `studios` does not. All 189 studios still have
-- updated_at = created_at even though 35 studio updates had been approved, so
-- the Studios tab's "Recently updated" sort is really "recently created" and
-- sitemap lastmod never moves for studios.
--
-- Also pins set_updated_at()'s search_path (Supabase security advisor
-- "function_search_path_mutable"). The function only uses NEW and now(), so an
-- empty search_path is safe.

begin;

-- 1. Best-effort backfill BEFORE the trigger exists (otherwise this UPDATE
--    would stamp every row with now()): each studio's last approved update
--    suggestion. Merges of new-studio submissions aren't recorded per studio,
--    so those can't be recovered.
update studios s
   set updated_at = x.last_reviewed
  from (
    select studio_id, max(reviewed_at) as last_reviewed
      from studio_submissions
     where moderation_status = 'approved'
       and studio_id is not null
       and reviewed_at is not null
     group by studio_id
  ) x
 where s.id = x.studio_id
   and x.last_reviewed > s.updated_at;

-- 2. The trigger, named like the communities one.
create trigger studios_set_updated_at
  before update on public.studios
  for each row execute function public.set_updated_at();

-- 3. Advisor fix.
alter function public.set_updated_at() set search_path = '';

-- Check: expect 3 rows (games, communities, studios).
select tgrelid::regclass as table_name, tgname
  from pg_trigger
 where not tgisinternal and tgfoid = 'public.set_updated_at'::regproc;

commit;

-- Rollback (trigger only; the backfilled timestamps are harmless to keep):
--   drop trigger studios_set_updated_at on public.studios;
--   alter function public.set_updated_at() reset search_path;
