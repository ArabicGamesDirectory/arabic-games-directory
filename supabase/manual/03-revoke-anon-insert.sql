-- 03 — Make /api/submit the ONLY write path into the submission queues.
--
-- RUN: LAST. Only after the new code is deployed AND you have submitted one
-- game, one studio, and one community through the live site and seen all
-- three arrive in /admin. If you run this before deploying, every public
-- submission form stops working.
--
-- Policy names differ per project, so this file cannot drop them blindly.
-- Step A: run the SELECT and note the policy names it returns.
-- Step B: uncomment the matching DROP lines, fill in the names, run them.

select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('submissions', 'studio_submissions', 'community_submissions')
   and cmd in ('INSERT', 'ALL');

-- then, using the names from that query:
-- drop policy "<policy name>" on submissions;
-- drop policy "<policy name>" on studio_submissions;
-- drop policy "<policy name>" on community_submissions;

-- Rollback: re-create the anon INSERT policy on each table, e.g.
--   create policy "Anyone can submit" on submissions
--     for insert to anon, authenticated with check (true);
