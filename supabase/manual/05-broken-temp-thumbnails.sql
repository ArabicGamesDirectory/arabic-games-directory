-- 05 — Clear thumbnail URLs that point at deleted temp/ files.
-- NOT YET APPLIED.
--
-- RUN: any time; independent of the deploy.
--
-- Five live rows (4 games, 1 studio, found 2026-10-02) store a
-- .../thumbnails/temp/... URL whose file the daily cleanup cron already
-- deleted, so they render a broken image. Cause: the cron swept temp/ files
-- older than 24h even while a pending submission still referenced them, so
-- anything approved more than a day after it was submitted lost its file, and
-- the approve routes then stored the dead temp/ URL. Both halves are fixed in
-- code (cron skips referenced files; finalThumbnailUrl() never stores a temp/
-- URL). Setting these to NULL makes the site show the generated title cover.
--
-- Expected rows: games word-blocked-2, parcel-trip, delta-sand-1973,
-- burning-road; studio lyes-belaidouni-carlo-perconti.

begin;

-- What will change (copy the result somewhere if you want a record).
select 'games' as tbl, slug, thumbnail_url from games where thumbnail_url like '%/thumbnails/temp/%'
union all
select 'studios', slug, thumbnail_url from studios where thumbnail_url like '%/thumbnails/temp/%'
union all
select 'communities', slug, thumbnail_url from communities where thumbnail_url like '%/thumbnails/temp/%';

update games       set thumbnail_url = null where thumbnail_url like '%/thumbnails/temp/%';
update studios     set thumbnail_url = null where thumbnail_url like '%/thumbnails/temp/%';
update communities set thumbnail_url = null where thumbnail_url like '%/thumbnails/temp/%';

commit;

-- Rollback: not needed — the files these URLs point at no longer exist.
-- The studio/game owners can upload a new thumbnail via "Suggest an update".
