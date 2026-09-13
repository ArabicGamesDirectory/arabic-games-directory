-- 04 — Remove duplicate studio rows and make studio names unique.
--
-- RUN: any time. Independent of 03 and of the deploy order:
--   - Before the new code is live, approving a submission for an existing
--     studio name fails with a unique-violation error (nothing is written);
--     re-approve it after deploying and it merges.
--   - After the new code is live, such approvals merge automatically.
-- Paste the whole file into the Supabase SQL editor and run it once.
--
-- What happened: four studios exist twice (the second copy got a "-2" slug
-- because /api/approve-studio only avoided SLUG collisions, never NAME ones).
-- Game linking matches developer names to studio names and errored when two
-- rows matched, so 12 games ended up linked to no studio at all
-- (afkar media ×7, EpicSoft ×4, Lion's Den Team ×1).
--
--   keep (canonical URL)    remove              notes
--   abualamrien-studio      abualamrien-studio-2  identical, keep has the 2 linked games
--   lions-den-team          lions-den-team-2      the -2 copy holds description/website/thumbnail → merged into keep
--   afkar-media             afkar-media-2         identical; -2 thumbnail points at a deleted temp/ file
--   epicsoft                epicsoft-2            identical; -2 thumbnail points at a deleted temp/ file
--
-- Result: the query near the end shows the 4 surviving studios with their
-- linked-game counts. Expected: Abualamrien Studio 2, afkar media 7,
-- EpicSoft 4, Lion's Den Team 1 (now with description + thumbnail).

begin;

create temp table studio_dupe_map (
  keep_id uuid primary key,
  dup_id  uuid not null unique
) on commit drop;

insert into studio_dupe_map (keep_id, dup_id) values
  ('6c0df5d6-4f10-44f1-b89e-6f270eafd553', '35ff6b78-29a2-438e-a38d-3c23b7a26d0c'),  -- Abualamrien Studio
  ('e3586654-1773-44a9-b376-cdbd963db6dc', '5732b9b6-2abb-4a95-93b0-a017ea0e36f5'),  -- Lion's Den Team
  ('d7b4a63b-1dbb-42cc-b97c-c345560fc52b', '0d331a7e-4a75-4e27-a816-885d3256632a'),  -- afkar media
  ('52009dd0-0209-4dc1-9689-037cd6bcdb26', '7759e8da-2001-42c3-aa28-6ccf2bf25cdf');  -- EpicSoft

-- Guard: all four pairs must still exist with matching names. If anything was
-- already fixed or renamed by hand, stop instead of guessing. Re-running this
-- file after a successful run lands here too and changes nothing.
do $$
declare n int;
begin
  select count(*) into n
    from studio_dupe_map m
    join studios k on k.id = m.keep_id
    join studios d on d.id = m.dup_id
   where lower(btrim(k.name)) = lower(btrim(d.name));
  if n <> 4 then
    raise exception 'Expected 4 duplicate pairs, found %. Nothing was changed.', n;
  end if;
end $$;

-- 1. Back up the rows about to be deleted. RLS on with no policies keeps it
--    service-role only (tables created here are otherwise exposed to the API).
create table if not exists studios_duplicates_backup_20260914 as
  select s.* from studios s join studio_dupe_map m on s.id = m.dup_id;
alter table studios_duplicates_backup_20260914 enable row level security;

-- 2. Merge: fill only what the kept row is missing. Never copy a temp/
--    thumbnail URL — the daily cron deletes those files.
update studios k
   set description   = coalesce(nullif(k.description, ''), d.description),
       website_url   = coalesce(nullif(k.website_url, ''), d.website_url),
       thumbnail_url = coalesce(nullif(k.thumbnail_url, ''),
                         case when d.thumbnail_url like '%/thumbnails/temp/%' then null
                              else d.thumbnail_url end)
  from studio_dupe_map m
  join studios d on d.id = m.dup_id
 where k.id = m.keep_id;

-- 3. Point any pending "suggest an update" submissions at the kept row, so they
--    don't reference a deleted studio.
update studio_submissions ss
   set studio_id = m.keep_id
  from studio_dupe_map m
 where ss.studio_id = m.dup_id;

-- 4. Move any game links from the duplicate to the kept row.
insert into game_studios (game_id, studio_id)
select gs.game_id, m.keep_id
  from game_studios gs
  join studio_dupe_map m on gs.studio_id = m.dup_id
on conflict (game_id, studio_id) do nothing;

-- 5. Re-link every game whose developers[] names a kept studio — repairs the
--    12 games that linking skipped while the duplicates existed.
insert into game_studios (game_id, studio_id)
select distinct g.id, k.id
  from studio_dupe_map m
  join studios k on k.id = m.keep_id
  join games g on exists (
         select 1 from unnest(g.developers) as dev(name)
          where lower(btrim(dev.name)) = lower(btrim(k.name)))
on conflict (game_id, studio_id) do nothing;

-- 6. Delete the duplicates (their game_studios rows cascade).
delete from studios s
 using studio_dupe_map m
 where s.id = m.dup_id;

-- 7. Result you should see in the editor.
select k.name,
       k.slug,
       (select count(*) from game_studios gs where gs.studio_id = k.id) as linked_games,
       k.description   is not null as has_description,
       k.thumbnail_url is not null as has_thumbnail
  from studio_dupe_map m
  join studios k on k.id = m.keep_id
 order by k.name;

-- 8. Make it impossible to recreate. The app already treats "same name" as
--    "same studio" (linking is by name), so this encodes an existing rule.
--    If this errors, another duplicate exists — the whole file rolls back.
create unique index studios_name_unique on studios (lower(btrim(name)));

commit;

-- ── Rollback (only if needed) ────────────────────────────────────────────
-- drop index studios_name_unique;
-- insert into studios select * from studios_duplicates_backup_20260914;
-- (Fields merged into the kept rows in step 2 stay; the restored duplicates
--  come back with no game links, as they had before.)
--
-- ── Cleanup, once you're happy ───────────────────────────────────────────
-- drop table studios_duplicates_backup_20260914;
